import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Visit, RouteStop } from '../types'
import { isSupabaseConfigured, supabase } from '../lib/supabase.js'

interface UserState {
  user: User | null
  favorites: string[]
  eventFavorites: string[]
  visits: Record<string, Visit>
  routeStops: RouteStop[]
  hasPendingSync: boolean
  setUser: (user: User | null) => void
  toggleFavorite: (exhibitorId: string) => void
  isFavorite: (exhibitorId: string) => boolean
  toggleEventFavorite: (eventId: string) => void
  isEventFavorite: (eventId: string) => boolean
  toggleVisited: (exhibitorId: string, notes?: string) => void
  isVisited: (exhibitorId: string) => boolean
  addToRoute: (exhibitorId: string, standCode: string) => void
  removeFromRoute: (exhibitorId: string) => void
  moveRouteStop: (exhibitorId: string, direction: 'up' | 'down') => void
  setRouteOrder: (exhibitorIds: string[]) => void
  isInRoute: (exhibitorId: string) => boolean
  clearRoute: () => void
  loadUserData: (userId: string) => Promise<void>
  syncUserData: (userId: string) => Promise<void>
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

export const useUserStore = create<UserState>()(persist((set, get) => ({
  user: null,
  favorites: [],
  eventFavorites: [],
  visits: {},
  routeStops: [],
  hasPendingSync: false,

  setUser: user => set({ user }),

  toggleFavorite: exhibitorId => {
    const current = get().favorites
    const userId = get().user?.id
    const removing = current.includes(exhibitorId)
    set({ favorites: removing ? current.filter(id => id !== exhibitorId) : [...current, exhibitorId], hasPendingSync: !navigator.onLine })
    if (!isSupabaseConfigured || !userId) return
    const request = removing
      ? supabase.from('user_favorites').delete().eq('user_id', userId).eq('exhibitor_id', exhibitorId)
      : supabase.from('user_favorites').upsert({ user_id: userId, exhibitor_id: exhibitorId })
    void request.then(({ error }) => reportSyncError('sincronizar favorito', error))
  },

  isFavorite: exhibitorId => get().favorites.includes(exhibitorId),

  toggleEventFavorite: eventId => {
    const current = get().eventFavorites
    const userId = get().user?.id
    const removing = current.includes(eventId)
    set({ eventFavorites: removing ? current.filter(id => id !== eventId) : [...current, eventId], hasPendingSync: !navigator.onLine })
    if (!isSupabaseConfigured || !userId) return
    const request = removing
      ? supabase.from('user_event_favorites').delete().eq('user_id', userId).eq('event_id', eventId)
      : supabase.from('user_event_favorites').upsert({ user_id: userId, event_id: eventId })
    void request.then(({ error }) => reportSyncError('sincronizar evento favorito', error))
  },

  isEventFavorite: eventId => get().eventFavorites.includes(eventId),

  toggleVisited: (exhibitorId, notes) => {
    const current = { ...get().visits }
    const userId = get().user?.id
    const removing = Boolean(current[exhibitorId])
    if (removing) delete current[exhibitorId]
    else current[exhibitorId] = {
      id: `${userId || 'local'}-${exhibitorId}`,
      userId: userId || 'local-user', exhibitorId, visitedAt: new Date().toISOString(), notes
    }
    const nextRoute = removing ? get().routeStops : get().routeStops.filter(stop => stop.exhibitorId !== exhibitorId)
      .sort((a, b) => a.order - b.order).map((stop, index) => ({ ...stop, order: index + 1 }))
    set({ visits: current, routeStops: nextRoute, hasPendingSync: !navigator.onLine })
    if (!isSupabaseConfigured || !userId) return
    const request = removing
      ? supabase.from('user_visits').delete().eq('user_id', userId).eq('exhibitor_id', exhibitorId)
      : supabase.from('user_visits').upsert({ user_id: userId, exhibitor_id: exhibitorId, visited_at: current[exhibitorId].visitedAt, notes: notes || null })
    void request.then(({ error }) => reportSyncError('sincronizar visita', error))
    if (!removing) void syncRoute(userId, nextRoute)
  },

  isVisited: exhibitorId => Boolean(get().visits[exhibitorId]),

  addToRoute: (exhibitorId, standCode) => {
    const stops = get().routeStops
    if (stops.some(stop => stop.exhibitorId === exhibitorId || stop.standCode.trim().toUpperCase() === standCode.trim().toUpperCase())) return
    const next = [...stops, { exhibitorId, standCode, visited: false, order: stops.length + 1 }]
    set({ routeStops: next, hasPendingSync: !navigator.onLine })
    const userId = get().user?.id
    if (isSupabaseConfigured && userId) void syncRoute(userId, next)
  },

  removeFromRoute: exhibitorId => {
    const next = get().routeStops.filter(stop => stop.exhibitorId !== exhibitorId)
      .sort((a, b) => a.order - b.order).map((stop, index) => ({ ...stop, order: index + 1 }))
    set({ routeStops: next, hasPendingSync: !navigator.onLine })
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
    set({ routeStops: next, hasPendingSync: !navigator.onLine })
    const userId = get().user?.id
    if (isSupabaseConfigured && userId) void syncRoute(userId, next)
  },

  setRouteOrder: exhibitorIds => {
    const byId = new Map(get().routeStops.map(stop => [stop.exhibitorId, stop]))
    const next = exhibitorIds.map(id => byId.get(id)).filter((stop): stop is RouteStop => Boolean(stop))
      .map((stop, index) => ({ ...stop, order: index + 1 }))
    if (next.length !== get().routeStops.length) return
    set({ routeStops: next, hasPendingSync: !navigator.onLine })
    const userId = get().user?.id
    if (isSupabaseConfigured && userId) void syncRoute(userId, next)
  },

  isInRoute: exhibitorId => get().routeStops.some(stop => stop.exhibitorId === exhibitorId),

  clearRoute: () => {
    set({ routeStops: [], hasPendingSync: !navigator.onLine })
    const userId = get().user?.id
    if (isSupabaseConfigured && userId) void syncRoute(userId, [])
  },

  loadUserData: async userId => {
    if (!isSupabaseConfigured) return
    if (get().hasPendingSync) {
      await get().syncUserData(userId)
      return
    }
    const [favoritesResult, eventFavoritesResult, visitsResult, routeResult] = await Promise.all([
      supabase.from('user_favorites').select('exhibitor_id').eq('user_id', userId),
      supabase.from('user_event_favorites').select('event_id').eq('user_id', userId),
      supabase.from('user_visits').select('exhibitor_id, visited_at, notes').eq('user_id', userId),
      supabase.from('user_route_stops').select('exhibitor_id, stand_code, stop_order, visited').eq('user_id', userId).order('stop_order')
    ])
    const error = favoritesResult.error || eventFavoritesResult.error || visitsResult.error || routeResult.error
    if (error) return reportSyncError('carregar dados da usuária', error)
    const visits = Object.fromEntries((visitsResult.data || []).map(row => [row.exhibitor_id, {
      id: `${userId}-${row.exhibitor_id}`, userId, exhibitorId: row.exhibitor_id,
      visitedAt: row.visited_at, notes: row.notes || undefined
    }]))
    set({
      favorites: (favoritesResult.data || []).map(row => row.exhibitor_id),
      eventFavorites: (eventFavoritesResult.data || []).map(row => row.event_id),
      visits,
      routeStops: (routeResult.data || []).map(row => ({
        exhibitorId: row.exhibitor_id, standCode: row.stand_code,
        order: row.stop_order, visited: row.visited
      }))
    })
  },

  syncUserData: async userId => {
    if (!isSupabaseConfigured) return
    const { favorites, eventFavorites, visits, routeStops } = get()
    const [favoritesDelete, eventFavoritesDelete, visitsDelete] = await Promise.all([
      supabase.from('user_favorites').delete().eq('user_id', userId),
      supabase.from('user_event_favorites').delete().eq('user_id', userId),
      supabase.from('user_visits').delete().eq('user_id', userId)
    ])
    if (favoritesDelete.error || eventFavoritesDelete.error || visitsDelete.error) {
      reportSyncError('preparar sincronizaÃ§Ã£o offline', favoritesDelete.error || eventFavoritesDelete.error || visitsDelete.error)
      return
    }
    const requests: PromiseLike<{ error: unknown }>[] = []
    if (favorites.length) requests.push(supabase.from('user_favorites').insert(favorites.map(exhibitorId => ({ user_id: userId, exhibitor_id: exhibitorId }))))
    if (eventFavorites.length) requests.push(supabase.from('user_event_favorites').insert(eventFavorites.map(eventId => ({ user_id: userId, event_id: eventId }))))
    const visitRows = Object.values(visits).map(visit => ({
      user_id: userId, exhibitor_id: visit.exhibitorId, visited_at: visit.visitedAt, notes: visit.notes || null
    }))
    if (visitRows.length) requests.push(supabase.from('user_visits').insert(visitRows))
    const results = await Promise.all(requests)
    results.forEach(result => reportSyncError('sincronizar dados offline', result.error))
    await syncRoute(userId, routeStops)
    set({ hasPendingSync: false })
  },

  clearUserData: () => set({ favorites: [], eventFavorites: [], visits: {}, routeStops: [], hasPendingSync: false })
}), {
  name: 'mapasafico-offline-user-data',
  partialize: state => ({ favorites: state.favorites, eventFavorites: state.eventFavorites, visits: state.visits, routeStops: state.routeStops, hasPendingSync: state.hasPendingSync })
}))
