-- Liberação privada do Passaporte para contas administrativas de homologação.
-- A feature flag global continua desligada para as demais usuárias.

create table if not exists public.feature_access_overrides (
  feature_key text not null references public.feature_flags(key) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  primary key (feature_key, user_id)
);

alter table public.feature_access_overrides enable row level security;

create policy "Admins manage feature access overrides"
on public.feature_access_overrides for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.can_access_feature(target_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select enabled from public.feature_flags where key=target_key),
    false
  ) or exists (
    select 1
    from public.feature_access_overrides access
    where access.feature_key=target_key
      and access.user_id=(select auth.uid())
  )
$$;

grant execute on function public.can_access_feature(text) to authenticated;

insert into public.profiles(id,email,display_name,role,updated_at)
select
  auth_user.id,
  auth_user.email,
  coalesce(
    auth_user.raw_user_meta_data->>'name',
    auth_user.raw_user_meta_data->>'username',
    split_part(auth_user.email,'@',1)
  ),
  'admin',
  now()
from auth.users auth_user
where auth_user.id in (
  '50c28bb8-b9e5-4ffe-99a5-dc2773823f9e'::uuid,
  '55eac928-445c-413e-a281-7d2f6d8ba65b'::uuid
)
on conflict(id) do update set role='admin',email=excluded.email,updated_at=now();

insert into public.feature_access_overrides(feature_key,user_id)
select 'passport', auth_user.id
from auth.users auth_user
where auth_user.id in (
  '50c28bb8-b9e5-4ffe-99a5-dc2773823f9e'::uuid,
  '55eac928-445c-413e-a281-7d2f6d8ba65b'::uuid
)
on conflict(feature_key,user_id) do nothing;
