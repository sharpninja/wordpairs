begin;
create schema wordpairs;
revoke all on schema wordpairs from public;

create table wordpairs.aggregates (
  kind text not null check (kind in ('room','match','profile','moderation')),
  id text not null,
  version integer not null check (version >= 0),
  state jsonb not null,
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  retention_room_kind text generated always as ('room') stored,
  retention_room_id text,
  primary key (kind,id),
  foreign key(retention_room_kind,retention_room_id) references wordpairs.aggregates(kind,id),
  check (state ? 'id' and state ? 'version' and state->>'id' is not null and state->>'version' is not null and state->>'id' = id and (state->>'version')::integer = version)
);
create function wordpairs.assign_retention_room() returns trigger language plpgsql as $$
begin
  if new.kind='room' then new.retention_room_id := new.id;
  elsif new.kind='match' then
    new.retention_room_id := new.state->>'roomId';
    if new.retention_room_id is null then raise exception 'Match requires retention room' using errcode='23514'; end if;
  elsif new.kind='moderation' then new.retention_room_id := new.state->>'sourceRoomId';
  else new.retention_room_id := null;
  end if;
  return new;
end $$;
create trigger assign_retention_room before insert or update on wordpairs.aggregates
  for each row execute function wordpairs.assign_retention_room();
create table wordpairs.profiles (
  id text primary key,
  identity_kind text not null check (identity_kind in ('guest','member')),
  issuer text,
  provider_subject text,
  alias text not null,
  icon text not null,
  public_leaderboard boolean not null,
  wins integer not null default 0 check (wins >= 0),
  points integer not null default 0 check (points >= 0),
  earliest_win_at timestamptz,
  unique(issuer,provider_subject),
  check ((identity_kind='guest' and issuer is null and provider_subject is null) or
         (identity_kind='member' and issuer is not null and provider_subject is not null))
);
create table wordpairs.rooms (
  id text primary key,
  capacity integer not null check (capacity between 2 and 25),
  status text not null check(status in ('waiting','countdown','playing','closed')),
  code_digest text not null unique,
  creator_id text not null references wordpairs.profiles(id),
  discoverable boolean not null default false,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create table wordpairs.room_members (
  room_id text not null references wordpairs.rooms(id),
  profile_id text not null references wordpairs.profiles(id),
  membership_kind text not null check(membership_kind in ('player','observer')),
  roster_position integer,
  ready boolean not null default false,
  joined_at timestamptz not null default now(),
  disconnected_at timestamptz,
  followed_player_id text references wordpairs.profiles(id),
  arrival_sequence bigint,
  primary key(room_id,profile_id),
  unique(room_id,roster_position) deferrable initially deferred,
  check ((membership_kind='player' and roster_position is not null and roster_position > 0 and followed_player_id is null and arrival_sequence is null) or
         (membership_kind='observer' and roster_position is null and not ready and followed_player_id is not null and arrival_sequence is not null and arrival_sequence >= 0))
);

-- Serialize membership writes on the same room row before checking capacity. Direct writes
-- remain server-only; this constraint is a database backstop to the application policy.
create function wordpairs.check_membership_capacity() returns trigger language plpgsql as $$
declare maximum integer; occupied integer; begin
  select capacity into maximum from wordpairs.rooms where id=new.room_id for update;
  select count(*) into occupied from wordpairs.room_members
    where room_id=new.room_id and membership_kind=new.membership_kind and profile_id<>new.profile_id;
  if occupied >= (case when new.membership_kind='player' then maximum else 25 end) then
    raise exception 'membership capacity exceeded' using errcode='23514';
  end if;
  if new.membership_kind='player' and new.roster_position > maximum then
    raise exception 'invalid roster position' using errcode='23514';
  end if;
  return new;
end $$;
create trigger membership_capacity before insert or update on wordpairs.room_members
  for each row execute function wordpairs.check_membership_capacity();

create table wordpairs.categories (
  id text primary key, name text not null, background_id text not null,
  approved boolean not null default false, version integer not null default 0
);
create table wordpairs.word_pairs (
  id text not null, category_id text not null references wordpairs.categories(id),
  prompt text not null check(length(trim(prompt))>0),
  target text not null check(length(trim(target))>0),
  hints text[] not null check(coalesce(array_ndims(hints)=1 and array_lower(hints,1)=1 and cardinality(hints)=3 and
    array_position(hints,null) is null and length(trim(hints[1]))>0 and length(trim(hints[2]))>0 and length(trim(hints[3]))>0,false)),
  approved boolean not null default false, version integer not null default 0,
  primary key(id,version)
);
create table wordpairs.accepted_answers (
  pair_id text not null, pair_version integer not null, answer text not null,
  primary key(pair_id,pair_version,answer), foreign key(pair_id,pair_version) references wordpairs.word_pairs(id,version)
);
create table wordpairs.matches (
  id text primary key, room_id text not null references wordpairs.rooms(id),
  anchor_id text not null references wordpairs.profiles(id), status text not null,
  started_at timestamptz not null default now()
);
create table wordpairs.match_players (
  match_id text not null references wordpairs.matches(id),
  profile_id text not null references wordpairs.profiles(id),
  roster_index integer not null check(roster_index between 1 and 25),
  primary key(match_id,profile_id), unique(match_id,roster_index)
);
create table wordpairs.rounds (
  id text primary key, match_id text not null references wordpairs.matches(id),
  pair_id text not null, pair_version integer not null,
  round_index integer not null check(round_index between 1 and 8),
  stage integer not null check(stage between 0 and 3),
  started_at timestamptz not null, stage_due_at timestamptz not null,
  revealed boolean not null default false, unique(match_id,round_index),
  foreign key(pair_id,pair_version) references wordpairs.word_pairs(id,version)
);
-- Content versions are append-only. A live round can never observe edited answers/hints.
create function wordpairs.reject_content_edit() returns trigger language plpgsql as $$
begin raise exception 'Content versions are immutable; insert a new version' using errcode='23514'; end $$;
create trigger immutable_pair before update or delete on wordpairs.word_pairs
  for each row execute function wordpairs.reject_content_edit();
create trigger immutable_accepted_answer before update or delete on wordpairs.accepted_answers
  for each row execute function wordpairs.reject_content_edit();
create function wordpairs.freeze_live_alternatives() returns trigger language plpgsql as $$
begin
  perform id from wordpairs.word_pairs where id=new.pair_id and version=new.pair_version for update;
  if exists(select 1 from wordpairs.rounds where pair_id=new.pair_id and pair_version=new.pair_version) then
    raise exception 'Live content alternatives are immutable' using errcode='23514';
  end if;
  return new;
end $$;
create trigger freeze_live_alternatives before insert on wordpairs.accepted_answers
  for each row execute function wordpairs.freeze_live_alternatives();
create function wordpairs.lock_round_content() returns trigger language plpgsql as $$
begin
  perform id from wordpairs.word_pairs where id=new.pair_id and version=new.pair_version for update;
  return new;
end $$;
create trigger lock_round_content before insert on wordpairs.rounds
  for each row execute function wordpairs.lock_round_content();
-- No raw answer/guess column: unsuccessful text may not be persisted.
create table wordpairs.submissions (
  round_id text not null references wordpairs.rounds(id),
  profile_id text not null references wordpairs.profiles(id), stage integer not null check(stage between 0 and 3),
  correct boolean not null, accepted_at timestamptz not null,
  points integer not null check(points in (0,1,2,3,5)), elapsed_ms integer not null check(elapsed_ms>=0),
  primary key(round_id,profile_id,stage)
);
create unique index one_solve_per_player_round on wordpairs.submissions(round_id,profile_id) where correct;
create table wordpairs.moderation_cases (
  id text primary key, proposer_id text not null references wordpairs.profiles(id),
  kind text not null check(kind in ('nomination','suggestion')), payload jsonb not null,
  status text not null check(status in ('collecting','pending','approved','rejected','appealed')),
  reviewer_id text references wordpairs.profiles(id), reason text,
  appealed boolean not null default false, appeal_resolved boolean not null default false,
  check (reviewer_id is null or reviewer_id<>proposer_id)
);
create unique index one_open_suggestion on wordpairs.moderation_cases(proposer_id)
  where kind='suggestion' and status in ('collecting','pending','appealed');
create table wordpairs.nominations (
  candidate_id text not null references wordpairs.moderation_cases(id),
  profile_id text not null references wordpairs.profiles(id),
  round_id text not null references wordpairs.rounds(id),
  primary key(candidate_id,profile_id), unique(profile_id,round_id)
);
create table wordpairs.profile_roles (
  profile_id text not null references wordpairs.profiles(id),
  role text not null check(role in ('moderator','senior-moderator')),
  primary key(profile_id,role)
);
create table wordpairs.sessions (
  token_digest text primary key, profile_id text not null references wordpairs.profiles(id), expires_at timestamptz not null
);
create table wordpairs.idempotency_records (
  aggregate_kind text not null, aggregate_id text not null,
  actor_id text not null, command_id text not null, request_digest text not null,
  transition jsonb not null, created_at timestamptz not null default now(),
  primary key(aggregate_kind,aggregate_id,actor_id,command_id),
  foreign key(aggregate_kind,aggregate_id) references wordpairs.aggregates(kind,id)
);
create table wordpairs.outbox_events (
  id text primary key, aggregate_kind text not null, aggregate_id text not null,
  aggregate_version integer not null, schema_version integer not null check(schema_version=1),
  event_type text not null, audience jsonb not null check(jsonb_typeof(audience)='array'),
  payload jsonb not null, created_at timestamptz not null default now(), published_at timestamptz,
  unique(aggregate_kind,aggregate_id,aggregate_version),
  foreign key(aggregate_kind,aggregate_id) references wordpairs.aggregates(kind,id)
);
create table wordpairs.deadline_jobs (
  id text primary key, aggregate_kind text not null, aggregate_id text not null,
  expected_version integer not null, kind text not null check(kind in ('idle','holdout','countdown','stage','reconnect','empty-room')),
  due_at timestamptz not null, completed_at timestamptz,
  foreign key(aggregate_kind,aggregate_id) references wordpairs.aggregates(kind,id)
);
create index due_deadlines on wordpairs.deadline_jobs(due_at) where completed_at is null;
create table wordpairs.audit_events (
  id text primary key, actor_id text not null, target_id text not null,
  action text not null, at timestamptz not null, details jsonb not null
);

-- The private schema is never exposed through PostgREST. RLS has no browser policies:
-- all public/actor reads will use explicit, allowlisted server projection functions.
do $$ declare relation record; begin
  for relation in select tablename from pg_tables where schemaname='wordpairs' loop
    execute format('alter table wordpairs.%I enable row level security',relation.tablename);
    execute format('revoke all on wordpairs.%I from public, anon, authenticated',relation.tablename);
  end loop;
end $$;

create function public.wordpairs_snapshot(p_kind text,p_id text,p_actor text,p_command text,p_digest text,p_version integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog,wordpairs as $$
declare previous wordpairs.idempotency_records; current wordpairs.aggregates; begin
  select * into previous from wordpairs.idempotency_records where aggregate_kind=p_kind and aggregate_id=p_id and actor_id=p_actor and command_id=p_command;
  if found then
    if previous.request_digest<>p_digest then return jsonb_build_object('status','error','code','IDEMPOTENCY_CONFLICT'); end if;
    return jsonb_build_object('status','replayed','transition',previous.transition);
  end if;
  select * into current from wordpairs.aggregates where kind=p_kind and id=p_id;
  if not found then return jsonb_build_object('status','error','code','NOT_FOUND'); end if;
  if current.version<>p_version then return jsonb_build_object('status','error','code','CONFLICT'); end if;
  return jsonb_build_object('status','loaded','state',current.state);
end $$;

create function public.wordpairs_commit(p_kind text,p_id text,p_actor text,p_command text,p_digest text,p_version integer,p_transition jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,wordpairs as $$
declare previous wordpairs.idempotency_records; current wordpairs.aggregates; event jsonb; job jsonb; audit jsonb; begin
  select * into current from wordpairs.aggregates where kind=p_kind and id=p_id for update;
  if not found then return jsonb_build_object('status','error','code','NOT_FOUND'); end if;
  select * into previous from wordpairs.idempotency_records where aggregate_kind=p_kind and aggregate_id=p_id and actor_id=p_actor and command_id=p_command;
  if found then
    if previous.request_digest<>p_digest then return jsonb_build_object('status','error','code','IDEMPOTENCY_CONFLICT'); end if;
    return jsonb_build_object('status','replayed','transition',previous.transition);
  end if;
  if current.version<>p_version then return jsonb_build_object('status','error','code','CONFLICT'); end if;
  if p_transition->'state'->>'id' is distinct from p_id or
     (p_transition->'state'->>'version')::integer is distinct from p_version+1 or
     jsonb_typeof(p_transition->'events') is distinct from 'array' or
     jsonb_typeof(p_transition->'deadlines') is distinct from 'array' or
     jsonb_typeof(p_transition->'audits') is distinct from 'array' or
     not (p_transition ? 'result') or
     jsonb_array_length(p_transition->'events') is distinct from 1 then
    return jsonb_build_object('status','error','code','VALIDATION_ERROR');
  end if;
  update wordpairs.aggregates set state=p_transition->'state',version=p_version+1,updated_at=now(),
    closed_at=case when p_transition->'state'->>'status'='closed' then coalesce(closed_at,now()) else closed_at end
    where kind=p_kind and id=p_id;
  for event in select value from jsonb_array_elements(p_transition->'events') loop
    if event->>'aggregateId' is distinct from p_id or event->>'aggregateType' is distinct from p_kind or
       (event->>'version')::integer is distinct from p_version+1 then raise exception 'invalid event scope' using errcode='23514'; end if;
    insert into wordpairs.outbox_events(id,aggregate_kind,aggregate_id,aggregate_version,schema_version,event_type,audience,payload)
      values(event->>'id',p_kind,p_id,p_version+1,(event->>'schemaVersion')::integer,event->>'type',event->'audience',event->'payload');
  end loop;
  for job in select value from jsonb_array_elements(p_transition->'deadlines') loop
    if job->>'aggregateId' is distinct from p_id or (job->>'expectedVersion')::integer is distinct from p_version+1 then
      raise exception 'invalid deadline scope' using errcode='23514';
    end if;
    insert into wordpairs.deadline_jobs(id,aggregate_kind,aggregate_id,expected_version,kind,due_at)
      values(job->>'id',p_kind,p_id,p_version+1,job->>'kind',to_timestamp((job->>'dueAt')::double precision/1000));
  end loop;
  for audit in select value from jsonb_array_elements(p_transition->'audits') loop
    if audit->>'actorId' is distinct from p_actor or audit->>'targetId' is distinct from p_id then
      raise exception 'invalid audit scope' using errcode='23514';
    end if;
    insert into wordpairs.audit_events(id,actor_id,target_id,action,at,details)
      values(audit->>'id',p_actor,p_id,audit->>'action',to_timestamp((audit->>'at')::double precision/1000),audit->'details');
  end loop;
  insert into wordpairs.idempotency_records(aggregate_kind,aggregate_id,actor_id,command_id,request_digest,transition)
    values(p_kind,p_id,p_actor,p_command,p_digest,p_transition);
  return jsonb_build_object('status','committed','transition',p_transition);
end $$;

create function wordpairs.prune_retained_data(p_now timestamptz) returns void language plpgsql as $$
begin
  delete from wordpairs.audit_events where at < p_now-interval '1 year';
  delete from wordpairs.outbox_events where published_at < p_now-interval '7 days';
  delete from wordpairs.idempotency_records i using wordpairs.aggregates a
    left join wordpairs.aggregates room on room.kind='room' and room.id=a.retention_room_id
    where a.kind=i.aggregate_kind and a.id=i.aggregate_id and
      ((room.closed_at < p_now-interval '30 days') or
       (a.retention_room_id is null and a.kind in ('profile','moderation') and i.created_at < p_now-interval '30 days'));
  delete from wordpairs.sessions where expires_at < p_now;
end $$;

revoke all on all functions in schema wordpairs from public,anon,authenticated;
revoke all on function public.wordpairs_snapshot(text,text,text,text,text,integer) from public,anon,authenticated;
revoke all on function public.wordpairs_commit(text,text,text,text,text,integer,jsonb) from public,anon,authenticated;
grant execute on function public.wordpairs_snapshot(text,text,text,text,text,integer) to service_role;
grant execute on function public.wordpairs_commit(text,text,text,text,text,integer,jsonb) to service_role;
grant usage on schema wordpairs to service_role;
grant select,update on wordpairs.aggregates to service_role;
create policy server_aggregate_access on wordpairs.aggregates to service_role using(true) with check(true);
commit;
