import { create } from 'zustand'
import { Exhibitor, RelevanceLevel } from '../types'
import { INITIAL_EXHIBITORS } from '../data/initialExhibitors'
import { isSupabaseConfigured, supabase } from '../lib/supabase.js'

export type ActiveTabMode = 'map' | 'list' | 'passport' | 'route' | 'schedule' | 'admin'

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
    if (!isSupabaseConfigured) return
    const { data, error } = await supabase.from('exhibitors').select('*').eq('active', true).order('name')
    if (error) {
      console.error('[Supabase] carregar expositores:', error)
      return
    }
    if (!data?.length) return
    set({ exhibitors: data.map(row => ({
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
}))
