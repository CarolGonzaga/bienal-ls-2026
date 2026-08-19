-- Relações canônicas para os dados editoriais das autoras. As tabelas
-- publicadas são administradas apenas por admin; autoras enviam propostas
-- por author_change_requests e nunca publicam diretamente.

create table if not exists public.author_books (
  author_id uuid not null references public.authors(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  display_order smallint,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null,
  primary key (author_id, book_id),
  check (display_order is null or display_order between 1 and 3)
);

create unique index if not exists author_books_featured_order_unique
  on public.author_books(author_id, display_order)
  where featured and deleted_at is null and display_order is not null;

create table if not exists public.book_stand_availability (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  author_id uuid references public.authors(id) on delete set null,
  exhibitor_id text references public.exhibitors(id) on delete set null,
  stand_code text,
  available_for_sale boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null,
  check (exhibitor_id is not null or nullif(trim(coalesce(stand_code,'')),'') is not null)
);

create unique index if not exists book_stand_availability_unique
  on public.book_stand_availability(book_id, coalesce(exhibitor_id,''), coalesce(upper(trim(stand_code)),''))
  where deleted_at is null;

create table if not exists public.author_presences (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.authors(id) on delete cascade,
  presence_date date not null,
  start_time time not null,
  end_time time,
  stand_code text,
  exhibitor_id text references public.exhibitors(id) on delete set null,
  notes text,
  guaranteed boolean not null default false,
  status text not null default 'published' check (status in ('published','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null,
  check (presence_date between date '2026-09-04' and date '2026-09-13'),
  check (end_time is null or end_time >= start_time),
  check (exhibitor_id is not null or nullif(trim(coalesce(stand_code,'')),'') is not null)
);

create unique index if not exists author_presences_unique
  on public.author_presences(author_id, presence_date, start_time, coalesce(exhibitor_id,''), coalesce(upper(trim(stand_code)),''))
  where deleted_at is null;

create table if not exists public.event_authors (
  event_id uuid not null references public.events(id) on delete cascade,
  author_id uuid not null references public.authors(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, author_id)
);

create table if not exists public.event_books (
  event_id uuid not null references public.events(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, book_id)
);

-- Migração segura dos vínculos identificáveis já existentes. Não tenta inferir
-- relações ambíguas por nome parcial nem sobrescreve associações anteriores.
insert into public.event_authors(event_id, author_id)
select event.id, author.id
from public.events event
join public.authors author on author.slug = event.author_source_id
where event.author_source_id is not null
on conflict do nothing;

insert into public.author_books(author_id, book_id)
select author.id, book.id
from public.books book
join public.authors author on lower(trim(author.name)) = lower(trim(book.author_name))
where book.deleted_at is null
on conflict do nothing;

alter table public.author_change_requests drop constraint if exists author_change_requests_request_type_check;
alter table public.author_change_requests add constraint author_change_requests_request_type_check
  check (request_type in ('profile','schedule','urgent','presence','book','availability','autograph'));

-- O vínculo da conta precisa ser validado também na policy: submitted_by por si
-- só não impede uma autora de tentar apontar uma proposta para outra autora.
drop policy if exists "Authors create own requests" on public.author_change_requests;
create policy "Authors create own requests" on public.author_change_requests for insert to authenticated
with check (
  submitted_by=(select auth.uid())
  and exists(select 1 from public.author_accounts aa where aa.author_id=author_change_requests.author_id and aa.user_id=(select auth.uid()) and aa.active)
  and status in ('draft','pending')
);
drop policy if exists "Authors edit own draft requests" on public.author_change_requests;
create policy "Authors edit own draft requests" on public.author_change_requests for update to authenticated
using (
  submitted_by=(select auth.uid()) and status='draft'
  and exists(select 1 from public.author_accounts aa where aa.author_id=author_change_requests.author_id and aa.user_id=(select auth.uid()) and aa.active)
)
with check (
  submitted_by=(select auth.uid())
  and exists(select 1 from public.author_accounts aa where aa.author_id=author_change_requests.author_id and aa.user_id=(select auth.uid()) and aa.active)
  and status in ('draft','pending')
);

alter table public.author_books enable row level security;
alter table public.book_stand_availability enable row level security;
alter table public.author_presences enable row level security;
alter table public.event_authors enable row level security;
alter table public.event_books enable row level security;

create policy "Users read published author books" on public.author_books for select to authenticated
using (deleted_at is null and exists(select 1 from public.authors a where a.id=author_books.author_id and a.published));
create policy "Authors read own book links" on public.author_books for select to authenticated
using (exists(select 1 from public.author_accounts aa where aa.author_id=author_books.author_id and aa.user_id=(select auth.uid()) and aa.active));
create policy "Admins manage author books" on public.author_books for all to authenticated using(public.is_admin()) with check(public.is_admin());

create policy "Users read published book availability" on public.book_stand_availability for select to authenticated
using (deleted_at is null and available_for_sale);
create policy "Authors read own book availability" on public.book_stand_availability for select to authenticated
using (author_id is not null and exists(select 1 from public.author_accounts aa where aa.author_id=book_stand_availability.author_id and aa.user_id=(select auth.uid()) and aa.active));
create policy "Admins manage book availability" on public.book_stand_availability for all to authenticated using(public.is_admin()) with check(public.is_admin());

create policy "Users read published author presences" on public.author_presences for select to authenticated
using (deleted_at is null and status='published');
create policy "Authors read own presences" on public.author_presences for select to authenticated
using (exists(select 1 from public.author_accounts aa where aa.author_id=author_presences.author_id and aa.user_id=(select auth.uid()) and aa.active));
create policy "Admins manage author presences" on public.author_presences for all to authenticated using(public.is_admin()) with check(public.is_admin());

create policy "Users read event authors" on public.event_authors for select to authenticated using(true);
create policy "Admins manage event authors" on public.event_authors for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Users read event books" on public.event_books for select to authenticated using(true);
create policy "Admins manage event books" on public.event_books for all to authenticated using(public.is_admin()) with check(public.is_admin());

grant select on public.author_books, public.book_stand_availability, public.author_presences, public.event_authors, public.event_books to authenticated;
grant insert,update,delete on public.author_books, public.book_stand_availability, public.author_presences, public.event_authors, public.event_books to authenticated;

create or replace function public.submit_author_content_request(p_request_type text, p_payload jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare linked_author_id uuid; request_id uuid;
begin
  if p_request_type not in ('presence','book','availability','autograph') then raise exception 'Tipo de solicitação inválido'; end if;
  select author_id into linked_author_id from public.author_accounts where user_id=(select auth.uid()) and active limit 1;
  if linked_author_id is null then raise exception 'Conta não vinculada a uma autora verificada'; end if;
  insert into public.author_change_requests(author_id,submitted_by,request_type,payload,status,submitted_at)
  values(linked_author_id,(select auth.uid()),p_request_type,coalesce(p_payload,'{}'::jsonb),'pending',now()) returning id into request_id;
  return request_id;
end;
$$;

create or replace function public.review_author_content_request(
  p_request_id uuid,
  p_decision text,
  p_payload jsonb default null,
  p_target_id uuid default null,
  p_notes text default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare request_record public.author_change_requests; payload jsonb; entity_id uuid; target_book uuid;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Decisão inválida'; end if;
  select * into request_record from public.author_change_requests where id=p_request_id and status='pending' for update;
  if request_record.id is null then raise exception using errcode='40001', message='Solicitação pendente não encontrada ou já revisada'; end if;
  if request_record.request_type not in ('presence','book','availability','autograph') then raise exception 'Esta solicitação deve usar o fluxo de perfil existente'; end if;
  payload := coalesce(p_payload, request_record.payload);
  if p_decision='rejected' then
    update public.author_change_requests set status='rejected',admin_notes=p_notes,reviewed_at=now(),reviewed_by=(select auth.uid()),updated_at=now() where id=request_record.id;
    perform public.write_audit('REJECT','author_change_request',request_record.id::text,to_jsonb(request_record),payload,null);
    return jsonb_build_object('status','rejected');
  end if;
  if request_record.request_type='presence' then
    insert into public.author_presences(author_id,presence_date,start_time,end_time,stand_code,exhibitor_id,notes,guaranteed)
    values(request_record.author_id,(payload->>'presence_date')::date,(payload->>'start_time')::time,nullif(payload->>'end_time','')::time,nullif(payload->>'stand_code',''),nullif(payload->>'exhibitor_id',''),nullif(payload->>'notes',''),coalesce((payload->>'guaranteed')::boolean,false))
    returning id into entity_id;
    perform public.write_audit('CREATE','author_presence',entity_id::text,null,payload,null);
  elsif request_record.request_type='book' then
    if p_target_id is null then
      insert into public.books(title,author_name,publisher,notes,tags,active)
      values(payload->>'title',(select name from public.authors where id=request_record.author_id),nullif(payload->>'publisher',''),nullif(payload->>'notes',''),coalesce(array(select jsonb_array_elements_text(payload->'tags')),'{}'),true)
      returning id into target_book;
      perform public.write_audit('CREATE','book',target_book::text,null,payload,null);
    else target_book := p_target_id; end if;
    insert into public.author_books(author_id,book_id,featured,display_order) values(request_record.author_id,target_book,coalesce((payload->>'featured')::boolean,false),nullif(payload->>'display_order','')::smallint) on conflict(author_id,book_id) do update set featured=excluded.featured,display_order=excluded.display_order,deleted_at=null,updated_at=now();
    entity_id := target_book;
    perform public.write_audit('LINK','author_book',target_book::text,null,payload,null);
  elsif request_record.request_type='availability' then
    target_book := coalesce(p_target_id, nullif(payload->>'book_id','')::uuid);
    if target_book is null then raise exception 'Selecione o livro disponível para venda'; end if;
    insert into public.book_stand_availability(book_id,author_id,exhibitor_id,stand_code,available_for_sale)
    values(target_book,request_record.author_id,nullif(payload->>'exhibitor_id',''),nullif(payload->>'stand_code',''),coalesce((payload->>'available_for_sale')::boolean,true)) returning id into entity_id;
    perform public.write_audit('CREATE','book_stand_availability',entity_id::text,null,payload,null);
  elsif request_record.request_type='autograph' then
    insert into public.events(event_type,author_name,books,event_date,start_time,end_time,stand_code,exhibitor_id,location_text,notes,tags,active)
    values('autograph',(select name from public.authors where id=request_record.author_id),coalesce(array(select jsonb_array_elements_text(payload->'books')),'{}'),(payload->>'event_date')::date,(payload->>'start_time')::time,nullif(payload->>'end_time','')::time,nullif(payload->>'stand_code',''),nullif(payload->>'exhibitor_id',''),nullif(payload->>'location_text',''),nullif(payload->>'notes',''),array['sessao-de-autografo']::text[],true) returning id into entity_id;
    insert into public.event_authors(event_id,author_id) values(entity_id,request_record.author_id) on conflict do nothing;
    perform public.write_audit('CREATE','event',entity_id::text,null,payload,null);
  end if;
  update public.author_change_requests set status='approved',admin_notes=p_notes,reviewed_at=now(),reviewed_by=(select auth.uid()),updated_at=now() where id=request_record.id;
  perform public.bump_content_manifest(case when request_record.request_type='book' or request_record.request_type='availability' then 'books' when request_record.request_type='autograph' then 'schedule' else 'passport' end);
  perform public.write_audit('APPROVE','author_change_request',request_record.id::text,to_jsonb(request_record),payload,null);
  return jsonb_build_object('status','approved','entity_id',entity_id);
end;
$$;

create or replace function public.author_profile_ready(target_author_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.passport_profiles p where p.author_id=target_author_id and p.photo_path is not null and nullif(trim(p.bio),'') is not null)
    and exists(select 1 from public.author_books ab where ab.author_id=target_author_id and ab.deleted_at is null)
    and exists(select 1 from public.author_presences ap where ap.author_id=target_author_id and ap.deleted_at is null and ap.guaranteed and ap.status='published')
$$;

create or replace view public.passport_public_profiles
with (security_invoker = true) as
select
  profile.author_id,
  profile.photo_path,
  profile.photo_width,
  profile.photo_height,
  profile.photo_mime,
  profile.photo_size,
  profile.bio,
  profile.message,
  coalesce((
    select jsonb_agg(jsonb_build_object('id',book.id,'title',book.title,'publisher',book.publisher,'featured',author_book.featured,'display_order',author_book.display_order) order by author_book.display_order nulls last, book.title)
    from public.author_books author_book join public.books book on book.id=author_book.book_id
    where author_book.author_id=profile.author_id and author_book.deleted_at is null and book.deleted_at is null and book.active
  ), profile.books, '[]'::jsonb) as books,
  coalesce((
    select jsonb_agg(jsonb_build_object('id',presence.id,'date',presence.presence_date,'start_time',presence.start_time,'end_time',presence.end_time,'stand_code',presence.stand_code,'exhibitor_id',presence.exhibitor_id,'notes',presence.notes,'guaranteed',presence.guaranteed) order by presence.presence_date, presence.start_time)
    from public.author_presences presence
    where presence.author_id=profile.author_id and presence.deleted_at is null and presence.status='published'
  ), profile.presences, '[]'::jsonb) as presences,
  coalesce((
    select jsonb_agg(jsonb_build_object('id',event.id,'date',event.event_date,'start_time',event.start_time,'end_time',event.end_time,'stand_code',event.stand_code,'exhibitor_id',event.exhibitor_id,'books',event.books,'location_text',event.location_text) order by event.event_date, event.start_time)
    from public.event_authors event_author join public.events event on event.id=event_author.event_id
    where event_author.author_id=profile.author_id and event.deleted_at is null and event.active and event.event_type='autograph'
  ), profile.autograph_sessions, '[]'::jsonb) as autograph_sessions,
  coalesce((
    select jsonb_agg(jsonb_build_object('book_id',availability.book_id,'stand_code',availability.stand_code,'exhibitor_id',availability.exhibitor_id,'available_for_sale',availability.available_for_sale))
    from public.book_stand_availability availability
    where availability.author_id=profile.author_id and availability.deleted_at is null and availability.available_for_sale
  ), profile.sale_locations, '[]'::jsonb) as sale_locations,
  profile.status,
  profile.updated_at,
  profile.deleted_at
from public.passport_profiles profile
where profile.status='published' and profile.deleted_at is null;

grant select on public.passport_public_profiles to authenticated;

revoke execute on function public.approve_passport_profile(uuid) from public, anon, authenticated;
create or replace function public.approve_passport_profile(target_author_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
  if not exists(select 1 from public.passport_profiles where author_id=target_author_id and status='pending' and consent_version is not null and consent_accepted_at is not null) then
    raise exception 'Perfil pendente com consentimento versionado é obrigatório';
  end if;
  if not public.author_profile_ready(target_author_id) then
    raise exception 'Perfil incompleto: foto, bio, ao menos um livro e uma presença garantida são obrigatórios';
  end if;
  update public.passport_profiles set status='published',reviewed_at=now(),reviewed_by=(select auth.uid()),updated_at=now() where author_id=target_author_id;
  update public.authors set published=true,updated_at=now() where id=target_author_id;
  perform public.bump_content_manifest('authors');
  perform public.bump_content_manifest('passport');
end;
$$;

grant execute on function public.submit_author_content_request(text,jsonb), public.review_author_content_request(uuid,text,jsonb,uuid,text), public.author_profile_ready(uuid), public.approve_passport_profile(uuid) to authenticated;

create index if not exists author_presences_public_idx on public.author_presences(author_id,presence_date,start_time) where deleted_at is null and status='published';
create index if not exists availability_public_idx on public.book_stand_availability(book_id,exhibitor_id) where deleted_at is null;
create index if not exists event_authors_author_idx on public.event_authors(author_id,event_id);
