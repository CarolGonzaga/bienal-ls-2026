import { create } from 'zustand'
import { Exhibitor, RelevanceLevel } from '../types'
import { INITIAL_EXHIBITORS } from '../data/initialExhibitors'
import { isSupabaseConfigured } from '../lib/supabase.js'
import { getOfflineDataset } from '../lib/offlineDb'
import { syncPublicContent } from '../lib/contentSync'

export type ActiveTabMode = 'map' | 'list' | 'books' | 'passport' | 'route' | 'schedule' | 'admin'

interface ExhibitorState {
  exhibitors: Exhibitor[]
  searchQuery: string
  selectedRelevanceFilter: RelevanceLevel | 'all'
  selectedCategoryFilter: string | null
  filterFavoritesOnly: boolean
  filterVisitedOnly: boolean
  filterRouteOnly: boolean
  activeTabMode: ActiveTabMode
  selectedExhibitorId: string | null
  
  // Actions
  setSearchQuery: (query: string) => void
  setSelectedRelevanceFilter: (filter: RelevanceLevel | 'all') => void
  setSelectedCategoryFilter: (category: string | null) => void
  setFilterFavoritesOnly: (val: boolean) => void
  setFilterVisitedOnly: (val: boolean) => void
  setFilterRouteOnly: (val: boolean) => void
  setActiveTabMode: (mode: ActiveTabMode) => void
  setSelectedExhibitorId: (id: string | null) => void
  clearFilters: () => void
  loadExhibitors: () => Promise<void>
}

export const useExhibitorStore = create<ExhibitorState>((set) => ({
  exhibitors: INITIAL_EXHIBITORS,
  searchQuery: '',
  selectedRelevanceFilter: 'all',
  selectedCategoryFilter: null,
  filterFavoritesOnly: false,
  filterVisitedOnly: false,
  filterRouteOnly: false,
  activeTabMode: 'map',
  selectedExhibitorId: null,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedRelevanceFilter: (filter) => set({ selectedRelevanceFilter: filter }),
  setSelectedCategoryFilter: (category) => set({ selectedCategoryFilter: category }),
  setFilterFavoritesOnly: (val) => set({ filterFavoritesOnly: val }),
  setFilterVisitedOnly: (val) => set({ filterVisitedOnly: val }),
  setFilterRouteOnly: (val) => set({ filterRouteOnly: val }),
  setActiveTabMode: (mode) => set({ activeTabMode: mode }),
  setSelectedExhibitorId: (id) => set({ selectedExhibitorId: id }),
  clearFilters: () => set({
    searchQuery: '',
    selectedRelevanceFilter: 'all',
    selectedCategoryFilter: null,
    filterFavoritesOnly: false,
    filterVisitedOnly: false,
    filterRouteOnly: false
  }),
  loadExhibitors: async () => {
    const applyRows = (rows: any[]) => {
      const activeRows = rows.filter(row => row.active && !row.deleted_at)
      if (!activeRows.length) return
      set({ exhibitors: activeRows.map(row => ({
      id: row.id,
      logo: row.logo,
      name: row.name,
      description: row.description,
      reasonToVisit: row.reason_to_visit,
      standCode: row.stand_code,
      active: row.active,
      relevanceLevel: row.relevance_level,
      relevanceReasons: row.relevance_reasons,
      categories: row.categories,
      featured: row.featured,
      createdAt: row.created_at,
      updatedAt: row.updated_at
      })) })
    }
    const cached = await getOfflineDataset<any[]>('exhibitors')
    if (cached?.data?.length) applyRows(cached.data)
    if (!isSupabaseConfigured || !navigator.onLine) return
    try {
      await syncPublicContent({ sections: ['exhibitors'] })
      const fresh = await getOfflineDataset<any[]>('exhibitors')
      if (fresh?.data?.length) applyRows(fresh.data)
    } catch (error) { console.error('[Offline] sincronizar expositores:', error) }
  }
}))
