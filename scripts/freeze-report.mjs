import { createClient } from '@supabase/supabase-js'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em ambiente seguro para gerar o relatório.')
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const primaryField = { authors: 'id', passport_profiles: 'author_id', events: 'id', exhibitors: 'id', books: 'id' }
const count = async (table, apply = query => query) => {
  const result = await apply(db.from(table).select(primaryField[table], { count: 'exact', head: true }))
  if (result.error) throw new Error(`${table}: ${result.error.message}`)
  return result.count || 0
}
const [authors, noPhoto, noBio, noBooks, noPresence, events, noAuthor, noLocation, exhibitors, books, manifest] = await Promise.all([
  count('authors', q => q.eq('published', true).is('deleted_at', null)),
  count('passport_profiles', q => q.eq('status', 'published').is('photo_path', null)),
  count('passport_profiles', q => q.eq('status', 'published').eq('bio', '')),
  count('passport_profiles', q => q.eq('status', 'published').eq('books', '[]')),
  count('passport_profiles', q => q.eq('status', 'published').eq('presences', '[]')),
  count('events', q => q.eq('active', true).is('deleted_at', null)),
  count('events', q => q.eq('active', true).eq('author_name', '').is('deleted_at', null)),
  count('events', q => q.eq('active', true).is('stand_code', null).is('deleted_at', null)),
  count('exhibitors', q => q.eq('active', true).is('deleted_at', null)),
  count('books', q => q.eq('active', true).is('deleted_at', null)),
  db.from('content_manifest').select('global_version,updated_at').eq('id', true).single()
])
if (manifest.error) throw new Error(manifest.error.message)
const report = `# RELATÓRIO DE CONGELAMENTO — ${new Date().toISOString()}\n\n## PASSAPORTE\n\n- ${authors} autoras publicadas\n- ${noPhoto} sem foto\n- ${noBio} sem bio\n- ${noBooks} sem livro\n- ${noPresence} sem presença\n\n## PROGRAMAÇÃO\n\n- ${events} eventos\n- ${noAuthor} sem autora\n- ${noLocation} sem local vinculado\n\n## CONTEÚDO\n\n- ${exhibitors} expositores ativos\n- ${books} livros ativos\n\n## MAPA\n\nExecute \`npm run test:map\` e \`node scripts/audit-map-spaces.mjs\` e anexe os resultados. A base local esperada possui 279 espaços e 222 estandes.\n\n## OFFLINE\n\n- manifesto v${manifest.data.global_version}\n- última publicação: ${manifest.data.updated_at}\n- execute \`npm run build\` e o teste físico descrito em \`docs/OFFLINE-ACCEPTANCE.md\`\n\n## SUPABASE\n\n- database: Verificar manualmente no Supabase Dashboard\n- storage: Verificar manualmente no Supabase Dashboard\n- RLS: executar checklist antes da liberação\n`
const directory = path.join(process.cwd(), 'artifacts', 'freeze')
await mkdir(directory, { recursive: true })
const target = path.join(directory, `freeze-${new Date().toISOString().slice(0, 10)}.md`)
await writeFile(target, report)
console.log(target)
