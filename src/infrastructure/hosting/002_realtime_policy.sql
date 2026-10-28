-- Managed Supabase already owns/enables RLS on this table. postgres may manage
-- policies through supautils but cannot ALTER TABLE. Fail closed if RLS is absent.
do $$ begin
 if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='realtime' and c.relname='messages' and c.relrowsecurity) then
  raise exception 'Managed Realtime RLS prerequisite absent';
 end if;
end $$;
drop policy if exists wordpairs_own_notifications on realtime.messages;
create policy wordpairs_own_notifications on realtime.messages for select to authenticated using(
 extension='broadcast' and realtime.topic()='wordpairs-profile:'||(current_setting('request.jwt.claims',true)::jsonb->>'sub')
);
