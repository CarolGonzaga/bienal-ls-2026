-- Consolida exclusivamente os registros de "Operação Colares" / Luana Cruz,
-- preservando capa, sinopse, estande, autógrafo e vínculos existentes.
do $$
declare
  canonical_book_id uuid;
  duplicate_book_ids uuid[] := '{}'::uuid[];
  target_exhibitor_id text;
  availability_author_id uuid;
  target_availability_id uuid;
  synopsis text := $synopsis$
Em 1977, os moradores da ilha de Colares, no Pará, começaram a avistar luzes misteriosas no céu. O exército foi chamado para investigar, e a missão, que ficou conhecida como Operação Prato, entrou para a história como um dos casos ufológicos mais emblemáticos do Brasil.

Quase cinquenta anos depois, não são as luzes que assombram Laila Rosário. Ela deixou Colares jurando nunca mais voltar, e, agora que precisou retornar, está contando os dias para ir embora outra vez. Mas quando um pescador é resgatado do rio carregando um enigmático pedido de ajuda, Laila é arrastada para um mistério enterrado há tanto tempo quanto os segredos de sua família.
$synopsis$;
begin
  select book.id
    into canonical_book_id
  from public.books book
  where book.deleted_at is null
    and regexp_replace(lower(public.unaccent(trim(book.title))), '[^a-z0-9]+', '', 'g') = 'operacaocolares'
    and regexp_replace(lower(public.unaccent(trim(book.author_name))), '[^a-z0-9]+', '', 'g') = 'luanacruz'
  order by
    (nullif(trim(book.cover_url), '') is not null) desc,
    coalesce(book.autograph_available, false) desc,
    (upper(trim(coalesce(book.stand_code, ''))) = 'G50') desc,
    length(coalesce(book.notes, '')) desc,
    book.created_at asc
  limit 1;

  if canonical_book_id is null then
    raise notice 'Nenhum registro ativo de Operação Colares / Luana Cruz foi encontrado.';
    return;
  end if;

  select coalesce(array_remove(array_agg(book.id), canonical_book_id), '{}'::uuid[])
    into duplicate_book_ids
  from public.books book
  where book.deleted_at is null
    and regexp_replace(lower(public.unaccent(trim(book.title))), '[^a-z0-9]+', '', 'g') = 'operacaocolares'
    and regexp_replace(lower(public.unaccent(trim(book.author_name))), '[^a-z0-9]+', '', 'g') = 'luanacruz';

  drop table if exists pg_temp.operacao_colares_authors;
  create temporary table operacao_colares_authors on commit drop as
  select
    linked.author_id,
    bool_or(linked.featured) as featured,
    min(linked.display_order) as display_order
  from public.author_books linked
  where linked.deleted_at is null
    and (linked.book_id = canonical_book_id or linked.book_id = any(duplicate_book_ids))
  group by linked.author_id;

  drop table if exists pg_temp.operacao_colares_events;
  create temporary table operacao_colares_events on commit drop as
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
      order by (upper(trim(coalesce(availability.stand_code, ''))) = 'G50') desc,
               (availability.book_id = canonical_book_id) desc
      limit 1
    ),
    (select author_id from pg_temp.operacao_colares_authors limit 1)
  ) into availability_author_id;

  select exhibitor.id
    into target_exhibitor_id
  from public.exhibitors exhibitor
  where exhibitor.deleted_at is null
    and upper(trim(exhibitor.stand_code)) = 'G50'
  order by exhibitor.active desc, exhibitor.updated_at desc
  limit 1;

  select availability.id
    into target_availability_id
  from public.book_stand_availability availability
  where availability.book_id = canonical_book_id or availability.book_id = any(duplicate_book_ids)
  order by
    (availability.deleted_at is null) desc,
    (upper(trim(coalesce(availability.stand_code, ''))) = 'G50') desc,
    (availability.book_id = canonical_book_id) desc,
    availability.created_at asc
  limit 1;

  update public.author_books linked
  set deleted_at = now(), updated_at = now()
  where linked.deleted_at is null
    and (linked.book_id = canonical_book_id or linked.book_id = any(duplicate_book_ids));

  insert into public.author_books(author_id, book_id, featured, display_order)
  select author_id, canonical_book_id, featured, display_order
  from pg_temp.operacao_colares_authors
  on conflict(author_id, book_id) do update set
    featured = excluded.featured,
    display_order = excluded.display_order,
    deleted_at = null,
    deleted_by = null,
    updated_at = now();

  insert into public.event_books(event_id, book_id)
  select event_id, canonical_book_id
  from pg_temp.operacao_colares_events
  on conflict do nothing;

  delete from public.event_books linked
  where linked.book_id = any(duplicate_book_ids);

  -- Mantém apenas uma disponibilidade para que o índice funcional existente
  -- não deixe uma linha arquivada bloquear a associação canônica ao G50.
  delete from public.book_stand_availability availability
  where (availability.book_id = canonical_book_id or availability.book_id = any(duplicate_book_ids))
    and availability.id is distinct from target_availability_id;

  if target_availability_id is null then
    insert into public.book_stand_availability(
      book_id, author_id, exhibitor_id, stand_code, available_for_sale
    ) values (
      canonical_book_id, availability_author_id, target_exhibitor_id, 'G50', true
    );
  else
    update public.book_stand_availability
    set book_id = canonical_book_id,
        author_id = availability_author_id,
        exhibitor_id = target_exhibitor_id,
        stand_code = 'G50',
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

  update public.books book
  set title = 'Operação Colares',
      author_name = 'Luana Cruz',
      publisher = 'Plataforma 21',
      cover_url = 'https://gxrzglxwvnqokneesddu.supabase.co/storage/v1/object/public/passport-book-covers/35d79e47-dc7f-403b-b931-983aaee3dcdd/books/ba0ed25e-0ab8-43a0-afba-6eebee5aa982.webp',
      genre = 'Ficção científica',
      autograph_available = true,
      notes = trim(synopsis),
      tags = array[
        'romance',
        'nacional',
        'ficção científica',
        'sáfico',
        'mistério',
        'best friends to lovers',
        'segunda chance'
      ]::text[],
      stand_code = 'G50',
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

  perform public.bump_content_manifest('books');
  perform public.bump_content_manifest('passport');
end;
$$;
