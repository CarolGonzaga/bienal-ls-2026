-- Corrige a geração e validação dos códigos do passaporte.
-- A versão original usava gen_random_bytes() e digest() sem schema dentro de
-- funções com search_path vazio. Em projetos Supabase, pgcrypto costuma estar
-- no schema extensions, o que fazia a resolução dessas funções falhar.
--
-- gen_random_uuid() e sha256(bytea) são funções nativas do PostgreSQL. Assim,
-- o código não depende do schema em que pgcrypto foi instalado e mantém o
-- mesmo formato legível e o mesmo hash SHA-256 já utilizados pela aplicação.

create or replace function public.generate_passport_code(target_author_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  author_record public.authors;
  normalized_name text;
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  random_part text;
  generated_code text;
  attempt integer := 0;
  byte_value integer;
  random_uuid uuid;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessário';
  end if;

  select *
    into author_record
  from public.authors
  where id = target_author_id
    and deleted_at is null;

  if author_record.id is null then
    raise exception 'Autora não encontrada';
  end if;

  normalized_name := upper(
    regexp_replace(
      public.unaccent(split_part(trim(author_record.first_name), ' ', 1)),
      '[^A-Za-z0-9]',
      '',
      'g'
    )
  );

  if normalized_name = '' then
    normalized_name := 'AUTORA';
  end if;

  loop
    attempt := attempt + 1;
    random_part := '';
    random_uuid := pg_catalog.gen_random_uuid();

    for position in 0..7 loop
      byte_value := pg_catalog.get_byte(
        pg_catalog.decode(replace(random_uuid::text, '-', ''), 'hex'),
        position
      );
      random_part := random_part || substr(alphabet, (byte_value % length(alphabet)) + 1, 1);
    end loop;

    generated_code := normalized_name
      || '-'
      || substr(random_part, 1, 4)
      || '-'
      || substr(random_part, 5, 4);

    exit when not exists (
      select 1
      from public.passport_codes
      where code_plaintext = generated_code
    );

    if attempt >= 10 then
      raise exception 'Não foi possível gerar código único';
    end if;
  end loop;

  insert into public.passport_codes (
    author_id,
    code_plaintext,
    code_hash,
    valid_from,
    valid_until,
    version,
    created_by
  )
  values (
    target_author_id,
    generated_code,
    pg_catalog.encode(
      pg_catalog.sha256(
        pg_catalog.convert_to(public.normalize_passport_code(generated_code), 'UTF8')
      ),
      'hex'
    ),
    '2026-09-04 00:00:00 America/Sao_Paulo'::timestamptz,
    '2026-09-13 23:59:59 America/Sao_Paulo'::timestamptz,
    1,
    (select auth.uid())
  )
  on conflict (author_id) do update
    set code_plaintext = excluded.code_plaintext,
        code_hash = excluded.code_hash,
        valid_from = excluded.valid_from,
        valid_until = excluded.valid_until,
        version = public.passport_codes.version + 1,
        active = true,
        updated_at = now(),
        created_by = excluded.created_by;

  perform public.bump_content_manifest('passport_codes');
  return generated_code;
end;
$$;

create or replace function public.redeem_passport_stamp(raw_code text, redemption_source text)
returns table(author_id uuid, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched_author uuid;
begin
  if redemption_source not in ('manual', 'qr') then
    raise exception 'Fonte inválida';
  end if;

  select passport_codes.author_id
    into matched_author
  from public.passport_codes
  where code_hash = pg_catalog.encode(
      pg_catalog.sha256(
        pg_catalog.convert_to(public.normalize_passport_code(raw_code), 'UTF8')
      ),
      'hex'
    )
    and active
    and now() between valid_from and valid_until;

  if matched_author is null then
    raise exception 'Código inválido ou fora do período de validade';
  end if;

  insert into public.passport_stamps (user_id, author_id, source)
  values ((select auth.uid()), matched_author, redemption_source)
  on conflict (user_id, author_id) do nothing;

  return query select matched_author, 'confirmed'::text;
end;
$$;

grant execute on function public.generate_passport_code(uuid) to authenticated;
grant execute on function public.redeem_passport_stamp(text, text) to authenticated;
