-- O Passaporte público é uma projeção de várias tabelas. Alterações nessas
-- dependências precisam invalidar passport_version; caso contrário, clientes
-- offline-first continuam usando o perfil antigo mesmo após uma aprovação.

drop trigger if exists author_books_passport_manifest_bump on public.author_books;
create trigger author_books_passport_manifest_bump
after insert or update or delete on public.author_books
for each statement execute function public.bump_manifest_trigger('passport');

drop trigger if exists books_passport_manifest_bump on public.books;
create trigger books_passport_manifest_bump
after insert or update or delete on public.books
for each statement execute function public.bump_manifest_trigger('passport');

drop trigger if exists author_presences_passport_manifest_bump on public.author_presences;
create trigger author_presences_passport_manifest_bump
after insert or update or delete on public.author_presences
for each statement execute function public.bump_manifest_trigger('passport');

drop trigger if exists availability_passport_manifest_bump on public.book_stand_availability;
create trigger availability_passport_manifest_bump
after insert or update or delete on public.book_stand_availability
for each statement execute function public.bump_manifest_trigger('passport');

drop trigger if exists event_authors_passport_manifest_bump on public.event_authors;
create trigger event_authors_passport_manifest_bump
after insert or update or delete on public.event_authors
for each statement execute function public.bump_manifest_trigger('passport');

drop trigger if exists events_passport_manifest_bump on public.events;
create trigger events_passport_manifest_bump
after insert or update or delete on public.events
for each statement execute function public.bump_manifest_trigger('passport');

-- Corrige imediatamente caches criados antes desta migration, incluindo a
-- autora teste já aprovada.
select public.bump_content_manifest('passport');
