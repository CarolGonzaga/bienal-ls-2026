-- Mapa Sáfico · schema inicial para Supabase
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  display_name text,
  discovery_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exhibitors (
  id text primary key,
  logo text not null,
  name text not null,
  description text not null default '',
  reason_to_visit text not null default '',
  stand_code text not null unique,
  active boolean not null default true,
  relevance_level text not null check (relevance_level in ('curadoria_direta', 'catalogo_confirmado', 'titulos_pontuais', 'neutro')),
  relevance_reasons text[] not null default '{}',
  categories text[] not null default '{}',
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  exhibitor_id text not null references public.exhibitors(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, exhibitor_id)
);

create table if not exists public.user_visits (
  user_id uuid not null references auth.users(id) on delete cascade,
  exhibitor_id text not null references public.exhibitors(id) on delete cascade,
  visited_at timestamptz not null default now(),
  notes text,
  primary key (user_id, exhibitor_id)
);

create table if not exists public.user_route_stops (
  user_id uuid not null references auth.users(id) on delete cascade,
  exhibitor_id text not null references public.exhibitors(id) on delete cascade,
  stand_code text not null,
  stop_order integer not null check (stop_order > 0),
  visited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, exhibitor_id),
  unique (user_id, stop_order)
);

create table if not exists public.user_route_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  origin_id text not null default 'HALL1',
  user_position jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name, discovery_source)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'username'),
    new.raw_user_meta_data ->> 'discoverySource'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.exhibitors enable row level security;
alter table public.user_favorites enable row level security;
alter table public.user_visits enable row level security;
alter table public.user_route_stops enable row level security;
alter table public.user_route_settings enable row level security;

create policy "Exhibitors are publicly readable" on public.exhibitors for select to anon, authenticated using (true);
create policy "Users read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Users update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Users read own favorites" on public.user_favorites for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users insert own favorites" on public.user_favorites for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users delete own favorites" on public.user_favorites for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users read own visits" on public.user_visits for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users insert own visits" on public.user_visits for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update own visits" on public.user_visits for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete own visits" on public.user_visits for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users read own route stops" on public.user_route_stops for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users insert own route stops" on public.user_route_stops for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update own route stops" on public.user_route_stops for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete own route stops" on public.user_route_stops for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users read own route settings" on public.user_route_settings for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users insert own route settings" on public.user_route_settings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update own route settings" on public.user_route_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select on public.exhibitors to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, delete on public.user_favorites to authenticated;
grant select, insert, update, delete on public.user_visits to authenticated;
grant select, insert, update, delete on public.user_route_stops to authenticated;
grant select, insert, update on public.user_route_settings to authenticated;

create index if not exists user_favorites_user_idx on public.user_favorites(user_id);
create index if not exists user_visits_user_idx on public.user_visits(user_id);
create index if not exists user_route_stops_user_idx on public.user_route_stops(user_id, stop_order);
