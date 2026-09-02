-- Libera o painel de autoras para Lola Chambrett.
-- O vínculo permanente usa os UUIDs de auth.users e public.authors.
do $$
declare
  target_name constant text := 'Lola Chambrett';
  target_source_id constant text := 'lola-chambrett';
  target_email constant text := 'lolachambrett@gmail.com';
  target_user_id constant uuid := '8aa07f14-f370-4b53-b104-16a24d6f6795';
  target_author_id uuid;
  auth_email text;
begin
  select lower(trim(auth_user.email))
    into auth_email
  from auth.users auth_user
  where auth_user.id = target_user_id;

  if auth_email is null then
    raise exception 'Conta do Auth não encontrada para o UID: %', target_user_id;
  end if;

  if auth_email <> target_email then
    raise exception 'Email divergente para o UID %: esperado %, encontrado %',
      target_user_id, target_email, auth_email;
  end if;

  -- Preserva um vínculo canônico já existente para esta conta.
  select account.author_id
    into target_author_id
  from public.author_accounts account
  join public.authors author on author.id = account.author_id
  where account.user_id = target_user_id
    and author.deleted_at is null
  limit 1;

  if target_author_id is null then
    select author.id
      into target_author_id
    from public.authors author
    where lower(trim(author.slug)) = target_source_id
      and author.deleted_at is null
    limit 1;
  end if;

  if target_author_id is null then
    select author.id
      into target_author_id
    from public.authors author
    where author.deleted_at is null
      and regexp_replace(
            translate(lower(author.name), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
            '[^a-z0-9]+', '', 'g'
          ) = regexp_replace(
            translate(lower(target_name), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
            '[^a-z0-9]+', '', 'g'
          )
    order by author.published desc, author.active desc, author.updated_at desc
    limit 1;
  end if;

  if target_author_id is null then
    select event_author.author_id
      into target_author_id
    from public.events event
    join public.event_authors event_author on event_author.event_id = event.id
    join public.authors author on author.id = event_author.author_id
    where author.deleted_at is null
      and (
        lower(trim(event.author_source_id)) in (target_source_id, lower(target_name))
        or regexp_replace(
             translate(lower(event.author_name), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
             '[^a-z0-9]+', '', 'g'
           ) = regexp_replace(
             translate(lower(target_name), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
             '[^a-z0-9]+', '', 'g'
           )
      )
    order by author.published desc, author.active desc, author.updated_at desc
    limit 1;
  end if;

  if target_author_id is null then
    insert into public.authors (slug, name, first_name, active, published)
    values (target_source_id, target_name, split_part(target_name, ' ', 1), true, false)
    on conflict (slug) do update
      set active = true,
          deleted_at = null,
          deleted_by = null,
          updated_at = now()
    returning id into target_author_id;
  else
    update public.authors
    set active = true,
        deleted_at = null,
        deleted_by = null,
        updated_at = now()
    where id = target_author_id;
  end if;

  insert into public.event_authors (event_id, author_id)
  select event.id, target_author_id
  from public.events event
  where lower(trim(event.author_source_id)) in (target_source_id, lower(target_name))
     or regexp_replace(
          translate(lower(event.author_name), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
          '[^a-z0-9]+', '', 'g'
        ) = regexp_replace(
          translate(lower(target_name), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
          '[^a-z0-9]+', '', 'g'
        )
  on conflict do nothing;

  insert into public.author_accounts (
    author_id,
    user_id,
    active,
    verified_at,
    verified_by
  )
  values (target_author_id, target_user_id, true, now(), null)
  on conflict (user_id) do update
    set author_id = excluded.author_id,
        active = true,
        verified_at = now(),
        verified_by = coalesce(author_accounts.verified_by, excluded.verified_by);

  insert into public.profiles (id, email, display_name, role, updated_at)
  values (target_user_id, target_email, target_name, 'author', now())
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(profiles.display_name, excluded.display_name),
        role = 'author',
        updated_at = now();

  if not exists (
    select 1
    from public.author_accounts account
    join public.profiles profile on profile.id = account.user_id
    where account.author_id = target_author_id
      and account.user_id = target_user_id
      and account.active
      and profile.role = 'author'
      and lower(trim(profile.email)) = target_email
  ) then
    raise exception 'O vínculo de Lola Chambrett não passou pela verificação final';
  end if;

  raise notice 'Acesso ao painel confirmado para Lola Chambrett (%).', target_user_id;
end;
$$;
