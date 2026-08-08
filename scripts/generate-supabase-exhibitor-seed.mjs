import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { INITIAL_EXHIBITORS } from '../src/data/initialExhibitors.ts'

const quote = value => `'${String(value ?? '').replaceAll("'", "''")}'`
const array = values => `array[${(values || []).map(quote).join(', ')}]::text[]`
const rows = INITIAL_EXHIBITORS.map(item => `(${[
  quote(item.id), quote(item.logo), quote(item.name), quote(item.description), quote(item.reasonToVisit),
  quote(item.standCode), item.active, quote(item.relevanceLevel), array(item.relevanceReasons),
  array(item.categories), Boolean(item.featured)
].join(', ')})`).join(',\n')

const allowedIds = INITIAL_EXHIBITORS.map(item => quote(item.id)).join(', ')
const sql = `-- Gerado de src/data/initialExhibitors.ts. Não edite manualmente.\n-- Esta seed é autoritativa: remove expositores que não pertencem aos 29 registros oficiais.\ndelete from public.exhibitors where id not in (${allowedIds});\n\ninsert into public.exhibitors (id, logo, name, description, reason_to_visit, stand_code, active, relevance_level, relevance_reasons, categories, featured)\nvalues\n${rows}\non conflict (id) do update set\n  logo = excluded.logo, name = excluded.name, description = excluded.description,\n  reason_to_visit = excluded.reason_to_visit, stand_code = excluded.stand_code, active = excluded.active,\n  relevance_level = excluded.relevance_level, relevance_reasons = excluded.relevance_reasons,\n  categories = excluded.categories, featured = excluded.featured, updated_at = now();\n`

await writeFile(resolve('supabase/migrations/202608080002_seed_exhibitors.sql'), sql, 'utf8')
console.log(`Seed criado com ${INITIAL_EXHIBITORS.length} expositores.`)
