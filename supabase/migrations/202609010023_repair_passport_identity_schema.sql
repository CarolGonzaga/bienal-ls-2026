-- Reparo idempotente para instalações em que o frontend foi publicado antes
-- dos campos de identidade do Passaporte e/ou o PostgREST manteve cache antigo.
alter table public.books
  add column if not exists cover_url text,
  add column if not exists genre text,
  add column if not exists autograph_available boolean not null default false;

alter table public.passport_profiles
  add column if not exists passport_display_name text,
  add column if not exists passport_age smallint,
  add column if not exists passport_city text;

alter table public.passport_profiles
  drop constraint if exists passport_profiles_passport_age_check;

alter table public.passport_profiles
  add constraint passport_profiles_passport_age_check
  check (passport_age is null or passport_age between 0 and 130);

create or replace view public.passport_public_profiles
with (security_invoker = true) as
select
  profile.author_id, profile.photo_path, profile.photo_width, profile.photo_height,
  profile.photo_mime, profile.photo_size, profile.bio, profile.message,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',book.id,'title',book.title,'publisher',book.publisher,'cover_url',book.cover_url,
      'genre',book.genre,'synopsis',book.notes,'tags',book.tags,
      'autograph_available',book.autograph_available,'featured',author_book.featured,
      'display_order',author_book.display_order
    ) order by author_book.display_order nulls last, book.title)
    from public.author_books author_book
    join public.books book on book.id=author_book.book_id
    where author_book.author_id=profile.author_id
      and author_book.deleted_at is null
      and book.deleted_at is null
      and book.active
  ), profile.books, '[]'::jsonb) as books,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',presence.id,'date',presence.presence_date,'start_time',presence.start_time,
      'end_time',presence.end_time,'stand_code',presence.stand_code,
      'exhibitor_id',presence.exhibitor_id,'notes',presence.notes,'guaranteed',presence.guaranteed
    ) order by presence.presence_date, presence.start_time)
    from public.author_presences presence
    where presence.author_id=profile.author_id
      and presence.deleted_at is null
      and presence.status='published'
  ), profile.presences, '[]'::jsonb) as presences,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',event.id,'date',event.event_date,'start_time',event.start_time,
      'end_time',event.end_time,'stand_code',event.stand_code,
      'exhibitor_id',event.exhibitor_id,'books',event.books,'location_text',event.location_text
    ) order by event.event_date, event.start_time)
    from public.event_authors event_author
    join public.events event on event.id=event_author.event_id
    where event_author.author_id=profile.author_id
      and event.deleted_at is null
      and event.active
      and event.event_type='autograph'
  ), profile.autograph_sessions, '[]'::jsonb) as autograph_sessions,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'book_id',availability.book_id,'stand_code',availability.stand_code,
      'exhibitor_id',availability.exhibitor_id,'available_for_sale',availability.available_for_sale
    ))
    from public.book_stand_availability availability
    where availability.author_id=profile.author_id
      and availability.deleted_at is null
      and availability.available_for_sale
  ), profile.sale_locations, '[]'::jsonb) as sale_locations,
  profile.status, profile.updated_at, profile.deleted_at,
  profile.passport_display_name, profile.passport_age, profile.passport_city
from public.passport_profiles profile
where profile.status='published' and profile.deleted_at is null;

grant select on public.passport_public_profiles to authenticated;

-- Força o PostgREST/Supabase a abandonar a definição antiga das colunas.
notify pgrst, 'reload schema';
