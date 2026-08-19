import { create } from 'zustand'
import { cacheOfflineAssets, getOfflineReadiness, preloadOfflineQrTools, syncPublicContent } from '../lib/contentSync'
import { getOfflineDataset } from '../lib/offlineDb'

type Readiness = Awaited<ReturnType<typeof getOfflineReadiness>>
type OfflineState = {
  online: boolean; preparing: boolean; progress: string; error: string | null; readiness: Readiness | null
  refreshStatus: () => Promise<void>; prepare: (force?: boolean) => Promise<void>; setOnline: (online: boolean) => void
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  online: navigator.onLine,
  preparing: false,
  progress: '',
  error: null,
  readiness: null,
  setOnline: online => set({ online }),
  refreshStatus: async () => set({ readiness: await getOfflineReadiness() }),
  prepare: async (force = false) => {
    if (!navigator.onLine) return set({ error: 'Conecte-se à internet para baixar ou atualizar o pacote offline.' })
    if (get().preparing) return
    set({ preparing: true, progress: 'Verificando versões...', error: null })
    try {
      await syncPublicContent({ force })
      set({ progress: 'Preparando leitor de QR para uso offline...' })
      await preloadOfflineQrTools()
      set({ progress: 'Salvando imagens e mapa...' })
      const [exhibitors, passport] = await Promise.all([getOfflineDataset<any[]>('exhibitors'), getOfflineDataset<any[]>('passport')])
      const logos = (exhibitors?.data || []).filter(item => item.active && !item.deleted_at).map(item => item.logo).filter(Boolean)
      const photos = (passport?.data || []).map(item => item.photo_path).filter((path): path is string => Boolean(path))
      const results = await cacheOfflineAssets(logos, photos)
      const failed = results.filter(item => !item.ok)
      const failedCritical = failed.filter(item => item.critical)
      const readiness = await getOfflineReadiness()
      if (failedCritical.length || !readiness.ready) throw new Error(`O pacote essencial ficou incompleto (${failedCritical.length || 1} recurso(s)). Tente novamente em uma conexão estável.`)
      set({ readiness, progress: failed.length ? `Pacote essencial pronto. ${failed.length} imagem(ns) de expositor não foram salvas.` : 'Tudo pronto para uso offline.' })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Não foi possível preparar o pacote offline.' })
    } finally { set({ preparing: false }) }
  }
}))
