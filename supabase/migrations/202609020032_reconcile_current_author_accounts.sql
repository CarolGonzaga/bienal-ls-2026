-- Reconcilia novamente a relação vigente de contas de autoras. Esta migration
-- existe separadamente porque contas criadas depois da execução da migration
-- 022 não seriam processadas por ela uma segunda vez.
--
-- Provisiona as entidades canônicas de autora que ainda não existem e vincula
-- cada conta do Auth por UUID. Os IDs informados abaixo são IDs internos da
-- programação, não usernames das contas.
--
-- Depois desta execução, o acesso ao painel depende exclusivamente de
-- author_accounts(author_id, user_id). Alterações futuras no username, nome ou
-- email da conta não rompem o vínculo já criado.
do $$
declare
  author_links jsonb := jsonb_build_array(
    jsonb_build_object('source_id', 'andremis',        'email', 'andremis.escritora@gmail.com',     'user_id', '3a544123-a721-400a-a386-39c0432d6fdc'),
    jsonb_build_object('source_id', 'baldassari',      'email', 'baldassarigb@gmail.com',           'user_id', 'bf86dcca-7ab2-42e9-bdd5-eb10d343b06c'),
    jsonb_build_object('source_id', 'bia-r-d-ramos',   'email', 'biardramoslivros@gmail.com',       'user_id', '5d5956f7-57d9-4193-a5b9-f1be7642e212'),
    jsonb_build_object('source_id', 'carol-cara',      'email', 'carol.cara12@gmail.com',           'user_id', '11bb3425-86da-4b8c-b12d-b511492958e6'),
    jsonb_build_object('source_id', 'danda-odeleci',   'email', 'dandaautora@gmail.com',            'user_id', '66ba0f58-8d91-4c7f-9a12-e0094ed7db03'),
    jsonb_build_object('source_id', 'englantine',      'email', 'englantinescrita@gmail.com',       'user_id', '911b5a66-5fc3-4439-a783-a1f36bd8f0b8'),
    jsonb_build_object('source_id', 'evelin-sousa',    'email', 'evelinsilva631@gmail.com',         'user_id', '287c4427-2742-4002-b0c1-8acbd8788ee1'),
    jsonb_build_object('source_id', 'gih-alves',       'email', 'contatogihalves@gmail.com',        'user_id', '0f93bea2-d9a6-4eff-acda-bbe9e0fb499b'),
    jsonb_build_object('source_id', 'graziela-santos', 'email', 'grazieautora@gmail.com',           'user_id', '84b93f25-7338-4087-a8c9-6d69eb8f1feb'),
    jsonb_build_object('source_id', 'ju-mesquita',     'email', 'jumesquitaautora@gmail.com',       'user_id', '5816565a-7547-40cc-af8f-331c7412cff7'),
    jsonb_build_object('source_id', 'jus-saraiva',     'email', 'contatojuliasaraivabr@gmail.com',  'user_id', 'd6b223ea-1bb5-459f-8417-078aa97e5889'),
    jsonb_build_object('source_id', 'karoline-mandu',  'email', 'karolinemandu.conteudo@gmail.com', 'user_id', '6e68e984-6eec-4f60-8ca2-d8b61cbadc1e'),
    jsonb_build_object('source_id', 'lari-alcantara',  'email', 'chadaescrita@gmail.com',           'user_id', '8b8a160c-37b5-4aa9-8f25-c40783a46efd'),
    jsonb_build_object('source_id', 'laura-rodrigues', 'email', 'laurardautora@gmail.com',          'user_id', 'ab692685-8141-4c24-9b7e-8c273d3f38fb'),
    jsonb_build_object('source_id', 'liliane-reis',    'email', 'lilianereis36@gmail.com',          'user_id', '5becc1be-0f75-49ef-9dba-48e1c2b52605'),
    jsonb_build_object('source_id', 'luana-cruz',      'email', 'luanacruiz@gmail.com',             'user_id', '9649d1b7-c45a-4910-8038-c8b56c0fa216'),
    jsonb_build_object('source_id', 'luisa-landre',    'email', 'lu_guilan@hotmail.com',            'user_id', '9ae136f0-7a12-4af6-a4ad-9156089dd03b'),
    jsonb_build_object('source_id', 'mariana-rosa',    'email', 'mariana.mrosa94@gmail.com',        'user_id', '672e1406-aa26-469d-8e5f-468ebf387e4b'),
    jsonb_build_object('source_id', 'marina-feijoo',   'email', 'marinadfeijoo@gmail.com',          'user_id', '70b234e7-3539-4ee7-84b2-7c41bef088b8'),
    jsonb_build_object('source_id', 'nicole-oliveira', 'email', 'oliveiranic_@hotmail.com',         'user_id', 'f2e93dd3-2c8f-4931-b419-a41e00c7ad9d'),
    jsonb_build_object('source_id', 'sarah-oliveira',  'email', 'autorasaraholiveira@gmail.com',    'user_id', '49d8af29-b475-4a65-ab4f-83ed43826711'),
    jsonb_build_object('source_id', 'stephanie-cruz',  'email', 'cruzstephanie2012@gmail.com',      'user_id', 'eafaf32a-f3fd-40cc-aed5-39f140773811'),
    jsonb_build_object('source_id', 'victoria-mendes', 'email', 'victoriaesmendes@gmail.com',       'user_id', '09b5dde6-ef42-4c14-8abd-ae842226f9f1'),
    jsonb_build_object('source_id', 'victoria-moon',   'email', 'contatovictoriamoon@gmail.com',    'user_id', 'd5c4370d-82bd-4f4a-8ba2-0ee739ce77ba')
  );
  link record;
  linked_author_id uuid;
  linked_author_count integer;
  auth_email text;
  auth_display_name text;
  canonical_author_name text;
  canonical_first_name text;
  verified_link_count integer;
  created_author_count integer := 0;
begin
  if jsonb_array_length(author_links) <> 24 then
    raise exception 'A lista de vínculos deve conter exatamente 24 autoras únicas';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(author_links) as item(source_id text, email text, user_id uuid)
    group by item.source_id
    having count(*) > 1
  ) or exists (
    select 1
    from jsonb_to_recordset(author_links) as item(source_id text, email text, user_id uuid)
    group by item.user_id
    having count(*) > 1
  ) or exists (
    select 1
    from jsonb_to_recordset(author_links) as item(source_id text, email text, user_id uuid)
    group by lower(trim(item.email))
    having count(*) > 1
  ) then
    raise exception 'A lista contém ID interno, UID ou email duplicado';
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
      lower(trim(item.source_id)) as source_id,
      lower(trim(item.email)) as email,
      item.user_id
    from jsonb_to_recordset(author_links)
      as item(source_id text, email text, user_id uuid)
  loop
    -- UID e email identificam e validam a conta. Username não participa.
    select
      lower(trim(auth_user.email)),
      nullif(
        trim(
          coalesce(
            auth_user.raw_user_meta_data->>'name',
            auth_user.raw_user_meta_data->>'full_name'
          )
        ),
        ''
      )
      into auth_email, auth_display_name
    from auth.users auth_user
    where auth_user.id = link.user_id;

    if auth_email is null then
      raise exception 'Conta do Auth não encontrada para o UID: %', link.user_id;
    end if;

    if auth_email <> link.email then
      raise exception 'Email divergente para o UID %: esperado %, encontrado %', link.user_id, link.email, auth_email;
    end if;

    -- Procura uma entidade canônica já existente pelo ID interno, por um
    -- vínculo de evento ou pelo nome completo existente na programação.
    select count(*), min(candidate.author_id::text)::uuid
      into linked_author_count, linked_author_id
    from (
      select account.author_id
      from public.author_accounts account
      join public.authors author on author.id = account.author_id
      where account.user_id = link.user_id
        and author.deleted_at is null

      union

      select author.id as author_id
      from public.authors author
      where author.slug = link.source_id
        and author.deleted_at is null

      union

      select event_author.author_id
      from public.events event
      join public.event_authors event_author on event_author.event_id = event.id
      join public.authors author on author.id = event_author.author_id
      where event.author_source_id = link.source_id
        and author.deleted_at is null

      union

      select author.id
      from public.events event
      join public.authors author
        on regexp_replace(
             translate(lower(author.name), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
             '[^a-z0-9]+', '', 'g'
           ) = regexp_replace(
             translate(lower(event.author_name), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
             '[^a-z0-9]+', '', 'g'
           )
      where event.author_source_id = link.source_id
        and author.deleted_at is null
    ) candidate;

    if linked_author_count > 1 then
      raise exception 'Mais de uma autora corresponde ao ID interno: %. Informe o UUID de public.authors.', link.source_id;
    end if;

    if linked_author_count = 0 then
      -- A programação não cria public.authors automaticamente. Quando a linha
      -- canônica estiver ausente, usa o nome da programação; para IDs sem
      -- evento, usa o perfil da conta e por último o próprio ID legível.
      select coalesce(
        (
          select nullif(trim(min(event.author_name)), '')
          from public.events event
          where event.author_source_id = link.source_id
            and event.deleted_at is null
        ),
        (
          select nullif(trim(profile.display_name), '')
          from public.profiles profile
          where profile.id = link.user_id
        ),
        auth_display_name,
        initcap(replace(link.source_id, '-', ' '))
      )
        into canonical_author_name;

      canonical_first_name := split_part(trim(canonical_author_name), ' ', 1);

      insert into public.authors (
        slug,
        name,
        first_name,
        active,
        published
      )
      values (
        link.source_id,
        canonical_author_name,
        canonical_first_name,
        true,
        false
      )
      on conflict (slug) do update
        set active = true,
            deleted_at = null,
            deleted_by = null,
            updated_at = now()
      returning id into linked_author_id;

      created_author_count := created_author_count + 1;
    else
      select author.name
        into canonical_author_name
      from public.authors author
      where author.id = linked_author_id;
    end if;

    -- Reaproveita o ID interno para conectar a grade da programação à entidade
    -- canônica recém-localizada ou criada.
    insert into public.event_authors (event_id, author_id)
    select event.id, linked_author_id
    from public.events event
    where event.author_source_id = link.source_id
    on conflict do nothing;

    insert into author_link_batch (
      source_id,
      email,
      user_id,
      author_id,
      author_name
    )
    values (
      link.source_id,
      link.email,
      link.user_id,
      linked_author_id,
      canonical_author_name
    );
  end loop;

  -- O vínculo permanente usa somente UUIDs.
  for link in select * from author_link_batch
  loop
    insert into public.author_accounts (
      author_id,
      user_id,
      active,
      verified_at,
      verified_by
    )
    values (
      link.author_id,
      link.user_id,
      true,
      now(),
      null
    )
    on conflict (user_id) do update
      set author_id = excluded.author_id,
          active = true,
          verified_at = now(),
          verified_by = coalesce(author_accounts.verified_by, excluded.verified_by);

    insert into public.profiles (
      id,
      email,
      display_name,
      role,
      updated_at
    )
    values (
      link.user_id,
      link.email,
      link.author_name,
      'author',
      now()
    )
    on conflict (id) do update
      set email = excluded.email,
          role = 'author',
          updated_at = now();
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

  if verified_link_count <> 24 then
    raise exception 'Verificação final incompleta: % de 24 vínculos confirmados', verified_link_count;
  end if;

  raise notice '24 vínculos confirmados; % entidade(s) de autora criada(s)', created_author_count;
end;
$$;
