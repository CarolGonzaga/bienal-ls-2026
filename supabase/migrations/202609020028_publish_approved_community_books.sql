-- Uma contribuição de livro aprovada deve tornar seu registro publicável e
-- invalidar o catálogo offline, inclusive quando o admin escolhe "vincular".
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
    update public.books book
    set active = true,
        cover_url = coalesce(reviewed_cover, book.cover_url),
        updated_at = now()
    where book.id = new.review_target_id::uuid
      and book.deleted_at is null;
  end if;
  return new;
end;
$$;

-- Corrige registros aprovados antes desta migration, sem exigir nova revisão.
update public.books book
set active = true,
    cover_url = coalesce(
      nullif(trim(coalesce(contribution.review_payload->>'cover_url', contribution.payload->>'cover_url', '')), ''),
      book.cover_url
    ),
    updated_at = now()
from public.community_contributions contribution
where contribution.contribution_type = 'sapphic_book'
  and contribution.status = 'approved'
  and contribution.review_target_type = 'book'
  and contribution.review_target_id = book.id::text
  and book.deleted_at is null;

select public.bump_content_manifest('books');
