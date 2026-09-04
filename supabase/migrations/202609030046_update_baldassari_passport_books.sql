-- Ajusta os livros publicados de G. B. Baldassari sem depender do apelido da autora.
-- O vínculo canônico é resolvido pelo UUID da conta já associada em author_accounts.

do $$
declare
  target_author_id uuid;
  pitada_book_id uuid;
  active_featured_count integer;
  next_display_order smallint;
  changed_amor_fati integer;
begin
  select account.author_id
    into target_author_id
  from public.author_accounts account
  where account.user_id = 'bf86dcca-7ab2-42e9-bdd5-eb10d343b06c'::uuid
    and account.active
  limit 1;

  if target_author_id is null then
    raise exception
      'Conta de G. B. Baldassari não está vinculada em author_accounts (UID bf86dcca-7ab2-42e9-bdd5-eb10d343b06c).';
  end if;

  -- A marcação exibida na vitrine e nos cards do Passaporte pertence ao livro,
  -- portanto ela deve ser removida de todo registro ativo correspondente.
  update public.books book
  set autograph_available = false,
      updated_at = now()
  where book.deleted_at is null
    and book.active
    and regexp_replace(lower(public.unaccent(trim(book.title))), '[^a-z0-9]+', '', 'g') = 'amorfati'
    and (
      regexp_replace(lower(public.unaccent(trim(book.author_name))), '[^a-z0-9]+', '', 'g') like '%baldassari'
      or exists (
        select 1
        from public.author_books linked
        where linked.author_id = target_author_id
          and linked.book_id = book.id
          and linked.deleted_at is null
      )
    );

  get diagnostics changed_amor_fati = row_count;
  if changed_amor_fati = 0 then
    raise exception 'Livro ativo "Amor Fati", de G. B. Baldassari, não foi localizado.';
  end if;

  select book.id
    into pitada_book_id
  from public.books book
  where book.deleted_at is null
    and book.active
    and regexp_replace(lower(public.unaccent(trim(book.title))), '[^a-z0-9]+', '', 'g') = 'umapitadadesorte'
    and (
      regexp_replace(lower(public.unaccent(trim(book.author_name))), '[^a-z0-9]+', '', 'g') like '%baldassari'
      or exists (
        select 1
        from public.author_books linked
        where linked.author_id = target_author_id
          and linked.book_id = book.id
          and linked.deleted_at is null
      )
    )
  order by
    exists (
      select 1
      from public.author_books linked
      where linked.author_id = target_author_id
        and linked.book_id = book.id
        and linked.deleted_at is null
    ) desc,
    (nullif(trim(book.cover_url), '') is not null) desc,
    length(coalesce(book.notes, '')) desc,
    book.created_at asc
  limit 1;

  if pitada_book_id is null then
    raise exception 'Livro ativo "Uma Pitada de Sorte", de G. B. Baldassari, não foi localizado.';
  end if;

  -- Restaura o vínculo caso ele exista arquivado. O destaque é aplicado depois
  -- da validação para respeitar o limite global de três livros no Passaporte.
  insert into public.author_books (author_id, book_id, featured, display_order)
  values (target_author_id, pitada_book_id, false, null)
  on conflict (author_id, book_id) do update
    set deleted_at = null,
        deleted_by = null,
        updated_at = now();

  if not exists (
    select 1
    from public.author_books linked
    where linked.author_id = target_author_id
      and linked.book_id = pitada_book_id
      and linked.deleted_at is null
      and linked.featured
  ) then
    select count(*)
      into active_featured_count
    from public.author_books linked
    where linked.author_id = target_author_id
      and linked.deleted_at is null
      and linked.featured;

    if active_featured_count >= 3 then
      raise exception
        'G. B. Baldassari já possui 3 livros destacados. Remova um destaque antes de incluir "Uma Pitada de Sorte".';
    end if;

    select slot::smallint
      into next_display_order
    from generate_series(1, 3) slot
    where not exists (
      select 1
      from public.author_books linked
      where linked.author_id = target_author_id
        and linked.deleted_at is null
        and linked.featured
        and linked.display_order = slot
    )
    order by slot
    limit 1;

    update public.author_books
    set featured = true,
        display_order = next_display_order,
        updated_at = now()
    where author_id = target_author_id
      and book_id = pitada_book_id;
  end if;
end;
$$;

select public.bump_content_manifest('books');
select public.bump_content_manifest('passport');
