-- Autoras podem cadastrar quantos livros desejarem. Somente a seleção exibida
-- no perfil do Passaporte permanece limitada a três títulos por autora.

drop trigger if exists enforce_author_pending_book_limit on public.author_change_requests;
drop trigger if exists enforce_author_passport_book_limit on public.author_books;
drop function if exists public.enforce_author_pending_book_limit();
drop function if exists public.enforce_author_passport_book_limit();

-- Corrige preventivamente bases que já tenham mais de três destaques. A ordem
-- explícita é preservada primeiro; os demais ficam cadastrados, sem destaque.
with ranked_featured as (
  select
    author_book.author_id,
    author_book.book_id,
    row_number() over (
      partition by author_book.author_id
      order by author_book.display_order nulls last, author_book.updated_at, author_book.book_id
    ) as position
  from public.author_books author_book
  where author_book.deleted_at is null and author_book.featured
)
update public.author_books author_book
set featured = false, display_order = null, updated_at = now()
from ranked_featured ranked
where author_book.author_id = ranked.author_id
  and author_book.book_id = ranked.book_id
  and ranked.position > 3;

create or replace function public.enforce_author_passport_featured_book_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  featured_count integer;
begin
  if new.deleted_at is not null or not new.featured then
    if not new.featured then new.display_order := null; end if;
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.author_id::text, 0));

  select count(*) into featured_count
  from public.author_books linked
  where linked.author_id = new.author_id
    and linked.deleted_at is null
    and linked.featured
    and linked.book_id <> new.book_id;

  if featured_count >= 3 then
    raise exception using
      errcode = '23514',
      message = 'O Passaporte aceita no máximo 3 livros destacados por autora. Remova um destaque antes de adicionar outro.';
  end if;

  return new;
end;
$$;

create trigger enforce_author_passport_featured_book_limit
before insert or update
on public.author_books
for each row execute function public.enforce_author_passport_featured_book_limit();

-- Alterações em destaque invalidam o cache do Passaporte pelo trigger de
-- dependência já instalado em author_books.
