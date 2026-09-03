-- Consolida os registros duplicados de "Overdrive" / Agatha Menezes sem
-- perder capa, vínculos editoriais, listas das leitoras ou autógrafo.

create or replace function public.merge_passport_book_duplicate(
  p_title_key text,
  p_author_key text,
  p_title text,
  p_author text,
  p_publisher text,
  p_genre text,
  p_tags text[],
  p_stand_code text,
  p_autograph_available boolean
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  canonical_book_id uuid;
  duplicate_book_ids uuid[] := '{}'::uuid[];
  selected_cover text;
  selected_notes text;
  target_exhibitor_id text;
  availability_author_id uuid;
  target_availability_id uuid;
begin
  select book.id
    into canonical_book_id
  from public.books book
  where book.deleted_at is null
    and regexp_replace(lower(public.unaccent(trim(book.title))), '[^a-z0-9]+', '', 'g') = p_title_key
    and regexp_replace(lower(public.unaccent(trim(book.author_name))), '[^a-z0-9]+', '', 'g') = p_author_key
  order by
    (nullif(trim(book.cover_url), '') is not null) desc,
    (upper(trim(coalesce(book.stand_code, ''))) = upper(trim(p_stand_code))) desc,
    coalesce(book.autograph_available, false) desc,
    length(coalesce(book.notes, '')) desc,
    book.created_at asc
  limit 1;

  if canonical_book_id is null then
    raise notice 'Nenhum registro ativo encontrado para % / %.', p_title, p_author;
    return null;
  end if;

  select
    coalesce(array_remove(array_agg(book.id), canonical_book_id), '{}'::uuid[]),
    (array_agg(nullif(trim(book.cover_url), '') order by
      (nullif(trim(book.cover_url), '') is not null) desc,
      book.created_at asc))[1],
    (array_agg(nullif(trim(book.notes), '') order by length(coalesce(book.notes, '')) desc))[1]
  into duplicate_book_ids, selected_cover, selected_notes
  from public.books book
  where book.deleted_at is null
    and regexp_replace(lower(public.unaccent(trim(book.title))), '[^a-z0-9]+', '', 'g') = p_title_key
    and regexp_replace(lower(public.unaccent(trim(book.author_name))), '[^a-z0-9]+', '', 'g') = p_author_key;

  drop table if exists pg_temp.merged_book_authors;
  create temporary table merged_book_authors on commit drop as
  select
    linked.author_id,
    bool_or(linked.featured) as featured,
    min(linked.display_order) as display_order
  from public.author_books linked
  where linked.deleted_at is null
    and (linked.book_id = canonical_book_id or linked.book_id = any(duplicate_book_ids))
  group by linked.author_id;

  drop table if exists pg_temp.merged_book_events;
  create temporary table merged_book_events on commit drop as
  select distinct linked.event_id
  from public.event_books linked
  where linked.book_id = canonical_book_id or linked.book_id = any(duplicate_book_ids);

  select coalesce(
    (
      select availability.author_id
      from public.book_stand_availability availability
      where availability.deleted_at is null
        and (availability.book_id = canonical_book_id or availability.book_id = any(duplicate_book_ids))
        and availability.author_id is not null
      order by
        (upper(trim(coalesce(availability.stand_code, ''))) = upper(trim(p_stand_code))) desc,
        (availability.book_id = canonical_book_id) desc
      limit 1
    ),
    (select author_id from pg_temp.merged_book_authors limit 1)
  ) into availability_author_id;

  select exhibitor.id
    into target_exhibitor_id
  from public.exhibitors exhibitor
  where exhibitor.deleted_at is null
    and upper(trim(exhibitor.stand_code)) = upper(trim(p_stand_code))
  order by exhibitor.active desc, exhibitor.updated_at desc
  limit 1;

  select availability.id
    into target_availability_id
  from public.book_stand_availability availability
  where availability.book_id = canonical_book_id
     or availability.book_id = any(duplicate_book_ids)
  order by
    (availability.deleted_at is null) desc,
    (upper(trim(coalesce(availability.stand_code, ''))) = upper(trim(p_stand_code))) desc,
    (availability.book_id = canonical_book_id) desc,
    availability.created_at asc
  limit 1;

  update public.author_books linked
  set deleted_at = now(), updated_at = now()
  where linked.deleted_at is null
    and (linked.book_id = canonical_book_id or linked.book_id = any(duplicate_book_ids));

  insert into public.author_books(author_id, book_id, featured, display_order)
  select author_id, canonical_book_id, featured, display_order
  from pg_temp.merged_book_authors
  on conflict(author_id, book_id) do update set
    featured = excluded.featured,
    display_order = excluded.display_order,
    deleted_at = null,
    deleted_by = null,
    updated_at = now();

  insert into public.event_books(event_id, book_id)
  select event_id, canonical_book_id
  from pg_temp.merged_book_events
  on conflict do nothing;

  delete from public.event_books linked
  where linked.book_id = any(duplicate_book_ids);

  delete from public.book_stand_availability availability
  where (availability.book_id = canonical_book_id or availability.book_id = any(duplicate_book_ids))
    and availability.id is distinct from target_availability_id;

  if target_availability_id is null then
    insert into public.book_stand_availability(
      book_id, author_id, exhibitor_id, stand_code, available_for_sale
    ) values (
      canonical_book_id, availability_author_id, target_exhibitor_id,
      upper(trim(p_stand_code)), true
    );
  else
    update public.book_stand_availability
    set book_id = canonical_book_id,
        author_id = availability_author_id,
        exhibitor_id = target_exhibitor_id,
        stand_code = upper(trim(p_stand_code)),
        available_for_sale = true,
        deleted_at = null,
        deleted_by = null,
        updated_at = now()
    where id = target_availability_id;
  end if;

  update public.community_contributions contribution
  set review_target_id = canonical_book_id::text,
      updated_at = now()
  where contribution.contribution_type = 'sapphic_book'
    and contribution.review_target_type = 'book'
    and contribution.review_target_id in (
      select duplicate_id::text from unnest(duplicate_book_ids) duplicate_id
    );

  update public.author_change_requests request
  set payload = jsonb_set(request.payload, '{target_id}', to_jsonb(canonical_book_id::text), true),
      updated_at = now()
  where request.status in ('draft', 'pending')
    and request.request_type = 'book'
    and request.payload->>'target_id' in (
      select duplicate_id::text from unnest(duplicate_book_ids) duplicate_id
    );

  update public.author_change_requests request
  set payload = jsonb_set(request.payload, '{book_id}', to_jsonb(canonical_book_id::text), true),
      updated_at = now()
  where request.status in ('draft', 'pending')
    and request.request_type = 'availability'
    and request.payload->>'book_id' in (
      select duplicate_id::text from unnest(duplicate_book_ids) duplicate_id
    );

  -- Preserva livros já incluídos nas listas pessoais e elimina uma eventual
  -- repetição causada por a leitora ter adicionado as duas cópias.
  with normalized_entries as (
    select
      state.user_id,
      entry.ordinality,
      case
        when entry.value->>'bookId' = canonical_book_id::text
          or entry.value->>'bookId' in (
            select duplicate_id::text from unnest(duplicate_book_ids) duplicate_id
          )
        then jsonb_set(entry.value, '{bookId}', to_jsonb(canonical_book_id::text), true)
        else entry.value
      end as item,
      case
        when entry.value->>'bookId' = canonical_book_id::text
          or entry.value->>'bookId' in (
            select duplicate_id::text from unnest(duplicate_book_ids) duplicate_id
          )
        then canonical_book_id::text
        else coalesce(entry.value->>'bookId', concat('entry:', entry.ordinality))
      end as normalized_book_id,
      case entry.value->>'status'
        when 'bought' then 3
        when 'want_to_buy_bienal' then 2
        else 1
      end as status_priority
    from public.passport_reader_states state
    cross join lateral jsonb_array_elements(state.user_books) with ordinality entry(value, ordinality)
    where exists (
      select 1
      from jsonb_array_elements(state.user_books) current_entry
      where current_entry->>'bookId' = canonical_book_id::text
         or current_entry->>'bookId' in (
           select duplicate_id::text from unnest(duplicate_book_ids) duplicate_id
         )
    )
  ), selected_entries as (
    select distinct on (user_id, normalized_book_id)
      user_id, ordinality, item
    from normalized_entries
    order by user_id, normalized_book_id, status_priority desc, ordinality desc
  ), rebuilt_states as (
    select user_id, jsonb_agg(item order by ordinality) as user_books
    from selected_entries
    group by user_id
  )
  update public.passport_reader_states state
  set user_books = rebuilt.user_books,
      updated_at = now()
  from rebuilt_states rebuilt
  where state.user_id = rebuilt.user_id;

  update public.books book
  set title = p_title,
      author_name = p_author,
      publisher = p_publisher,
      cover_url = coalesce(selected_cover, book.cover_url),
      genre = p_genre,
      autograph_available = p_autograph_available,
      notes = coalesce(selected_notes, book.notes),
      tags = p_tags,
      stand_code = upper(trim(p_stand_code)),
      exhibitor_id = target_exhibitor_id,
      active = true,
      deleted_at = null,
      updated_at = now()
  where book.id = canonical_book_id;

  update public.books book
  set active = false,
      deleted_at = now(),
      updated_at = now()
  where book.id = any(duplicate_book_ids);

  return canonical_book_id;
end;
$$;

select public.merge_passport_book_duplicate(
  'overdrive',
  'agathamenezes',
  'Overdrive',
  'Agatha Menezes',
  'Editora Calíope',
  'Romance sáfico',
  array[
    'romance sáfico',
    'nacional',
    '+18',
    'rancinho to lovers',
    'fórmula 1',
    'romance esportivo',
    'slow burn'
  ]::text[],
  'F14',
  true
);

drop function public.merge_passport_book_duplicate(text,text,text,text,text,text,text[],text,boolean);

create unique index if not exists books_overdrive_agatha_menezes_unique
on public.books ((1))
where deleted_at is null
  and regexp_replace(translate(lower(trim(title)), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), '[^a-z0-9]+', '', 'g') = 'overdrive'
  and regexp_replace(translate(lower(trim(author_name)), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), '[^a-z0-9]+', '', 'g') = 'agathamenezes';

select public.bump_content_manifest('books');
select public.bump_content_manifest('passport');
