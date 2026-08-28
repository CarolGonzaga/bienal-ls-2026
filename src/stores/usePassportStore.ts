import { create } from 'zustand'
import { getOfflineDataset, getPersonalOfflineData, putPersonalOfflineData, enqueueOfflineMutation, listOfflineMutations, removeOfflineMutation } from '../lib/offlineDb'
import { syncPublicContent } from '../lib/contentSync'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { codeIsValidAt, extractPassportCode, sha256Hex } from '../lib/passportCode'

export type PassportAuthor = { id: string; slug: string; name: string; first_name: string; bio: string; message: string; active: boolean; published: boolean }
export type PassportProfile = { author_id: string; photo_path?: string; bio: string; message: string; passport_display_name?: string; passport_age?: number | string; passport_city?: string; books: any[]; presences: any[]; autograph_sessions: any[]; sale_locations: any[] }
export type PassportCodeHash = { author_id: string; code_hash: string; valid_from: string; valid_until: string; version: number }
export type LocalPassportStamp = { authorId: string; authorName?: string; authorSlug?: string; redeemedAtLocal: string; status: 'pending_sync' | 'confirmed'; source: 'manual' | 'qr'; syncAttempts: number; lastSyncError?: string }

type RedeemResult = { ok: boolean; authorId?: string; differentAuthor?: PassportAuthor; message: string }
type PassportState = {
  enabled: boolean; authors: PassportAuthor[]; profiles: PassportProfile[]; codes: PassportCodeHash[]; stamps: LocalPassportStamp[]; loaded: boolean
  load: (userId: string) => Promise<void>; redeemPassportCode: (userId: string, raw: string, source: 'manual' | 'qr', expectedAuthorId?: string) => Promise<RedeemResult>; syncPendingStamps: (userId: string) => Promise<void>
}

export const usePassportStore = create<PassportState>((set, get) => ({
  enabled: false, authors: [], profiles: [], codes: [], stamps: [], loaded: false,
  load: async userId => {
    const [authors, profiles, codes, stamps, cachedFlag] = await Promise.all([
      getOfflineDataset<PassportAuthor[]>('authors'), getOfflineDataset<PassportProfile[]>('passport'), getOfflineDataset<PassportCodeHash[]>('passport_codes'),
      getPersonalOfflineData<LocalPassportStamp[]>(userId, 'passportStamps'), getPersonalOfflineData<boolean>(userId, 'passportAccess')
    ])
    set({ authors: authors?.data || [], profiles: profiles?.data || [], codes: codes?.data || [], stamps: stamps || [], enabled: Boolean(cachedFlag), loaded: true })
    if (!isSupabaseConfigured || !navigator.onLine) return
    try {
      const accessResult = await supabase.rpc('can_access_feature', { target_key: 'passport' })
      const accessEnabled = accessResult.error ? Boolean(cachedFlag) : Boolean(accessResult.data)
      if (!accessResult.error) await putPersonalOfflineData(userId, 'passportAccess', accessEnabled)
      set({ enabled: accessEnabled })
      if (!accessEnabled) return
      await syncPublicContent({ sections: ['authors', 'passport', 'passport_codes'] })
      const [freshAuthors, freshProfiles, freshCodes, stampResult] = await Promise.all([
        getOfflineDataset<PassportAuthor[]>('authors'), getOfflineDataset<PassportProfile[]>('passport'), getOfflineDataset<PassportCodeHash[]>('passport_codes'),
        supabase.from('passport_stamps').select('author_id,redeemed_at,source,author:authors(name,slug)').eq('user_id', userId)
      ])
      const remoteStamps: LocalPassportStamp[] = (stampResult.data || []).map(row => ({ authorId: row.author_id, authorName: row.author?.name, authorSlug: row.author?.slug, redeemedAtLocal: row.redeemed_at, source: row.source, status: 'confirmed', syncAttempts: 0 }))
      const pending = get().stamps.filter(item => item.status === 'pending_sync' && !remoteStamps.some(remote => remote.authorId === item.authorId))
      const merged = [...remoteStamps, ...pending]
      await putPersonalOfflineData(userId, 'passportStamps', merged)
      set({ authors: freshAuthors?.data || [], profiles: freshProfiles?.data || [], codes: freshCodes?.data || [], stamps: merged, enabled: accessEnabled, loaded: true })
      await get().syncPendingStamps(userId)
    } catch (error) { console.error('[Passaporte] usando dados offline:', error) }
  },
  redeemPassportCode: async (userId, raw, source, expectedAuthorId) => {
    let code: string
    try { code = extractPassportCode(raw) } catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'Código inválido.' } }
    const hash = await sha256Hex(code)
    const match = get().codes.find(item => item.code_hash === hash && codeIsValidAt(item.valid_from, item.valid_until))
    if (!match) return { ok: false, message: 'Código inválido ou fora do período de validade.' }
    const author = get().authors.find(item => item.id === match.author_id)
    if (expectedAuthorId && match.author_id !== expectedAuthorId) return { ok: false, differentAuthor: author, message: 'Este código pertence a outra autora.' }
    if (get().stamps.some(item => item.authorId === match.author_id)) return { ok: true, authorId: match.author_id, message: 'Este carimbo já faz parte do seu Passaporte.' }
    const stamp: LocalPassportStamp = { authorId: match.author_id, authorName: author?.name, authorSlug: author?.slug, redeemedAtLocal: new Date().toISOString(), status: 'pending_sync', source, syncAttempts: 0 }
    const next = [...get().stamps, stamp]
    set({ stamps: next })
    await putPersonalOfflineData(userId, 'passportStamps', next)
    await enqueueOfflineMutation({ id: `${userId}:passport:${match.author_id}`, userId, type: 'passport_stamp', payload: { authorId: match.author_id, code, source }, createdAt: stamp.redeemedAtLocal })
    if (navigator.onLine) await get().syncPendingStamps(userId)
    return { ok: true, authorId: match.author_id, message: `Carimbo de ${author?.name || 'autora'} desbloqueado!` }
  },
  syncPendingStamps: async userId => {
    if (!isSupabaseConfigured || !navigator.onLine) return
    const queue = (await listOfflineMutations<any>(userId)).filter(item => item.type === 'passport_stamp')
    for (const item of queue) {
      const { data, error } = await supabase.rpc('redeem_passport_stamp', { raw_code: item.payload.code, redemption_source: item.payload.source })
      if (error) {
        const next = get().stamps.map(stamp => stamp.authorId === item.payload.authorId ? { ...stamp, syncAttempts: stamp.syncAttempts + 1, lastSyncError: error.message } : stamp)
        set({ stamps: next }); await putPersonalOfflineData(userId, 'passportStamps', next); continue
      }
      if (data) {
        const next = get().stamps.map(stamp => stamp.authorId === item.payload.authorId ? { ...stamp, status: 'confirmed' as const, lastSyncError: undefined } : stamp)
        set({ stamps: next }); await putPersonalOfflineData(userId, 'passportStamps', next); await removeOfflineMutation(item.id)
      }
    }
  }
}))
