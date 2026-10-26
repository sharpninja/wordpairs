-- Apply after the Supabase Realtime service has installed realtime.messages.
-- Fail closed if that prerequisite is absent; no public-channel fallback.
begin;
alter table realtime.messages enable row level security;
drop policy if exists wordpairs_own_notifications on realtime.messages;
create policy wordpairs_own_notifications on realtime.messages for select to authenticated using(
  extension='broadcast' and realtime.topic()='wordpairs-profile:'||(current_setting('request.jwt.claims',true)::jsonb->>'sub')
);
commit;
