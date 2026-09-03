-- Remove tags duplicadas e impede que o gênero seja repetido como tag.

create or replace function public.normalize_book_tags(
  p_genre text,
  p_tags text[]
)
returns text[]
language sql
immutable
set search_path = ''
as $$
  with prepared as (
    select
      trim(source.tag) as clean_tag,
      source.ordinality,
      regexp_replace(
        translate(
          lower(trim(source.tag)),
          'áàâãäéèêëíìîïóòôõöúùûüç',
          'aaaaaeeeeiiiiooooouuuuc'
        ),
        '[^a-z0-9]+', '', 'g'
      ) as tag_key
    from unnest(coalesce(p_tags, '{}'::text[])) with ordinality source(tag, ordinality)
    where nullif(trim(source.tag), '') is not null
  ), unique_tags as (
    select distinct on (tag_key)
      clean_tag, ordinality, tag_key
    from prepared
    where tag_key <> regexp_replace(
      translate(
        lower(trim(coalesce(p_genre, ''))),
        'áàâãäéèêëíìîïóòôõöúùûüç',
        'aaaaaeeeeiiiiooooouuuuc'
      ),
      '[^a-z0-9]+', '', 'g'
    )
    order by tag_key, ordinality
  )
  select coalesce(array_agg(clean_tag order by ordinality), '{}'::text[])
  from unique_tags;
$$;

update public.books book
set tags = public.normalize_book_tags(book.genre, book.tags),
    updated_at = now()
where book.tags is distinct from public.normalize_book_tags(book.genre, book.tags);

create or replace function public.normalize_book_tags_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.tags := public.normalize_book_tags(new.genre, new.tags);
  return new;
end;
$$;

drop trigger if exists normalize_book_tags_before_write on public.books;
create trigger normalize_book_tags_before_write
before insert or update of genre, tags
on public.books
for each row execute function public.normalize_book_tags_before_write();

revoke execute on function public.normalize_book_tags(text, text[]) from public, anon;
grant execute on function public.normalize_book_tags(text, text[]) to authenticated;

select public.bump_content_manifest('books');
select public.bump_content_manifest('passport');
