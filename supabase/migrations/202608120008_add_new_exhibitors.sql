-- Atualiza o estande compartilhado F14 e adiciona os novos expositores da planilha.
-- O ID editora-caliope e preservado para manter favoritos, visitas e rotas existentes.
insert into public.exhibitors (
  id, logo, name, description, reason_to_visit, stand_code, active,
  relevance_level, relevance_reasons, categories, featured
)
values
(
  'editora-caliope',
  'se-liga-editorial.webp',
  'Se Liga Editorial | Calíope | PEL',
  E'💛 Acreditamos no poder das histórias que abraçam\n🌈 Orgulho. Afeto. Resistência. Diversidade.\n📚 Se Liga: literatura que acolhe, inspira e transforma',
  'De 4 a 13 de setembro, o nosso estande estará recheado de histórias LGBTQIAP+, lançamentos, autores, sessões de autógrafos e aquele acolhimento que já é nossa marca registrada',
  'F14', true, 'catalogo_confirmado',
  array['Representatividade e apoio a novos escritores']::text[], array[]::text[], false
),
(
  'editora-venus', 'editora-venus.webp', 'Editora Vênus',
  'Somos uma editora que nasceu da paixão por histórias, da imersão nas páginas e do amor pelos romances. Vênus não é apenas uma editora; é uma promessa de levar as estórias que nascem em corações apaixonados para além do horizonte, tornando cada palavra uma jornada.',
  'Na Vênuzinha, teremos brindes exclusivos, sessões de autógrafos e muitas novidades em todos os dias do evento!',
  'H85', true, 'catalogo_confirmado', array[]::text[], array[]::text[], false
),
(
  'literunico', 'literunico.webp', 'Literunico',
  'Literunico é um lugar para autores, leitores e obras existirem com mais espaço. Uma obra pode nascer como rascunho, virar livro, ganhar página própria, leitores, capítulos, bastidores, venda, clube, assinatura, comunidade e presença pública.',
  'Livros, encontros e autores no estande do Literunico durante os dez dias da Bienal Internacional do Livro de São Paulo.',
  'TRAVESSA LITERÁRIA 24', true, 'catalogo_confirmado', array[]::text[], array[]::text[], false
),
(
  'editora-bezz', 'editora-bezz.webp', 'Editora Bezz', '', '',
  'K40', true, 'catalogo_confirmado', array[]::text[], array[]::text[], false
)
on conflict (id) do update set
  logo = excluded.logo,
  name = excluded.name,
  description = excluded.description,
  reason_to_visit = excluded.reason_to_visit,
  stand_code = excluded.stand_code,
  active = excluded.active,
  relevance_level = excluded.relevance_level,
  relevance_reasons = excluded.relevance_reasons,
  categories = excluded.categories,
  featured = excluded.featured,
  updated_at = now();

-- Eventos importados antes desta migração passam a apontar para os novos expositores.
update public.events as event
set
  exhibitor_id = exhibitor.id,
  stand_code = exhibitor.stand_code,
  updated_at = now()
from public.exhibitors as exhibitor
where event.exhibitor_id is null
  and upper(trim(event.location_text)) = upper(exhibitor.stand_code)
  and exhibitor.id in ('editora-venus', 'literunico', 'editora-bezz');
