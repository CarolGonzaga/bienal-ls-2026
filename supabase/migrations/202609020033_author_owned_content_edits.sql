-- Permite que uma autora proponha alterações nos conteúdos já vinculados a
-- ela. A publicação continua condicionada à aprovação administrativa.

create or replace function public.submit_author_content_request(p_request_type text, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  linked_author_id uuid;
  request_id uuid;
  target_id uuid;
begin
  if p_request_type not in ('presence','book','availability','autograph') then
    raise exception 'Tipo de solicitação inválido';
  end if;

  select account.author_id into linked_author_id
  from public.author_accounts account
  where account.user_id = (select auth.uid()) and account.active
  limit 1;

  if linked_author_id is null then
    raise exception 'Conta não vinculada a uma autora verificada';
  end if;

  if coalesce(p_payload->>'operation', '') = 'update' then
    target_id := nullif(p_payload->>'target_id', '')::uuid;
    if target_id is null then raise exception 'Registro a editar não informado'; end if;

    if p_request_type = 'presence' and not exists (
      select 1 from public.author_presences presence
      where presence.id = target_id and presence.author_id = linked_author_id and presence.deleted_at is null
    ) then raise exception 'Presença não vinculada a esta autora'; end if;

    if p_request_type = 'book' and not exists (
      select 1 from public.author_books author_book
      where author_book.book_id = target_id and author_book.author_id = linked_author_id and author_book.deleted_at is null
    ) then raise exception 'Livro não vinculado a esta autora'; end if;

    if p_request_type = 'autograph' and not exists (
      select 1 from public.event_authors event_author
      join public.events event on event.id = event_author.event_id
      where event_author.event_id = target_id and event_author.author_id = linked_author_id
        and event.deleted_at is null and event.event_type = 'autograph'
    ) then raise exception 'Sessão de autógrafos não vinculada a esta autora'; end if;

    if exists (
      select 1 from public.author_change_requests request
      where request.author_id = linked_author_id
        and request.request_type = p_request_type
        and request.status in ('draft', 'pending')
        and request.payload->>'operation' = 'update'
        and request.payload->>'target_id' = target_id::text
    ) then raise exception 'Já existe uma alteração em revisão para este registro'; end if;
  end if;

  insert into public.author_change_requests(author_id, submitted_by, request_type, payload, status, submitted_at)
  values(linked_author_id, (select auth.uid()), p_request_type, coalesce(p_payload, '{}'::jsonb), 'pending', now())
  returning id into request_id;

  return request_id;
end;
$$;

create or replace function public.review_author_content_update(
  p_request_id uuid,
  p_decision text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_record public.author_change_requests;
  payload jsonb;
  target_id uuid;
  availability_id uuid;
  previous_row jsonb;
  normalized_tags text[];
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'Decisão inválida'; end if;

  select * into request_record
  from public.author_change_requests
  where id = p_request_id and status = 'pending'
  for update;

  if request_record.id is null then
    raise exception using errcode = '40001', message = 'Solicitação pendente não encontrada ou já revisada';
  end if;

  payload := coalesce(request_record.payload, '{}'::jsonb);
  if payload->>'operation' <> 'update' then raise exception 'A solicitação não é uma edição'; end if;
  target_id := nullif(payload->>'target_id', '')::uuid;
  if target_id is null then raise exception 'Registro a editar não informado'; end if;

  if p_decision = 'rejected' then
    update public.author_change_requests
    set status = 'rejected', admin_notes = p_notes, reviewed_at = now(), reviewed_by = (select auth.uid()), updated_at = now()
    where id = request_record.id;
    perform public.write_audit('REJECT', 'author_content_update', request_record.id::text, to_jsonb(request_record), payload, null);
    return jsonb_build_object('status', 'rejected');
  end if;

  if request_record.request_type = 'presence' then
    select to_jsonb(presence) into previous_row
    from public.author_presences presence
    where presence.id = target_id and presence.author_id = request_record.author_id and presence.deleted_at is null
    for update;
    if previous_row is null then raise exception 'Presença não vinculada a esta autora'; end if;

    update public.author_presences
    set presence_date = (payload->>'presence_date')::date,
        start_time = (payload->>'start_time')::time,
        end_time = nullif(payload->>'end_time', '')::time,
        stand_code = nullif(payload->>'stand_code', ''),
        exhibitor_id = nullif(payload->>'exhibitor_id', ''),
        notes = nullif(payload->>'notes', ''),
        guaranteed = coalesce((payload->>'guaranteed')::boolean, false),
        updated_at = now()
    where id = target_id;

    perform public.bump_content_manifest('passport');
    perform public.bump_content_manifest('schedule');

  elsif request_record.request_type = 'book' then
    if not exists (
      select 1 from public.author_books author_book
      where author_book.book_id = target_id and author_book.author_id = request_record.author_id and author_book.deleted_at is null
    ) then raise exception 'Livro não vinculado a esta autora'; end if;

    select to_jsonb(book) into previous_row from public.books book where book.id = target_id and book.deleted_at is null for update;
    if previous_row is null then raise exception 'Livro não encontrado'; end if;
    normalized_tags := case when jsonb_typeof(payload->'tags') = 'array'
      then array(select jsonb_array_elements_text(payload->'tags')) else '{}'::text[] end;

    update public.books
    set title = coalesce(nullif(trim(payload->>'title'), ''), title),
        publisher = nullif(payload->>'publisher', ''),
        cover_url = nullif(payload->>'cover_url', ''),
        genre = nullif(payload->>'genre', ''),
        notes = nullif(payload->>'notes', ''),
        tags = normalized_tags,
        autograph_available = coalesce((payload->>'autograph_available')::boolean, false),
        updated_at = now()
    where id = target_id;

    update public.author_books
    set featured = coalesce((payload->>'featured')::boolean, false), updated_at = now()
    where author_id = request_record.author_id and book_id = target_id;

    if coalesce((payload->>'available_for_sale')::boolean, false) then
      if nullif(payload->>'exhibitor_id', '') is null and nullif(payload->>'stand_code', '') is null then
        raise exception 'Informe o estande para disponibilizar o livro à venda';
      end if;
      select availability.id into availability_id
      from public.book_stand_availability availability
      where availability.author_id = request_record.author_id and availability.book_id = target_id and availability.deleted_at is null
      order by availability.created_at limit 1 for update;
      if availability_id is null then
        insert into public.book_stand_availability(book_id, author_id, exhibitor_id, stand_code, available_for_sale)
        values(target_id, request_record.author_id, nullif(payload->>'exhibitor_id', ''), nullif(payload->>'stand_code', ''), true);
      else
        update public.book_stand_availability
        set exhibitor_id = nullif(payload->>'exhibitor_id', ''), stand_code = nullif(payload->>'stand_code', ''),
            available_for_sale = true, deleted_at = null, deleted_by = null, updated_at = now()
        where id = availability_id;
      end if;
    else
      update public.book_stand_availability
      set available_for_sale = false, deleted_at = now(), deleted_by = (select auth.uid()), updated_at = now()
      where author_id = request_record.author_id and book_id = target_id and deleted_at is null;
    end if;

    perform public.bump_content_manifest('books');
    perform public.bump_content_manifest('passport');

  elsif request_record.request_type = 'autograph' then
    select to_jsonb(event) into previous_row
    from public.events event
    join public.event_authors event_author on event_author.event_id = event.id
    where event.id = target_id and event_author.author_id = request_record.author_id
      and event.deleted_at is null and event.event_type = 'autograph'
    for update of event;
    if previous_row is null then raise exception 'Sessão de autógrafos não vinculada a esta autora'; end if;

    update public.events
    set event_date = (payload->>'event_date')::date,
        start_time = (payload->>'start_time')::time,
        end_time = nullif(payload->>'end_time', '')::time,
        stand_code = nullif(payload->>'stand_code', ''),
        exhibitor_id = nullif(payload->>'exhibitor_id', ''),
        location_text = nullif(payload->>'location_text', ''),
        books = case when jsonb_typeof(payload->'books') = 'array' then array(select jsonb_array_elements_text(payload->'books')) else '{}'::text[] end,
        notes = nullif(payload->>'notes', ''),
        updated_at = now()
    where id = target_id;

    perform public.bump_content_manifest('schedule');
    perform public.bump_content_manifest('passport');
  else
    raise exception 'Tipo de conteúdo não editável';
  end if;

  update public.author_change_requests
  set status = 'approved', admin_notes = p_notes, reviewed_at = now(), reviewed_by = (select auth.uid()), updated_at = now()
  where id = request_record.id;
  perform public.write_audit('UPDATE', request_record.request_type, target_id::text, previous_row, payload, null);
  return jsonb_build_object('status', 'approved', 'entity_id', target_id);
end;
$$;

revoke execute on function public.submit_author_content_request(text, jsonb) from public, anon;
revoke execute on function public.review_author_content_update(uuid, text, text) from public, anon;
grant execute on function public.submit_author_content_request(text, jsonb) to authenticated;
grant execute on function public.review_author_content_update(uuid, text, text) to authenticated;
