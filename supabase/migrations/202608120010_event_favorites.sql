create table if not exists public.user_event_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

alter table public.user_event_favorites enable row level security;

create policy "Users read own event favorites"
  on public.user_event_favorites for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users insert own event favorites"
  on public.user_event_favorites for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users delete own event favorites"
  on public.user_event_favorites for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, delete on public.user_event_favorites to authenticated;
create index if not exists user_event_favorites_user_idx on public.user_event_favorites(user_id);
