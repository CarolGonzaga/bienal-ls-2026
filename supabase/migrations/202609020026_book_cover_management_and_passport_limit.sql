-- Capas comunitárias e administrativas, com limite transacional de três
-- livros ativos por autora no Passaporte.

drop policy if exists "Admins upload passport book covers" on storage.objects;
create policy "Admins upload passport book covers"
on storage.objects for insert to authenticated
with check (bucket_id = 'passport-book-covers' and public.is_admin());

drop policy if exists "Admins update passport book covers" on storage.objects;
create policy "Admins update passport book covers"
on storage.objects for update to authenticated
using (bucket_id = 'passport-book-covers' and public.is_admin())
with check (bucket_id = 'passport-book-covers' and public.is_admin());

drop policy if exists "Admins delete passport book covers" on storage.objects;
create policy "Admins delete passport book covers"
on storage.objects for delete to authenticated
using (bucket_id = 'passport-book-covers' and public.is_admin());

-- A revisão comunitária já cria/vincula o livro antes de gravar o resultado
-- na contribuição. Este trigger aplica a URL revisada ao registro resultante.
create or replace function public.sync_approved_community_book_cover()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewed_cover text;
begin
  if new.contribution_type = 'sapphic_book'
     and new.status = 'approved'
     and new.review_target_type = 'book'
     and new.review_target_id is not null then
    reviewed_cover := nullif(trim(coalesce(new.review_payload->>'cover_url', new.payload->>'cover_url', '')), '');
    if reviewed_cover is not null then
      update public.books
      set cover_url = reviewed_cover, updated_at = now()
      where id = new.review_target_id::uuid and deleted_at is null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_approved_community_book_cover on public.community_contributions;
create trigger sync_approved_community_book_cover
after insert or update of status, review_payload, review_target_id
on public.community_contributions
for each row execute function public.sync_approved_community_book_cover();

update public.books book
set cover_url = nullif(trim(coalesce(contribution.review_payload->>'cover_url', contribution.payload->>'cover_url', '')), ''),
    updated_at = now()
from public.community_contributions contribution
where contribution.contribution_type = 'sapphic_book'
  and contribution.status = 'approved'
  and contribution.review_target_type = 'book'
  and contribution.review_target_id = book.id::text
  and nullif(trim(coalesce(contribution.review_payload->>'cover_url', contribution.payload->>'cover_url', '')), '') is not null
  and book.cover_url is null;

create or replace function public.enforce_author_passport_book_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  active_count integer;
begin
  if new.deleted_at is not null then return new; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.author_id::text, 0));

  select count(*) into active_count
  from public.author_books linked
  where linked.author_id = new.author_id
    and linked.deleted_at is null
    and linked.book_id <> new.book_id;

  if active_count >= 3 then
    raise exception using errcode = '23514', message = 'O Passaporte aceita no máximo 3 livros ativos por autora.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_author_passport_book_limit on public.author_books;
create trigger enforce_author_passport_book_limit
before insert or update of author_id, book_id, deleted_at
on public.author_books
for each row execute function public.enforce_author_passport_book_limit();

create or replace function public.enforce_author_pending_book_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  occupied_count integer;
begin
  if new.request_type <> 'book' or new.status not in ('draft', 'pending') then return new; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.author_id::text, 0));

  select
    (select count(*) from public.author_books linked
      where linked.author_id = new.author_id and linked.deleted_at is null)
    +
    (select count(*) from public.author_change_requests request
      where request.author_id = new.author_id
        and request.request_type = 'book'
        and request.status in ('draft', 'pending')
        and request.id <> new.id)
  into occupied_count;

  if occupied_count >= 3 then
    raise exception using errcode = '23514', message = 'O Passaporte aceita no máximo 3 livros por autora, incluindo livros aguardando revisão.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_author_pending_book_limit on public.author_change_requests;
create trigger enforce_author_pending_book_limit
before insert or update of author_id, request_type, status
on public.author_change_requests
for each row execute function public.enforce_author_pending_book_limit();
