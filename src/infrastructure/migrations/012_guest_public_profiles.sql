begin;
-- Hide every account identity, including legacy rows with a saved public flag.
-- Filter before ordering/paging so hidden members cannot consume public slots.
create or replace function public.wordpairs_public_profiles(p_offset integer,p_limit integer,p_revision bigint) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,wordpairs as $$
declare result jsonb; revision bigint; more boolean; begin
  if p_offset not between 0 and 1000000 or p_limit not between 1 and 25 or p_offset is null or p_limit is null then raise exception 'Invalid page' using errcode='22023'; end if;
  select version into revision from wordpairs.public_revisions where kind='leaderboard';
  if p_revision is not null and p_revision<>revision then return jsonb_build_object('conflict',true); end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'alias',alias,'publicLeaderboard',true,'wins',wins,'points',points,'earliestWinAt',extract(epoch from earliest_win_at)*1000) order by wins desc,points desc,earliest_win_at nulls last,id collate "C"),'[]'::jsonb) into result
    from (select id,alias,wins,points,earliest_win_at from wordpairs.profiles where public_leaderboard and identity_kind='guest'
          order by wins desc,points desc,earliest_win_at nulls last,id collate "C" offset p_offset limit p_limit+1) ranked;
  more := jsonb_array_length(result)>p_limit;
  if more then result := result-p_limit; end if;
  return jsonb_build_object('rows',result,'revision',revision,'nextOffset',case when more and p_offset+p_limit<=1000000 then p_offset+p_limit else null end);
end $$;
-- Invalidate cursors and caches that refer to the former account-inclusive view.
update wordpairs.public_revisions set version=version+1 where kind='leaderboard';
commit;
