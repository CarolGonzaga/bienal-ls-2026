import type { Point2D, StandGeometry } from '../../types/index.ts'
import { MAPA_PNG_SPACES, type MapaPngSpaceType } from './mapaPngSpaces.ts'
import { MAP_VIEWBOX_HEIGHT, MAP_VIEWBOX_WIDTH } from './map-reference-calibration.ts'
import { appPath } from '../../lib/paths.ts'

export const MAP_WIDTH = MAP_VIEWBOX_WIDTH
export const MAP_HEIGHT = MAP_VIEWBOX_HEIGHT
export const MAP_REFERENCE_ASSET = appPath('/mapa/mapa-guia-2d.png')
export const MAP_GRID_SIZE = 24

export type MapFeatureType = 'booth' | 'street' | 'gate' | 'entrance' | 'exit' | 'bathroom' | 'food' | 'stage' | 'service' | 'special-area' | 'external-area' | 'wall' | 'obstacle' | 'information'
export type RectGeometry = { type: 'rect'; x: number; y: number; width: number; height: number; rotation?: number }
export type PolygonGeometry = { type: 'polygon'; points: Point2D[] }
export type MapGeometry = RectGeometry | PolygonGeometry

export interface MapFeature {
  id: string
  type: MapFeatureType
  label?: string
  geometry: MapGeometry
  boothCode?: string
  exhibitorId?: string
  category?: string
  interactive?: boolean
  walkable?: boolean
  entrances?: Point2D[]
  zIndex?: number
  needsReview?: boolean
  metadata?: Record<string, unknown>
}

export interface MapStreet {
  id: string
  name: string
  centerline: Point2D[]
  width: number
  labelPosition: Point2D
  segments: Array<[Point2D, Point2D]>
}

export interface MapAnnotation {
  id: string
  label: string
  position: Point2D
  fontSize?: number
}

const street = (name: string, y: number, segments: Array<[number, number]>, width = 17): MapStreet => ({
  id: `street-${name.toLowerCase().replace(/\s+/g, '-')}`,
  name: `Rua ${name}`,
  centerline: [{ x: segments[0][0], y }, { x: segments[0][1], y }],
  width,
  labelPosition: { x: (segments[0][0] + segments[0][1]) / 2, y },
  segments: segments.map(([x1, x2]) => [{ x: x1, y }, { x: x2, y }])
})

export const MAP_STREETS: MapStreet[] = [
  street('K', 289, [[300, 1135]], 16), street('J', 356, [[300, 1135]], 16),
  street('H', 421, [[300, 1135]], 16), street('G', 489, [[255, 1135]], 17),
  street('F', 558, [[255, 1135]], 17), street('E', 625, [[255, 1135]], 17),
  street('D', 694, [[255, 1255]], 17), street('C', 763, [[255, 1220]], 17),
  street('B', 831, [[255, 1135]], 17), street('A', 899, [[255, 1010]], 17),
  street('DD', 746, [[1650, 1818]], 16), street('CC', 813, [[1650, 1818]], 16),
  street('BB', 862, [[1650, 1818]], 16), street('AA', 928, [[1650, 1818]], 16)
]

export const MAP_ANNOTATIONS: MapAnnotation[] = [
  { id: 'travessa-literaria', label: 'TRAVESSA LITERÁRIA', position: { x: 1078, y: 383 }, fontSize: 7 },
  { id: 'alameda-artistas', label: 'ALAMEDA DOS ARTISTAS BY RIC', position: { x: 1398, y: 735 }, fontSize: 7 },
  { id: 'acesso-profissionais', label: 'ACESSO PROFISSIONAIS DO SETOR', position: { x: 1725, y: 974 }, fontSize: 7 }
]

export const MAP_BUILDINGS: MapFeature[] = [
  {
    id: 'pavilion-main', type: 'wall', label: 'Pavilhão principal', zIndex: 1,
    geometry: { type: 'polygon', points: [
      { x: 80, y: 190 }, { x: 1290, y: 190 }, { x: 1290, y: 722 },
      { x: 1270, y: 722 }, { x: 1270, y: 1010 }, { x: 80, y: 1010 }
    ] }, metadata: { source: 'MAPA.png' }
  },
  {
    id: 'pavilion-east', type: 'wall', label: 'Pavilhão leste', zIndex: 1,
    geometry: { type: 'polygon', points: [
      { x: 1572, y: 637 }, { x: 1880, y: 637 }, { x: 1880, y: 1010 }, { x: 1572, y: 1010 }
    ] }, metadata: { source: 'MAPA.png' }
  },
  {
    id: 'pavilion-connector', type: 'external-area', zIndex: 2, walkable: true,
    geometry: { type: 'polygon', points: [
      { x: 1270, y: 722 }, { x: 1572, y: 722 }, { x: 1572, y: 764 }, { x: 1270, y: 764 }
    ] }, metadata: { source: 'MAPA.png' }
  },
  {
    id: 'external-north', type: 'external-area', zIndex: 0,
    geometry: { type: 'polygon', points: [
      { x: 80, y: 162 }, { x: 134, y: 162 }, { x: 134, y: 130 }, { x: 149, y: 130 },
      { x: 149, y: 102 }, { x: 383, y: 102 }, { x: 383, y: 111 }, { x: 827, y: 111 },
      { x: 846, y: 77 }, { x: 887, y: 111 }, { x: 1038, y: 111 }, { x: 1055, y: 83 },
      { x: 1090, y: 116 }, { x: 1260, y: 116 }, { x: 1260, y: 190 }, { x: 80, y: 190 }
    ] }, metadata: { source: 'MAPA.png' }
  }
]

const featureType = (type: MapaPngSpaceType): MapFeatureType => type
const rectFromBounds = ([x1, y1, x2, y2]: [number, number, number, number]): RectGeometry => ({
  type: 'rect', x: x1, y: y1, width: x2 - x1, height: y2 - y1
})
const geometryFromSpace = (item: (typeof MAPA_PNG_SPACES)[number]): MapGeometry => item.points
  ? { type: 'polygon', points: item.points.map(([x, y]) => ({ x, y })) }
  : rectFromBounds(item.bounds)

export const OFFICIAL_LAYOUT_FEATURES: MapFeature[] = MAPA_PNG_SPACES.map((item, index) => ({
  id: `mapa-png-${item.type}-${item.code}-${index}`,
  type: featureType(item.type),
  label: item.showLabel === false ? undefined : item.label || item.code,
  boothCode: item.type === 'booth' ? item.code : undefined,
  interactive: item.showLabel !== false,
  walkable: false,
  geometry: geometryFromSpace(item),
  zIndex: item.type === 'booth' ? 7 : 10,
  needsReview: item.needsReview,
  metadata: { routeOrigin: item.routeOrigin, routeCode: item.code, source: 'MAPA.png', sourceBounds: item.bounds, navigable: item.type !== 'booth', showLabel: item.showLabel !== false }
}))

export const streetForBoothCode = (code: string) => {
  if (code.toUpperCase().startsWith('TRAVESSA LITERÁRIA')) return MAP_STREETS.find(item => item.name === 'Rua J')
  const prefix = ['DD', 'CC', 'BB', 'AA'].find(value => code.startsWith(value)) || code.charAt(0)
  return MAP_STREETS.find(item => item.name === `Rua ${prefix}`)
}

export const boothAccessPoint = (feature: MapFeature): Point2D | null => {
  if (!feature.boothCode) return null
  const targetStreet = streetForBoothCode(feature.boothCode)
  if (!targetStreet) return null
  const rect = feature.geometry.type === 'rect'
    ? feature.geometry
    : (() => {
        const xs = feature.geometry.points.map(point => point.x)
        const ys = feature.geometry.points.map(point => point.y)
        return { type: 'rect' as const, x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }
      })()
  const streetY = targetStreet.centerline[0].y
  const centerY = rect.y + rect.height / 2
  return { x: rect.x + rect.width / 2, y: streetY > centerY ? rect.y + rect.height : rect.y }
}

export const databaseGeometriesToFeatures = (geometries: StandGeometry[]): MapFeature[] => geometries
  .filter(item => !item.neutral && item.verified)
  .flatMap(item => {
    const pngSpace = MAPA_PNG_SPACES.find(space => space.type === 'booth' && space.code.toUpperCase() === item.standCode.toUpperCase())
    if (!pngSpace) return []
    const feature: MapFeature = {
      id: item.id,
      type: 'booth',
      label: item.standCode,
      boothCode: item.standCode,
      exhibitorId: item.exhibitorId,
      interactive: true,
      walkable: false,
      geometry: geometryFromSpace(pngSpace),
      zIndex: 8,
      needsReview: pngSpace.needsReview,
      metadata: { navigable: true, source: 'MAPA.png' }
    }
    const access = boothAccessPoint(feature)
    if (access) feature.entrances = [access]
    return [feature]
  })

export const buildMapLayout = (databaseGeometries: StandGeometry[]): MapFeature[] => {
  const database = databaseGeometriesToFeatures(databaseGeometries)
  const occupiedCodes = new Set(database.map(item => item.boothCode?.toUpperCase()))
  const official = OFFICIAL_LAYOUT_FEATURES.filter(item => !item.boothCode || !occupiedCodes.has(item.boothCode.toUpperCase()))
  return [...MAP_BUILDINGS, ...official, ...database]
}
