import { create } from 'zustand'
import { User, Visit, RouteStop } from '../types'

interface UserState {
  user: User | null
  favorites: string[] // Exhibitor IDs
  visits: Record<string, Visit> // Exhibitor ID -> Visit object
  routeStops: RouteStop[]
  
  // Actions
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
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  favorites: ['editora-sunbee', 'new-pop'],
  visits: {
    'editora-sunbee': {
      id: 'visit-1',
      userId: 'local-user',
      exhibitorId: 'editora-sunbee',
      visitedAt: '2026-08-05T18:30:00Z',
      notes: 'Comprei o novo lançamento com brinde especial!'
    }
  },
  routeStops: [],

  setUser: (user) => set({ user }),

  toggleFavorite: (exhibitorId) => {
    const current = get().favorites
    if (current.includes(exhibitorId)) {
      set({ favorites: current.filter(id => id !== exhibitorId) })
    } else {
      set({ favorites: [...current, exhibitorId] })
    }
  },

  isFavorite: (exhibitorId) => get().favorites.includes(exhibitorId),

  toggleVisited: (exhibitorId, notes) => {
    const current = { ...get().visits }
    if (current[exhibitorId]) {
      delete current[exhibitorId]
      set({ visits: current })
    } else {
      current[exhibitorId] = {
        id: `visit-${Date.now()}`,
        userId: get().user?.id || 'local-user',
        exhibitorId,
        visitedAt: new Date().toISOString(),
        notes
      }
      set({ visits: current })
    }
  },

  isVisited: (exhibitorId) => Boolean(get().visits[exhibitorId]),

  addToRoute: (exhibitorId, standCode) => {
    const stops = get().routeStops
    if (!stops.some(s => s.exhibitorId === exhibitorId)) {
      set({
        routeStops: [
          ...stops,
          { exhibitorId, standCode, visited: false, order: stops.length + 1 }
        ]
      })
    }
  },

  removeFromRoute: (exhibitorId) => {
    const remaining = get().routeStops
      .filter(s => s.exhibitorId !== exhibitorId)
      .sort((a, b) => a.order - b.order)
      .map((stop, index) => ({ ...stop, order: index + 1 }))
    set({
      routeStops: remaining
    })
  },

  moveRouteStop: (exhibitorId, direction) => {
    const ordered = [...get().routeStops].sort((a, b) => a.order - b.order)
    const currentIndex = ordered.findIndex(stop => stop.exhibitorId === exhibitorId)
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= ordered.length) return
    ;[ordered[currentIndex], ordered[targetIndex]] = [ordered[targetIndex], ordered[currentIndex]]
    set({ routeStops: ordered.map((stop, index) => ({ ...stop, order: index + 1 })) })
  },

  isInRoute: (exhibitorId) => get().routeStops.some(s => s.exhibitorId === exhibitorId),

  clearRoute: () => set({ routeStops: [] })
}))
