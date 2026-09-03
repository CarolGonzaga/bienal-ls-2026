-- Impede que solicitações incompletas cheguem à fila administrativa.
-- Rascunhos continuam aceitando dados parciais; a validação ocorre ao enviar.

create or replace function public.validate_author_content_payload(
  p_request_type text,
  p_payload jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  payload jsonb := coalesce(p_payload, '{}'::jsonb);
  event_date date;
  start_time time;
  end_time time;
  date_text text;
  start_text text;
  end_text text;
  has_location boolean;
  selected_book_id uuid;
begin
  if jsonb_typeof(payload) <> 'object' then
    raise exception using errcode = '22023', message = 'Os dados enviados são inválidos.';
  end if;

  if p_request_type = 'profile' then
    if coalesce(payload->>'participation_status', '') <> 'participating'
      or nullif(trim(coalesce(payload->>'consent_version', '')), '') is null
      or nullif(trim(coalesce(payload->>'consent_accepted_at', '')), '') is null then
      raise exception using errcode = '22023', message = 'Confirme a participação e o consentimento do Passaporte antes de enviar.';
    end if;
    if nullif(trim(coalesce(payload->>'photo_path', '')), '') is null then
      raise exception using errcode = '22023', message = 'Envie uma foto para o perfil do Passaporte.';
    end if;
    if nullif(trim(coalesce(payload->>'bio', '')), '') is null then
      raise exception using errcode = '22023', message = 'Preencha a bio antes de enviar para revisão.';
    end if;
    if char_length(coalesce(payload->>'bio', '')) > 360 then
      raise exception using errcode = '22023', message = 'A bio deve ter no máximo 360 caracteres.';
    end if;
    if nullif(trim(coalesce(payload->>'message', '')), '') is null then
      raise exception using errcode = '22023', message = 'Preencha a mensagem para as leitoras antes de enviar para revisão.';
    end if;
    return;
  end if;

  if p_request_type in ('presence', 'autograph') then
    date_text := nullif(trim(coalesce(payload->>(case when p_request_type = 'presence' then 'presence_date' else 'event_date' end), '')), '');
    start_text := nullif(trim(coalesce(payload->>'start_time', '')), '');
    end_text := nullif(trim(coalesce(payload->>'end_time', '')), '');
    has_location := nullif(trim(coalesce(payload->>'exhibitor_id', '')), '') is not null
      or nullif(trim(coalesce(payload->>'stand_code', '')), '') is not null;

    if date_text is null then
      raise exception using errcode = '22023', message = 'Informe a data do evento.';
    end if;
    if start_text is null then
      raise exception using errcode = '22023', message = 'Informe o horário inicial.';
    end if;
    if not has_location then
      raise exception using errcode = '22023', message = 'Selecione o estande do evento.';
    end if;

    begin
      event_date := date_text::date;
      start_time := start_text::time;
      end_time := case when end_text is null then null else end_text::time end;
    exception when others then
      raise exception using errcode = '22023', message = 'Confira a data e os horários informados.';
    end;

    if event_date < date '2026-09-04' or event_date > date '2026-09-13' then
      raise exception using errcode = '22023', message = 'A data deve estar entre 04/09/2026 e 13/09/2026.';
    end if;
    if end_time is not null and end_time < start_time then
      raise exception using errcode = '22023', message = 'O horário final não pode ser anterior ao horário inicial.';
    end if;
    return;
  end if;

  if p_request_type = 'book' then
    if nullif(trim(coalesce(payload->>'title', '')), '') is null then
      raise exception using errcode = '22023', message = 'Informe o título do livro.';
    end if;
    if nullif(trim(coalesce(payload->>'cover_url', '')), '') is not null
      and payload->>'cover_url' !~* '^https?://' then
      raise exception using errcode = '22023', message = 'A URL da capa deve começar com http:// ou https://.';
    end if;
    if lower(coalesce(payload->>'available_for_sale', 'false')) in ('true', 't', '1', 'yes', 'on')
      and nullif(trim(coalesce(payload->>'exhibitor_id', '')), '') is null
      and nullif(trim(coalesce(payload->>'stand_code', '')), '') is null then
      raise exception using errcode = '22023', message = 'Selecione o estande onde o livro estará à venda.';
    end if;
    return;
  end if;

  if p_request_type = 'availability' then
    if nullif(trim(coalesce(payload->>'book_id', '')), '') is null then
      raise exception using errcode = '22023', message = 'Selecione o livro disponível para venda.';
    end if;
    begin
      selected_book_id := (payload->>'book_id')::uuid;
    exception when others then
      raise exception using errcode = '22023', message = 'O livro selecionado é inválido.';
    end;
    if nullif(trim(coalesce(payload->>'exhibitor_id', '')), '') is null
      and nullif(trim(coalesce(payload->>'stand_code', '')), '') is null then
      raise exception using errcode = '22023', message = 'Selecione o estande onde o livro estará à venda.';
    end if;
  end if;
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
    perform public.validate_author_content_payload(new.request_type, new.payload);
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

drop trigger if exists validate_author_change_request_submission on public.author_change_requests;
create trigger validate_author_change_request_submission
before insert or update of request_type, payload, status, urgent_type, affected_date
on public.author_change_requests
for each row execute function public.validate_author_change_request_submission();

create or replace function public.validate_pending_passport_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'pending' then
    perform public.validate_author_content_payload('profile', to_jsonb(new));
  end if;
  return new;
end;
$$;

drop trigger if exists validate_pending_passport_profile on public.passport_profiles;
create trigger validate_pending_passport_profile
before insert or update on public.passport_profiles
for each row execute function public.validate_pending_passport_profile();

revoke execute on function public.validate_author_content_payload(text, jsonb) from public, anon;
grant execute on function public.validate_author_content_payload(text, jsonb) to authenticated;
