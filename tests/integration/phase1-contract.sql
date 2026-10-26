\set ON_ERROR_STOP on
-- Local disposable database evidence only (TR-31); this does not count as AC coverage.
do $$ begin
  if (select count(*) from pg_tables where schemaname = 'wordpairs' and not rowsecurity) <> 0 then
    raise exception 'Every private table must have RLS enabled';
  end if;
  if has_table_privilege('anon', 'wordpairs.aggregates', 'select') or
     has_table_privilege('authenticated', 'wordpairs.aggregates', 'select') then
    raise exception 'Untrusted roles have direct table access';
  end if;
  if has_function_privilege('anon', 'public.wordpairs_snapshot(text,text,text,text,text,integer)', 'execute') then
    raise exception 'Anonymous role can execute private RPC';
  end if;
end $$;

insert into wordpairs.aggregates(kind,id,version,state) values
 ('room','r1',4,'{"id":"r1","version":4,"count":0}');

do $$ declare r jsonb; begin
  r := public.wordpairs_snapshot('room','r1','p1','c1','digest',4);
  if r->>'status' <> 'loaded' then raise exception 'Snapshot failed: %',r; end if;
  r := public.wordpairs_commit('room','r1','p1','c1','digest',4,
    '{"state":{"id":"r1","version":5,"count":1},"result":{"status":"changed"},"events":[{"id":"e1","aggregateType":"room","schemaVersion":1,"aggregateId":"r1","version":5,"type":"changed","audience":["p1"],"payload":{}}],"deadlines":[],"audits":[]}');
  if r->>'status' <> 'committed' then raise exception 'Commit failed: %',r; end if;
  if (select count(*) from wordpairs.outbox_events where id='e1') <> 1 then raise exception 'Outbox missing'; end if;
  r := public.wordpairs_snapshot('room','r1','p1','c1','digest',4);
  if r->>'status' <> 'replayed' or r->'transition'->'result'->>'status' <> 'changed' then raise exception 'Canonical retry failed: %',r; end if;
  r := public.wordpairs_snapshot('room','r1','p1','c1','different',4);
  if r->>'code' <> 'IDEMPOTENCY_CONFLICT' then raise exception 'Changed payload allowed: %',r; end if;
  r := public.wordpairs_snapshot('room','r1','p2','c2','digest',4);
  if r->>'code' <> 'CONFLICT' then raise exception 'Stale version allowed: %',r; end if;
end $$;

-- Induce a constraint failure after the aggregate write and verify statement rollback.
do $$ declare failed boolean := false; begin
  begin
    perform public.wordpairs_commit('room','r1','p1','c-fault','fault',5,
      '{"state":{"id":"r1","version":6,"count":2},"result":"changed","events":[{"id":"e1","aggregateType":"room","schemaVersion":1,"aggregateId":"r1","version":6,"type":"changed","audience":["p1"],"payload":{}}],"deadlines":[],"audits":[]}');
  exception when unique_violation then failed := true;
  end;
  if not failed then raise exception 'Fault injection did not fail'; end if;
  if (select version from wordpairs.aggregates where id='r1') <> 5 then raise exception 'Failed transaction mutated state'; end if;
  if exists(select 1 from wordpairs.idempotency_records where command_id='c-fault') then raise exception 'Failed transaction retained result'; end if;
  if (select count(*) from wordpairs.outbox_events) <> 1 then raise exception 'Failed transaction retained event'; end if;
end $$;

-- Retention is independent of event delivery and room activity.
insert into wordpairs.categories(id,name,background_id,approved) values('test-category','Test category','test-background',true);
do $$ declare variant jsonb; hints text[]; rejected integer := 0; begin
  for variant in select value from jsonb_array_elements('[[],[null,"two","three"],["one","two"],["one","two","three","four"],[" ","two","three"]]'::jsonb) loop
    select coalesce(array_agg(value),'{}'::text[]) into hints from jsonb_array_elements_text(variant);
    begin
      insert into wordpairs.word_pairs(id,category_id,prompt,target,hints,approved) values('invalid','test-category','prompt','answer',hints,true);
    exception when check_violation then rejected := rejected+1;
    end;
  end loop;
  if rejected<>5 then raise exception 'Invalid hint arrays accepted: % rejected',rejected; end if;
end $$;

insert into wordpairs.aggregates(kind,id,version,state,closed_at) values
('room','old-closed',0,'{"id":"old-closed","version":0}','2026-09-20T00:00:00Z');
insert into wordpairs.aggregates(kind,id,version,state,closed_at) values
('room','boundary-closed',0,'{"id":"boundary-closed","version":0}','2026-09-26T00:00:00Z');
insert into wordpairs.aggregates(kind,id,version,state) values
('match','finished-old-match',0,'{"id":"finished-old-match","version":0,"roomId":"old-closed","status":"finished"}'),
('match','boundary-match',0,'{"id":"boundary-match","version":0,"roomId":"boundary-closed","status":"finished"}'),
('profile','retention-profile',0,'{"id":"retention-profile","version":0}');
insert into wordpairs.idempotency_records(aggregate_kind,aggregate_id,actor_id,command_id,request_digest,transition)
values ('room','old-closed','p1','old-command','digest','{}');
insert into wordpairs.idempotency_records(aggregate_kind,aggregate_id,actor_id,command_id,request_digest,transition,created_at) values
('match','finished-old-match','p1','expired-match-command','digest','{}','2026-09-20T00:00:00Z'),
('match','boundary-match','p1','boundary-match-command','digest','{}','2026-09-01T00:00:00Z'),
('profile','retention-profile','p1','old-profile-command','digest','{}','2026-09-20T00:00:00Z'),
('profile','retention-profile','p1','recent-profile-command','digest','{}','2026-10-25T00:00:00Z');
insert into wordpairs.outbox_events(id,aggregate_kind,aggregate_id,aggregate_version,schema_version,event_type,audience,payload,published_at) values
('old-published','room','old-closed',0,1,'test','[]','{}','2026-10-01T00:00:00Z'),
('old-unpublished','room','old-closed',1,1,'test','[]','{}',null);
insert into wordpairs.audit_events(id,actor_id,target_id,action,at,details) values
('old-audit','p1','r1','test','2025-10-25T00:00:00Z','{}'),
('recent-audit','p1','r1','test','2026-10-25T00:00:00Z','{}');
select wordpairs.prune_retained_data('2026-10-26T00:00:00Z');
do $$ begin
  if exists(select 1 from wordpairs.audit_events where id='old-audit') or
     exists(select 1 from wordpairs.idempotency_records where command_id='old-command') or
     exists(select 1 from wordpairs.outbox_events where id='old-published') then raise exception 'Expired records retained'; end if;
  if not exists(select 1 from wordpairs.audit_events where id='recent-audit') or
     not exists(select 1 from wordpairs.idempotency_records where command_id='c1') or
     not exists(select 1 from wordpairs.outbox_events where id='old-unpublished') then raise exception 'Live records removed'; end if;
  if exists(select 1 from wordpairs.idempotency_records where command_id in ('expired-match-command','old-profile-command')) then raise exception 'Room-linked or non-room retention expired incorrectly'; end if;
  if not exists(select 1 from wordpairs.idempotency_records where command_id='boundary-match-command') or
     not exists(select 1 from wordpairs.idempotency_records where command_id='recent-profile-command') then raise exception '30-day retention boundary shortened'; end if;
end $$;

select 'Phase 1 transaction/RLS/idempotency/rollback/retention checks passed' as result;
