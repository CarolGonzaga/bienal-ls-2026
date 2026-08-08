import { create } from 'zustand'
import { MapVersion, StandGeometry, Point2D } from '../types'
import { INITIAL_STAND_GEOMETRIES } from '../data/initialStands'

interface AdminMapState {
  currentVersion: MapVersion
  geometries: StandGeometry[]
  activePolygonDraft: Point2D[]
  selectedGeometryId: string | null
  opacityBackground: number
  isDrawing: boolean
  
  // Actions
  setOpacityBackground: (val: number) => void
  setIsDrawing: (isDrawing: boolean) => void
  addPointToDraft: (point: Point2D) => void
  removeLastDraftPoint: () => void
  clearDraft: () => void
  saveDraftAsGeometry: (exhibitorId: string, standCode: string, height?: number) => void
  setSelectedGeometryId: (id: string | null) => void
  verifyGeometry: (id: string, verifiedBy: string) => void
  deleteGeometry: (id: string) => void
}

export const useAdminMapStore = create<AdminMapState>((set, get) => ({
  currentVersion: {
    id: "v1-bienal-sp-2026",
    name: "Planta Oficial V1",
    eventName: "Bienal Internacional do Livro de SP 2026",
    originalWidth: 1376,
    originalHeight: 1118,
    backgroundAsset: "/mapa/mapa-bienal-v4.webp",
    version: "1.0.0",
    status: "published",
    publishedAt: "2026-08-01T12:00:00Z"
  },
  geometries: INITIAL_STAND_GEOMETRIES,
  activePolygonDraft: [],
  selectedGeometryId: null,
  opacityBackground: 0.8,
  isDrawing: false,

  setOpacityBackground: (val) => set({ opacityBackground: val }),
  setIsDrawing: (val) => set({ isDrawing: val }),

  addPointToDraft: (point) => set({
    activePolygonDraft: [...get().activePolygonDraft, point]
  }),

  removeLastDraftPoint: () => set({
    activePolygonDraft: get().activePolygonDraft.slice(0, -1)
  }),

  clearDraft: () => set({ activePolygonDraft: [] }),

  saveDraftAsGeometry: (exhibitorId, standCode, height = 1.5) => {
    const draft = get().activePolygonDraft
    if (draft.length < 3) return

    const newGeometry: StandGeometry = {
      id: `stand-${Date.now()}`,
      mapVersionId: get().currentVersion.id,
      exhibitorId,
      standCode,
      type: "polygon",
      polygon: [...draft],
      height,
      neutral: false,
      verified: true,
      verifiedBy: "admin",
      verifiedAt: new Date().toISOString()
    }

    set({
      geometries: [...get().geometries, newGeometry],
      activePolygonDraft: [],
      isDrawing: false
    })
  },

  setSelectedGeometryId: (id) => set({ selectedGeometryId: id }),

  verifyGeometry: (id, verifiedBy) => {
    set({
      geometries: get().geometries.map(g => 
        g.id === id 
          ? { ...g, verified: true, verifiedBy, verifiedAt: new Date().toISOString() } 
          : g
      )
    })
  },

  deleteGeometry: (id) => set({
    geometries: get().geometries.filter(g => g.id !== id),
    selectedGeometryId: null
  })
}))
