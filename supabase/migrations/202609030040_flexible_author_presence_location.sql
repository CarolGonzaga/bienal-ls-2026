-- Presenças podem acontecer sem estande fixo, desde que a autora informe
-- uma referência útil para as leitoras encontrá-la dentro da Bienal.

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select constraint_item.conname
    from pg_constraint constraint_item
    where constraint_item.conrelid = 'public.author_presences'::regclass
      and constraint_item.contype = 'c'
      and pg_get_constraintdef(constraint_item.oid) ilike '%exhibitor_id%'
      and pg_get_constraintdef(constraint_item.oid) ilike '%stand_code%'
  loop
    execute format(
      'alter table public.author_presences drop constraint %I',
      constraint_record.conname
    );
  end loop;
end;
$$;

alter table public.author_presences
  add constraint author_presences_location_or_guidance_check
  check (
    exhibitor_id is not null
    or nullif(trim(coalesce(stand_code, '')), '') is not null
    or char_length(trim(coalesce(notes, ''))) >= 10
  );

create or replace function public.validate_author_content_payload_v2(
  p_request_type text,
  p_payload jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  payload jsonb := coalesce(p_payload, '{}'::jsonb);
  roaming_presence boolean := false;
begin
  if p_request_type = 'presence' then
    roaming_presence := lower(coalesce(payload->>'location_unspecified', 'false'))
      in ('true', 't', '1', 'yes', 'on')
      or (
        nullif(trim(coalesce(payload->>'exhibitor_id', '')), '') is null
        and nullif(trim(coalesce(payload->>'stand_code', '')), '') is null
        and char_length(trim(coalesce(payload->>'notes', ''))) >= 10
      );

    if roaming_presence then
      if char_length(trim(coalesce(payload->>'notes', ''))) < 10 then
        raise exception using
          errcode = '22023',
          message = 'Conte, de forma breve, em qual região da Bienal as leitoras poderão encontrar você.';
      end if;

      -- A função-base continua responsável por validar data e horários. Este
      -- valor existe somente durante a validação e não é salvo no registro.
      payload := jsonb_set(payload, '{stand_code}', to_jsonb('SEM LOCAL FIXO'::text), true);
    end if;
  end if;

  perform public.validate_author_content_payload(p_request_type, payload);
end;
$$;

create or replace function public.validate_author_change_request_submission()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status <> 'pending' then
    return new;
  end if;

  if new.request_type in ('profile', 'presence', 'book', 'availability', 'autograph') then
    perform public.validate_author_content_payload_v2(new.request_type, new.payload);
  elsif new.request_type = 'urgent' then
    if nullif(trim(coalesce(new.payload->>'message', '')), '') is null then
      raise exception using errcode = '22023', message = 'Descreva a alteração urgente antes de enviar.';
    end if;
    if coalesce(new.urgent_type, '') <> 'important_information' and new.affected_date is null then
      raise exception using errcode = '22023', message = 'Informe a data afetada pela alteração.';
    end if;
    if new.affected_date is not null
      and (new.affected_date < date '2026-09-04' or new.affected_date > date '2026-09-13') then
      raise exception using errcode = '22023', message = 'A data afetada deve estar entre 04/09/2026 e 13/09/2026.';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.validate_author_content_payload_v2(text, jsonb) from public, anon;
grant execute on function public.validate_author_content_payload_v2(text, jsonb) to authenticated;

notify pgrst, 'reload schema';
