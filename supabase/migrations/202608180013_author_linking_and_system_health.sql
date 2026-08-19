alter table public.profiles add column if not exists email text;
alter table public.community_contributions add column if not exists client_submission_id uuid;
create unique index if not exists community_contributions_client_submission_unique on public.community_contributions(client_submission_id);
update public.profiles profile set email=auth_user.email from auth.users auth_user where auth_user.id=profile.id and profile.email is null;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, username, display_name, discovery_source)
  values (new.id, new.email, new.raw_user_meta_data->>'username', coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'username'), new.raw_user_meta_data->>'discoverySource')
  on conflict (id) do update set email=excluded.email, updated_at=now();
  return new;
end;
$$;

create policy "Admins read profiles for account linking" on public.profiles for select to authenticated using (public.is_admin());

create or replace function public.admin_link_author_by_email(target_author_id uuid, target_email text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target_user_id uuid;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
  select id into target_user_id from auth.users where lower(email)=lower(trim(target_email)) limit 1;
  if target_user_id is null then raise exception 'Nenhuma conta encontrada para este email'; end if;
  insert into public.author_accounts(author_id,user_id,active,verified_at,verified_by)
  values(target_author_id,target_user_id,true,now(),(select auth.uid()))
  on conflict(user_id) do update set author_id=excluded.author_id,active=true,verified_at=now(),verified_by=excluded.verified_by;
  insert into public.profiles(id,email,display_name,role,updated_at)
  values(target_user_id,lower(trim(target_email)),split_part(lower(trim(target_email)),'@',1),'author',now())
  on conflict(id) do update set email=excluded.email,role='author',updated_at=now();
  return target_user_id;
end;
$$;

create or replace function public.get_my_passport_code()
returns table(author_id uuid, code_plaintext text, valid_from timestamptz, valid_until timestamptz, version integer)
language sql stable security definer set search_path = '' as $$
  select code.author_id,code.code_plaintext,code.valid_from,code.valid_until,code.version
  from public.passport_codes code join public.author_accounts account on account.author_id=code.author_id
  where account.user_id=(select auth.uid()) and account.active and code.active
$$;

create or replace function public.approve_passport_profile(target_author_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
  if not exists(select 1 from public.passport_profiles where author_id=target_author_id and status='pending' and consent_version is not null and consent_accepted_at is not null) then
    raise exception 'Perfil pendente com consentimento versionado é obrigatório';
  end if;
  update public.passport_profiles set status='published',reviewed_at=now(),reviewed_by=(select auth.uid()),updated_at=now() where author_id=target_author_id;
  update public.authors set published=true,updated_at=now() where id=target_author_id;
  perform public.bump_content_manifest('authors');
  perform public.bump_content_manifest('passport');
end;
$$;

create or replace function public.review_author_change_request(target_request_id uuid, decision text, notes text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare request_record public.author_change_requests;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
  if decision not in ('approved','rejected') then raise exception 'Decisão inválida'; end if;
  select * into request_record from public.author_change_requests where id=target_request_id and status='pending' for update;
  if request_record.id is null then raise exception 'Solicitação pendente não encontrada'; end if;
  if decision='approved' and request_record.request_type='profile' then
    insert into public.passport_profiles(author_id,photo_path,photo_width,photo_height,photo_mime,photo_size,photo_updated_at,bio,message,books,presences,autograph_sessions,sale_locations,status,consent_version,consent_accepted_at,consent_accepted_by_user_id,reviewed_at,reviewed_by,updated_at)
    values(request_record.author_id,nullif(request_record.payload->>'photo_path',''),nullif(request_record.payload->>'photo_width','')::integer,nullif(request_record.payload->>'photo_height','')::integer,nullif(request_record.payload->>'photo_mime',''),nullif(request_record.payload->>'photo_size','')::integer,nullif(request_record.payload->>'photo_updated_at','')::timestamptz,coalesce(request_record.payload->>'bio',''),coalesce(request_record.payload->>'message',''),coalesce(request_record.payload->'books','[]'::jsonb),coalesce(request_record.payload->'presences','[]'::jsonb),coalesce(request_record.payload->'autograph_sessions','[]'::jsonb),coalesce(request_record.payload->'sale_locations','[]'::jsonb),'published',request_record.payload->>'consent_version',nullif(request_record.payload->>'consent_accepted_at','')::timestamptz,nullif(request_record.payload->>'consent_accepted_by_user_id','')::uuid,now(),(select auth.uid()),now())
    on conflict(author_id) do update set photo_path=excluded.photo_path,photo_width=excluded.photo_width,photo_height=excluded.photo_height,photo_mime=excluded.photo_mime,photo_size=excluded.photo_size,photo_updated_at=excluded.photo_updated_at,bio=excluded.bio,message=excluded.message,books=excluded.books,presences=excluded.presences,autograph_sessions=excluded.autograph_sessions,sale_locations=excluded.sale_locations,status='published',consent_version=excluded.consent_version,consent_accepted_at=excluded.consent_accepted_at,consent_accepted_by_user_id=excluded.consent_accepted_by_user_id,reviewed_at=now(),reviewed_by=(select auth.uid()),updated_at=now();
    update public.authors set published=true,updated_at=now() where id=request_record.author_id;
  end if;
  update public.author_change_requests set status=decision,admin_notes=notes,reviewed_at=now(),reviewed_by=(select auth.uid()),updated_at=now() where id=target_request_id;
  if request_record.request_type='profile' and decision='approved' then perform public.bump_content_manifest('authors'); perform public.bump_content_manifest('passport'); end if;
end;
$$;

create policy "Authors create own passport profile" on public.passport_profiles for insert to authenticated
with check (exists(select 1 from public.author_accounts aa where aa.author_id=passport_profiles.author_id and aa.user_id=(select auth.uid()) and aa.active) and status in ('draft','pending') and (consent_accepted_by_user_id is null or consent_accepted_by_user_id=(select auth.uid())));
grant insert on public.passport_profiles to authenticated;
grant select(author_id,code_hash,valid_from,valid_until,version) on public.passport_codes to authenticated;
grant execute on function public.admin_link_author_by_email(uuid,text), public.get_my_passport_code(), public.approve_passport_profile(uuid), public.review_author_change_request(uuid,text,text) to authenticated;

create table if not exists public.system_budget_config (
  id boolean primary key default true check(id),
  database_budget_bytes bigint not null default 524288000,
  storage_budget_bytes bigint not null default 1073741824,
  warning_thresholds numeric[] not null default array[0.60,0.75,0.90],
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
insert into public.system_budget_config(id) values(true) on conflict(id) do nothing;
alter table public.system_budget_config enable row level security;
create policy "Admins read budget configuration" on public.system_budget_config for select to authenticated using(public.is_admin());
create policy "Admins update budget configuration" on public.system_budget_config for update to authenticated using(public.is_admin()) with check(public.is_admin());
grant select,update on public.system_budget_config to authenticated;

create or replace function public.get_system_health()
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when public.is_admin() then jsonb_build_object(
    'authors_published',(select count(*) from public.authors where published and deleted_at is null),
    'authors_incomplete',(select count(*) from public.authors author left join public.passport_profiles profile on profile.author_id=author.id where author.published and author.deleted_at is null and (profile.author_id is null or profile.status<>'published' or profile.photo_path is null or profile.bio='')),
    'pending_contributions',(select count(*) from public.community_contributions where status='pending'),
    'urgent_changes',(select count(*) from public.author_change_requests where status='pending' and request_type='urgent'),
    'events_without_location',(select count(*) from public.events where active and deleted_at is null and stand_code is null),
    'events_without_time',(select count(*) from public.events where active and deleted_at is null and start_time is null and event_type<>'presence'),
    'books_without_cover',null,
    'profiles_without_photo',(select count(*) from public.passport_profiles where status='published' and photo_path is null),
    'sync_errors',null,
    'content_version',(select global_version from public.content_manifest where id=true),
    'last_publication',(select updated_at from public.content_manifest where id=true),
    'database_bytes',null,
    'storage_bytes',null
  ) else null end
$$;
grant execute on function public.get_system_health() to authenticated;
