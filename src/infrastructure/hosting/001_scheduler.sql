-- Hosted Supabase only. Game migrations 001..011 must already be installed.
-- No secret literals. Endpoint and Vault secrets are configured separately.
begin;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create schema if not exists wordpairs_hosting;
revoke all on schema wordpairs_hosting from public,anon,authenticated,service_role;
create table if not exists wordpairs_hosting.scheduler (
 singleton boolean primary key default true check(singleton),
 endpoint text not null check(endpoint in
 ('https://wordpairs.vercel.app/api/internal/deadlines','https://wordpairs-j9jf.vercel.app/api/internal/deadlines')),
 enabled boolean not null default false,
 last_request bigint, last_sent timestamptz, last_pruned timestamptz,
 last_status integer, failures integer not null default 0, retry_after timestamptz
);
alter table wordpairs_hosting.scheduler enable row level security;
revoke all on wordpairs_hosting.scheduler from public,anon,authenticated,service_role;
-- Managed pg_net can expose queued headers to direct database logins; postgres
-- cannot revoke every managed-owner grant. Every DB login is trusted for the
-- purpose-limited scheduler credential. No untrusted direct DB logins are issued.
-- Vault/net schemas must stay out of the Data API's exposed-schema allowlist.
do $$ begin
 if not exists(select 1 from pg_roles where rolname='wordpairs_app') then
  create role wordpairs_app login inherit;
 end if;
end $$;
grant service_role to wordpairs_app;
revoke all on schema wordpairs_hosting from wordpairs_app;
revoke all on wordpairs_hosting.scheduler from wordpairs_app;

create or replace function wordpairs_hosting.tick() returns void
language plpgsql set search_path=pg_catalog as $$
declare cfg wordpairs_hosting.scheduler; response_status integer; response_error text; secret text; v_now timestamptz := clock_timestamp();
begin
 if not pg_try_advisory_xact_lock(170027,1) then return; end if;
 select * into cfg from wordpairs_hosting.scheduler where singleton for update;
 if not found then return; end if;
 -- Bound history even while idle: one hour of this job's cron ticks. Consume only
 -- this job's HTTP responses; late responses retain pg_net's bounded default TTL.
 if cfg.last_pruned is null or cfg.last_pruned < v_now-interval '5 minutes' then
  delete from cron.job_run_details where jobid in (select jobid from cron.job where jobname='wordpairs-hosted-tick') and end_time < v_now-interval '1 hour';
  update wordpairs_hosting.scheduler set last_pruned=v_now where singleton;
 end if;
 if not cfg.enabled or cfg.retry_after > v_now then return; end if;
 if cfg.last_request is not null then
  select status_code,error_msg into response_status,response_error from net._http_response where id=cfg.last_request;
  if not found and cfg.last_sent > v_now-interval '35 seconds' then return; end if;
  -- A finite lease recovers lost unlogged requests after a DB restart.
  if response_status is distinct from 200 then
   delete from net._http_response where id=cfg.last_request;
   update wordpairs_hosting.scheduler set last_request=null,last_status=response_status,
    failures=least(failures+1,6), retry_after=v_now+make_interval(secs=>least(60,power(2,least(failures+1,6))::integer)) where singleton;
   return;
  end if;
  delete from net._http_response where id=cfg.last_request;
  update wordpairs_hosting.scheduler set last_request=null,last_status=200,failures=0,retry_after=null where singleton;
 end if;
 -- Never invoke Vercel when there is no work; initial match creation also needs
 -- recovery if the foreground request ended after committing the room transition.
 if not exists(select 1 from wordpairs.deadline_jobs where completed_at is null and due_at<=v_now and (lease_until is null or lease_until<=v_now))
  and not exists(select 1 from wordpairs.outbox_events where published_at is null)
  and not exists(select 1 from wordpairs.rooms r where r.status='playing' and not exists(select 1 from wordpairs.matches m where m.room_id=r.id)) then return; end if;
 select decrypted_secret into secret from vault.decrypted_secrets where name='wordpairs_scheduler_secret';
 if secret is null or length(secret)<32 then return; end if;
 update wordpairs_hosting.scheduler set last_request=net.http_post(
  url:=cfg.endpoint,headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),
  body:='{}'::jsonb,timeout_milliseconds:=20000),last_sent=v_now where singleton;
end $$;
revoke all on function wordpairs_hosting.tick() from public,anon,authenticated,service_role,wordpairs_app;
-- Idempotent, disabled until administrator configures and verifies its endpoint.
select cron.schedule('wordpairs-hosted-tick','1 second','select wordpairs_hosting.tick();');
select cron.alter_job((select jobid from cron.job where jobname='wordpairs-hosted-tick'),active:=false);
commit;
