begin;
create index public_ranking_order on wordpairs.profiles(wins desc,points desc,earliest_win_at,id) where public_leaderboard;
create index public_room_order on wordpairs.rooms(created_at,id) where discoverable and status='waiting';

create table wordpairs.public_revisions(kind text primary key,version bigint not null default 0 check(version between 0 and 9007199254740991));
alter table wordpairs.public_revisions enable row level security;
insert into wordpairs.public_revisions(kind) values ('leaderboard'),('lobbies');
create function wordpairs.bump_public_revision() returns trigger language plpgsql security definer set search_path=pg_catalog,wordpairs as $$
begin update wordpairs.public_revisions set version=version+1 where kind=tg_argv[0]; return null; end $$;
revoke all on function wordpairs.bump_public_revision() from public,anon,authenticated;
create trigger public_profiles_changed after insert or update or delete on wordpairs.profiles for each statement execute function wordpairs.bump_public_revision('leaderboard');
create trigger public_rooms_changed after insert or update or delete on wordpairs.rooms for each statement execute function wordpairs.bump_public_revision('lobbies');
create trigger public_members_changed after insert or update or delete on wordpairs.room_members for each statement execute function wordpairs.bump_public_revision('lobbies');

-- STABLE: revision and page rows share the caller's statement snapshot.
create function public.wordpairs_public_profiles(p_offset integer,p_limit integer,p_revision bigint) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,wordpairs as $$
declare result jsonb; revision bigint; more boolean; begin
  if p_offset not between 0 and 1000000 or p_limit not between 1 and 25 or p_offset is null or p_limit is null then raise exception 'Invalid page' using errcode='22023'; end if;
  select version into revision from wordpairs.public_revisions where kind='leaderboard';
  if p_revision is not null and p_revision<>revision then return jsonb_build_object('conflict',true); end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'alias',alias,'publicLeaderboard',true,'wins',wins,'points',points,'earliestWinAt',extract(epoch from earliest_win_at)*1000) order by wins desc,points desc,earliest_win_at nulls last,id collate "C"),'[]'::jsonb) into result
    from (select id,alias,wins,points,earliest_win_at from wordpairs.profiles where public_leaderboard
          order by wins desc,points desc,earliest_win_at nulls last,id collate "C" offset p_offset limit p_limit+1) ranked;
  more := jsonb_array_length(result)>p_limit;
  if more then result := result-p_limit; end if;
  return jsonb_build_object('rows',result,'revision',revision,'nextOffset',case when more and p_offset+p_limit<=1000000 then p_offset+p_limit else null end);
end $$;
create function public.wordpairs_public_rooms(p_offset integer,p_limit integer,p_revision bigint) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,wordpairs as $$
declare result jsonb; revision bigint; more boolean; begin
  if p_offset not between 0 and 1000000 or p_limit not between 1 and 25 or p_offset is null or p_limit is null then raise exception 'Invalid page' using errcode='22023'; end if;
  select version into revision from wordpairs.public_revisions where kind='lobbies';
  if p_revision is not null and p_revision<>revision then return jsonb_build_object('conflict',true); end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'capacity',capacity,'status','waiting','discoverable',true,'createdAt',extract(epoch from created_at)*1000,'playerCount',player_count) order by created_at,id collate "C"),'[]'::jsonb) into result
    from (select r.id,r.capacity,r.created_at,count(m.profile_id) as player_count from wordpairs.rooms r
          left join wordpairs.room_members m on m.room_id=r.id and m.membership_kind='player'
          where r.discoverable and r.status='waiting' group by r.id having count(m.profile_id)<r.capacity
          order by r.created_at,r.id collate "C" offset p_offset limit p_limit+1) available;
  more := jsonb_array_length(result)>p_limit;
  if more then result := result-p_limit; end if;
  return jsonb_build_object('rows',result,'revision',revision,'nextOffset',case when more and p_offset+p_limit<=1000000 then p_offset+p_limit else null end);
end $$;
revoke all on function public.wordpairs_public_profiles(integer,integer,bigint) from public,anon,authenticated;
revoke all on function public.wordpairs_public_rooms(integer,integer,bigint) from public,anon,authenticated;
grant execute on function public.wordpairs_public_profiles(integer,integer,bigint) to service_role;
grant execute on function public.wordpairs_public_rooms(integer,integer,bigint) to service_role;
commit;
