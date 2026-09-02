-- Capas enviadas pelo painel de autoras. O caminho começa pelo UUID da autora,
-- preservando o mesmo isolamento usado para as fotos do Passaporte.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('passport-book-covers', 'passport-book-covers', true, 307200, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Passport book covers are publicly readable" on storage.objects;
create policy "Passport book covers are publicly readable"
on storage.objects for select
using (bucket_id = 'passport-book-covers');

drop policy if exists "Authors upload own passport book covers" on storage.objects;
create policy "Authors upload own passport book covers"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'passport-book-covers'
  and exists (
    select 1 from public.author_accounts account
    where account.user_id = (select auth.uid())
      and account.author_id::text = (storage.foldername(name))[1]
      and account.active
  )
);

drop policy if exists "Authors update own passport book covers" on storage.objects;
create policy "Authors update own passport book covers"
on storage.objects for update to authenticated
using (
  bucket_id = 'passport-book-covers'
  and exists (
    select 1 from public.author_accounts account
    where account.user_id = (select auth.uid())
      and account.author_id::text = (storage.foldername(name))[1]
      and account.active
  )
)
with check (
  bucket_id = 'passport-book-covers'
  and exists (
    select 1 from public.author_accounts account
    where account.user_id = (select auth.uid())
      and account.author_id::text = (storage.foldername(name))[1]
      and account.active
  )
);

drop policy if exists "Authors delete own passport book covers" on storage.objects;
create policy "Authors delete own passport book covers"
on storage.objects for delete to authenticated
using (
  bucket_id = 'passport-book-covers'
  and exists (
    select 1 from public.author_accounts account
    where account.user_id = (select auth.uid())
      and account.author_id::text = (storage.foldername(name))[1]
      and account.active
  )
);

-- A aprovação agora reaproveita presenças semanticamente iguais e permite ao
-- admin apontar p_target_id para uma sessão de autógrafos já existente.
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
  where id = p_request_id and status = 'pending'
  for update;

  if request_record.id is null then
    raise exception using errcode = '40001', message = 'Solicitação pendente não encontrada ou já revisada';
  end if;
  if request_record.request_type not in ('presence','book','availability','autograph') then
    raise exception 'Esta solicitação deve usar o fluxo de perfil existente';
  end if;

  payload := coalesce(p_payload, request_record.payload);

  if p_decision = 'rejected' then
    update public.author_change_requests
    set status = 'rejected', admin_notes = p_notes, reviewed_at = now(), reviewed_by = (select auth.uid()), updated_at = now()
    where id = request_record.id;
    perform public.write_audit('REJECT','author_change_request',request_record.id::text,to_jsonb(request_record),payload,null);
    return jsonb_build_object('status','rejected');
  end if;

  if request_record.request_type = 'presence' then
    select presence.id into entity_id
    from public.author_presences presence
    where presence.author_id = request_record.author_id
      and presence.deleted_at is null
      and presence.presence_date = (payload->>'presence_date')::date
      and presence.start_time = (payload->>'start_time')::time
      and coalesce(presence.exhibitor_id, '') = coalesce(nullif(payload->>'exhibitor_id',''), '')
      and coalesce(upper(trim(presence.stand_code)), '') = coalesce(upper(trim(nullif(payload->>'stand_code',''))), '')
    limit 1;

    if entity_id is null then
      insert into public.author_presences(author_id,presence_date,start_time,end_time,stand_code,exhibitor_id,notes,guaranteed)
      values(request_record.author_id,(payload->>'presence_date')::date,(payload->>'start_time')::time,
        nullif(payload->>'end_time','')::time,nullif(payload->>'stand_code',''),nullif(payload->>'exhibitor_id',''),
        nullif(payload->>'notes',''),coalesce((payload->>'guaranteed')::boolean,false))
      returning id into entity_id;
      perform public.write_audit('CREATE','author_presence',entity_id::text,null,payload,null);
    end if;

  elsif request_record.request_type = 'book' then
    if p_target_id is null then
      insert into public.books(title,author_name,publisher,cover_url,genre,autograph_available,notes,tags,active)
      values(
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

  elsif request_record.request_type = 'availability' then
    target_book := coalesce(p_target_id, nullif(payload->>'book_id','')::uuid);
    if target_book is null then raise exception 'Selecione o livro disponível para venda'; end if;
    insert into public.book_stand_availability(book_id,author_id,exhibitor_id,stand_code,available_for_sale)
    values(target_book,request_record.author_id,nullif(payload->>'exhibitor_id',''),nullif(payload->>'stand_code',''),coalesce((payload->>'available_for_sale')::boolean,true))
    on conflict do nothing
    returning id into entity_id;

  elsif request_record.request_type = 'autograph' then
    if p_target_id is not null then
      select event.id into entity_id
      from public.events event
      where event.id = p_target_id and event.deleted_at is null and event.active and event.event_type = 'autograph';
      if entity_id is null then raise exception 'Sessão de autógrafos existente não encontrada'; end if;
    else
      select event.id into entity_id
      from public.events event
      join public.event_authors event_author on event_author.event_id = event.id
      where event_author.author_id = request_record.author_id
        and event.deleted_at is null and event.active and event.event_type = 'autograph'
        and event.event_date = (payload->>'event_date')::date
        and event.start_time = (payload->>'start_time')::time
        and coalesce(event.exhibitor_id, '') = coalesce(nullif(payload->>'exhibitor_id',''), '')
        and coalesce(upper(trim(event.stand_code)), '') = coalesce(upper(trim(nullif(payload->>'stand_code',''))), '')
      limit 1;

      if entity_id is null then
        insert into public.events(event_type,author_name,books,event_date,start_time,end_time,stand_code,exhibitor_id,location_text,notes,tags,active)
        values('autograph',(select name from public.authors where id=request_record.author_id),
          coalesce(array(select jsonb_array_elements_text(payload->'books')),'{}'),(payload->>'event_date')::date,
          (payload->>'start_time')::time,nullif(payload->>'end_time','')::time,nullif(payload->>'stand_code',''),
          nullif(payload->>'exhibitor_id',''),nullif(payload->>'location_text',''),nullif(payload->>'notes',''),
          array['sessao-de-autografo']::text[],true)
        returning id into entity_id;
        perform public.write_audit('CREATE','event',entity_id::text,null,payload,null);
      end if;
    end if;

    insert into public.event_authors(event_id,author_id)
    values(entity_id,request_record.author_id) on conflict do nothing;
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
