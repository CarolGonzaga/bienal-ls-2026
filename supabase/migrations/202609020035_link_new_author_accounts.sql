-- Vincula as contas de autoras recebidas em 02/09/2026 que ainda não faziam
-- parte do lote anterior. A relação permanente usa os UUIDs de auth.users e
-- public.authors; source_id, nome e email servem somente para localizar e
-- validar a entidade canônica durante esta execução.
do $$
declare
  author_links jsonb := jsonb_build_array(
    jsonb_build_object('name', 'Alexia',             'source_id', 'alexia',             'email', 'alexia-1604@hotmail.com',          'user_id', '9b9dca5d-4f4c-4e9b-b313-caa0fe02e790'),
    jsonb_build_object('name', 'Arquelana',          'source_id', 'arquelana',          'email', 'arquelanalivros@gmail.com',        'user_id', '22d44396-071c-4137-b5de-3dfcbcc6767b'),
    jsonb_build_object('name', 'Clara Alves',        'source_id', 'clara-alves',        'email', 'contato@claraalves.com',           'user_id', 'e5e96887-0802-4d52-949b-7128300b6f98'),
    jsonb_build_object('name', 'Emely Luiza Curcio', 'source_id', 'emely-luiza-curcio', 'email', 'autoraemely@gmail.com',             'user_id', 'efbc75c6-6fc8-426d-9151-b541bfe3a599'),
    jsonb_build_object('name', 'Fernanda V.',        'source_id', 'fernanda-v',         'email', 'itsfernandav@yahoo.com',            'user_id', '0196db2c-2c87-4f64-b379-1dc0da4330e1'),
    jsonb_build_object('name', 'Gina Milbradt',      'source_id', 'gina-milbradt',      'email', 'autoraginamilbradt@gmail.com',     'user_id', '47784dbb-90bd-4607-a4a4-123d72a51d86'),
    jsonb_build_object('name', 'Giu Domingues',      'source_id', 'giu-domingues',      'email', 'giuldom@gmail.com',                 'user_id', '5b9df117-b23a-4cde-8e94-44ead66987b2'),
    jsonb_build_object('name', 'Helena Nolasco',     'source_id', 'helena-nolasco',     'email', 'helenanasentrelinhas@gmail.com',   'user_id', '092cef92-9b08-4a3f-bcc3-990781f4ef26'),
    jsonb_build_object('name', 'Ingrid Gomm',        'source_id', 'ingrid-gomm',        'email', 'ingridgomm.escritora@gmail.com',   'user_id', '01dc23e3-ff49-45d1-b130-7696e281c8ba'),
    jsonb_build_object('name', 'Ingrid Paranhos',    'source_id', 'ingrid-paranhos',    'email', 'paranhosingrid2@gmail.com',         'user_id', 'd519c315-0bbc-4d97-9f13-550e51e3be3b'),
    jsonb_build_object('name', 'Line Cunha',         'source_id', 'line-cunha',         'email', 'linecnha@gmail.com',                'user_id', '149d56a6-4606-4b5e-968e-21fc2aed0b4a'),
    jsonb_build_object('name', 'Marina Basso',       'source_id', 'marina-basso',       'email', 'marinabassosilva@gmail.com',       'user_id', '27ca3c0c-d254-47be-a5bc-477d05a5b5c5'),
    jsonb_build_object('name', 'Thaís Boito',        'source_id', 'thais-boito',        'email', 'thaissb8@gmail.com',                'user_id', '53e801b8-fba3-49de-8aee-97d9d5c5c771')
  );
  link record;
  linked_author_id uuid;
  linked_author_count integer;
  auth_email text;
  verified_link_count integer;
  created_author_count integer := 0;
begin
  if jsonb_array_length(author_links) <> 13 then
    raise exception 'A lista de novos vínculos deve conter exatamente 13 autoras únicas';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(author_links) as item(name text, source_id text, email text, user_id uuid)
    group by lower(trim(item.source_id))
    having count(*) > 1
  ) or exists (
    select 1
    from jsonb_to_recordset(author_links) as item(name text, source_id text, email text, user_id uuid)
    group by item.user_id
    having count(*) > 1
  ) or exists (
    select 1
    from jsonb_to_recordset(author_links) as item(name text, source_id text, email text, user_id uuid)
    group by lower(trim(item.email))
    having count(*) > 1
  ) then
    raise exception 'A lista contém source_id, UID ou email duplicado';
  end if;

  create temporary table new_author_link_batch (
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
      raise exception 'Email divergente para o UID %: esperado %, encontrado %', link.user_id, link.email, auth_email;
    end if;

    select count(*), min(candidate.author_id::text)::uuid
      into linked_author_count, linked_author_id
    from (
      select account.author_id
      from public.author_accounts account
      join public.authors author on author.id = account.author_id
      where account.user_id = link.user_id
        and author.deleted_at is null

      union

      select author.id
      from public.authors author
      where author.deleted_at is null
        and (
          lower(trim(author.slug)) = link.source_id
          or regexp_replace(
               translate(lower(author.name), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
               '[^a-z0-9]+', '', 'g'
             ) = regexp_replace(
               translate(lower(link.name), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
               '[^a-z0-9]+', '', 'g'
             )
        )

      union

      select event_author.author_id
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
    ) candidate;

    if linked_author_count > 1 then
      raise exception 'Mais de uma autora corresponde à conta % (%). Informe o UUID de public.authors.', link.user_id, link.email;
    end if;

    if linked_author_count = 0 then
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

    insert into new_author_link_batch (source_id, email, user_id, author_id, author_name)
    values (link.source_id, link.email, link.user_id, linked_author_id, link.name);
  end loop;

  for link in select * from new_author_link_batch
  loop
    insert into public.author_accounts (author_id, user_id, active, verified_at, verified_by)
    values (link.author_id, link.user_id, true, now(), null)
    on conflict (user_id) do update
      set author_id = excluded.author_id,
          active = true,
          verified_at = now(),
          verified_by = coalesce(author_accounts.verified_by, excluded.verified_by);

    insert into public.profiles (id, email, display_name, role, updated_at)
    values (link.user_id, link.email, link.author_name, 'author', now())
    on conflict (id) do update
      set email = excluded.email,
          role = 'author',
          updated_at = now();
  end loop;

  select count(*)
    into verified_link_count
  from new_author_link_batch batch
  join public.author_accounts account
    on account.author_id = batch.author_id
   and account.user_id = batch.user_id
   and account.active
  join public.profiles profile
    on profile.id = batch.user_id
   and profile.role = 'author'
   and lower(trim(profile.email)) = batch.email;

  if verified_link_count <> 13 then
    raise exception 'Verificação final incompleta: % de 13 vínculos confirmados', verified_link_count;
  end if;

  raise notice '13 novos vínculos confirmados; % entidade(s) de autora criada(s)', created_author_count;
end;
$$;
