-- Um espaço físico pode ser compartilhado por várias editoras.
alter table public.exhibitors drop constraint if exists exhibitors_stand_code_key;
create index if not exists exhibitors_stand_code_idx on public.exhibitors (upper(trim(stand_code)));

create table if not exists public.contribution_notifications (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null unique references public.community_contributions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  contribution_type text not null,
  status text not null check (status in ('approved', 'rejected')),
  record_label text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.contribution_notifications enable row level security;
create policy "Users read own contribution notifications" on public.contribution_notifications
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users acknowledge own contribution notifications" on public.contribution_notifications
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, update on public.contribution_notifications to authenticated;
create index if not exists contribution_notifications_unread_idx on public.contribution_notifications(user_id, created_at) where read_at is null;

create or replace function public.notify_contribution_review()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  label text;
begin
  if new.status not in ('approved', 'rejected') or new.status is not distinct from old.status then return new; end if;
  label := case new.contribution_type
    when 'sapphic_book' then new.payload->>'book_name'
    when 'autograph_session' then new.payload->>'author_name'
    when 'exhibitor' then new.payload->>'exhibitor_name'
    when 'correction' then coalesce(new.payload->>'stand_code', new.payload->>'what_is_wrong')
  end;
  insert into public.contribution_notifications (contribution_id, user_id, contribution_type, status, record_label)
  values (new.id, new.user_id, new.contribution_type, new.status, nullif(trim(label), ''))
  on conflict (contribution_id) do update set status=excluded.status, record_label=excluded.record_label, created_at=now(), read_at=null;
  return new;
end;
$$;

drop trigger if exists contribution_review_notification on public.community_contributions;
create trigger contribution_review_notification after update of status on public.community_contributions
for each row execute function public.notify_contribution_review();

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
  select id into linked_exhibitor from public.exhibitors where upper(trim(stand_code)) = upper(trim(item.payload->>'stand_code')) order by created_at limit 1;

  if item.contribution_type = 'sapphic_book' then
    insert into public.books (title, author_name, publisher, stand_code, exhibitor_id, notes, tags, source_contribution_id)
    values (item.payload->>'book_name', item.payload->>'author', nullif(item.payload->>'publisher',''), nullif(item.payload->>'stand_code',''), linked_exhibitor, nullif(item.payload->>'notes',''), coalesce(array(select jsonb_array_elements_text(item.payload->'tags')), '{}'), item.id)
    on conflict (source_contribution_id) do update set title=excluded.title, author_name=excluded.author_name, publisher=excluded.publisher, stand_code=excluded.stand_code, exhibitor_id=excluded.exhibitor_id, notes=excluded.notes, tags=excluded.tags, updated_at=now();
  elsif item.contribution_type = 'autograph_session' then
    insert into public.events (event_type, author_name, books, event_date, start_time, stand_code, exhibitor_id, location_text, official_link, notes, tags, source_contribution_id)
    values ('autograph', item.payload->>'author_name', string_to_array(coalesce(item.payload->>'books',''), ','), (item.payload->>'event_date')::date, nullif(item.payload->>'start_time','')::time, nullif(item.payload->>'stand_code',''), linked_exhibitor, nullif(item.payload->>'location_text',''), nullif(item.payload->>'official_link',''), nullif(item.payload->>'notes',''), coalesce(array(select jsonb_array_elements_text(item.payload->'tags')), '{}'), item.id)
    on conflict (source_contribution_id) do update set author_name=excluded.author_name, books=excluded.books, event_date=excluded.event_date, start_time=excluded.start_time, stand_code=excluded.stand_code, exhibitor_id=excluded.exhibitor_id, location_text=excluded.location_text, official_link=excluded.official_link, notes=excluded.notes, tags=excluded.tags, updated_at=now();
  elsif item.contribution_type = 'exhibitor' then
    generated_id := trim(both '-' from regexp_replace(lower(public.unaccent(item.payload->>'exhibitor_name')), '[^a-z0-9]+', '-', 'g')) || '-' || lower(regexp_replace(item.payload->>'stand_code', '[^a-zA-Z0-9]+', '-', 'g'));
    insert into public.exhibitors (id, logo, name, description, reason_to_visit, stand_code, active, relevance_level, relevance_reasons, categories, featured)
    values (generated_id, '', item.payload->>'exhibitor_name', coalesce(item.payload->>'description',''), '', upper(trim(item.payload->>'stand_code')), true, 'catalogo_confirmado', '{}', coalesce(array(select jsonb_array_elements_text(item.payload->'tags')), '{}'), false)
    on conflict (id) do update set name=excluded.name, description=excluded.description, categories=excluded.categories, active=true, updated_at=now();
  end if;

  update public.community_contributions set status='approved', reviewed_by=(select auth.uid()), reviewed_at=now(), updated_at=now() where id=item.id;
end;
$$;

grant execute on function public.approve_community_contribution(uuid) to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='contribution_notifications') then
    alter publication supabase_realtime add table public.contribution_notifications;
  end if;
end $$;
