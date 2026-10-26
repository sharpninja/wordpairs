begin;
create function public.wordpairs_outbox_pending(p_limit integer) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,wordpairs as $$
declare result jsonb;begin
  if p_limit is null or p_limit not between 1 and 25 then raise exception 'Invalid batch' using errcode='22023';end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'aggregateType',aggregate_kind,'aggregateId',aggregate_id,'version',aggregate_version,'schemaVersion',schema_version,'type',event_type,'audience',audience,'payload',payload) order by created_at,id),'[]'::jsonb) into result from (select * from wordpairs.outbox_events where published_at is null order by created_at,id limit p_limit) batch;
  return result;
end $$;
create function public.wordpairs_outbox_published(p_id text,p_at bigint) returns boolean language plpgsql security definer set search_path=pg_catalog,wordpairs as $$
begin update wordpairs.outbox_events set published_at=coalesce(published_at,to_timestamp(p_at/1000.0)) where id=p_id;return found;end $$;
revoke all on function public.wordpairs_outbox_pending(integer) from public,anon,authenticated;
revoke all on function public.wordpairs_outbox_published(text,bigint) from public,anon,authenticated;
grant execute on function public.wordpairs_outbox_pending(integer) to service_role;
grant execute on function public.wordpairs_outbox_published(text,bigint) to service_role;
commit;
