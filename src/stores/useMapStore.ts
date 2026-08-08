import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { WorldPoint } from '../utils/coordinates'

export type CameraMode = '2.5D' | '2D'
export type ViewPreset = 'isometric' | 'top' | 'custom'
export type GraphicsQuality = 'auto' | 'high' | 'eco'
export type MapTheme = 'light' | 'dark'

interface MapState {
  cameraMode: CameraMode
  viewPreset: ViewPreset
  graphicsQuality: GraphicsQuality
  mapTheme: MapTheme
  reducedMotion: boolean
  selectedStandId: string | null
  hoveredStandId: string | null
  userPosition: WorldPoint | null
  routeOriginGateId: string
  isChoosingRouteOrigin: boolean
  isChoosingUserPosition: boolean
  
  // Actions
  setCameraMode: (mode: CameraMode) => void
  setViewPreset: (preset: ViewPreset) => void
  setGraphicsQuality: (quality: GraphicsQuality) => void
  setMapTheme: (theme: MapTheme) => void
  setReducedMotion: (reduced: boolean) => void
  setSelectedStandId: (id: string | null) => void
  setHoveredStandId: (id: string | null) => void
  setUserPosition: (pos: WorldPoint | null) => void
  setRouteOriginGateId: (id: string) => void
  setIsChoosingRouteOrigin: (choosing: boolean) => void
  setIsChoosingUserPosition: (choosing: boolean) => void
  resetCamera: () => void
}

export const useMapStore = create<MapState>()(persist((set) => ({
  cameraMode: '2D',
  viewPreset: 'top',
  graphicsQuality: 'auto',
  reducedMotion: false,
  selectedStandId: null,
  hoveredStandId: null,
  userPosition: null,
  routeOriginGateId: 'HALL1',
  isChoosingRouteOrigin: false,
  isChoosingUserPosition: false,
  mapTheme: 'light',

  setCameraMode: (mode) => set({ cameraMode: mode }),
  setViewPreset: (preset) => set({ viewPreset: preset }),
  setGraphicsQuality: (quality) => set({ graphicsQuality: quality }),
  setMapTheme: (theme) => set({ mapTheme: theme }),
  setReducedMotion: (reduced) => set({ reducedMotion: reduced }),
  setSelectedStandId: (id) => set({ selectedStandId: id }),
  setHoveredStandId: (id) => set({ hoveredStandId: id }),
  setUserPosition: (pos) => set({ userPosition: pos }),
  setRouteOriginGateId: (id) => set({ routeOriginGateId: id }),
  setIsChoosingRouteOrigin: (choosing) => set({ isChoosingRouteOrigin: choosing }),
  setIsChoosingUserPosition: (choosing) => set({ isChoosingUserPosition: choosing }),
  resetCamera: () => set({ viewPreset: 'top', selectedStandId: null })
}), {
  name: 'bienal-map-preferences',
  partialize: (state) => ({
    mapTheme: state.mapTheme,
    graphicsQuality: state.graphicsQuality,
    reducedMotion: state.reducedMotion,
    userPosition: state.userPosition,
    routeOriginGateId: state.routeOriginGateId
  })
}))
