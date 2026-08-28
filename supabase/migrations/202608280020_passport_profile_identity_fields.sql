-- Campos opcionais exibidos exclusivamente na primeira página do Passaporte.
alter table public.passport_profiles
  add column if not exists passport_display_name text,
  add column if not exists passport_age smallint,
  add column if not exists passport_city text;

alter table public.passport_profiles
  drop constraint if exists passport_profiles_passport_age_check;

alter table public.passport_profiles
  add constraint passport_profiles_passport_age_check
  check (passport_age is null or passport_age between 0 and 130);

-- Inclui a identidade escolhida pela autora na fonte pública/offline do Passaporte.
create or replace view public.passport_public_profiles
with (security_invoker = true) as
select
  profile.author_id, profile.photo_path, profile.photo_width, profile.photo_height,
  profile.photo_mime, profile.photo_size, profile.bio, profile.message,
  profile.passport_display_name, profile.passport_age, profile.passport_city,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',book.id,'title',book.title,'publisher',book.publisher,'cover_url',book.cover_url,
      'genre',book.genre,'synopsis',book.notes,'tags',book.tags,
      'autograph_available',book.autograph_available,'featured',author_book.featured,
      'display_order',author_book.display_order
    ) order by author_book.display_order nulls last, book.title)
    from public.author_books author_book join public.books book on book.id=author_book.book_id
    where author_book.author_id=profile.author_id and author_book.deleted_at is null and book.deleted_at is null and book.active
  ), profile.books, '[]'::jsonb) as books,
  coalesce((select jsonb_agg(jsonb_build_object('id',presence.id,'date',presence.presence_date,'start_time',presence.start_time,'end_time',presence.end_time,'stand_code',presence.stand_code,'exhibitor_id',presence.exhibitor_id,'notes',presence.notes,'guaranteed',presence.guaranteed) order by presence.presence_date, presence.start_time) from public.author_presences presence where presence.author_id=profile.author_id and presence.deleted_at is null and presence.status='published'), profile.presences, '[]'::jsonb) as presences,
  coalesce((select jsonb_agg(jsonb_build_object('id',event.id,'date',event.event_date,'start_time',event.start_time,'end_time',event.end_time,'stand_code',event.stand_code,'exhibitor_id',event.exhibitor_id,'books',event.books,'location_text',event.location_text) order by event.event_date, event.start_time) from public.event_authors event_author join public.events event on event.id=event_author.event_id where event_author.author_id=profile.author_id and event.deleted_at is null and event.active and event.event_type='autograph'), profile.autograph_sessions, '[]'::jsonb) as autograph_sessions,
  coalesce((select jsonb_agg(jsonb_build_object('book_id',availability.book_id,'stand_code',availability.stand_code,'exhibitor_id',availability.exhibitor_id,'available_for_sale',availability.available_for_sale)) from public.book_stand_availability availability where availability.author_id=profile.author_id and availability.deleted_at is null and availability.available_for_sale), profile.sale_locations, '[]'::jsonb) as sale_locations,
  profile.status, profile.updated_at, profile.deleted_at
from public.passport_profiles profile
where profile.status='published' and profile.deleted_at is null;

grant select on public.passport_public_profiles to authenticated;

-- Approved author edits are copied from the review queue into the published profile.
create or replace function public.review_author_change_request(target_request_id uuid, decision text, notes text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare request_record public.author_change_requests;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
  if decision not in ('approved','rejected') then raise exception 'Decisão inválida'; end if;
  select * into request_record from public.author_change_requests where id=target_request_id and status='pending' for update;
  if request_record.id is null then raise exception 'Solicitação pendente não encontrada'; end if;

  if decision='approved' and request_record.request_type='profile' then
    insert into public.passport_profiles(
      author_id,photo_path,photo_width,photo_height,photo_mime,photo_size,photo_updated_at,
      bio,message,passport_display_name,passport_age,passport_city,books,presences,autograph_sessions,sale_locations,
      status,consent_version,consent_accepted_at,consent_accepted_by_user_id,reviewed_at,reviewed_by,updated_at
    ) values (
      request_record.author_id,nullif(request_record.payload->>'photo_path',''),nullif(request_record.payload->>'photo_width','')::integer,
      nullif(request_record.payload->>'photo_height','')::integer,nullif(request_record.payload->>'photo_mime',''),
      nullif(request_record.payload->>'photo_size','')::integer,nullif(request_record.payload->>'photo_updated_at','')::timestamptz,
      coalesce(request_record.payload->>'bio',''),coalesce(request_record.payload->>'message',''),
      nullif(request_record.payload->>'passport_display_name',''),nullif(request_record.payload->>'passport_age','')::smallint,
      nullif(request_record.payload->>'passport_city',''),coalesce(request_record.payload->'books','[]'::jsonb),
      coalesce(request_record.payload->'presences','[]'::jsonb),coalesce(request_record.payload->'autograph_sessions','[]'::jsonb),
      coalesce(request_record.payload->'sale_locations','[]'::jsonb),'published',request_record.payload->>'consent_version',
      nullif(request_record.payload->>'consent_accepted_at','')::timestamptz,nullif(request_record.payload->>'consent_accepted_by_user_id','')::uuid,
      now(),(select auth.uid()),now()
    ) on conflict(author_id) do update set
      photo_path=excluded.photo_path,photo_width=excluded.photo_width,photo_height=excluded.photo_height,
      photo_mime=excluded.photo_mime,photo_size=excluded.photo_size,photo_updated_at=excluded.photo_updated_at,
      bio=excluded.bio,message=excluded.message,passport_display_name=excluded.passport_display_name,
      passport_age=excluded.passport_age,passport_city=excluded.passport_city,books=excluded.books,
      presences=excluded.presences,autograph_sessions=excluded.autograph_sessions,sale_locations=excluded.sale_locations,
      status='published',consent_version=excluded.consent_version,consent_accepted_at=excluded.consent_accepted_at,
      consent_accepted_by_user_id=excluded.consent_accepted_by_user_id,reviewed_at=now(),reviewed_by=(select auth.uid()),updated_at=now();
    update public.authors set published=true,updated_at=now() where id=request_record.author_id;
  end if;

  update public.author_change_requests set status=decision,admin_notes=notes,reviewed_at=now(),reviewed_by=(select auth.uid()),updated_at=now() where id=target_request_id;
  if request_record.request_type='profile' and decision='approved' then
    perform public.bump_content_manifest('authors');
    perform public.bump_content_manifest('passport');
  end if;
end;
$$;

grant execute on function public.review_author_change_request(uuid,text,text) to authenticated;
