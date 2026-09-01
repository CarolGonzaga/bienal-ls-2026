create table if not exists public.passport_reader_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb check (jsonb_typeof(profile) = 'object'),
  user_books jsonb not null default '[]'::jsonb check (jsonb_typeof(user_books) = 'array'),
  client_updated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.passport_reader_states enable row level security;

create policy "Users read own passport reader state"
  on public.passport_reader_states for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert own passport reader state"
  on public.passport_reader_states for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update own passport reader state"
  on public.passport_reader_states for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete own passport reader state"
  on public.passport_reader_states for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.passport_reader_states to authenticated;
