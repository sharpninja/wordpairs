begin;
create table wordpairs.guest_credentials(credential_hash text primary key,profile_id text not null unique references wordpairs.profiles(id));
create index sessions_expiry on wordpairs.sessions(expires_at);
create table wordpairs.login_challenges(key_hash text primary key,payload jsonb not null,expires_at timestamptz not null);
alter table wordpairs.guest_credentials enable row level security;
alter table wordpairs.sessions enable row level security;
alter table wordpairs.profile_roles enable row level security;
alter table wordpairs.login_challenges enable row level security;

create function wordpairs.establish_profile(p_profile jsonb,p_issuer text,p_subject text) returns void language plpgsql security definer set search_path=pg_catalog,wordpairs as $$
declare profile_id text := p_profile->>'id'; begin
  insert into wordpairs.profiles(id,identity_kind,issuer,provider_subject,alias,icon,public_leaderboard)
    values(profile_id,p_profile->>'kind',p_issuer,p_subject,p_profile->>'alias',p_profile->>'icon',(p_profile->>'publicLeaderboard')::boolean);
  insert into wordpairs.aggregates(kind,id,version,state) values('profile',profile_id,0,p_profile);
  insert into wordpairs.outbox_events(id,aggregate_kind,aggregate_id,aggregate_version,event_type,schema_version,audience,payload)
    values('profile-created-'||profile_id,'profile',profile_id,0,'ProfileEstablished',1,jsonb_build_array(profile_id),jsonb_build_object('profileId',profile_id));
end $$;

create function public.wordpairs_identity_guest(p_credential text,p_profile jsonb,p_session text,p_now bigint) returns jsonb
language plpgsql security definer set search_path=pg_catalog,wordpairs as $$
declare profile_id text; result jsonb; begin
  perform pg_advisory_xact_lock(hashtextextended('guest:'||p_credential,0));
  select g.profile_id into profile_id from wordpairs.guest_credentials g where credential_hash=p_credential;
  if profile_id is null then
    if p_profile->>'kind'<>'guest' or p_profile->>'providerSubject' is not null then raise exception 'Invalid identity' using errcode='22023'; end if;
    perform wordpairs.establish_profile(p_profile,null,null);
    profile_id := p_profile->>'id';
    insert into wordpairs.guest_credentials values(p_credential,profile_id);
  end if;
  select state into result from wordpairs.aggregates where kind='profile' and id=profile_id;
  delete from wordpairs.sessions where expires_at<=to_timestamp(p_now/1000.0);
  insert into wordpairs.sessions values(p_session,profile_id,to_timestamp(p_now/1000.0)+interval '30 days');
  return result;
end $$;
create function public.wordpairs_identity_member(p_issuer text,p_subject text,p_profile jsonb,p_session text,p_now bigint) returns jsonb
language plpgsql security definer set search_path=pg_catalog,wordpairs as $$
declare profile_id text; result jsonb; begin
  perform pg_advisory_xact_lock(hashtextextended('member:'||p_issuer||':'||p_subject,0));
  select id into profile_id from wordpairs.profiles where issuer=p_issuer and provider_subject=p_subject;
  if profile_id is null then
    if p_profile->>'kind'<>'member' or p_profile->>'providerSubject' is distinct from p_subject then raise exception 'Invalid identity' using errcode='22023'; end if;
    perform wordpairs.establish_profile(p_profile,p_issuer,p_subject);
    profile_id := p_profile->>'id';
  end if;
  select state into result from wordpairs.aggregates where kind='profile' and id=profile_id;
  delete from wordpairs.sessions where expires_at<=to_timestamp(p_now/1000.0);
  insert into wordpairs.sessions values(p_session,profile_id,to_timestamp(p_now/1000.0)+interval '1 day');
  return result;
end $$;
create function public.wordpairs_identity_session(p_hash text,p_now bigint) returns jsonb
language sql stable security definer set search_path=pg_catalog,wordpairs as $$
  select jsonb_build_object('profile',a.state,'actor',jsonb_build_object('profileId',a.id,'roles',(select '["player"]'::jsonb || coalesce(jsonb_agg(role order by role),'[]'::jsonb) from wordpairs.profile_roles where profile_id=a.id)))
  from wordpairs.sessions s join wordpairs.aggregates a on a.kind='profile' and a.id=s.profile_id
  where s.token_digest=p_hash and s.expires_at>to_timestamp(p_now/1000.0)
$$;
create function public.wordpairs_identity_revoke(p_hash text) returns boolean
language plpgsql security definer set search_path=pg_catalog,wordpairs as $$
begin delete from wordpairs.sessions where token_digest=p_hash; return true; end $$;
create function public.wordpairs_identity_save_challenge(p_key text,p_payload jsonb,p_due bigint) returns boolean
language plpgsql security definer set search_path=pg_catalog,wordpairs as $$
begin
  delete from wordpairs.login_challenges where expires_at<=to_timestamp(p_due/1000.0)-interval '10 minutes';
  insert into wordpairs.login_challenges values(p_key,p_payload,to_timestamp(p_due/1000.0)); return true;
end $$;
create function public.wordpairs_identity_take_challenge(p_key text,p_now bigint) returns jsonb
language plpgsql security definer set search_path=pg_catalog,wordpairs as $$
declare result jsonb; expiry timestamptz; begin
  delete from wordpairs.login_challenges where key_hash=p_key returning payload,expires_at into result,expiry;
  return case when expiry>to_timestamp(p_now/1000.0) then result else null end;
end $$;

-- Canonical aggregate command commit updates the ranking/profile relation atomically.
create function wordpairs.sync_profile_projection() returns trigger language plpgsql security definer set search_path=pg_catalog,wordpairs as $$
begin
  if new.kind='profile' then
    update wordpairs.profiles set alias=new.state->>'alias',icon=new.state->>'icon',public_leaderboard=(new.state->>'publicLeaderboard')::boolean,
      wins=(new.state->>'wins')::integer,points=(new.state->>'points')::integer,earliest_win_at=to_timestamp((new.state->>'earliestWinAt')::double precision/1000)
      where id=new.id;
  end if;
  return new;
end $$;
create trigger sync_profile_projection after insert or update on wordpairs.aggregates for each row execute function wordpairs.sync_profile_projection();
revoke all on function wordpairs.establish_profile(jsonb,text,text) from public,anon,authenticated;
revoke all on function wordpairs.sync_profile_projection() from public,anon,authenticated;
do $$ declare fn regprocedure; begin
  for fn in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'wordpairs_identity_%' loop
    execute format('revoke all on function %s from public,anon,authenticated',fn);
    execute format('grant execute on function %s to service_role',fn);
  end loop;
end $$;
commit;
