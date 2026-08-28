-- Campos opcionais exibidos exclusivamente na primeira página do Passaporte.
-- Mantém esta migração executável mesmo quando a migração de detalhes dos
-- livros ainda não tiver sido aplicada manualmente no projeto remoto.
alter table public.books
  add column if not exists cover_url text,
  add column if not exists genre text,
  add column if not exists autograph_available boolean not null default false;

alter table public.passport_profiles
  add column if not exists passport_display_name text,
  add column if not exists passport_age smallint,
  add column if not exists passport_city text;

alter table public.passport_profiles
  drop constraint if exists passport_profiles_passport_age_check;

alter table public.passport_profiles
  add constraint passport_profiles_passport_age_check
  check (passport_age is null or passport_age between 0 and 130);

-- Inclui a identidade escolhida pela autora na fonte pública/offline do Passaporte.
create or replace view public.passport_public_profiles
with (security_invoker = true) as
select
  profile.author_id, profile.photo_path, profile.photo_width, profile.photo_height,
  profile.photo_mime, profile.photo_size, profile.bio, profile.message,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',book.id,'title',book.title,'publisher',book.publisher,'cover_url',book.cover_url,
      'genre',book.genre,'synopsis',book.notes,'tags',book.tags,
      'autograph_available',book.autograph_available,'featured',author_book.featured,
      'display_order',author_book.display_order
    ) order by author_book.display_order nulls last, book.title)
    from public.author_books author_book join public.books book on book.id=author_book.book_id
    where author_book.author_id=profile.author_id and author_book.deleted_at is null and book.deleted_at is null and book.active
  ), profile.books, '[]'::jsonb) as books,
  coalesce((select jsonb_agg(jsonb_build_object('id',presence.id,'date',presence.presence_date,'start_time',presence.start_time,'end_time',presence.end_time,'stand_code',presence.stand_code,'exhibitor_id',presence.exhibitor_id,'notes',presence.notes,'guaranteed',presence.guaranteed) order by presence.presence_date, presence.start_time) from public.author_presences presence where presence.author_id=profile.author_id and presence.deleted_at is null and presence.status='published'), profile.presences, '[]'::jsonb) as presences,
  coalesce((select jsonb_agg(jsonb_build_object('id',event.id,'date',event.event_date,'start_time',event.start_time,'end_time',event.end_time,'stand_code',event.stand_code,'exhibitor_id',event.exhibitor_id,'books',event.books,'location_text',event.location_text) order by event.event_date, event.start_time) from public.event_authors event_author join public.events event on event.id=event_author.event_id where event_author.author_id=profile.author_id and event.deleted_at is null and event.active and event.event_type='autograph'), profile.autograph_sessions, '[]'::jsonb) as autograph_sessions,
  coalesce((select jsonb_agg(jsonb_build_object('book_id',availability.book_id,'stand_code',availability.stand_code,'exhibitor_id',availability.exhibitor_id,'available_for_sale',availability.available_for_sale)) from public.book_stand_availability availability where availability.author_id=profile.author_id and availability.deleted_at is null and availability.available_for_sale), profile.sale_locations, '[]'::jsonb) as sale_locations,
  profile.status, profile.updated_at, profile.deleted_at,
  -- CREATE OR REPLACE VIEW exige preservar nome, posição e tipo das colunas
  -- existentes. Campos novos são sempre acrescentados ao final da projeção.
  profile.passport_display_name, profile.passport_age, profile.passport_city
from public.passport_profiles profile
where profile.status='published' and profile.deleted_at is null;

grant select on public.passport_public_profiles to authenticated;

-- Approved author edits are copied from the review queue into the published profile.
create or replace function public.review_author_change_request(target_request_id uuid, decision text, notes text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare request_record public.author_change_requests;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
  if decision not in ('approved','rejected') then raise exception 'Decisão inválida'; end if;
  select * into request_record from public.author_change_requests where id=target_request_id and status='pending' for update;
  if request_record.id is null then raise exception 'Solicitação pendente não encontrada'; end if;

  if decision='approved' and request_record.request_type='profile' then
    insert into public.passport_profiles(
      author_id,photo_path,photo_width,photo_height,photo_mime,photo_size,photo_updated_at,
      bio,message,passport_display_name,passport_age,passport_city,participation_status,books,presences,autograph_sessions,sale_locations,
      status,consent_version,consent_accepted_at,consent_accepted_by_user_id,reviewed_at,reviewed_by,updated_at
    ) values (
      request_record.author_id,nullif(request_record.payload->>'photo_path',''),nullif(request_record.payload->>'photo_width','')::integer,
      nullif(request_record.payload->>'photo_height','')::integer,nullif(request_record.payload->>'photo_mime',''),
      nullif(request_record.payload->>'photo_size','')::integer,nullif(request_record.payload->>'photo_updated_at','')::timestamptz,
      coalesce(request_record.payload->>'bio',''),coalesce(request_record.payload->>'message',''),
      nullif(request_record.payload->>'passport_display_name',''),nullif(request_record.payload->>'passport_age','')::smallint,
      nullif(request_record.payload->>'passport_city',''),nullif(request_record.payload->>'participation_status',''),
      coalesce(request_record.payload->'books','[]'::jsonb),
      coalesce(request_record.payload->'presences','[]'::jsonb),coalesce(request_record.payload->'autograph_sessions','[]'::jsonb),
      coalesce(request_record.payload->'sale_locations','[]'::jsonb),'published',request_record.payload->>'consent_version',
      nullif(request_record.payload->>'consent_accepted_at','')::timestamptz,nullif(request_record.payload->>'consent_accepted_by_user_id','')::uuid,
      now(),(select auth.uid()),now()
    ) on conflict(author_id) do update set
      photo_path=excluded.photo_path,photo_width=excluded.photo_width,photo_height=excluded.photo_height,
      photo_mime=excluded.photo_mime,photo_size=excluded.photo_size,photo_updated_at=excluded.photo_updated_at,
      bio=excluded.bio,message=excluded.message,passport_display_name=excluded.passport_display_name,
      passport_age=excluded.passport_age,passport_city=excluded.passport_city,participation_status=excluded.participation_status,books=excluded.books,
      presences=excluded.presences,autograph_sessions=excluded.autograph_sessions,sale_locations=excluded.sale_locations,
      status='published',consent_version=excluded.consent_version,consent_accepted_at=excluded.consent_accepted_at,
      consent_accepted_by_user_id=excluded.consent_accepted_by_user_id,reviewed_at=now(),reviewed_by=(select auth.uid()),updated_at=now();
    update public.authors set published=true,updated_at=now() where id=request_record.author_id;
  end if;

  update public.author_change_requests set status=decision,admin_notes=notes,reviewed_at=now(),reviewed_by=(select auth.uid()),updated_at=now() where id=target_request_id;
  if request_record.request_type='profile' and decision='approved' then
    perform public.bump_content_manifest('authors');
    perform public.bump_content_manifest('passport');
  end if;
end;
$$;

grant execute on function public.review_author_change_request(uuid,text,text) to authenticated;

-- O painel da autora já envia estes metadados. A função anterior criava o
-- livro descartando capa, gênero, autógrafo e o local de venda.
create or replace function public.review_author_content_request(
  p_request_id uuid,
  p_decision text,
  p_payload jsonb default null,
  p_target_id uuid default null,
  p_notes text default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  request_record public.author_change_requests;
  payload jsonb;
  entity_id uuid;
  target_book uuid;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Decisão inválida'; end if;

  select * into request_record
  from public.author_change_requests
  where id=p_request_id and status='pending'
  for update;

  if request_record.id is null then
    raise exception using errcode='40001', message='Solicitação pendente não encontrada ou já revisada';
  end if;
  if request_record.request_type not in ('presence','book','availability','autograph') then
    raise exception 'Esta solicitação deve usar o fluxo de perfil existente';
  end if;

  payload := coalesce(p_payload, request_record.payload);

  if p_decision='rejected' then
    update public.author_change_requests
    set status='rejected',admin_notes=p_notes,reviewed_at=now(),reviewed_by=(select auth.uid()),updated_at=now()
    where id=request_record.id;
    perform public.write_audit('REJECT','author_change_request',request_record.id::text,to_jsonb(request_record),payload,null);
    return jsonb_build_object('status','rejected');
  end if;

  if request_record.request_type='presence' then
    insert into public.author_presences(author_id,presence_date,start_time,end_time,stand_code,exhibitor_id,notes,guaranteed)
    values(request_record.author_id,(payload->>'presence_date')::date,(payload->>'start_time')::time,
      nullif(payload->>'end_time','')::time,nullif(payload->>'stand_code',''),nullif(payload->>'exhibitor_id',''),
      nullif(payload->>'notes',''),coalesce((payload->>'guaranteed')::boolean,false))
    returning id into entity_id;
    perform public.write_audit('CREATE','author_presence',entity_id::text,null,payload,null);

  elsif request_record.request_type='book' then
    if p_target_id is null then
      insert into public.books(
        title,author_name,publisher,cover_url,genre,autograph_available,notes,tags,active
      ) values (
        payload->>'title',(select name from public.authors where id=request_record.author_id),
        nullif(payload->>'publisher',''),nullif(payload->>'cover_url',''),nullif(payload->>'genre',''),
        coalesce((payload->>'autograph_available')::boolean,false),nullif(payload->>'notes',''),
        coalesce(array(select jsonb_array_elements_text(payload->'tags')),'{}'),true
      ) returning id into target_book;
      perform public.write_audit('CREATE','book',target_book::text,null,payload,null);
    else
      target_book := p_target_id;
    end if;

    insert into public.author_books(author_id,book_id,featured,display_order)
    values(request_record.author_id,target_book,coalesce((payload->>'featured')::boolean,false),nullif(payload->>'display_order','')::smallint)
    on conflict(author_id,book_id) do update set
      featured=excluded.featured,display_order=excluded.display_order,deleted_at=null,updated_at=now();

    if coalesce((payload->>'available_for_sale')::boolean,false) then
      if nullif(payload->>'exhibitor_id','') is null and nullif(payload->>'stand_code','') is null then
        raise exception 'Informe o estande para disponibilizar o livro à venda';
      end if;
      insert into public.book_stand_availability(book_id,author_id,exhibitor_id,stand_code,available_for_sale)
      values(target_book,request_record.author_id,nullif(payload->>'exhibitor_id',''),nullif(payload->>'stand_code',''),true)
      on conflict do nothing;
    end if;

    entity_id := target_book;
    perform public.write_audit('LINK','author_book',target_book::text,null,payload,null);

  elsif request_record.request_type='availability' then
    target_book := coalesce(p_target_id, nullif(payload->>'book_id','')::uuid);
    if target_book is null then raise exception 'Selecione o livro disponível para venda'; end if;
    insert into public.book_stand_availability(book_id,author_id,exhibitor_id,stand_code,available_for_sale)
    values(target_book,request_record.author_id,nullif(payload->>'exhibitor_id',''),nullif(payload->>'stand_code',''),coalesce((payload->>'available_for_sale')::boolean,true))
    returning id into entity_id;
    perform public.write_audit('CREATE','book_stand_availability',entity_id::text,null,payload,null);

  elsif request_record.request_type='autograph' then
    insert into public.events(event_type,author_name,books,event_date,start_time,end_time,stand_code,exhibitor_id,location_text,notes,tags,active)
    values('autograph',(select name from public.authors where id=request_record.author_id),
      coalesce(array(select jsonb_array_elements_text(payload->'books')),'{}'),(payload->>'event_date')::date,
      (payload->>'start_time')::time,nullif(payload->>'end_time','')::time,nullif(payload->>'stand_code',''),
      nullif(payload->>'exhibitor_id',''),nullif(payload->>'location_text',''),nullif(payload->>'notes',''),
      array['sessao-de-autografo']::text[],true)
    returning id into entity_id;
    insert into public.event_authors(event_id,author_id)
    values(entity_id,request_record.author_id) on conflict do nothing;
    perform public.write_audit('CREATE','event',entity_id::text,null,payload,null);
  end if;

  update public.author_change_requests
  set status='approved',admin_notes=p_notes,reviewed_at=now(),reviewed_by=(select auth.uid()),updated_at=now()
  where id=request_record.id;
  perform public.bump_content_manifest(case when request_record.request_type in ('book','availability') then 'books' when request_record.request_type='autograph' then 'schedule' else 'passport' end);
  perform public.write_audit('APPROVE','author_change_request',request_record.id::text,to_jsonb(request_record),payload,null);
  return jsonb_build_object('status','approved','entity_id',entity_id);
end;
$$;

grant execute on function public.review_author_content_request(uuid,text,jsonb,uuid,text) to authenticated;
