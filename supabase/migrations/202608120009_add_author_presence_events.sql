-- Registra presenças confirmadas de autoras que não possuem sessão de autógrafos confirmada.
-- Cada dia informado na Sheet10 vira um evento independente, sem horário.
with presence_source(author_name, author_source_id, days, location_text) as (
  values
    ('Fernanda V.', 'fernanda-v', array[5,6,12,13], null),
    ('Julie Pedrosa', 'julie-pedrosa', array[4,5,6,7,8,9,10,11,12,13], null),
    ('Agatha Menezes', 'agatha-menezes', array[4,5,6,7,8,9,10,11,12,13], 'F14'),
    ('Helena Vieira', 'helena-vieira', array[5,6,7], null),
    ('Laura Rodrigues', 'laura-rodrigues', array[5,6,7], null),
    ('Ingrid Paranhos', 'ingrid-paranhos', array[5], null),
    ('Emely Luiza Curcio', 'emely-luiza-curcio', array[4,5,6,7,8,9,10,11,12,13], 'F14'),
    ('Thaís Boito', 'thais-boito', array[4,6,7,8,9,10,11,13], null),
    ('Vanessa Freitas', 'vanessa-freitas', array[4,5,6,7,8,9,10,11,12,13], 'F14'),
    ('Alexia', 'alexia', array[5], null),
    ('Helena Nolasco', 'helena-nolasco', array[5,6,7,8,9,10,11,12,13], null),
    ('Gina Milbradt', 'gina-milbradt', array[4,5,6,11,12,13], null),
    ('Raquel Alves', 'raquel-alves', array[5,7,12,13], null)
),
expanded as (
  select
    presence_source.author_name,
    presence_source.author_source_id,
    make_date(2026, 9, day_number) as event_date,
    presence_source.location_text
  from presence_source
  cross join lateral unnest(presence_source.days) as day_number
),
prepared as (
  select
    expanded.*,
    concat('presence|', expanded.author_source_id, '|', expanded.event_date::text) as source_key,
    exhibitor.id as exhibitor_id,
    exhibitor.stand_code
  from expanded
  left join public.exhibitors as exhibitor
    on upper(exhibitor.stand_code) = upper(expanded.location_text)
)
insert into public.events (
  event_type, author_name, author_source_id, books, event_date, start_time, end_time,
  stand_code, exhibitor_id, location_text, notes, tags, active, source_key
)
select
  'presence', author_name, author_source_id, '{}'::text[], event_date, null, null,
  stand_code, exhibitor_id, coalesce(location_text, 'Local a confirmar'), null,
  array['presenca']::text[], true, source_key
from prepared
on conflict (source_key) where source_key is not null do update set
  event_type = excluded.event_type,
  author_name = excluded.author_name,
  author_source_id = excluded.author_source_id,
  books = excluded.books,
  event_date = excluded.event_date,
  start_time = null,
  end_time = null,
  stand_code = excluded.stand_code,
  exhibitor_id = excluded.exhibitor_id,
  location_text = excluded.location_text,
  tags = excluded.tags,
  active = true,
  updated_at = now();
