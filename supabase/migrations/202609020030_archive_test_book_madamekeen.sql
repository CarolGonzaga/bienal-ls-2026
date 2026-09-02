-- Remove da publicação o livro criado pela antiga conta de teste Madame Keen.
do $$
declare
  test_book_ids uuid[];
begin
  select coalesce(array_agg(book.id), '{}'::uuid[])
  into test_book_ids
  from public.books book
  where book.deleted_at is null
    and regexp_replace(lower(public.unaccent(trim(book.title))), '[^a-z0-9]+', '', 'g') = 'livroteste1'
    and lower(trim(book.author_name)) = 'madamekeen@gmail.com';

  if cardinality(test_book_ids) = 0 then
    raise notice 'Livro teste 1 / madamekeen@gmail.com não foi encontrado ou já estava arquivado.';
    return;
  end if;

  update public.author_books linked
  set deleted_at = now(), updated_at = now()
  where linked.deleted_at is null and linked.book_id = any(test_book_ids);

  update public.book_stand_availability availability
  set deleted_at = now(), updated_at = now()
  where availability.deleted_at is null and availability.book_id = any(test_book_ids);

  delete from public.event_books linked
  where linked.book_id = any(test_book_ids);

  update public.community_contributions contribution
  set deleted_at = now(), updated_at = now()
  where contribution.deleted_at is null
    and contribution.contribution_type = 'sapphic_book'
    and (
      contribution.review_target_id in (select book_id::text from unnest(test_book_ids) book_id)
      or (
        regexp_replace(lower(public.unaccent(trim(coalesce(contribution.payload->>'book_name', '')))), '[^a-z0-9]+', '', 'g') = 'livroteste1'
        and lower(trim(coalesce(contribution.payload->>'author', ''))) = 'madamekeen@gmail.com'
      )
    );

  update public.books book
  set active = false, deleted_at = now(), updated_at = now()
  where book.id = any(test_book_ids);

  perform public.bump_content_manifest('books');
  perform public.bump_content_manifest('passport');
end;
$$;
