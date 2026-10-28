begin;
alter table wordpairs.profile_roles drop constraint profile_roles_role_check;
alter table wordpairs.profile_roles add constraint profile_roles_role_check
  check(role in ('moderator','senior-moderator','admin'));

create table wordpairs.access_state(
  singleton boolean primary key default true check(singleton),
  version integer not null default 0 check(version>=0)
);
insert into wordpairs.access_state values(true,0);
create table wordpairs.access_commands(
  actor_id text not null references wordpairs.profiles(id),
  command_id text not null, digest text not null, result jsonb not null,
  created_at timestamptz not null default now(), primary key(actor_id,command_id)
);
create table wordpairs.access_audit(
  id bigserial primary key, actor_id text not null references wordpairs.profiles(id),
  profile_id text not null references wordpairs.profiles(id), role text not null,
  granted boolean not null, reason text not null, at timestamptz not null default now()
);
alter table wordpairs.access_state enable row level security;
alter table wordpairs.access_commands enable row level security;
alter table wordpairs.access_audit enable row level security;
revoke all on wordpairs.access_state,wordpairs.access_commands,wordpairs.access_audit from public,anon,authenticated,service_role;

create function public.wordpairs_access_read(p_actor text,p_admins text[],p_search text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,wordpairs as $$
declare users jsonb; history jsonb; total integer; begin
  perform pg_advisory_xact_lock_shared(hashtextextended('wordpairs-acl',0));
  -- This statement authorizes the directory read, independent of a prior session read.
  if not exists(select 1 from wordpairs.profiles where id=p_actor) or not (
    p_actor=any(coalesce(p_admins,'{}'::text[])) or
    exists(select 1 from wordpairs.profile_roles where profile_id=p_actor and role='admin')
  ) then return jsonb_build_object('ok',false,'error',jsonb_build_object('code','NOT_AUTHORIZED'));end if;
  if p_search is null or length(p_search)>80 then
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code','VALIDATION_ERROR'));end if;
  select count(*) into total from wordpairs.profiles p
    where position(lower(p_search) in lower(p.alias))>0 or position(lower(p_search) in lower(p.id))>0;
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'alias',p.alias,'kind',p.identity_kind,
    'configuredAdmin',p.id=any(coalesce(p_admins,'{}'::text[])),
    'roles','["player"]'::jsonb || coalesce((select jsonb_agg(role order by role) from wordpairs.profile_roles where profile_id=p.id),'[]'::jsonb) ||
      case when p.id=any(coalesce(p_admins,'{}'::text[])) and not exists(select 1 from wordpairs.profile_roles where profile_id=p.id and role='admin') then '["admin"]'::jsonb else '[]'::jsonb end
    ) order by p.alias,p.id),'[]'::jsonb) into users from (
      select * from wordpairs.profiles where position(lower(p_search) in lower(alias))>0 or position(lower(p_search) in lower(id))>0
      order by alias,id limit 100
    ) p;
  select coalesce(jsonb_agg(jsonb_build_object('id',a.id::text,'actorId',a.actor_id,'profileId',a.profile_id,'role',a.role,'granted',a.granted,'reason',a.reason,'at',floor(extract(epoch from a.at)*1000)::bigint) order by a.id desc),'[]'::jsonb)
    into history from (select * from wordpairs.access_audit order by id desc limit 50) a;
  return jsonb_build_object('ok',true,'value',jsonb_build_object('actorId',p_actor,'version',(select version from wordpairs.access_state),'users',users,'total',total,'audit',history));
end $$;

create function public.wordpairs_access_change(p_actor text,p_admins text[],p_command text,p_digest text,p_version integer,p_target text,p_role text,p_grant boolean,p_reason text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,wordpairs as $$
declare prior wordpairs.access_commands%rowtype; current_version integer; result jsonb; begin
  perform pg_advisory_xact_lock(hashtextextended('wordpairs-acl',0));
  if not exists(select 1 from wordpairs.profiles where id=p_actor) or not (
    p_actor=any(coalesce(p_admins,'{}'::text[])) or
    exists(select 1 from wordpairs.profile_roles where profile_id=p_actor and role='admin')
  ) then return jsonb_build_object('ok',false,'error',jsonb_build_object('code','NOT_AUTHORIZED'));end if;
  if p_command is null or p_command !~ '^[A-Za-z0-9_-]{1,128}$' or
    p_digest is null or p_digest !~ '^[a-f0-9]{64}$' or p_version is null or p_version<0 or
    p_role is null or p_role not in ('moderator','senior-moderator','admin') or p_grant is null or
    p_reason is null or length(trim(p_reason))=0 or length(p_reason)>1000 or p_reason ~ '[<>[:cntrl:]]'
  then return jsonb_build_object('ok',false,'error',jsonb_build_object('code','VALIDATION_ERROR'));end if;
  select * into prior from wordpairs.access_commands where actor_id=p_actor and command_id=p_command;
  if found then
    if prior.digest<>p_digest then return jsonb_build_object('ok',false,'error',jsonb_build_object('code','IDEMPOTENCY_CONFLICT'));end if;
    return prior.result;
  end if;
  select version into current_version from wordpairs.access_state for update;
  if current_version<>p_version then return jsonb_build_object('ok',false,'error',jsonb_build_object('code','CONFLICT'));end if;
  if not exists(select 1 from wordpairs.profiles where id=p_target) then return jsonb_build_object('ok',false,'error',jsonb_build_object('code','NOT_FOUND'));end if;
  if (p_role='admin' and p_target=any(coalesce(p_admins,'{}'::text[]))) or
    (p_grant=exists(select 1 from wordpairs.profile_roles where profile_id=p_target and role=p_role))
  then return jsonb_build_object('ok',false,'error',jsonb_build_object('code','CONFLICT'));end if;
  if not p_grant and p_role='admin' and (
    select count(*) from wordpairs.profiles p where p.id=any(coalesce(p_admins,'{}'::text[])) or
      exists(select 1 from wordpairs.profile_roles r where r.profile_id=p.id and r.role='admin')
  )<=1 then return jsonb_build_object('ok',false,'error',jsonb_build_object('code','CONFLICT'));end if;
  if p_grant then insert into wordpairs.profile_roles values(p_target,p_role);
  else delete from wordpairs.profile_roles where profile_id=p_target and role=p_role;end if;
  update wordpairs.access_state set version=version+1;
  insert into wordpairs.access_audit(actor_id,profile_id,role,granted,reason) values(p_actor,p_target,p_role,p_grant,trim(p_reason));
  result:=jsonb_build_object('ok',true,'value',jsonb_build_object('version',current_version+1));
  insert into wordpairs.access_commands(actor_id,command_id,digest,result) values(p_actor,p_command,p_digest,result);
  return result;
end $$;
revoke all on function public.wordpairs_access_read(text,text[],text),public.wordpairs_access_change(text,text[],text,text,integer,text,text,boolean,text) from public,anon,authenticated;
grant execute on function public.wordpairs_access_read(text,text[],text),public.wordpairs_access_change(text,text[],text,text,integer,text,text,boolean,text) to service_role;
commit;
