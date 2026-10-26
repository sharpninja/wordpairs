begin;
create table wordpairs.room_invitations(token_digest text primary key,room_id text not null references wordpairs.rooms(id),inviter_id text not null references wordpairs.profiles(id));
create table wordpairs.code_attempts(id bigserial primary key,session_key text not null,attempted_at bigint not null);
create index code_attempt_window on wordpairs.code_attempts(session_key,attempted_at);
create table wordpairs.quick_assignments(actor_id text not null references wordpairs.profiles(id),command_id text not null,request_digest text not null,room_id text references wordpairs.rooms(id),expected_version integer,primary key(actor_id,command_id));
alter table wordpairs.room_invitations enable row level security;
alter table wordpairs.code_attempts enable row level security;
alter table wordpairs.quick_assignments enable row level security;

create function wordpairs.sync_room_projection() returns trigger language plpgsql security definer set search_path=pg_catalog,wordpairs as $$
begin
  if new.kind='room' and new.state ? 'players' then
    update wordpairs.rooms set capacity=(new.state->>'capacity')::integer,status=new.state->>'status',discoverable=(new.state->>'discoverable')::boolean,closed_at=to_timestamp((new.state->>'closedAt')::double precision/1000) where id=new.id;
    -- Rebuild the small ordered projection under the aggregate lock; rollback is atomic.
    delete from wordpairs.room_members where room_id=new.id;
    insert into wordpairs.room_members(room_id,profile_id,membership_kind,roster_position,ready,joined_at,disconnected_at)
      select new.id,p->>'profileId','player',position,(p->>'ready')::boolean,to_timestamp((p->>'joinedAt')::double precision/1000),to_timestamp((p->>'disconnectedAt')::double precision/1000)
      from jsonb_array_elements(new.state->'players') with ordinality as members(p,position);
    insert into wordpairs.room_members(room_id,profile_id,membership_kind,joined_at,followed_player_id,arrival_sequence)
      select new.id,o->>'profileId','observer',to_timestamp((o->>'joinedAt')::double precision/1000),o->>'followedPlayerId',(o->>'arrivalSequence')::bigint
      from jsonb_array_elements(new.state->'observers') as members(o);
  end if;
  return new;
end $$;
create trigger sync_room_projection after insert or update on wordpairs.aggregates for each row execute function wordpairs.sync_room_projection();

create function public.wordpairs_room_get(p_id text) returns jsonb language sql stable security definer set search_path=pg_catalog,wordpairs as $$
  select state from wordpairs.aggregates where kind='room' and id=p_id
$$;
create function public.wordpairs_room_discover(p_limit integer,p_after text) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,wordpairs as $$
declare result jsonb; after_time timestamptz; begin
  if p_limit is null or p_limit not between 1 and 25 then raise exception 'Invalid page' using errcode='22023'; end if;
  if p_after is not null then select created_at into after_time from wordpairs.rooms where id=p_after; if after_time is null then raise exception 'Invalid page' using errcode='22023'; end if; end if;
  select coalesce(jsonb_agg(state order by created_at,id collate "C"),'[]'::jsonb) into result from (
    select a.state,r.id,r.created_at from wordpairs.rooms r join wordpairs.aggregates a on a.kind='room' and a.id=r.id
      where r.discoverable and r.status='waiting' and (select count(*) from wordpairs.room_members m where m.room_id=r.id and m.membership_kind='player')<r.capacity
        and (p_after is null or (r.created_at,r.id collate "C")>(after_time,p_after collate "C")) order by r.created_at,r.id collate "C" limit p_limit
  ) available;return result;
end $$;
create function public.wordpairs_room_code(p_digest text,p_session text,p_now bigint) returns jsonb language plpgsql security definer set search_path=pg_catalog,wordpairs as $$
declare result jsonb; begin
  perform pg_advisory_xact_lock(hashtextextended('code-attempt:'||p_session,0));
  delete from wordpairs.code_attempts where attempted_at<=p_now-60000;
  if (select count(*) from wordpairs.code_attempts where session_key=p_session and attempted_at>p_now-60000)>=10 then return jsonb_build_object('ok',false,'error',jsonb_build_object('code','RATE_LIMITED')); end if;
  insert into wordpairs.code_attempts(session_key,attempted_at) values(p_session,p_now);
  select a.state into result from wordpairs.rooms r join wordpairs.aggregates a on a.kind='room' and a.id=r.id where r.code_digest=p_digest and r.status<>'closed';
  return case when result is null then jsonb_build_object('ok',false,'error',jsonb_build_object('code','NOT_FOUND')) else jsonb_build_object('ok',true,'value',result) end;
end $$;
create function public.wordpairs_room_labels(p_ids jsonb) returns jsonb language sql stable security definer set search_path=pg_catalog,wordpairs as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'alias',alias,'icon',icon)),'[]'::jsonb) from wordpairs.profiles where id in (select jsonb_array_elements_text(p_ids))
$$;
create function public.wordpairs_room_create(p_command jsonb,p_room jsonb,p_digest text,p_event jsonb) returns jsonb language plpgsql security definer set search_path=pg_catalog,wordpairs as $$
declare prior wordpairs.idempotency_records; transition jsonb; room_id text:=p_room->>'id'; begin
  perform pg_advisory_xact_lock(hashtextextended('room-create:'||room_id,0));
  select * into prior from wordpairs.idempotency_records where aggregate_kind='room' and aggregate_id=room_id and actor_id=p_command->>'actorId' and command_id=p_command->>'commandId';
  if found then
    if prior.request_digest<>p_command->>'requestDigest' then return jsonb_build_object('ok',false,'error',jsonb_build_object('code','IDEMPOTENCY_CONFLICT')); end if;
    return jsonb_build_object('ok',true,'value',prior.transition->'state');
  end if;
  if exists(select 1 from wordpairs.aggregates where kind='room' and id=room_id) then return jsonb_build_object('ok',false,'error',jsonb_build_object('code','CONFLICT')); end if;
  insert into wordpairs.rooms(id,capacity,status,code_digest,creator_id,discoverable,created_at) values(room_id,(p_room->>'capacity')::integer,'waiting',p_digest,p_command->>'actorId',(p_room->>'discoverable')::boolean,to_timestamp((p_room->>'createdAt')::double precision/1000));
  insert into wordpairs.aggregates(kind,id,version,state) values('room',room_id,0,p_room);
  insert into wordpairs.outbox_events(id,aggregate_kind,aggregate_id,aggregate_version,schema_version,event_type,audience,payload)
    values(p_event->>'id','room',room_id,0,1,p_event->>'type',p_event->'audience',p_event->'payload');
  transition:=jsonb_build_object('state',p_room,'result',p_room,'events',jsonb_build_array(p_event),'deadlines','[]'::jsonb,'audits','[]'::jsonb);
  insert into wordpairs.idempotency_records(aggregate_kind,aggregate_id,actor_id,command_id,request_digest,transition) values('room',room_id,p_command->>'actorId',p_command->>'commandId',p_command->>'requestDigest',transition);
  return jsonb_build_object('ok',true,'value',p_room);
end $$;
create function public.wordpairs_room_invite(p_room text,p_actor text,p_digest text) returns jsonb language plpgsql security definer set search_path=pg_catalog,wordpairs as $$
declare current_state jsonb; begin
  select state into current_state from wordpairs.aggregates where kind='room' and id=p_room for update;
  if current_state is null or current_state->>'status'='closed' or not exists(select 1 from jsonb_array_elements(current_state->'players') p where p->>'profileId'=p_actor) then return jsonb_build_object('ok',false,'error',jsonb_build_object('code','NOT_AUTHORIZED')); end if;
  insert into wordpairs.room_invitations values(p_digest,p_room,p_actor);
  return jsonb_build_object('ok',true);
end $$;
create function public.wordpairs_room_invitation(p_digest text) returns jsonb language sql stable security definer set search_path=pg_catalog,wordpairs as $$
  select jsonb_build_object('roomId',i.room_id,'inviterId',i.inviter_id) from wordpairs.room_invitations i join wordpairs.rooms r on r.id=i.room_id where i.token_digest=p_digest and r.status<>'closed'
$$;
create function public.wordpairs_room_assignment(p_actor text,p_command text,p_digest text) returns jsonb language plpgsql security definer set search_path=pg_catalog,wordpairs as $$
declare prior wordpairs.quick_assignments; selected_room text; selected_version integer; begin
  -- The adapter holds this transaction through the canonical join commit. Serialize
  -- quick admissions; aggregate FOR UPDATE also arbitrates manual joins.
  perform pg_advisory_xact_lock(hashtextextended('quick-admission',0));
  select * into prior from wordpairs.quick_assignments where actor_id=p_actor and command_id=p_command;
  if found then
    if prior.request_digest<>p_digest then return jsonb_build_object('ok',false,'error',jsonb_build_object('code','IDEMPOTENCY_CONFLICT')); end if;
    selected_room:=prior.room_id;selected_version:=prior.expected_version;
  else
    select a.id,a.version into selected_room,selected_version from wordpairs.aggregates a
      where a.kind='room' and a.state->>'status'='waiting' and (a.state->>'discoverable')::boolean
        and jsonb_array_length(a.state->'players')<(a.state->>'capacity')::integer
        and not exists(select 1 from jsonb_array_elements((a.state->'players')||(a.state->'observers')) m where m->>'profileId'=p_actor)
      order by (a.state->>'createdAt')::bigint,a.id collate "C" limit 1 for update;
    insert into wordpairs.quick_assignments values(p_actor,p_command,p_digest,selected_room,selected_version);
  end if;
  return jsonb_build_object('ok',true,'value',case when selected_room is null then null else jsonb_build_object('roomId',selected_room,'expectedVersion',selected_version) end);
end $$;
revoke all on function wordpairs.sync_room_projection() from public,anon,authenticated;
do $$ declare fn regprocedure; begin
  for fn in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'wordpairs_room_%' loop
    execute format('revoke all on function %s from public,anon,authenticated',fn);execute format('grant execute on function %s to service_role',fn);
  end loop;
end $$;
commit;
