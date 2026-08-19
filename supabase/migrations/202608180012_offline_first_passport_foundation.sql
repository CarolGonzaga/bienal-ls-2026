-- Fundação offline-first, autoras e Passaporte Sáfico.
-- Mantém Supabase como fonte oficial, mas permite sincronização compacta por versões.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('reader', 'author', 'editor', 'admin'));

alter table public.exhibitors add column if not exists deleted_at timestamptz;
alter table public.exhibitors add column if not exists deleted_by uuid references auth.users(id) on delete set null;
alter table public.books add column if not exists deleted_at timestamptz;
alter table public.books add column if not exists deleted_by uuid references auth.users(id) on delete set null;
alter table public.events add column if not exists deleted_at timestamptz;
alter table public.events add column if not exists deleted_by uuid references auth.users(id) on delete set null;

create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
insert into public.feature_flags (key, enabled, config)
values ('passport', false, jsonb_build_object('planned_release', '2026-08-28'))
on conflict (key) do nothing;

create table if not exists public.content_manifest (
  id boolean primary key default true check (id),
  global_version bigint not null default 1,
  map_version bigint not null default 1,
  exhibitors_version bigint not null default 1,
  books_version bigint not null default 1,
  schedule_version bigint not null default 1,
  authors_version bigint not null default 1,
  passport_version bigint not null default 1,
  passport_codes_version bigint not null default 1,
  updated_at timestamptz not null default now()
);
insert into public.content_manifest (id) values (true) on conflict (id) do nothing;

create or replace function public.bump_content_manifest(section_name text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.content_manifest set
    global_version = global_version + 1,
    map_version = map_version + case when section_name = 'map' then 1 else 0 end,
    exhibitors_version = exhibitors_version + case when section_name = 'exhibitors' then 1 else 0 end,
    books_version = books_version + case when section_name = 'books' then 1 else 0 end,
    schedule_version = schedule_version + case when section_name = 'schedule' then 1 else 0 end,
    authors_version = authors_version + case when section_name = 'authors' then 1 else 0 end,
    passport_version = passport_version + case when section_name = 'passport' then 1 else 0 end,
    passport_codes_version = passport_codes_version + case when section_name = 'passport_codes' then 1 else 0 end,
    updated_at = now()
  where id = true;
end;
$$;

create or replace function public.bump_manifest_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.bump_content_manifest(tg_argv[0]);
  return null;
end;
$$;

drop trigger if exists exhibitors_manifest_bump on public.exhibitors;
create trigger exhibitors_manifest_bump after insert or update or delete on public.exhibitors
for each statement execute function public.bump_manifest_trigger('exhibitors');
drop trigger if exists books_manifest_bump on public.books;
create trigger books_manifest_bump after insert or update or delete on public.books
for each statement execute function public.bump_manifest_trigger('books');
drop trigger if exists events_manifest_bump on public.events;
create trigger events_manifest_bump after insert or update or delete on public.events
for each statement execute function public.bump_manifest_trigger('schedule');

create table if not exists public.authors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  first_name text not null,
  bio text not null default '',
  message text not null default '',
  active boolean not null default true,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null
);

create table if not exists public.author_accounts (
  author_id uuid not null references public.authors(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  active boolean not null default true,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (author_id, user_id)
);

create table if not exists public.passport_profiles (
  author_id uuid primary key references public.authors(id) on delete cascade,
  photo_path text,
  photo_width integer,
  photo_height integer,
  photo_mime text,
  photo_size integer,
  photo_updated_at timestamptz,
  bio text not null default '',
  message text not null default '',
  books jsonb not null default '[]'::jsonb,
  presences jsonb not null default '[]'::jsonb,
  autograph_sessions jsonb not null default '[]'::jsonb,
  sale_locations jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'pending', 'published', 'rejected', 'suspended')),
  consent_version text,
  consent_accepted_at timestamptz,
  consent_accepted_by_user_id uuid references auth.users(id) on delete set null,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.author_change_requests (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.authors(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('profile', 'schedule', 'urgent')),
  urgent_type text check (urgent_type in ('schedule_change', 'stand_change', 'presence_cancelled', 'autograph_cancelled', 'important_information')),
  affected_date date,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'pending', 'approved', 'rejected')),
  admin_notes text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.passport_codes (
  author_id uuid primary key references public.authors(id) on delete cascade,
  code_plaintext text not null unique,
  code_hash text not null unique,
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  version integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.passport_stamps (
  user_id uuid not null references auth.users(id) on delete cascade,
  author_id uuid not null references public.authors(id) on delete restrict,
  redeemed_at timestamptz not null default now(),
  source text not null check (source in ('manual', 'qr')),
  created_at timestamptz not null default now(),
  primary key (user_id, author_id)
);

create or replace function public.normalize_passport_code(raw_code text)
returns text language sql immutable set search_path = '' as $$
  select upper(regexp_replace(trim(raw_code), '[^A-Za-z0-9-]', '', 'g'))
$$;

create or replace function public.generate_passport_code(target_author_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  author_record public.authors;
  normalized_name text;
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  random_part text;
  generated_code text;
  attempt integer := 0;
  byte_value integer;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
  select * into author_record from public.authors where id = target_author_id and deleted_at is null;
  if author_record.id is null then raise exception 'Autora não encontrada'; end if;
  normalized_name := upper(regexp_replace(public.unaccent(split_part(trim(author_record.first_name), ' ', 1)), '[^A-Za-z0-9]', '', 'g'));
  if normalized_name = '' then normalized_name := 'AUTORA'; end if;
  loop
    attempt := attempt + 1;
    random_part := '';
    for position in 0..7 loop
      byte_value := get_byte(gen_random_bytes(1), 0);
      random_part := random_part || substr(alphabet, (byte_value % length(alphabet)) + 1, 1);
    end loop;
    generated_code := normalized_name || '-' || substr(random_part, 1, 4) || '-' || substr(random_part, 5, 4);
    exit when not exists(select 1 from public.passport_codes where code_plaintext = generated_code);
    if attempt >= 10 then raise exception 'Não foi possível gerar código único'; end if;
  end loop;
  insert into public.passport_codes (author_id, code_plaintext, code_hash, valid_from, valid_until, version, created_by)
  values (
    target_author_id,
    generated_code,
    encode(digest(public.normalize_passport_code(generated_code), 'sha256'), 'hex'),
    '2026-09-04 00:00:00 America/Sao_Paulo'::timestamptz,
    '2026-09-13 23:59:59 America/Sao_Paulo'::timestamptz,
    1,
    (select auth.uid())
  )
  on conflict (author_id) do update set
    code_plaintext = excluded.code_plaintext,
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
returns table(author_id uuid, status text) language plpgsql security definer set search_path = '' as $$
declare
  matched_author uuid;
begin
  if redemption_source not in ('manual', 'qr') then raise exception 'Fonte inválida'; end if;
  select passport_codes.author_id into matched_author
  from public.passport_codes
  where code_hash = encode(digest(public.normalize_passport_code(raw_code), 'sha256'), 'hex')
    and active
    and now() between valid_from and valid_until;
  if matched_author is null then raise exception 'Código inválido ou fora do período de validade'; end if;
  insert into public.passport_stamps (user_id, author_id, source)
  values ((select auth.uid()), matched_author, redemption_source)
  on conflict (user_id, author_id) do nothing;
  return query select matched_author, 'confirmed'::text;
end;
$$;

create or replace view public.passport_code_manifest
with (security_invoker = true) as
select author_id, code_hash, valid_from, valid_until, version
from public.passport_codes where active;

drop trigger if exists authors_manifest_bump on public.authors;
create trigger authors_manifest_bump after insert or update or delete on public.authors
for each statement execute function public.bump_manifest_trigger('authors');
drop trigger if exists passport_profiles_manifest_bump on public.passport_profiles;
create trigger passport_profiles_manifest_bump after insert or update or delete on public.passport_profiles
for each statement execute function public.bump_manifest_trigger('passport');

alter table public.feature_flags enable row level security;
alter table public.content_manifest enable row level security;
alter table public.authors enable row level security;
alter table public.author_accounts enable row level security;
alter table public.passport_profiles enable row level security;
alter table public.author_change_requests enable row level security;
alter table public.passport_codes enable row level security;
alter table public.passport_stamps enable row level security;

create policy "Authenticated users read feature flags" on public.feature_flags for select to authenticated using (true);
create policy "Admins manage feature flags" on public.feature_flags for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Authenticated users read content manifest" on public.content_manifest for select to authenticated using (true);
create policy "Users read published authors" on public.authors for select to authenticated using (published or public.is_admin() or exists(select 1 from public.author_accounts aa where aa.author_id=authors.id and aa.user_id=(select auth.uid()) and aa.active) or exists(select 1 from public.passport_stamps stamp where stamp.author_id=authors.id and stamp.user_id=(select auth.uid())));
create policy "Admins manage authors" on public.authors for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Authors read own account link" on public.author_accounts for select to authenticated using (user_id=(select auth.uid()) or public.is_admin());
create policy "Admins manage author accounts" on public.author_accounts for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Users read published passport profiles" on public.passport_profiles for select to authenticated using (status='published' or public.is_admin() or exists(select 1 from public.author_accounts aa where aa.author_id=passport_profiles.author_id and aa.user_id=(select auth.uid()) and aa.active) or exists(select 1 from public.passport_stamps stamp where stamp.author_id=passport_profiles.author_id and stamp.user_id=(select auth.uid())));
create policy "Authors update own passport draft" on public.passport_profiles for update to authenticated using (status in ('draft','rejected') and exists(select 1 from public.author_accounts aa where aa.author_id=passport_profiles.author_id and aa.user_id=(select auth.uid()) and aa.active)) with check (status in ('draft','pending') and (consent_accepted_by_user_id is null or consent_accepted_by_user_id=(select auth.uid())));
create policy "Admins manage passport profiles" on public.passport_profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Authors read own requests" on public.author_change_requests for select to authenticated using (submitted_by=(select auth.uid()) or public.is_admin());
create policy "Authors create own requests" on public.author_change_requests for insert to authenticated with check (submitted_by=(select auth.uid()) and status in ('draft','pending'));
create policy "Authors edit own draft requests" on public.author_change_requests for update to authenticated using (submitted_by=(select auth.uid()) and status='draft') with check (submitted_by=(select auth.uid()) and status in ('draft','pending'));
create policy "Admins manage author requests" on public.author_change_requests for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Authors read own passport code" on public.passport_codes for select to authenticated using (public.is_admin() or exists(select 1 from public.author_accounts aa where aa.author_id=passport_codes.author_id and aa.user_id=(select auth.uid()) and aa.active));
create policy "Authenticated users read active code hashes" on public.passport_codes for select to authenticated using (active);
create policy "Users read own stamps" on public.passport_stamps for select to authenticated using (user_id=(select auth.uid()));
create policy "Admins read stamps" on public.passport_stamps for select to authenticated using (public.is_admin());

grant select on public.feature_flags, public.content_manifest, public.authors, public.author_accounts, public.passport_profiles, public.author_change_requests, public.passport_code_manifest, public.passport_stamps to authenticated;
grant update on public.passport_profiles to authenticated;
grant insert, update, select on public.author_change_requests to authenticated;
grant execute on function public.generate_passport_code(uuid), public.redeem_passport_stamp(text,text) to authenticated;

create index if not exists exhibitors_updated_idx on public.exhibitors(updated_at, deleted_at);
create index if not exists books_updated_idx on public.books(updated_at, deleted_at);
create index if not exists events_updated_idx on public.events(updated_at, deleted_at);
create index if not exists authors_updated_idx on public.authors(updated_at, deleted_at);
create index if not exists author_change_requests_priority_idx on public.author_change_requests(status, affected_date, created_at);
create index if not exists passport_profiles_status_idx on public.passport_profiles(status, updated_at);
create index if not exists passport_stamps_user_idx on public.passport_stamps(user_id, redeemed_at);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('passport-photos', 'passport-photos', true, 307200, array['image/jpeg','image/webp'])
on conflict (id) do update set public=excluded.public, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;
create policy "Passport photos are publicly readable" on storage.objects for select using (bucket_id='passport-photos');
create policy "Authors upload own optimized passport photo" on storage.objects for insert to authenticated
with check (bucket_id='passport-photos' and exists(select 1 from public.author_accounts aa where aa.user_id=(select auth.uid()) and aa.author_id::text=(storage.foldername(name))[1] and aa.active));
create policy "Authors update own optimized passport photo" on storage.objects for update to authenticated
using (bucket_id='passport-photos' and exists(select 1 from public.author_accounts aa where aa.user_id=(select auth.uid()) and aa.author_id::text=(storage.foldername(name))[1] and aa.active))
with check (bucket_id='passport-photos' and exists(select 1 from public.author_accounts aa where aa.user_id=(select auth.uid()) and aa.author_id::text=(storage.foldername(name))[1] and aa.active));
