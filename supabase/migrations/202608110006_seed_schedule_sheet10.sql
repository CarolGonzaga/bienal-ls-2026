-- Importação idempotente da programação oficial da Sheet10.
-- Mantém local textual quando não existe vínculo seguro com um estande cadastrado.
alter table public.events alter column start_time drop not null;
alter table public.events add column if not exists end_time time;
alter table public.events add column if not exists source_key text;
alter table public.events add column if not exists author_source_id text;
create unique index if not exists events_source_key_uidx on public.events(source_key) where source_key is not null;

with source_data(source_key, author_name, author_source_id, event_date, start_time, end_time, location_text, book_title, notes) as (
 values
  ('andremis|2026-09-07|17:00|a80', 'Andremis', 'andremis', '2026-09-07', '17:00', null, 'A80', null, null),
  ('graziela santos|2026-09-07|14:00|h85', 'Graziela Santos', 'graziela-santos', '2026-09-07', '14:00', null, 'H85', null, null),
  ('nicole oliveira|2026-09-05|16:15|h70', 'Nicole Oliveira', 'nicole-oliveira', '2026-09-05', '16:15', null, 'H70', null, null),
  ('nicole oliveira|2026-09-06|18:00|h70', 'Nicole Oliveira', 'nicole-oliveira', '2026-09-06', '18:00', null, 'H70', null, null),
  ('nicole oliveira|2026-09-12|18:00|h70', 'Nicole Oliveira', 'nicole-oliveira', '2026-09-12', '18:00', null, 'H70', null, null),
  ('luana cruz|2026-09-05||g50', 'Luana Cruz', 'luana-cruz', '2026-09-05', null, null, 'G50', null, null),
  ('ju mesquita|2026-09-05|16:00|h85', 'Ju Mesquita', 'ju-mesquita', '2026-09-05', '16:00', null, 'H85', 'Inimigas Secretas', null),
  ('evelin sousa|2026-09-05|17:00|k66', 'Evelin Sousa', 'evelin-sousa', '2026-09-05', '17:00', '20:00', 'K66', null, null),
  ('evelin sousa|2026-09-06|10:00|k66', 'Evelin Sousa', 'evelin-sousa', '2026-09-06', '10:00', '12:30', 'K66', null, null),
  ('bia r.d. ramos|2026-09-06|17:00|h85', 'Bia R.D. Ramos', 'bia-r-d-ramos', '2026-09-06', '17:00', null, 'H85', null, null),
  ('karoline mandu|2026-09-05|13:00|f14', 'Karoline Mandu', 'karoline-mandu', '2026-09-05', '13:00', null, 'F14', null, null),
  ('sarah oliveira|2026-09-05|16:00|h85', 'Sarah Oliveira', 'sarah-oliveira', '2026-09-05', '16:00', null, 'H85', null, null),
  ('sarah oliveira|2026-09-07|15:00|f14', 'Sarah Oliveira', 'sarah-oliveira', '2026-09-07', '15:00', null, 'F14', null, null),
  ('sarah oliveira|2026-09-10|17:00|k28', 'Sarah Oliveira', 'sarah-oliveira', '2026-09-10', '17:00', '17:55', 'K28', null, null),
  ('sarah oliveira|2026-09-12|14:00|k28', 'Sarah Oliveira', 'sarah-oliveira', '2026-09-12', '14:00', '14:55', 'K28', null, null),
  ('luisa landre|2026-09-05|12:00|h70', 'Luisa Landre', 'luisa-landre', '2026-09-05', '12:00', null, 'H70', null, null),
  ('luisa landre|2026-09-06|12:00|h70', 'Luisa Landre', 'luisa-landre', '2026-09-06', '12:00', null, 'H70', null, null),
  ('luisa landre|2026-09-11|14:00|h70', 'Luisa Landre', 'luisa-landre', '2026-09-11', '14:00', null, 'H70', null, null),
  ('luisa landre|2026-09-12|14:00|h70', 'Luisa Landre', 'luisa-landre', '2026-09-12', '14:00', null, 'H70', null, null),
  ('marina basso|2026-09-05|16:00|h60', 'Marina Basso', 'marina-basso', '2026-09-05', '16:00', null, 'H60', null, null),
  ('mariana rosa|2026-09-07|16:00|f14', 'Mariana Rosa', 'mariana-rosa', '2026-09-07', '16:00', null, 'F14', null, null),
  ('gih alves|2026-09-07|11:00|h85', 'Gih Alves', 'gih-alves', '2026-09-07', '11:00', null, 'H85', 'Diversões Humanas', 'Lançamento da versão física de Diversões Humanas (minibook lançado primeiro em ebook e audiodrama).'),
  ('marina feijóo|2026-09-13|13:00|h85', 'Marina Feijóo', 'marina-feijoo', '2026-09-13', '13:00', null, 'H85', null, null),
  ('lari alcantara|2026-09-04|12:00|k33', 'Lari Alcantara', 'lari-alcantara', '2026-09-04', '12:00', '13:00', 'K33', null, null),
  ('lari alcantara|2026-09-05|12:00|k33', 'Lari Alcantara', 'lari-alcantara', '2026-09-05', '12:00', '13:00', 'K33', null, null),
  ('lari alcantara|2026-09-06|12:00|k33', 'Lari Alcantara', 'lari-alcantara', '2026-09-06', '12:00', '13:00', 'K33', null, null),
  ('lari alcantara|2026-09-07|18:00|k33', 'Lari Alcantara', 'lari-alcantara', '2026-09-07', '18:00', '19:00', 'K33', null, null),
  ('lari alcantara|2026-09-08|10:00|k33', 'Lari Alcantara', 'lari-alcantara', '2026-09-08', '10:00', '11:00', 'K33', null, null),
  ('lari alcantara|2026-09-09|11:00|k33', 'Lari Alcantara', 'lari-alcantara', '2026-09-09', '11:00', '12:00', 'K33', null, null),
  ('lari alcantara|2026-09-10|11:00|k33', 'Lari Alcantara', 'lari-alcantara', '2026-09-10', '11:00', '12:00', 'K33', null, null),
  ('lari alcantara|2026-09-11|17:00|k33', 'Lari Alcantara', 'lari-alcantara', '2026-09-11', '17:00', '18:00', 'K33', null, null),
  ('lari alcantara|2026-09-12|13:00|k33', 'Lari Alcantara', 'lari-alcantara', '2026-09-12', '13:00', '14:00', 'K33', null, null),
  ('lari alcantara|2026-09-13|12:00|k33', 'Lari Alcantara', 'lari-alcantara', '2026-09-13', '12:00', '13:00', 'K33', null, null),
  ('raiany távora|2026-09-05|17:00|k33', 'Raiany Távora', 'raiany-tavora', '2026-09-05', '17:00', '18:00', 'K33', 'A Fera do Palacete', 'A Fera do Palacete, livro da autora Raiany Távora, será lançado em setembro, na Bienal'),
  ('raiany távora|2026-09-06|10:00|k33', 'Raiany Távora', 'raiany-tavora', '2026-09-06', '10:00', '11:00', 'K33', null, null),
  ('sebastian j.|2026-09-04|13:00|k33', 'Sebastian J.', 'sebastian-j', '2026-09-04', '13:00', '14:00', 'K33', null, null),
  ('sebastian j.|2026-09-08|13:00|k33', 'Sebastian J.', 'sebastian-j', '2026-09-08', '13:00', '14:00', 'K33', null, null),
  ('sebastian j.|2026-09-09|15:00|k33', 'Sebastian J.', 'sebastian-j', '2026-09-09', '15:00', '16:00', 'K33', null, null),
  ('sebastian j.|2026-09-10|17:00|k33', 'Sebastian J.', 'sebastian-j', '2026-09-10', '17:00', '18:00', 'K33', null, null),
  ('sebastian j.|2026-09-11|13:00|k33', 'Sebastian J.', 'sebastian-j', '2026-09-11', '13:00', '14:00', 'K33', null, null),
  ('sebastian j.|2026-09-12|17:00|k33', 'Sebastian J.', 'sebastian-j', '2026-09-12', '17:00', '18:00', 'K33', null, null),
  ('sebastian j.|2026-09-13|17:00|k33', 'Sebastian J.', 'sebastian-j', '2026-09-13', '17:00', '18:00', 'K33', null, null),
  ('carol cara|2026-09-13|12:00|travessa literária 24', 'Carol Cara', 'carol-cara', '2026-09-13', '12:00', '14:00', 'TRAVESSA LITERÁRIA 24', 'Como sabotar Mia Espinosa', 'Vou vender o livro Como sabotar Mia Espinosa'),
  ('denise flaibam|2026-09-06|13:00|f70', 'Denise Flaibam', 'denise-flaibam', '2026-09-06', '13:00', null, 'F70', 'O Clube do Pesadelo', null),
  ('denise flaibam|2026-09-07|11:00|f70', 'Denise Flaibam', 'denise-flaibam', '2026-09-07', '11:00', null, 'F70', 'O Clube do Pesadelo', null),
  ('denise flaibam|2026-09-12|14:00|f70', 'Denise Flaibam', 'denise-flaibam', '2026-09-12', '14:00', null, 'F70', 'O Clube do Pesadelo', null),
  ('bianca da silva|2026-09-06|13:00|f70', 'Bianca da Silva', 'bianca-da-silva', '2026-09-06', '13:00', null, 'F70', 'O Clube do Pesadelo', null),
  ('bianca da silva|2026-09-07|11:00|f70', 'Bianca da Silva', 'bianca-da-silva', '2026-09-07', '11:00', null, 'F70', 'O Clube do Pesadelo', null),
  ('bianca da silva|2026-09-12|14:00|f70', 'Bianca da Silva', 'bianca-da-silva', '2026-09-12', '14:00', null, 'F70', 'O Clube do Pesadelo', null),
  ('rina rodriguez|2026-09-05|14:00|k66', 'Rina Rodriguez', 'rina-rodriguez', '2026-09-05', '14:00', null, 'K66', null, null),
  ('rina rodriguez|2026-09-06|16:00|k66', 'Rina Rodriguez', 'rina-rodriguez', '2026-09-06', '16:00', null, 'K66', null, null),
  ('danda odeleci|2026-09-06||f14', 'Danda Odeleci', 'danda-odeleci', '2026-09-06', null, null, 'F14', null, null),
  ('danda odeleci|2026-09-13||f14', 'Danda Odeleci', 'danda-odeleci', '2026-09-13', null, null, 'F14', null, null),
  ('stephanie cruz|2026-09-12|17:00|h85', 'Stephanie Cruz', 'stephanie-cruz', '2026-09-12', '17:00', null, 'H85', null, null),
  ('victoria moon|2026-09-06|16:00|e18', 'Victoria Moon', 'victoria-moon', '2026-09-06', '16:00', null, 'E18', null, null),
  ('milos dracomir|2026-09-04|10:00|k33', 'Milos Dracomir', 'milos-dracomir', '2026-09-04', '10:00', '11:00', 'K33', null, null),
  ('milos dracomir|2026-09-07|14:00|k33', 'Milos Dracomir', 'milos-dracomir', '2026-09-07', '14:00', '15:00', 'K33', null, null),
  ('bacoaquiles|2026-09-12|11:00|k33', 'Bacoaquiles', 'bacoaquiles', '2026-09-12', '11:00', '12:00', 'K33', null, null)
),
prepared as (
  select
    source_data.*,
    exhibitor.id as linked_exhibitor_id,
    exhibitor.stand_code as linked_stand_code
  from source_data
  left join lateral (
    select id, stand_code from public.exhibitors
    where upper(trim(stand_code)) = upper(trim(source_data.location_text))
    limit 1
  ) exhibitor on true
)
insert into public.events (
  event_type, author_name, author_source_id, books, event_date, start_time, end_time,
  stand_code, exhibitor_id, location_text, notes, tags, active, source_key
)
select
  'autograph', author_name, nullif(trim(author_source_id), ''),
  case when nullif(trim(book_title), '') is null then '{}'::text[] else array[trim(book_title)] end,
  event_date::date, start_time::time, end_time::time, linked_stand_code, linked_exhibitor_id,
  location_text, nullif(trim(notes), ''), array['sessao de autografo']::text[], true, source_key
from prepared
on conflict (source_key) where source_key is not null do update set
  author_name = excluded.author_name,
  author_source_id = excluded.author_source_id,
  books = excluded.books,
  event_date = excluded.event_date,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  stand_code = excluded.stand_code,
  exhibitor_id = excluded.exhibitor_id,
  location_text = excluded.location_text,
  notes = excluded.notes,
  tags = excluded.tags,
  active = true,
  updated_at = now();
