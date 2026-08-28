import { appPath } from './paths'
import { getOfflineDataset, getOfflineMeta, putOfflineDataset, putOfflineMeta, type OfflineDatasetKey } from './offlineDb'
import { isSupabaseConfigured, supabase } from './supabase'

export type ContentManifest = {
  global_version: number; map_version: number; exhibitors_version: number; books_version: number;
  schedule_version: number; authors_version: number; passport_version: number; passport_codes_version: number; updated_at: string
}

export const OFFLINE_ASSET_CACHE = 'mapasafico-offline-assets-v1'
export const CORE_OFFLINE_ASSETS = [
  appPath('/'), appPath('/login'), appPath('/index.html'), appPath('/manifest.json'), appPath('/logo-icon.png'),
  appPath('/logo-texto.png'), appPath('/logo-completo.png'), appPath('/logo-ls-watermark.png'),
  appPath('/mapa/mapa-guia-2d.png')
]

const VERSION_FIELD: Record<OfflineDatasetKey, keyof ContentManifest> = {
  exhibitors: 'exhibitors_version', books: 'books_version', schedule: 'schedule_version', authors: 'authors_version',
  passport: 'passport_version', passport_codes: 'passport_codes_version'
}

let activeSync: Promise<ContentManifest | null> | null = null

const fetchManifest = async (): Promise<ContentManifest | null> => {
  const { data, error } = await supabase.from('content_manifest')
    .select('global_version,map_version,exhibitors_version,books_version,schedule_version,authors_version,passport_version,passport_codes_version,updated_at')
    .eq('id', true).maybeSingle()
  if (error) throw error
  return data
}

const downloadSection = async (section: OfflineDatasetKey) => {
  if (section === 'exhibitors') return supabase.from('exhibitors').select('id,logo,name,description,reason_to_visit,stand_code,active,relevance_level,relevance_reasons,categories,featured,updated_at,deleted_at').order('name')
  if (section === 'books') return supabase.from('books').select('id,title,author_name,publisher,stand_code,exhibitor_id,cover_url,genre,autograph_available,notes,tags,active,updated_at,deleted_at').order('updated_at')
  if (section === 'schedule') return supabase.from('events').select('id,event_type,author_name,author_source_id,books,event_date,start_time,end_time,stand_code,exhibitor_id,location_text,official_link,notes,tags,active,updated_at,deleted_at').order('event_date').order('start_time')
  if (section === 'authors') return supabase.from('authors').select('id,slug,name,first_name,bio,message,active,published,updated_at,deleted_at').eq('published', true).order('name')
  if (section === 'passport') return supabase.from('passport_public_profiles').select('author_id,photo_path,photo_width,photo_height,photo_mime,photo_size,bio,message,passport_display_name,passport_age,passport_city,books,presences,autograph_sessions,sale_locations,status,updated_at,deleted_at')
  return supabase.from('passport_code_manifest').select('author_id,code_hash,valid_from,valid_until,version')
}

export const syncPublicContent = async ({ force = false, sections }: { force?: boolean; sections?: OfflineDatasetKey[] } = {}) => {
  if (!isSupabaseConfigured || !navigator.onLine) return (await getOfflineMeta<ContentManifest>('contentManifest'))
  if (activeSync && !force) return activeSync
  activeSync = (async () => {
    const remote = await fetchManifest()
    if (!remote) return null
    const requested = sections || (Object.keys(VERSION_FIELD) as OfflineDatasetKey[])
    for (const section of requested) {
      const local = await getOfflineDataset(section)
      const version = Number(remote[VERSION_FIELD[section]])
      if (!force && local?.version === version) continue
      const result = await downloadSection(section)
      if (result.error) throw result.error
      await putOfflineDataset({ key: section, version, updatedAt: remote.updated_at, data: result.data || [] })
    }
    await putOfflineMeta('contentManifest', remote)
    await putOfflineMeta('lastSuccessfulSync', new Date().toISOString())
    return remote
  })().finally(() => { activeSync = null })
  return activeSync
}

export const cacheOfflineAssets = async (exhibitorLogos: string[] = [], passportPhotos: string[] = []) => {
  const cache = await caches.open(OFFLINE_ASSET_CACHE)
  const loadedResources = typeof performance === 'undefined' ? [] : performance.getEntriesByType('resource')
    .map(entry => entry.name).filter(url => url.startsWith(window.location.origin))
  const photoUrls = passportPhotos.map(path => path.startsWith('http') ? path : supabase.storage.from('passport-photos').getPublicUrl(path).data.publicUrl)
  const candidates = [
    ...CORE_OFFLINE_ASSETS.map(url => ({ url, critical: true })),
    ...loadedResources.map(url => ({ url, critical: true })),
    ...exhibitorLogos.map(file => ({ url: appPath(`/expositores/${file}`), critical: false })),
    ...photoUrls.map(url => ({ url, critical: true }))
  ]
  const byUrl = new Map<string, boolean>()
  for (const item of candidates) byUrl.set(item.url, Boolean(byUrl.get(item.url) || item.critical))
  const results = await Promise.all([...byUrl].map(async ([url, critical]) => {
    try {
      const response = await fetch(url, { cache: 'reload' })
      if (!response.ok) return { url, ok: false, critical }
      await cache.put(url, response.clone())
      return { url, ok: true, critical }
    } catch { return { url, ok: false, critical } }
  }))
  await putOfflineMeta('offlineAssets', results)
  return results
}

export const preloadOfflineQrTools = async () => {
  const [{ default: QrScanner }] = await Promise.all([import('qr-scanner'), import('qrcode')])
  try {
    const engine = await (QrScanner as any).createQrEngine()
    if (engine && typeof engine.terminate === 'function') engine.terminate()
  } catch {
    // A digitação manual continua disponível se o aparelho não suportar o worker/decoder.
  }
}

export const getOfflineReadiness = async () => {
  const keys = Object.keys(VERSION_FIELD) as OfflineDatasetKey[]
  const datasets = Object.fromEntries(await Promise.all(keys.map(async key => [key, Boolean(await getOfflineDataset(key))])))
  const assets = await getOfflineMeta<Array<{ url: string; ok: boolean; critical?: boolean }>>('offlineAssets') || []
  const criticalAssetsReady = CORE_OFFLINE_ASSETS.every(url => assets.some(item => item.url === url && item.ok))
  const lastUpdated = await getOfflineMeta<string>('lastSuccessfulSync')
  const allCriticalReady = assets.filter(item => item.critical).every(item => item.ok)
  return { datasets, assets: criticalAssetsReady && allCriticalReady, lastUpdated, ready: keys.every(key => datasets[key]) && criticalAssetsReady && allCriticalReady }
}
