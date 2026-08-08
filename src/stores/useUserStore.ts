import { create } from 'zustand'
import type { User, Visit, RouteStop } from '../types'
import { isSupabaseConfigured, supabase } from '../lib/supabase.js'

interface UserState {
  user: User | null
  favorites: string[]
  visits: Record<string, Visit>
  routeStops: RouteStop[]
  setUser: (user: User | null) => void
  toggleFavorite: (exhibitorId: string) => void
  isFavorite: (exhibitorId: string) => boolean
  toggleVisited: (exhibitorId: string, notes?: string) => void
  isVisited: (exhibitorId: string) => boolean
  addToRoute: (exhibitorId: string, standCode: string) => void
  removeFromRoute: (exhibitorId: string) => void
  moveRouteStop: (exhibitorId: string, direction: 'up' | 'down') => void
  isInRoute: (exhibitorId: string) => boolean
  clearRoute: () => void
  loadUserData: (userId: string) => Promise<void>
  clearUserData: () => void
}

const reportSyncError = (operation: string, error: unknown) => {
  if (error) console.error(`[Supabase] ${operation}:`, error)
}

const syncRoute = async (userId: string, stops: RouteStop[]) => {
  const { error: deleteError } = await supabase.from('user_route_stops').delete().eq('user_id', userId)
  if (deleteError) return reportSyncError('limpar rota antes de sincronizar', deleteError)
  if (!stops.length) return
  const { error } = await supabase.from('user_route_stops').insert(stops.map(stop => ({
    user_id: userId, exhibitor_id: stop.exhibitorId, stand_code: stop.standCode,
    stop_order: stop.order, visited: stop.visited
  })))
  reportSyncError('sincronizar rota', error)
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  favorites: [],
  visits: {},
  routeStops: [],

  setUser: user => set({ user }),

  toggleFavorite: exhibitorId => {
    const current = get().favorites
    const userId = get().user?.id
    const removing = current.includes(exhibitorId)
    set({ favorites: removing ? current.filter(id => id !== exhibitorId) : [...current, exhibitorId] })
    if (!isSupabaseConfigured || !userId) return
    const request = removing
      ? supabase.from('user_favorites').delete().eq('user_id', userId).eq('exhibitor_id', exhibitorId)
      : supabase.from('user_favorites').upsert({ user_id: userId, exhibitor_id: exhibitorId })
    void request.then(({ error }) => reportSyncError('sincronizar favorito', error))
  },

  isFavorite: exhibitorId => get().favorites.includes(exhibitorId),

  toggleVisited: (exhibitorId, notes) => {
    const current = { ...get().visits }
    const userId = get().user?.id
    const removing = Boolean(current[exhibitorId])
    if (removing) delete current[exhibitorId]
    else current[exhibitorId] = {
      id: `${userId || 'local'}-${exhibitorId}`,
      userId: userId || 'local-user', exhibitorId, visitedAt: new Date().toISOString(), notes
    }
    set({ visits: current })
    if (!isSupabaseConfigured || !userId) return
    const request = removing
      ? supabase.from('user_visits').delete().eq('user_id', userId).eq('exhibitor_id', exhibitorId)
      : supabase.from('user_visits').upsert({ user_id: userId, exhibitor_id: exhibitorId, visited_at: current[exhibitorId].visitedAt, notes: notes || null })
    void request.then(({ error }) => reportSyncError('sincronizar visita', error))
  },

  isVisited: exhibitorId => Boolean(get().visits[exhibitorId]),

  addToRoute: (exhibitorId, standCode) => {
    const stops = get().routeStops
    if (stops.some(stop => stop.exhibitorId === exhibitorId)) return
    const next = [...stops, { exhibitorId, standCode, visited: false, order: stops.length + 1 }]
    set({ routeStops: next })
    const userId = get().user?.id
    if (isSupabaseConfigured && userId) void syncRoute(userId, next)
  },

  removeFromRoute: exhibitorId => {
    const next = get().routeStops.filter(stop => stop.exhibitorId !== exhibitorId)
      .sort((a, b) => a.order - b.order).map((stop, index) => ({ ...stop, order: index + 1 }))
    set({ routeStops: next })
    const userId = get().user?.id
    if (isSupabaseConfigured && userId) void syncRoute(userId, next)
  },

  moveRouteStop: (exhibitorId, direction) => {
    const ordered = [...get().routeStops].sort((a, b) => a.order - b.order)
    const currentIndex = ordered.findIndex(stop => stop.exhibitorId === exhibitorId)
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= ordered.length) return
    ;[ordered[currentIndex], ordered[targetIndex]] = [ordered[targetIndex], ordered[currentIndex]]
    const next = ordered.map((stop, index) => ({ ...stop, order: index + 1 }))
    set({ routeStops: next })
    const userId = get().user?.id
    if (isSupabaseConfigured && userId) void syncRoute(userId, next)
  },

  isInRoute: exhibitorId => get().routeStops.some(stop => stop.exhibitorId === exhibitorId),

  clearRoute: () => {
    set({ routeStops: [] })
    const userId = get().user?.id
    if (isSupabaseConfigured && userId) void syncRoute(userId, [])
  },

  loadUserData: async userId => {
    if (!isSupabaseConfigured) return
    const [favoritesResult, visitsResult, routeResult] = await Promise.all([
      supabase.from('user_favorites').select('exhibitor_id').eq('user_id', userId),
      supabase.from('user_visits').select('exhibitor_id, visited_at, notes').eq('user_id', userId),
      supabase.from('user_route_stops').select('exhibitor_id, stand_code, stop_order, visited').eq('user_id', userId).order('stop_order')
    ])
    const error = favoritesResult.error || visitsResult.error || routeResult.error
    if (error) return reportSyncError('carregar dados da usuária', error)
    const visits = Object.fromEntries((visitsResult.data || []).map(row => [row.exhibitor_id, {
      id: `${userId}-${row.exhibitor_id}`, userId, exhibitorId: row.exhibitor_id,
      visitedAt: row.visited_at, notes: row.notes || undefined
    }]))
    set({
      favorites: (favoritesResult.data || []).map(row => row.exhibitor_id),
      visits,
      routeStops: (routeResult.data || []).map(row => ({
        exhibitorId: row.exhibitor_id, standCode: row.stand_code,
        order: row.stop_order, visited: row.visited
      }))
    })
  },

  clearUserData: () => set({ favorites: [], visits: {}, routeStops: [] })
}))
