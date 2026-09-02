-- Libera o painel de autoras para as contas de Agatha Menezes e Helena Vieira.
-- O vínculo permanente é author_accounts(author_id, user_id); slug, nome e
-- email são usados somente para localizar e validar os registros nesta execução.
do $$
declare
  author_links jsonb := jsonb_build_array(
    jsonb_build_object(
      'name', 'Agatha Menezes',
      'source_id', 'agatha-menezes',
      'email', 'agathafelix160@gmail.com',
      'user_id', '9226216e-dff0-4bac-a717-cb0570506347'
    ),
    jsonb_build_object(
      'name', 'Helena Vieira',
      'source_id', 'helena-vieira',
      'email', 'helenavieiraautora@gmail.com',
      'user_id', 'c2034aa0-ffd8-4708-963c-e860094a408e'
    )
  );
  link record;
  linked_author_id uuid;
  auth_email text;
  verified_link_count integer;
  created_author_count integer := 0;
begin
  if jsonb_array_length(author_links) <> 2 then
    raise exception 'A lista deve conter exatamente duas autoras';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(author_links)
      as item(name text, source_id text, email text, user_id uuid)
    group by item.user_id
    having count(*) > 1
  ) or exists (
    select 1
    from jsonb_to_recordset(author_links)
      as item(name text, source_id text, email text, user_id uuid)
    group by lower(trim(item.email))
    having count(*) > 1
  ) then
    raise exception 'A lista contém UID ou email duplicado';
  end if;

  create temporary table author_link_batch (
    source_id text primary key,
    email text not null,
    user_id uuid not null unique,
    author_id uuid not null unique,
    author_name text not null
  ) on commit drop;

  for link in
    select
      trim(item.name) as name,
      lower(trim(item.source_id)) as source_id,
      lower(trim(item.email)) as email,
      item.user_id
    from jsonb_to_recordset(author_links)
      as item(name text, source_id text, email text, user_id uuid)
  loop
    select lower(trim(auth_user.email))
      into auth_email
    from auth.users auth_user
    where auth_user.id = link.user_id;

    if auth_email is null then
      raise exception 'Conta do Auth não encontrada para o UID: %', link.user_id;
    end if;

    if auth_email <> link.email then
      raise exception 'Email divergente para o UID %: esperado %, encontrado %',
        link.user_id, link.email, auth_email;
    end if;

    -- Um vínculo já existente pelo UUID da conta sempre tem prioridade.
    select account.author_id
      into linked_author_id
    from public.author_accounts account
    join public.authors author on author.id = account.author_id
    where account.user_id = link.user_id
      and author.deleted_at is null
    limit 1;

    -- Em seguida, usa o identificador textual fornecido pela equipe.
    if linked_author_id is null then
      select author.id
        into linked_author_id
      from public.authors author
      where lower(trim(author.slug)) = link.source_id
        and author.deleted_at is null
      limit 1;
    end if;

    -- O nome normalizado cobre registros antigos cujo slug tenha mudado.
    if linked_author_id is null then
      select author.id
        into linked_author_id
      from public.authors author
      where author.deleted_at is null
        and regexp_replace(
              translate(lower(author.name), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
              '[^a-z0-9]+', '', 'g'
            ) = regexp_replace(
              translate(lower(link.name), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
              '[^a-z0-9]+', '', 'g'
            )
      order by author.published desc, author.active desc, author.updated_at desc
      limit 1;
    end if;

    -- Por último, tenta aproveitar a autora associada a eventos já cadastrados.
    if linked_author_id is null then
      select event_author.author_id
        into linked_author_id
      from public.events event
      join public.event_authors event_author on event_author.event_id = event.id
      join public.authors author on author.id = event_author.author_id
      where author.deleted_at is null
        and (
          lower(trim(event.author_source_id)) in (link.source_id, lower(trim(link.name)))
          or regexp_replace(
               translate(lower(event.author_name), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
               '[^a-z0-9]+', '', 'g'
             ) = regexp_replace(
               translate(lower(link.name), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
               '[^a-z0-9]+', '', 'g'
             )
        )
      order by author.published desc, author.active desc, author.updated_at desc
      limit 1;
    end if;

    if linked_author_id is null then
      insert into public.authors (slug, name, first_name, active, published)
      values (link.source_id, link.name, split_part(link.name, ' ', 1), true, false)
      on conflict (slug) do update
        set active = true,
            deleted_at = null,
            deleted_by = null,
            updated_at = now()
      returning id into linked_author_id;

      created_author_count := created_author_count + 1;
    end if;

    update public.authors
    set active = true,
        deleted_at = null,
        deleted_by = null,
        updated_at = now()
    where id = linked_author_id;

    insert into public.event_authors (event_id, author_id)
    select event.id, linked_author_id
    from public.events event
    where lower(trim(event.author_source_id)) in (link.source_id, lower(trim(link.name)))
       or regexp_replace(
            translate(lower(event.author_name), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
            '[^a-z0-9]+', '', 'g'
          ) = regexp_replace(
            translate(lower(link.name), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
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
    values (linked_author_id, link.user_id, true, now(), null)
    on conflict (user_id) do update
      set author_id = excluded.author_id,
          active = true,
          verified_at = now(),
          verified_by = coalesce(author_accounts.verified_by, excluded.verified_by);

    insert into public.profiles (id, email, display_name, role, updated_at)
    values (link.user_id, link.email, link.name, 'author', now())
    on conflict (id) do update
      set email = excluded.email,
          display_name = coalesce(profiles.display_name, excluded.display_name),
          role = 'author',
          updated_at = now();

    insert into author_link_batch (source_id, email, user_id, author_id, author_name)
    values (link.source_id, link.email, link.user_id, linked_author_id, link.name);
  end loop;

  select count(*)
    into verified_link_count
  from author_link_batch batch
  join public.author_accounts account
    on account.author_id = batch.author_id
   and account.user_id = batch.user_id
   and account.active
  join public.profiles profile
    on profile.id = batch.user_id
   and profile.role = 'author'
   and lower(trim(profile.email)) = batch.email;

  if verified_link_count <> 2 then
    raise exception 'Verificação final incompleta: % de 2 vínculos confirmados',
      verified_link_count;
  end if;

  raise notice '2 novos acessos ao painel confirmados; % entidade(s) de autora criada(s)',
    created_author_count;
end;
$$;
