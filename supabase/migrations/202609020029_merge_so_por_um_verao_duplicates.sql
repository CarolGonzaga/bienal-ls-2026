-- Consolida os registros fragmentados de "Só Por um Verão" sem perder capa
-- nem vínculos com autora, eventos e disponibilidade no estande.
do $$
declare
  canonical_book_id uuid;
  duplicate_book_ids uuid[] := '{}';
  selected_cover text;
  selected_genre text;
  selected_notes text;
  has_autograph boolean := false;
  c28_exhibitor_id text;
  availability_author_id uuid;
begin
  select book.id into canonical_book_id
  from public.books book
  where book.deleted_at is null
    and regexp_replace(lower(public.unaccent(trim(book.title))), '[^a-z0-9]+', '', 'g') = 'soporumverao'
    and regexp_replace(lower(public.unaccent(trim(book.author_name))), '[^a-z0-9]+', '', 'g') like '%baldassari'
  order by
    (nullif(trim(book.cover_url), '') is not null) desc,
    (nullif(trim(book.notes), '') is not null) desc,
    cardinality(book.tags) desc,
    book.created_at asc
  limit 1;

  if canonical_book_id is null then
    raise notice 'Nenhum registro ativo de Só Por um Verão / Baldassari foi encontrado.';
    return;
  end if;

  select
    array_remove(array_agg(book.id), canonical_book_id),
    (array_agg(nullif(trim(book.cover_url), '') order by (nullif(trim(book.cover_url), '') is not null) desc, book.created_at))[1],
    (array_agg(nullif(trim(book.genre), '') order by (nullif(trim(book.genre), '') is not null) desc, book.created_at))[1],
    (array_agg(nullif(trim(book.notes), '') order by length(coalesce(book.notes, '')) desc))[1],
    bool_or(coalesce(book.autograph_available, false))
  into duplicate_book_ids, selected_cover, selected_genre, selected_notes, has_autograph
  from public.books book
  where book.deleted_at is null
    and regexp_replace(lower(public.unaccent(trim(book.title))), '[^a-z0-9]+', '', 'g') = 'soporumverao'
    and regexp_replace(lower(public.unaccent(trim(book.author_name))), '[^a-z0-9]+', '', 'g') like '%baldassari';

  drop table if exists pg_temp.so_por_um_verao_authors;
  create temporary table so_por_um_verao_authors on commit drop as
  select distinct linked.author_id
  from public.author_books linked
  where linked.book_id = canonical_book_id or linked.book_id = any(coalesce(duplicate_book_ids, '{}'::uuid[]));

  drop table if exists pg_temp.so_por_um_verao_events;
  create temporary table so_por_um_verao_events on commit drop as
  select distinct linked.event_id
  from public.event_books linked
  where linked.book_id = canonical_book_id or linked.book_id = any(coalesce(duplicate_book_ids, '{}'::uuid[]));

  select coalesce(
    (select availability.author_id from public.book_stand_availability availability
      where availability.deleted_at is null
        and (availability.book_id = canonical_book_id or availability.book_id = any(coalesce(duplicate_book_ids, '{}'::uuid[])))
        and availability.author_id is not null limit 1),
    (select author_id from pg_temp.so_por_um_verao_authors limit 1)
  ) into availability_author_id;

  select exhibitor.id into c28_exhibitor_id
  from public.exhibitors exhibitor
  where exhibitor.deleted_at is null and upper(trim(exhibitor.stand_code)) = 'C28'
  order by exhibitor.active desc, exhibitor.updated_at desc
  limit 1;

  update public.author_books linked
  set deleted_at = now(), updated_at = now()
  where linked.deleted_at is null
    and (linked.book_id = canonical_book_id or linked.book_id = any(coalesce(duplicate_book_ids, '{}'::uuid[])));

  insert into public.author_books(author_id, book_id, featured, display_order)
  select author_id, canonical_book_id, true, null
  from pg_temp.so_por_um_verao_authors
  on conflict(author_id, book_id) do update set
    featured = true, display_order = null, deleted_at = null, updated_at = now();

  insert into public.event_books(event_id, book_id)
  select event_id, canonical_book_id from pg_temp.so_por_um_verao_events
  on conflict do nothing;
  delete from public.event_books linked
  where linked.book_id = any(coalesce(duplicate_book_ids, '{}'::uuid[]));

  update public.book_stand_availability availability
  set deleted_at = now(), updated_at = now()
  where availability.deleted_at is null
    and (availability.book_id = canonical_book_id or availability.book_id = any(coalesce(duplicate_book_ids, '{}'::uuid[])));

  insert into public.book_stand_availability(book_id, author_id, exhibitor_id, stand_code, available_for_sale)
  values(canonical_book_id, availability_author_id, c28_exhibitor_id, 'C28', true)
  on conflict do nothing;

  update public.community_contributions contribution
  set review_target_id = canonical_book_id::text, updated_at = now()
  where contribution.contribution_type = 'sapphic_book'
    and contribution.review_target_type = 'book'
    and contribution.review_target_id in (
      select duplicate_id::text from unnest(coalesce(duplicate_book_ids, '{}'::uuid[])) duplicate_id
    );

  update public.books book
  set title = 'Só Por um Verão',
      author_name = 'G. B. Baldassari',
      publisher = 'Editora Naci',
      cover_url = coalesce(selected_cover, book.cover_url),
      genre = coalesce(selected_genre, 'Romance'),
      autograph_available = has_autograph,
      notes = coalesce(selected_notes, book.notes),
      tags = array['romance sáfico', 'nacional']::text[],
      stand_code = 'C28',
      exhibitor_id = c28_exhibitor_id,
      active = true,
      deleted_at = null,
      updated_at = now()
  where book.id = canonical_book_id;

  update public.books book
  set active = false, deleted_at = now(), updated_at = now()
  where book.id = any(coalesce(duplicate_book_ids, '{}'::uuid[]));

  perform public.bump_content_manifest('books');
  perform public.bump_content_manifest('passport');
end;
$$;

-- Proteção dirigida a este título: aceita variações de pontuação/iniciais no
-- nome, mas impede que outro registro ativo equivalente seja criado.
create unique index if not exists books_so_por_um_verao_baldassari_unique
on public.books ((1))
where deleted_at is null
  and regexp_replace(translate(lower(trim(title)), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), '[^a-z0-9]+', '', 'g') = 'soporumverao'
  and regexp_replace(translate(lower(trim(author_name)), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), '[^a-z0-9]+', '', 'g') like '%baldassari';
