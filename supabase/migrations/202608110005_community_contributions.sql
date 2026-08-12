create extension if not exists unaccent;

alter table public.profiles add column if not exists role text not null default 'reader'
  check (role in ('reader', 'editor', 'admin'));

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author_name text not null,
  publisher text,
  stand_code text,
  exhibitor_id text references public.exhibitors(id) on delete set null,
  notes text,
  tags text[] not null default '{}',
  active boolean not null default true,
  source_contribution_id uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null default 'autograph',
  author_name text not null,
  books text[] not null default '{}',
  event_date date not null,
  start_time time not null,
  stand_code text,
  exhibitor_id text references public.exhibitors(id) on delete set null,
  location_text text,
  official_link text,
  notes text,
  tags text[] not null default '{}',
  active boolean not null default true,
  source_contribution_id uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contribution_type text not null check (contribution_type in ('sapphic_book', 'autograph_session', 'exhibitor', 'correction')),
  contributor_role text not null check (contributor_role in ('reader', 'author', 'publisher')),
  payload jsonb not null default '{}'::jsonb,
  submitter_name text not null,
  submitter_contact text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.books add constraint books_source_contribution_fk
  foreign key (source_contribution_id) references public.community_contributions(id) on delete set null;
alter table public.events add constraint events_source_contribution_fk
  foreign key (source_contribution_id) references public.community_contributions(id) on delete set null;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.profiles where id = (select auth.uid()) and role = 'admin') $$;

alter table public.books enable row level security;
alter table public.events enable row level security;
alter table public.community_contributions enable row level security;

create policy "Authenticated users read active books" on public.books for select to authenticated using (active or public.is_admin());
create policy "Admins manage books" on public.books for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Authenticated users read active events" on public.events for select to authenticated using (active or public.is_admin());
create policy "Admins manage events" on public.events for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Users submit contributions" on public.community_contributions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users read own contributions" on public.community_contributions for select to authenticated using ((select auth.uid()) = user_id or public.is_admin());
create policy "Admins update contributions" on public.community_contributions for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete contributions" on public.community_contributions for delete to authenticated using (public.is_admin());

create policy "Admins insert exhibitors" on public.exhibitors for insert to authenticated with check (public.is_admin());
create policy "Admins update exhibitors" on public.exhibitors for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete exhibitors" on public.exhibitors for delete to authenticated using (public.is_admin());

grant select on public.books, public.events to authenticated;
grant insert, select on public.community_contributions to authenticated;
grant select, insert, update, delete on public.books, public.events, public.exhibitors, public.community_contributions to authenticated;

create or replace function public.approve_community_contribution(contribution_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  item public.community_contributions;
  linked_exhibitor text;
  generated_id text;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
  select * into item from public.community_contributions where id = contribution_id for update;
  if item.id is null then raise exception 'Contribuição não encontrada'; end if;
  if item.status = 'approved' then return; end if;
  select id into linked_exhibitor from public.exhibitors where upper(stand_code) = upper(item.payload->>'stand_code') limit 1;

  if item.contribution_type = 'sapphic_book' then
    insert into public.books (title, author_name, publisher, stand_code, exhibitor_id, notes, tags, source_contribution_id)
    values (item.payload->>'book_name', item.payload->>'author', nullif(item.payload->>'publisher',''), nullif(item.payload->>'stand_code',''), linked_exhibitor, nullif(item.payload->>'notes',''), coalesce(array(select jsonb_array_elements_text(item.payload->'tags')), '{}'), item.id)
    on conflict (source_contribution_id) do update set title=excluded.title, author_name=excluded.author_name, publisher=excluded.publisher, stand_code=excluded.stand_code, exhibitor_id=excluded.exhibitor_id, notes=excluded.notes, tags=excluded.tags, updated_at=now();
  elsif item.contribution_type = 'autograph_session' then
    insert into public.events (author_name, books, event_date, start_time, stand_code, exhibitor_id, location_text, official_link, notes, tags, source_contribution_id)
    values (item.payload->>'author_name', string_to_array(coalesce(item.payload->>'books',''), ','), (item.payload->>'event_date')::date, (item.payload->>'start_time')::time, nullif(item.payload->>'stand_code',''), linked_exhibitor, nullif(item.payload->>'location_text',''), nullif(item.payload->>'official_link',''), nullif(item.payload->>'notes',''), coalesce(array(select jsonb_array_elements_text(item.payload->'tags')), '{}'), item.id)
    on conflict (source_contribution_id) do update set author_name=excluded.author_name, books=excluded.books, event_date=excluded.event_date, start_time=excluded.start_time, stand_code=excluded.stand_code, exhibitor_id=excluded.exhibitor_id, location_text=excluded.location_text, official_link=excluded.official_link, notes=excluded.notes, tags=excluded.tags, updated_at=now();
  elsif item.contribution_type = 'exhibitor' then
    generated_id := trim(both '-' from regexp_replace(lower(public.unaccent(item.payload->>'exhibitor_name')), '[^a-z0-9]+', '-', 'g')) || '-' || lower(item.payload->>'stand_code');
    insert into public.exhibitors (id, logo, name, description, reason_to_visit, stand_code, active, relevance_level, relevance_reasons, categories, featured)
    values (generated_id, '', item.payload->>'exhibitor_name', coalesce(item.payload->>'description',''), '', upper(item.payload->>'stand_code'), true, 'catalogo_confirmado', '{}', coalesce(array(select jsonb_array_elements_text(item.payload->'tags')), '{}'), false)
    on conflict (stand_code) do update set name=excluded.name, description=excluded.description, categories=excluded.categories, active=true, updated_at=now();
  end if;

  update public.community_contributions set status='approved', reviewed_by=(select auth.uid()), reviewed_at=now(), updated_at=now() where id=item.id;
end;
$$;

grant execute on function public.approve_community_contribution(uuid) to authenticated;
create index if not exists community_contributions_status_idx on public.community_contributions(status, created_at desc);
create index if not exists books_exhibitor_idx on public.books(exhibitor_id);
create index if not exists events_date_idx on public.events(event_date, start_time);

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'books') then alter publication supabase_realtime add table public.books; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'events') then alter publication supabase_realtime add table public.events; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'exhibitors') then alter publication supabase_realtime add table public.exhibitors; end if;
end $$;
