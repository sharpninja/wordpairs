begin;
alter table wordpairs.deadline_jobs add column lease_id text, add column lease_until timestamptz;

-- Five-argument application entry retains the original creation transaction and retry.
create function public.wordpairs_room_create(p_command jsonb,p_room jsonb,p_digest text,p_event jsonb,p_deadlines jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,wordpairs as $$
declare response jsonb; job jsonb; existed boolean; room_id text:=p_room->>'id'; begin
  perform pg_advisory_xact_lock(hashtextextended('room-create:'||room_id,0));
  existed:=exists(select 1 from wordpairs.idempotency_records where aggregate_kind='room' and aggregate_id=room_id and actor_id=p_command->>'actorId' and command_id=p_command->>'commandId');
  if jsonb_typeof(p_deadlines) is distinct from 'array' then raise exception 'Invalid deadlines' using errcode='22023'; end if;
  response:=public.wordpairs_room_create(p_command,p_room,p_digest,p_event);
  if not existed and (response->>'ok')::boolean then
    for job in select value from jsonb_array_elements(p_deadlines) loop
      if job->>'aggregateId' is distinct from room_id or (job->>'expectedVersion')::integer is distinct from 0 then raise exception 'Invalid deadline scope' using errcode='23514'; end if;
      insert into wordpairs.deadline_jobs(id,aggregate_kind,aggregate_id,expected_version,kind,due_at)
        values(job->>'id','room',room_id,0,job->>'kind',to_timestamp((job->>'dueAt')::double precision/1000));
    end loop;
    update wordpairs.idempotency_records set transition=jsonb_set(transition,'{deadlines}',p_deadlines)
      where aggregate_kind='room' and aggregate_id=room_id and actor_id=p_command->>'actorId' and command_id=p_command->>'commandId';
  end if;
  return response;
end $$;

create function public.wordpairs_lobby_claim(p_now bigint,p_limit integer,p_lease text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,wordpairs as $$
declare result jsonb; begin
  if p_limit is null or p_limit not between 1 and 25 or p_lease is null or length(p_lease) not between 1 and 128 then raise exception 'Invalid claim' using errcode='22023'; end if;
  -- Superseded version jobs can never mutate state. Remove them from the live queue.
  update wordpairs.deadline_jobs j set completed_at=to_timestamp(p_now::double precision/1000)
    from wordpairs.aggregates a where j.aggregate_kind='room' and j.kind<>'stage' and j.completed_at is null
      and a.kind='room' and a.id=j.aggregate_id and a.version<>j.expected_version;
  with candidates as (
    select id from wordpairs.deadline_jobs where aggregate_kind='room' and kind<>'stage' and completed_at is null
      and due_at<=to_timestamp(p_now::double precision/1000) and (lease_until is null or lease_until<=to_timestamp(p_now::double precision/1000))
      order by due_at,id collate "C" limit p_limit for update skip locked
  ), claimed as (
    update wordpairs.deadline_jobs j set lease_id=p_lease,lease_until=to_timestamp((p_now+30000)::double precision/1000)
      from candidates c where j.id=c.id returning j.*
  ) select coalesce(jsonb_agg(jsonb_build_object('id',id,'aggregateId',aggregate_id,'expectedVersion',expected_version,'kind',kind,'dueAt',floor(extract(epoch from due_at)*1000)::bigint) order by due_at,id collate "C"),'[]'::jsonb) into result from claimed;
  return result;
end $$;
create function public.wordpairs_lobby_complete(p_id text,p_lease text)
returns boolean language plpgsql security definer set search_path=pg_catalog,wordpairs as $$
begin
  update wordpairs.deadline_jobs set completed_at=now(),lease_until=null
    where id=p_id and lease_id=p_lease and aggregate_kind='room' and kind<>'stage';
  return found;
end $$;
revoke all on function public.wordpairs_room_create(jsonb,jsonb,text,jsonb,jsonb),public.wordpairs_lobby_claim(bigint,integer,text),public.wordpairs_lobby_complete(text,text) from public,anon,authenticated;
grant execute on function public.wordpairs_room_create(jsonb,jsonb,text,jsonb,jsonb),public.wordpairs_lobby_claim(bigint,integer,text),public.wordpairs_lobby_complete(text,text) to service_role;
commit;
