-- Consolida duplicatas conhecidas preservando capa, autógrafo e vínculos.
create or replace function public.merge_known_book_duplicates(
  p_title_key text,
  p_author_key text,
  p_title text,
  p_author text,
  p_publisher text,
  p_tags text[],
  p_stand_code text
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  canonical_book_id uuid;
  duplicate_book_ids uuid[] := '{}';
  selected_cover text;
  selected_genre text;
  selected_notes text;
  has_autograph boolean := false;
  target_exhibitor_id text;
  availability_author_id uuid;
begin
  select book.id into canonical_book_id
  from public.books book
  where book.deleted_at is null
    and regexp_replace(lower(public.unaccent(trim(book.title))), '[^a-z0-9]+', '', 'g') = p_title_key
    and regexp_replace(lower(public.unaccent(trim(book.author_name))), '[^a-z0-9]+', '', 'g') like ('%' || p_author_key)
  order by
    (nullif(trim(book.cover_url), '') is not null) desc,
    (nullif(trim(book.notes), '') is not null) desc,
    cardinality(book.tags) desc,
    book.created_at asc
  limit 1;

  if canonical_book_id is null then
    raise notice 'Nenhum registro ativo encontrado para % / %.', p_title, p_author;
    return null;
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
    and regexp_replace(lower(public.unaccent(trim(book.title))), '[^a-z0-9]+', '', 'g') = p_title_key
    and regexp_replace(lower(public.unaccent(trim(book.author_name))), '[^a-z0-9]+', '', 'g') like ('%' || p_author_key);

  drop table if exists pg_temp.merge_book_authors;
  create temporary table merge_book_authors on commit drop as
  select distinct linked.author_id
  from public.author_books linked
  where linked.book_id = canonical_book_id or linked.book_id = any(coalesce(duplicate_book_ids, '{}'::uuid[]));

  drop table if exists pg_temp.merge_book_events;
  create temporary table merge_book_events on commit drop as
  select distinct linked.event_id
  from public.event_books linked
  where linked.book_id = canonical_book_id or linked.book_id = any(coalesce(duplicate_book_ids, '{}'::uuid[]));

  select coalesce(
    (select availability.author_id from public.book_stand_availability availability
      where availability.deleted_at is null
        and (availability.book_id = canonical_book_id or availability.book_id = any(coalesce(duplicate_book_ids, '{}'::uuid[])))
        and availability.author_id is not null limit 1),
    (select author_id from pg_temp.merge_book_authors limit 1)
  ) into availability_author_id;

  select exhibitor.id into target_exhibitor_id
  from public.exhibitors exhibitor
  where exhibitor.deleted_at is null and upper(trim(exhibitor.stand_code)) = upper(trim(p_stand_code))
  order by exhibitor.active desc, exhibitor.updated_at desc
  limit 1;

  update public.author_books linked
  set deleted_at = now(), updated_at = now()
  where linked.deleted_at is null
    and (linked.book_id = canonical_book_id or linked.book_id = any(coalesce(duplicate_book_ids, '{}'::uuid[])));

  insert into public.author_books(author_id, book_id, featured, display_order)
  select author_id, canonical_book_id, true, null from pg_temp.merge_book_authors
  on conflict(author_id, book_id) do update set
    featured = true, display_order = null, deleted_at = null, updated_at = now();

  insert into public.event_books(event_id, book_id)
  select event_id, canonical_book_id from pg_temp.merge_book_events
  on conflict do nothing;
  delete from public.event_books linked
  where linked.book_id = any(coalesce(duplicate_book_ids, '{}'::uuid[]));

  update public.book_stand_availability availability
  set deleted_at = now(), updated_at = now()
  where availability.deleted_at is null
    and (availability.book_id = canonical_book_id or availability.book_id = any(coalesce(duplicate_book_ids, '{}'::uuid[])));

  insert into public.book_stand_availability(book_id, author_id, exhibitor_id, stand_code, available_for_sale)
  values(canonical_book_id, availability_author_id, target_exhibitor_id, upper(trim(p_stand_code)), true)
  on conflict do nothing;

  update public.community_contributions contribution
  set review_target_id = canonical_book_id::text, updated_at = now()
  where contribution.contribution_type = 'sapphic_book'
    and contribution.review_target_type = 'book'
    and contribution.review_target_id in (
      select duplicate_id::text from unnest(coalesce(duplicate_book_ids, '{}'::uuid[])) duplicate_id
    );

  update public.books book
  set title = p_title,
      author_name = p_author,
      publisher = p_publisher,
      cover_url = coalesce(selected_cover, book.cover_url),
      genre = coalesce(selected_genre, 'Romance'),
      autograph_available = has_autograph,
      notes = coalesce(selected_notes, book.notes),
      tags = p_tags,
      stand_code = upper(trim(p_stand_code)),
      exhibitor_id = target_exhibitor_id,
      active = true,
      deleted_at = null,
      updated_at = now()
  where book.id = canonical_book_id;

  update public.books book
  set active = false, deleted_at = now(), updated_at = now()
  where book.id = any(coalesce(duplicate_book_ids, '{}'::uuid[]));

  return canonical_book_id;
end;
$$;

select public.merge_known_book_duplicates(
  'amorfati', 'baldassari', 'Amor Fati', 'G. B. Baldassari', 'Euphoria',
  array['romance sáfico', 'nacional']::text[], 'K66'
);

select public.merge_known_book_duplicates(
  'naofoiodestino', 'grazielasantos', 'Não foi o destino', 'Graziela Santos', 'P.S.: Edições',
  array['romance', 'nacional', 'comédia romântica']::text[], 'H85'
);

drop function public.merge_known_book_duplicates(text,text,text,text,text,text[],text);

create unique index if not exists books_amor_fati_baldassari_unique
on public.books ((1))
where deleted_at is null
  and regexp_replace(translate(lower(trim(title)), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), '[^a-z0-9]+', '', 'g') = 'amorfati'
  and regexp_replace(translate(lower(trim(author_name)), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), '[^a-z0-9]+', '', 'g') like '%baldassari';

create unique index if not exists books_nao_foi_o_destino_graziela_unique
on public.books ((1))
where deleted_at is null
  and regexp_replace(translate(lower(trim(title)), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), '[^a-z0-9]+', '', 'g') = 'naofoiodestino'
  and regexp_replace(translate(lower(trim(author_name)), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), '[^a-z0-9]+', '', 'g') like '%grazielasantos';

select public.bump_content_manifest('books');
select public.bump_content_manifest('passport');
