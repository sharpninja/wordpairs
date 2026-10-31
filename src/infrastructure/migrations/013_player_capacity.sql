begin;

-- New games support at most15 players. Do not add a CHECK that would reject
-- unrelated updates to an existing capacity25 room during leave or completion.
-- Historical capacities may stay unchanged or shrink; they may never increase
-- above the new limit. The application also caps new admissions at15.
create function wordpairs.enforce_new_room_player_limit()
returns trigger language plpgsql set search_path=pg_catalog,wordpairs as $$
begin
  if new.capacity>15 then
    if tg_op='INSERT' then
      raise exception 'new room player capacity exceeds15' using errcode='23514';
    elsif new.capacity>old.capacity then
      raise exception 'room player capacity cannot increase above15' using errcode='23514';
    end if;
  end if;
  return new;
end $$;
create trigger new_room_player_limit before insert or update of capacity
  on wordpairs.rooms for each row
  execute function wordpairs.enforce_new_room_player_limit();

-- Existing match aggregates, frozen rosters, answer replays and final awards
-- keep working. Only creation of an oversized new match is prohibited.
create function wordpairs.enforce_new_match_player_limit()
returns trigger language plpgsql set search_path=pg_catalog,wordpairs as $$
begin
  if new.kind='match' and jsonb_array_length(new.state->'roster')>15 then
    raise exception 'new match roster exceeds15 players' using errcode='23514';
  end if;
  return new;
end $$;
create trigger new_match_player_limit before insert on wordpairs.aggregates
  for each row execute function wordpairs.enforce_new_match_player_limit();

revoke all on function wordpairs.enforce_new_room_player_limit()
  from public,anon,authenticated;
revoke all on function wordpairs.enforce_new_match_player_limit()
  from public,anon,authenticated;

-- Filter at the database page/assignment boundary too: an old capacity25 room
-- with15 players is full and must not hide an actually joinable room behind it.
create or replace function public.wordpairs_public_rooms(p_offset integer,p_limit integer,p_revision bigint) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,wordpairs as $$
declare result jsonb; revision bigint; more boolean; begin
  if p_offset not between 0 and 1000000 or p_limit not between 1 and 25 or p_offset is null or p_limit is null then raise exception 'Invalid page' using errcode='22023'; end if;
  select version into revision from wordpairs.public_revisions where kind='lobbies';
  if p_revision is not null and p_revision<>revision then return jsonb_build_object('conflict',true); end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'capacity',capacity,'status','waiting','discoverable',true,'createdAt',extract(epoch from created_at)*1000,'playerCount',player_count) order by created_at,id collate "C"),'[]'::jsonb) into result
    from (select r.id,least(r.capacity,15) as capacity,r.created_at,count(m.profile_id) as player_count from wordpairs.rooms r
          left join wordpairs.room_members m on m.room_id=r.id and m.membership_kind='player'
          where r.discoverable and r.status='waiting' group by r.id having count(m.profile_id)<least(r.capacity,15)
          order by r.created_at,r.id collate "C" offset p_offset limit p_limit+1) available;
  more:=jsonb_array_length(result)>p_limit;
  if more then result:=result-p_limit; end if;
  return jsonb_build_object('rows',result,'revision',revision,'nextOffset',case when more and p_offset+p_limit<=1000000 then p_offset+p_limit else null end);
end $$;

create or replace function public.wordpairs_room_discover(p_limit integer,p_after text) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,wordpairs as $$
declare result jsonb; after_time timestamptz; begin
  if p_limit is null or p_limit not between 1 and 25 then raise exception 'Invalid page' using errcode='22023'; end if;
  if p_after is not null then select created_at into after_time from wordpairs.rooms where id=p_after; if after_time is null then raise exception 'Invalid page' using errcode='22023'; end if; end if;
  select coalesce(jsonb_agg(state order by created_at,id collate "C"),'[]'::jsonb) into result from (
    select a.state,r.id,r.created_at from wordpairs.rooms r join wordpairs.aggregates a on a.kind='room' and a.id=r.id
      where r.discoverable and r.status='waiting' and (select count(*) from wordpairs.room_members m where m.room_id=r.id and m.membership_kind='player')<least(r.capacity,15)
        and (p_after is null or (r.created_at,r.id collate "C")>(after_time,p_after collate "C")) order by r.created_at,r.id collate "C" limit p_limit
  ) available;return result;
end $$;

create or replace function public.wordpairs_room_assignment(p_actor text,p_command text,p_digest text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,wordpairs as $$
declare prior wordpairs.quick_assignments; selected_room text; selected_version integer; begin
  perform pg_advisory_xact_lock(hashtextextended('quick-admission',0));
  select * into prior from wordpairs.quick_assignments where actor_id=p_actor and command_id=p_command;
  if found then
    if prior.request_digest<>p_digest then return jsonb_build_object('ok',false,'error',jsonb_build_object('code','IDEMPOTENCY_CONFLICT')); end if;
    selected_room:=prior.room_id;selected_version:=prior.expected_version;
  else
    select a.id,a.version into selected_room,selected_version from wordpairs.aggregates a
      where a.kind='room' and a.state->>'status'='waiting' and (a.state->>'discoverable')::boolean
        and jsonb_array_length(a.state->'players')<least((a.state->>'capacity')::integer,15)
        and not exists(select 1 from jsonb_array_elements((a.state->'players')||(a.state->'observers')) m where m->>'profileId'=p_actor)
      order by (a.state->>'createdAt')::bigint,a.id collate "C" limit 1 for update;
    insert into wordpairs.quick_assignments values(p_actor,p_command,p_digest,selected_room,selected_version);
  end if;
  return jsonb_build_object('ok',true,'value',case when selected_room is null then null else jsonb_build_object('roomId',selected_room,'expectedVersion',selected_version) end);
end $$;
commit;
