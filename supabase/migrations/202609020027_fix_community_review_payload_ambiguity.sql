-- Evita a colisão entre a coluna community_contributions.payload e a antiga
-- variável PL/pgSQL de mesmo nome durante a aprovação administrativa.
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
  reviewed_data jsonb;
  target_id text;
  target_before jsonb;
  result_entity_type text;
  result_entity_id text;
  generated_id text;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Decisão inválida'; end if;
  if p_resolution not in ('create','link','update','none') then raise exception 'Resolução inválida'; end if;

  select * into item from public.community_contributions contribution
  where contribution.id=p_contribution_id and contribution.deleted_at is null for update;
  if item.id is null then raise exception 'Contribuição não encontrada'; end if;
  if item.status <> 'pending' then
    raise exception using errcode='40001', message='Esta contribuição já foi revisada por outra administradora.';
  end if;
  if p_expected_updated_at is not null and item.updated_at is distinct from p_expected_updated_at then
    raise exception using errcode='40001', message='Esta contribuição foi alterada por outra administradora. Recarregue antes de revisar.';
  end if;

  reviewed_data := coalesce(p_reviewed_payload, item.payload);
  if p_decision='rejected' then
    update public.community_contributions contribution set
      status='rejected', review_resolution='none', review_payload=reviewed_data, admin_notes=p_admin_notes,
      reviewed_by=(select auth.uid()), reviewed_at=now(), updated_at=now(), review_version=contribution.review_version+1
    where contribution.id=item.id;
    perform public.write_audit('REJECT','community_contribution',item.id::text,to_jsonb(item),reviewed_data,item.id);
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
      if exists(select 1 from public.books book where lower(book.title)=lower(coalesce(reviewed_data->>'book_name','')) and lower(book.author_name)=lower(coalesce(reviewed_data->>'author','')) and book.deleted_at is null) then
        raise exception 'Já existe um livro com este título e autora. Escolha vincular ou atualizar explicitamente.';
      end if;
      insert into public.books(title,author_name,publisher,cover_url,stand_code,exhibitor_id,notes,tags,source_contribution_id)
      values (reviewed_data->>'book_name',reviewed_data->>'author',nullif(reviewed_data->>'publisher',''),nullif(reviewed_data->>'cover_url',''),nullif(reviewed_data->>'stand_code',''),nullif(reviewed_data->>'exhibitor_id',''),nullif(reviewed_data->>'notes',''),coalesce(array(select jsonb_array_elements_text(reviewed_data->'tags')),'{}'),item.id)
      returning id::text into result_entity_id;
      perform public.write_audit('CREATE','book',result_entity_id,null,reviewed_data,item.id);
    else
      target_id := p_target_entity_id;
      select to_jsonb(book) into target_before from public.books book where book.id=target_id::uuid and book.deleted_at is null for update;
      if target_before is null then raise exception 'Livro de destino não encontrado'; end if;
      result_entity_id := target_id;
      if p_resolution='update' then
        update public.books book set title=reviewed_data->>'book_name',author_name=reviewed_data->>'author',publisher=nullif(reviewed_data->>'publisher',''),cover_url=coalesce(nullif(reviewed_data->>'cover_url',''),book.cover_url),stand_code=nullif(reviewed_data->>'stand_code',''),exhibitor_id=nullif(reviewed_data->>'exhibitor_id','')::text,notes=nullif(reviewed_data->>'notes',''),tags=coalesce(array(select jsonb_array_elements_text(reviewed_data->'tags')),'{}'),updated_at=now(),active=true where book.id=target_id::uuid;
        perform public.write_audit('UPDATE','book',target_id,target_before,reviewed_data,item.id);
      else perform public.write_audit('LINK','book',target_id,target_before,reviewed_data,item.id); end if;
    end if;
  elsif item.contribution_type='autograph_session' then
    result_entity_type := 'event';
    if p_resolution='create' then
      if exists(select 1 from public.events event where lower(event.author_name)=lower(coalesce(reviewed_data->>'author_name','')) and event.event_date=(reviewed_data->>'event_date')::date and event.start_time=nullif(reviewed_data->>'start_time','')::time and coalesce(event.stand_code,'')=coalesce(nullif(reviewed_data->>'stand_code',''),'') and event.deleted_at is null) then
        raise exception 'Já existe uma sessão equivalente. Escolha vincular ou atualizar explicitamente.';
      end if;
      insert into public.events(event_type,author_name,books,event_date,start_time,end_time,stand_code,exhibitor_id,location_text,official_link,notes,tags,source_contribution_id)
      values ('autograph',reviewed_data->>'author_name',string_to_array(coalesce(reviewed_data->>'books',''),','),(reviewed_data->>'event_date')::date,nullif(reviewed_data->>'start_time','')::time,nullif(reviewed_data->>'end_time','')::time,nullif(reviewed_data->>'stand_code',''),nullif(reviewed_data->>'exhibitor_id',''),nullif(reviewed_data->>'location_text',''),nullif(reviewed_data->>'official_link',''),nullif(reviewed_data->>'notes',''),coalesce(array(select jsonb_array_elements_text(reviewed_data->'tags')),'{}'),item.id)
      returning id::text into result_entity_id;
      perform public.write_audit('CREATE','event',result_entity_id,null,reviewed_data,item.id);
    else
      target_id := p_target_entity_id;
      select to_jsonb(event) into target_before from public.events event where event.id=target_id::uuid and event.deleted_at is null for update;
      if target_before is null then raise exception 'Evento de destino não encontrado'; end if;
      result_entity_id := target_id;
      if p_resolution='update' then
        update public.events event set event_type='autograph',author_name=reviewed_data->>'author_name',books=string_to_array(coalesce(reviewed_data->>'books',''),','),event_date=(reviewed_data->>'event_date')::date,start_time=nullif(reviewed_data->>'start_time','')::time,end_time=nullif(reviewed_data->>'end_time','')::time,stand_code=nullif(reviewed_data->>'stand_code',''),exhibitor_id=nullif(reviewed_data->>'exhibitor_id','')::text,location_text=nullif(reviewed_data->>'location_text',''),official_link=nullif(reviewed_data->>'official_link',''),notes=nullif(reviewed_data->>'notes',''),tags=coalesce(array(select jsonb_array_elements_text(reviewed_data->'tags')),'{}'),updated_at=now(),active=true where event.id=target_id::uuid;
        perform public.write_audit('UPDATE','event',target_id,target_before,reviewed_data,item.id);
      else perform public.write_audit('LINK','event',target_id,target_before,reviewed_data,item.id); end if;
    end if;
  elsif item.contribution_type='exhibitor' then
    result_entity_type := 'exhibitor';
    if p_resolution='create' then
      generated_id := trim(both '-' from regexp_replace(lower(public.unaccent(reviewed_data->>'exhibitor_name')), '[^a-z0-9]+', '-', 'g')) || '-' || lower(regexp_replace(coalesce(reviewed_data->>'stand_code',''), '[^a-zA-Z0-9]+', '-', 'g'));
      if exists(select 1 from public.exhibitors exhibitor where exhibitor.id=generated_id) then
        raise exception 'Já existe um expositor com este identificador. Escolha vincular ou atualizar explicitamente.';
      end if;
      insert into public.exhibitors(id,logo,name,description,reason_to_visit,stand_code,active,relevance_level,relevance_reasons,categories,featured)
      values (generated_id,'',reviewed_data->>'exhibitor_name',coalesce(reviewed_data->>'description',''),'',upper(trim(reviewed_data->>'stand_code')),true,'catalogo_confirmado','{}',coalesce(array(select jsonb_array_elements_text(reviewed_data->'tags')),'{}'),false);
      result_entity_id := generated_id;
      perform public.write_audit('CREATE','exhibitor',result_entity_id,null,reviewed_data,item.id);
    else
      target_id := p_target_entity_id;
      select to_jsonb(exhibitor) into target_before from public.exhibitors exhibitor where exhibitor.id=target_id and exhibitor.deleted_at is null for update;
      if target_before is null then raise exception 'Expositor de destino não encontrado'; end if;
      result_entity_id := target_id;
      if p_resolution='update' then
        update public.exhibitors exhibitor set name=reviewed_data->>'exhibitor_name',description=coalesce(reviewed_data->>'description',''),stand_code=upper(trim(reviewed_data->>'stand_code')),categories=coalesce(array(select jsonb_array_elements_text(reviewed_data->'tags')),'{}'),active=true,updated_at=now() where exhibitor.id=target_id;
        perform public.write_audit('UPDATE','exhibitor',target_id,target_before,reviewed_data,item.id);
      else perform public.write_audit('LINK','exhibitor',target_id,target_before,reviewed_data,item.id); end if;
    end if;
  else
    raise exception 'Correções estruturadas exigem a etapa de modelagem do registro de destino';
  end if;

  update public.community_contributions contribution set
    status='approved',review_resolution=p_resolution,review_target_type=result_entity_type,review_target_id=result_entity_id,review_payload=reviewed_data,admin_notes=p_admin_notes,
    reviewed_by=(select auth.uid()),reviewed_at=now(),updated_at=now(),review_version=contribution.review_version+1
  where contribution.id=item.id;
  perform public.write_audit('APPROVE','community_contribution',item.id::text,to_jsonb(item),reviewed_data,item.id);
  return jsonb_build_object('contribution_id',item.id,'status','approved','entity_type',result_entity_type,'entity_id',result_entity_id);
end;
$$;

grant execute on function public.review_community_contribution(uuid,text,text,jsonb,text,timestamptz,text) to authenticated;
