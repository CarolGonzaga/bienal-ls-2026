import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY somente no ambiente local/CI seguro.')
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const specs = {
  exhibitors: 'id,logo,name,description,reason_to_visit,stand_code,active,relevance_level,relevance_reasons,categories,featured,updated_at,deleted_at',
  authors: 'id,slug,name,first_name,bio,message,active,published,updated_at,deleted_at',
  books: 'id,title,author_name,publisher,stand_code,exhibitor_id,notes,tags,active,updated_at,deleted_at',
  events: 'id,event_type,author_name,books,event_date,start_time,end_time,stand_code,exhibitor_id,location_text,official_link,notes,tags,active,updated_at,deleted_at',
  passport_profiles: 'author_id,photo_path,photo_width,photo_height,photo_mime,photo_size,bio,message,books,presences,autograph_sessions,sale_locations,status,updated_at,deleted_at',
  author_accounts: 'author_id,user_id,active,verified_at'
}
const exported = { exported_at: new Date().toISOString(), schema: 1, data: {} }
for (const [table, fields] of Object.entries(specs)) {
  const { data, error } = await client.from(table).select(fields)
  if (error) throw new Error(`${table}: ${error.message}`)
  exported.data[table] = data
}
const directory = path.join(process.cwd(), 'artifacts', 'backups')
await mkdir(directory, { recursive: true })
const stamp = exported.exported_at.replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')
const target = path.join(directory, `essential-content-${stamp}.json`)
await writeFile(target, JSON.stringify(exported, null, 2))
console.log(`Backup sem senhas, tokens ou códigos plaintext: ${target}`)
