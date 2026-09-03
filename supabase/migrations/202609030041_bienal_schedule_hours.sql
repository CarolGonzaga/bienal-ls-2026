-- Restringe presenças e sessões aos horários oficiais da Bienal 2026.

create or replace function public.validate_bienal_schedule_hours(
  p_event_date date,
  p_start_time time,
  p_end_time time default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  opening_time time;
  closing_time time;
  allowed_window text;
begin
  if p_event_date is null or p_start_time is null then
    return;
  end if;

  if p_event_date < date '2026-09-04' or p_event_date > date '2026-09-13' then
    raise exception using errcode = '22023', message = 'A data deve estar entre 04/09/2026 e 13/09/2026.';
  end if;

  if p_event_date = date '2026-09-13' then
    opening_time := time '10:00';
    closing_time := time '21:00';
    allowed_window := '10h às 21h';
  elsif extract(isodow from p_event_date) in (6, 7) then
    opening_time := time '10:00';
    closing_time := time '22:00';
    allowed_window := '10h às 22h';
  else
    opening_time := time '09:00';
    closing_time := time '22:00';
    allowed_window := '09h às 22h';
  end if;

  if p_start_time < opening_time or p_start_time > closing_time then
    raise exception using errcode = '22023', message = format(
      'Neste dia, o horário inicial deve ficar entre %s.', allowed_window
    );
  end if;
  if p_end_time is not null and (p_end_time < opening_time or p_end_time > closing_time) then
    raise exception using errcode = '22023', message = format(
      'Neste dia, o horário final deve ficar entre %s.', allowed_window
    );
  end if;
  if p_end_time is not null and p_end_time < p_start_time then
    raise exception using errcode = '22023', message = 'O horário final não pode ser anterior ao horário inicial.';
  end if;
end;
$$;

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
  date_key text;
begin
  if p_request_type = 'presence' then
    roaming_presence := lower(coalesce(payload->>'location_unspecified', 'false')) in ('true', 't', '1', 'yes', 'on')
      or (
        nullif(trim(coalesce(payload->>'exhibitor_id', '')), '') is null
        and nullif(trim(coalesce(payload->>'stand_code', '')), '') is null
        and char_length(trim(coalesce(payload->>'notes', ''))) >= 10
      );
    if roaming_presence then
      if char_length(trim(coalesce(payload->>'notes', ''))) < 10 then
        raise exception using errcode = '22023', message = 'Conte, de forma breve, em qual região da Bienal as leitoras poderão encontrar você.';
      end if;
      payload := jsonb_set(payload, '{stand_code}', to_jsonb('SEM LOCAL FIXO'::text), true);
    end if;
  end if;

  perform public.validate_author_content_payload(p_request_type, payload);

  if p_request_type in ('presence', 'autograph') then
    date_key := case when p_request_type = 'presence' then 'presence_date' else 'event_date' end;
    perform public.validate_bienal_schedule_hours(
      (payload->>date_key)::date,
      (payload->>'start_time')::time,
      nullif(payload->>'end_time', '')::time
    );
  end if;
end;
$$;

create or replace function public.validate_bienal_schedule_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'author_presences' then
    perform public.validate_bienal_schedule_hours(new.presence_date, new.start_time, new.end_time);
  elsif new.deleted_at is null and new.active and new.start_time is not null then
    perform public.validate_bienal_schedule_hours(new.event_date, new.start_time, new.end_time);
  end if;
  return new;
end;
$$;

drop trigger if exists validate_bienal_schedule_hours on public.author_presences;
create trigger validate_bienal_schedule_hours
before insert or update of presence_date, start_time, end_time
on public.author_presences
for each row execute function public.validate_bienal_schedule_row();

drop trigger if exists validate_bienal_schedule_hours on public.events;
create trigger validate_bienal_schedule_hours
before insert or update of event_date, start_time, end_time, active, deleted_at
on public.events
for each row execute function public.validate_bienal_schedule_row();

revoke execute on function public.validate_bienal_schedule_hours(date, time, time) from public, anon;
grant execute on function public.validate_bienal_schedule_hours(date, time, time) to authenticated;

notify pgrst, 'reload schema';
