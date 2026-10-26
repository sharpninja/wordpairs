begin;
insert into wordpairs.aggregates(kind,id,version,state) values('moderation','content-catalog',0,'{"id":"content-catalog","version":0,"sourceRoomId":null,"cases":[],"publications":[],"disabled":[]}');
alter table wordpairs.moderation_cases add column version integer not null default 0,add column normalized_word text,add column playable boolean not null default false,add column nomination_count integer not null default 0,add column future_eligible boolean not null default false;
create unique index normalized_candidate on wordpairs.moderation_cases(normalized_word) where kind='nomination';
alter table wordpairs.nominations add column created_at timestamptz not null default now(),add column submitted_form text;
create table wordpairs.catalog_revision(singleton boolean primary key default true check(singleton),revision bigint not null default 0);
insert into wordpairs.catalog_revision values(true,0);
create table wordpairs.catalog_exclusions(pair_id text not null,pair_version integer not null,reason text not null,disabled_at timestamptz not null,primary key(pair_id,pair_version),foreign key(pair_id,pair_version) references wordpairs.word_pairs(id,version));
alter table wordpairs.catalog_revision enable row level security;
alter table wordpairs.catalog_exclusions enable row level security;
revoke all on wordpairs.catalog_revision,wordpairs.catalog_exclusions from public,anon,authenticated;
grant select on wordpairs.profile_roles,wordpairs.profiles to service_role;
create function wordpairs.sync_content_projection() returns trigger language plpgsql security definer set search_path=pg_catalog,wordpairs as $$
declare item jsonb;vote jsonb;publication jsonb;cat jsonb;pair jsonb;answer text;entry jsonb;begin
 if new.kind<>'moderation' or new.id<>'content-catalog' then return new;end if;
 for item in select value from jsonb_array_elements(new.state->'cases') loop
  insert into wordpairs.moderation_cases(id,proposer_id,kind,payload,status,reviewer_id,reason,appealed,appeal_resolved,version,normalized_word,playable,nomination_count,future_eligible)
  values(item->>'id',item->>'proposerId',item->>'kind',item->'payload',item->>'status',item->>'reviewerId',item->>'reason',(item->>'appealed')::boolean,(item->>'appealResolved')::boolean,(item->>'version')::integer,item->>'normalizedWord',(item->>'playable')::boolean,jsonb_array_length(item->'nominatorIds'),coalesce((item->>'futureEligible')::boolean,false))
  on conflict(id) do update set payload=excluded.payload,status=excluded.status,reviewer_id=excluded.reviewer_id,reason=excluded.reason,appealed=excluded.appealed,appeal_resolved=excluded.appeal_resolved,version=excluded.version,playable=excluded.playable,nomination_count=excluded.nomination_count,future_eligible=excluded.future_eligible;
  for vote in select value from jsonb_array_elements(coalesce(item->'nominationEvidence','[]')) loop
   insert into wordpairs.nominations(candidate_id,profile_id,round_id,created_at,submitted_form) values(item->>'id',vote->>'profileId',vote->>'roundId',to_timestamp((vote->>'at')::double precision/1000),item->'payload'->>'word') on conflict(candidate_id,profile_id) do nothing;
  end loop;
 end loop;
 for publication in select value from jsonb_array_elements(new.state->'publications') loop
  cat:=publication->'content'->'category';
  insert into wordpairs.categories(id,name,background_id,approved,version) values(cat->>'id',cat->>'name',cat->>'backgroundId',(cat->>'approved')::boolean,(cat->>'version')::integer) on conflict(id) do nothing;
  for pair in select value from jsonb_array_elements(publication->'content'->'pairs') loop
   if not exists(select 1 from wordpairs.word_pairs where id=pair->>'id' and version=(pair->>'version')::integer) then
    insert into wordpairs.word_pairs(id,category_id,prompt,target,hints,approved,version) values(pair->>'id',pair->>'categoryId',pair->>'prompt',pair->>'target',array(select jsonb_array_elements_text(pair->'hints')),(pair->>'approved')::boolean,(pair->>'version')::integer);
    for answer in select jsonb_array_elements_text(pair->'acceptedAnswers') loop insert into wordpairs.accepted_answers(pair_id,pair_version,answer) values(pair->>'id',(pair->>'version')::integer,answer);end loop;
   end if;
  end loop;
 end loop;
 for entry in select value from jsonb_array_elements(new.state->'disabled') loop
  insert into wordpairs.catalog_exclusions values(entry->>'pairId',(entry->>'version')::integer,entry->>'reason',to_timestamp((entry->>'at')::double precision/1000)) on conflict do nothing;
 end loop;
 if new.state->'publications' is distinct from old.state->'publications' or new.state->'disabled' is distinct from old.state->'disabled' then update wordpairs.catalog_revision set revision=revision+1;end if;
 return new;
end $$;
create trigger sync_content_projection after update on wordpairs.aggregates for each row execute function wordpairs.sync_content_projection();
create or replace function public.wordpairs_catalog() returns jsonb language plpgsql stable security definer set search_path=pg_catalog,wordpairs as $$
declare categories jsonb;pairs jsonb;begin
 if (select count(*) from wordpairs.word_pairs where approved)>4096 then return jsonb_build_object('ok',false,'error',jsonb_build_object('code','SERVICE_LIMIT'));end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'version',version,'name',name,'backgroundId',background_id,'approved',approved) order by id collate "C"),'[]') into categories from wordpairs.categories where approved;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'version',p.version,'categoryId',p.category_id,'prompt',p.prompt,'target',p.target,'acceptedAnswers',coalesce((select jsonb_agg(answer order by answer collate "C") from wordpairs.accepted_answers a where a.pair_id=p.id and a.pair_version=p.version),'[]'::jsonb),'hints',p.hints,'backgroundId',c.background_id,'approved',p.approved,'selectable',not exists(select 1 from wordpairs.catalog_exclusions e where e.pair_id=p.id and e.pair_version=p.version)) order by p.id collate "C",p.version),'[]') into pairs from wordpairs.word_pairs p join wordpairs.categories c on c.id=p.category_id where p.approved and c.approved;
 return jsonb_build_object('ok',true,'value',jsonb_build_object('categories',categories,'pairs',pairs,'revision',(select revision from wordpairs.catalog_revision)));
end $$;
create function public.wordpairs_catalog_revision() returns bigint language sql stable security definer set search_path=pg_catalog,wordpairs as $$select revision from wordpairs.catalog_revision$$;
create function public.wordpairs_content_context(p_actor text) returns jsonb language sql stable security definer set search_path=pg_catalog,wordpairs as $$
 select jsonb_build_object('actor',jsonb_build_object('profileId',p.id,'roles','["player"]'::jsonb||coalesce((select jsonb_agg(role order by role) from wordpairs.profile_roles where profile_id=p.id),'[]'::jsonb)),'wins',p.wins,'catalog',public.wordpairs_catalog(),'audits',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'actorId',a.actor_id,'targetId',a.target_id,'action',a.action,'at',floor(extract(epoch from a.at)*1000)::bigint,'details',a.details) order by a.at,a.id collate "C") from (select * from wordpairs.audit_events where target_id='content-catalog' order by at desc,id collate "C" desc limit 2048) a),'[]')) from wordpairs.profiles p where p.id=p_actor
$$;
revoke all on function wordpairs.sync_content_projection(),public.wordpairs_catalog_revision(),public.wordpairs_content_context(text) from public,anon,authenticated;
grant execute on function public.wordpairs_catalog_revision(),public.wordpairs_content_context(text) to service_role;
commit;
create function public.wordpairs_lock_catalog_revision() returns bigint language plpgsql security definer set search_path=pg_catalog,wordpairs as $$declare result bigint;begin select revision into result from wordpairs.catalog_revision for share;return result;end$$;
revoke all on function public.wordpairs_lock_catalog_revision() from public,anon,authenticated;
grant execute on function public.wordpairs_lock_catalog_revision() to service_role;
