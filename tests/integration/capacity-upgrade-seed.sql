-- Disposable test fixture only. The harness runs this before migration013 so
-- upgrade assertions exercise actual historical rows, not disabled safeguards.
insert into wordpairs.profiles(id,identity_kind,alias,icon,public_leaderboard)
select 'cap15-upgrade-player-'||n,'guest','Capacity Upgrade '||n,'owl',false
from generate_series(1,26) n;

do $$
declare members jsonb; roster jsonb; state jsonb; room_id text; phase text; selected_members jsonb; legacy_capacity integer;
begin
  foreach legacy_capacity in array array[11,15,25] loop
  select jsonb_agg(jsonb_build_object('profileId','cap15-upgrade-player-'||n,
    'ready',true,'joinedAt',0,'disconnectedAt',null,'lastSeenAt',0) order by n),
    jsonb_agg('cap15-upgrade-player-'||n order by n)
  into members,roster from generate_series(1,legacy_capacity) n;
  foreach phase in array array['waiting','playing','full','partial'] loop
    if legacy_capacity<>25 and phase in('full','partial') then continue; end if;
    room_id:=case when legacy_capacity=25 then 'cap15-upgrade-'||phase else 'cap10-upgrade-'||phase||'-'||legacy_capacity end;
    select jsonb_agg(value order by ordinality) into selected_members
      from jsonb_array_elements(members) with ordinality
      where ordinality <= case phase when 'full' then 10 when 'partial' then 9 else legacy_capacity end;
    insert into wordpairs.rooms(id,capacity,status,code_digest,creator_id)
      values(room_id,legacy_capacity,case when phase='playing' then 'playing' else 'waiting' end,room_id,'cap15-upgrade-player-1');
    state:=jsonb_build_object('id',room_id,'version',0,'code','ABCDEFGH',
      'creatorId','cap15-upgrade-player-1','capacity',legacy_capacity,'discoverable',false,
      'status',case when phase='playing' then 'playing' else 'waiting' end,'createdAt',0,'changedAt',0,'closedAt',null,
      'players',selected_members,'observers','[]'::jsonb,'lockedRoster','[]'::jsonb,
      'nextObserverSequence',0,'idlePromptedVersion',null,'holdoutId',null,
      'holdoutDueAt',null,'countdownDueAt',null);
    if phase='playing' then
      state:=state||jsonb_build_object('lockedRoster',roster,'startedRoster',roster,'startedAt',0);
    end if;
    insert into wordpairs.aggregates(kind,id,version,state) values('room',room_id,0,state);
    if phase='playing' then
      insert into wordpairs.aggregates(kind,id,version,state)
      values('match',room_id,0,jsonb_build_object('id',room_id,'roomId',room_id,
        'version',0,'roster',roster,'anchorId','cap15-upgrade-player-1',
        'chooserId','cap15-upgrade-player-1','status','choosing','rounds','[]'::jsonb,
        'usedPairIds','[]'::jsonb,'autoCategoryId',null,'startedAt',0,'finishedAt',null));
    end if;
  end loop;
  end loop;
end $$;
