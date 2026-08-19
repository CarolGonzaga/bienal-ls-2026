-- Revisão editorial segura: nenhuma contribuição pendente é publicada sem uma
-- decisão explícita da administração sobre criar, vincular ou atualizar.

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null check (action in ('CREATE','UPDATE','DELETE','APPROVE','REJECT','LINK','UNLINK')),
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  source_contribution_id uuid references public.community_contributions(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.community_contributions add column if not exists review_resolution text;
alter table public.community_contributions add column if not exists review_target_type text;
alter table public.community_contributions add column if not exists review_target_id text;
alter table public.community_contributions add column if not exists review_payload jsonb;
alter table public.community_contributions add column if not exists review_version integer not null default 1;
alter table public.community_contributions add column if not exists deleted_at timestamptz;
alter table public.community_contributions add column if not exists deleted_by uuid references auth.users(id) on delete set null;

alter table public.community_contributions drop constraint if exists community_contributions_review_resolution_check;
alter table public.community_contributions add constraint community_contributions_review_resolution_check
  check (review_resolution is null or review_resolution in ('create','link','update','none'));

alter table public.audit_log enable row level security;
drop policy if exists "Admins read audit log" on public.audit_log;
create policy "Admins read audit log" on public.audit_log for select to authenticated using (public.is_admin());
grant select on public.audit_log to authenticated;

drop policy if exists "Users read own contributions" on public.community_contributions;
create policy "Users read active own contributions" on public.community_contributions for select to authenticated
using ((deleted_at is null and (user_id=(select auth.uid()) or public.is_admin())) or public.is_admin());
drop policy if exists "Admins update contributions" on public.community_contributions;
drop policy if exists "No direct contribution updates" on public.community_contributions;
create policy "No direct contribution updates" on public.community_contributions for update to authenticated using (false) with check (false);
drop policy if exists "Admins delete contributions" on public.community_contributions;
drop policy if exists "No direct contribution deletes" on public.community_contributions;
create policy "No direct contribution deletes" on public.community_contributions for delete to authenticated using (false);

create or replace function public.write_audit(
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_before jsonb default null,
  p_after jsonb default null,
  p_contribution_id uuid default null
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_log(actor_user_id, actor_role, action, entity_type, entity_id, before_data, after_data, source_contribution_id)
  values (
    (select auth.uid()),
    (select role from public.profiles where id=(select auth.uid())),
    p_action, p_entity_type, p_entity_id, p_before, p_after, p_contribution_id
  );
end;
$$;

create or replace function public.update_contribution_for_review(
  p_contribution_id uuid,
  p_payload jsonb,
  p_expected_updated_at timestamptz
)
returns void language plpgsql security definer set search_path = '' as $$
declare item public.community_contributions;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
  select * into item from public.community_contributions where id=p_contribution_id and deleted_at is null for update;
  if item.id is null then raise exception 'Contribuição não encontrada'; end if;
  if item.status <> 'pending' then raise exception 'Somente contribuições pendentes podem ser alteradas'; end if;
  if p_expected_updated_at is not null and item.updated_at is distinct from p_expected_updated_at then
    raise exception using errcode='40001', message='Esta contribuição foi alterada por outra administradora. Recarregue antes de salvar.';
  end if;
  update public.community_contributions set payload=p_payload, updated_at=now(), review_version=review_version+1 where id=item.id;
  perform public.write_audit('UPDATE','community_contribution',item.id::text,to_jsonb(item),p_payload,item.id);
end;
$$;

create or replace function public.review_community_contribution(
  p_contribution_id uuid,
  p_decision text,
  p_resolution text default 'none',
  p_reviewed_payload jsonb default null,
  p_target_entity_id text default null,
  p_expected_updated_at timestamptz default null,
  p_admin_notes text default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  item public.community_contributions;
  payload jsonb;
  target_id text;
  target_before jsonb;
  result_entity_type text;
  result_entity_id text;
  generated_id text;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Decisão inválida'; end if;
  if p_resolution not in ('create','link','update','none') then raise exception 'Resolução inválida'; end if;

  select * into item from public.community_contributions where id=p_contribution_id and deleted_at is null for update;
  if item.id is null then raise exception 'Contribuição não encontrada'; end if;
  if item.status <> 'pending' then
    raise exception using errcode='40001', message='Esta contribuição já foi revisada por outra administradora.';
  end if;
  if p_expected_updated_at is not null and item.updated_at is distinct from p_expected_updated_at then
    raise exception using errcode='40001', message='Esta contribuição foi alterada por outra administradora. Recarregue antes de revisar.';
  end if;

  payload := coalesce(p_reviewed_payload, item.payload);
  if p_decision='rejected' then
    update public.community_contributions set status='rejected', review_resolution='none', review_payload=payload, admin_notes=p_admin_notes,
      reviewed_by=(select auth.uid()), reviewed_at=now(), updated_at=now(), review_version=review_version+1 where id=item.id;
    perform public.write_audit('REJECT','community_contribution',item.id::text,to_jsonb(item),payload,item.id);
    return jsonb_build_object('contribution_id',item.id,'status','rejected');
  end if;

  if item.contribution_type='correction' and p_resolution <> 'update' then
    raise exception 'Uma correção aprovada deve atualizar explicitamente um registro existente';
  end if;
  if item.contribution_type <> 'correction' and p_resolution='none' then
    raise exception 'Escolha criar, vincular ou atualizar antes de aprovar';
  end if;
  if p_resolution in ('link','update') and nullif(trim(coalesce(p_target_entity_id,'')),'') is null then
    raise exception 'Selecione o registro de destino para esta decisão';
  end if;

  if item.contribution_type='sapphic_book' then
    result_entity_type := 'book';
    if p_resolution='create' then
      if exists(select 1 from public.books where lower(title)=lower(coalesce(payload->>'book_name','')) and lower(author_name)=lower(coalesce(payload->>'author','')) and deleted_at is null) then
        raise exception 'Já existe um livro com este título e autora. Escolha vincular ou atualizar explicitamente.';
      end if;
      insert into public.books(title,author_name,publisher,stand_code,exhibitor_id,notes,tags,source_contribution_id)
      values (payload->>'book_name',payload->>'author',nullif(payload->>'publisher',''),nullif(payload->>'stand_code',''),nullif(payload->>'exhibitor_id',''),nullif(payload->>'notes',''),coalesce(array(select jsonb_array_elements_text(payload->'tags')),'{}'),item.id)
      returning id::text into result_entity_id;
      perform public.write_audit('CREATE','book',result_entity_id,null,payload,item.id);
    else
      target_id := p_target_entity_id;
      select to_jsonb(books) into target_before from public.books where id=target_id::uuid and deleted_at is null for update;
      if target_before is null then raise exception 'Livro de destino não encontrado'; end if;
      result_entity_id := target_id;
      if p_resolution='update' then
        update public.books set title=payload->>'book_name',author_name=payload->>'author',publisher=nullif(payload->>'publisher',''),stand_code=nullif(payload->>'stand_code',''),exhibitor_id=nullif(payload->>'exhibitor_id','')::text,notes=nullif(payload->>'notes',''),tags=coalesce(array(select jsonb_array_elements_text(payload->'tags')),'{}'),updated_at=now(),active=true where id=target_id::uuid;
        perform public.write_audit('UPDATE','book',target_id,target_before,payload,item.id);
      else perform public.write_audit('LINK','book',target_id,target_before,payload,item.id); end if;
    end if;
  elsif item.contribution_type='autograph_session' then
    result_entity_type := 'event';
    if p_resolution='create' then
      if exists(select 1 from public.events where lower(author_name)=lower(coalesce(payload->>'author_name','')) and event_date=(payload->>'event_date')::date and start_time=nullif(payload->>'start_time','')::time and coalesce(stand_code,'')=coalesce(nullif(payload->>'stand_code',''),'') and deleted_at is null) then
        raise exception 'Já existe uma sessão equivalente. Escolha vincular ou atualizar explicitamente.';
      end if;
      insert into public.events(event_type,author_name,books,event_date,start_time,end_time,stand_code,exhibitor_id,location_text,official_link,notes,tags,source_contribution_id)
      values ('autograph',payload->>'author_name',string_to_array(coalesce(payload->>'books',''),','),(payload->>'event_date')::date,nullif(payload->>'start_time','')::time,nullif(payload->>'end_time','')::time,nullif(payload->>'stand_code',''),nullif(payload->>'exhibitor_id',''),nullif(payload->>'location_text',''),nullif(payload->>'official_link',''),nullif(payload->>'notes',''),coalesce(array(select jsonb_array_elements_text(payload->'tags')),'{}'),item.id)
      returning id::text into result_entity_id;
      perform public.write_audit('CREATE','event',result_entity_id,null,payload,item.id);
    else
      target_id := p_target_entity_id;
      select to_jsonb(events) into target_before from public.events where id=target_id::uuid and deleted_at is null for update;
      if target_before is null then raise exception 'Evento de destino não encontrado'; end if;
      result_entity_id := target_id;
      if p_resolution='update' then
        update public.events set event_type='autograph',author_name=payload->>'author_name',books=string_to_array(coalesce(payload->>'books',''),','),event_date=(payload->>'event_date')::date,start_time=nullif(payload->>'start_time','')::time,end_time=nullif(payload->>'end_time','')::time,stand_code=nullif(payload->>'stand_code',''),exhibitor_id=nullif(payload->>'exhibitor_id','')::text,location_text=nullif(payload->>'location_text',''),official_link=nullif(payload->>'official_link',''),notes=nullif(payload->>'notes',''),tags=coalesce(array(select jsonb_array_elements_text(payload->'tags')),'{}'),updated_at=now(),active=true where id=target_id::uuid;
        perform public.write_audit('UPDATE','event',target_id,target_before,payload,item.id);
      else perform public.write_audit('LINK','event',target_id,target_before,payload,item.id); end if;
    end if;
  elsif item.contribution_type='exhibitor' then
    result_entity_type := 'exhibitor';
    if p_resolution='create' then
      generated_id := trim(both '-' from regexp_replace(lower(public.unaccent(payload->>'exhibitor_name')), '[^a-z0-9]+', '-', 'g')) || '-' || lower(regexp_replace(coalesce(payload->>'stand_code',''), '[^a-zA-Z0-9]+', '-', 'g'));
      if exists(select 1 from public.exhibitors where id=generated_id) then
        raise exception 'Já existe um expositor com este identificador. Escolha vincular ou atualizar explicitamente.';
      end if;
      insert into public.exhibitors(id,logo,name,description,reason_to_visit,stand_code,active,relevance_level,relevance_reasons,categories,featured)
      values (generated_id,'',payload->>'exhibitor_name',coalesce(payload->>'description',''),'',upper(trim(payload->>'stand_code')),true,'catalogo_confirmado','{}',coalesce(array(select jsonb_array_elements_text(payload->'tags')),'{}'),false);
      result_entity_id := generated_id;
      perform public.write_audit('CREATE','exhibitor',result_entity_id,null,payload,item.id);
    else
      target_id := p_target_entity_id;
      select to_jsonb(exhibitors) into target_before from public.exhibitors where id=target_id and deleted_at is null for update;
      if target_before is null then raise exception 'Expositor de destino não encontrado'; end if;
      result_entity_id := target_id;
      if p_resolution='update' then
        update public.exhibitors set name=payload->>'exhibitor_name',description=coalesce(payload->>'description',''),stand_code=upper(trim(payload->>'stand_code')),categories=coalesce(array(select jsonb_array_elements_text(payload->'tags')),'{}'),active=true,updated_at=now() where id=target_id;
        perform public.write_audit('UPDATE','exhibitor',target_id,target_before,payload,item.id);
      else perform public.write_audit('LINK','exhibitor',target_id,target_before,payload,item.id); end if;
    end if;
  else
    raise exception 'Correções estruturadas exigem a etapa de modelagem do registro de destino';
  end if;

  update public.community_contributions set status='approved',review_resolution=p_resolution,review_target_type=result_entity_type,review_target_id=result_entity_id,review_payload=payload,admin_notes=p_admin_notes,
    reviewed_by=(select auth.uid()),reviewed_at=now(),updated_at=now(),review_version=review_version+1 where id=item.id;
  perform public.write_audit('APPROVE','community_contribution',item.id::text,to_jsonb(item),payload,item.id);
  return jsonb_build_object('contribution_id',item.id,'status','approved','entity_type',result_entity_type,'entity_id',result_entity_id);
end;
$$;

create or replace function public.archive_community_contribution(p_contribution_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare item public.community_contributions;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
  select * into item from public.community_contributions where id=p_contribution_id and deleted_at is null for update;
  if item.id is null then raise exception 'Contribuição não encontrada ou já arquivada'; end if;
  update public.community_contributions set deleted_at=now(),deleted_by=(select auth.uid()),updated_at=now(),review_version=review_version+1 where id=item.id;
  perform public.write_audit('DELETE','community_contribution',item.id::text,to_jsonb(item),null,item.id);
end;
$$;

revoke execute on function public.approve_community_contribution(uuid) from public, anon, authenticated;
grant execute on function public.update_contribution_for_review(uuid,jsonb,timestamptz), public.review_community_contribution(uuid,text,text,jsonb,text,timestamptz,text), public.archive_community_contribution(uuid) to authenticated;

create index if not exists audit_log_entity_created_idx on public.audit_log(entity_type, entity_id, created_at desc);
create index if not exists audit_log_contribution_idx on public.audit_log(source_contribution_id, created_at desc);
create index if not exists community_contributions_pending_idx on public.community_contributions(status, updated_at desc) where deleted_at is null;
