begin;
create function public.wordpairs_reactions_ensure(p_id text,p_state jsonb) returns void language plpgsql security definer set search_path=pg_catalog,wordpairs as $$begin
 if p_state->>'id' is distinct from p_id or p_state->>'sourceRoomId' is distinct from p_id or (p_state->>'version')::integer is distinct from 0 then raise exception 'Invalid reaction stream' using errcode='23514';end if;
 insert into wordpairs.aggregates(kind,id,version,state) values('moderation',p_id,0,p_state) on conflict do nothing;
end$$;
revoke all on function public.wordpairs_reactions_ensure(text,jsonb) from public,anon,authenticated;
grant execute on function public.wordpairs_reactions_ensure(text,jsonb) to service_role;
commit;
