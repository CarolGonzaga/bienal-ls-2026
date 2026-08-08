export type UserRole = 'visitor' | 'editor' | 'admin'

export interface AccessibilityPreferences {
  highContrast: boolean
  reducedMotion: boolean
  largerText: boolean
  hideLogos: boolean
  expandMarkers: boolean
}

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: UserRole
  accessibilityPreferences?: AccessibilityPreferences
  createdAt?: string
  updatedAt?: string
}

export type RelevanceLevel = 'curadoria_direta' | 'catalogo_confirmado' | 'titulos_pontuais' | 'neutro'

export interface Exhibitor {
  id: string
  logo: string
  name: string
  description: string
  reasonToVisit: string
  standCode: string
  active: boolean
  relevanceLevel: RelevanceLevel
  relevanceReasons?: string[]
  categories: string[]
  featured?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface Point2D {
  x: number
  y: number
}

export type MapVersionStatus = 'draft' | 'review' | 'published' | 'archived'

export interface MapVersion {
  id: string
  name: string
  eventName: string
  originalWidth: number
  originalHeight: number
  backgroundAsset?: string
  version: string
  status: MapVersionStatus
  publishedAt?: string
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

export type ServiceType = 'restroom' | 'gate' | 'medical' | 'food' | 'info' | 'accessibility' | 'stage'

export interface StandGeometry {
  id: string
  mapVersionId: string
  exhibitorId?: string
  standCode: string
  type: StandGeometryType
  polygon: Point2D[]
  anchor?: Point2D
  labelAnchor?: Point2D
  rotation?: number
  height: number
  neutral: boolean
  serviceType?: ServiceType
  displayName?: string
  routeOrigin?: boolean
  verified: boolean
  verifiedBy?: string
  verifiedAt?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface CorridorNode {
  id: string
  mapVersionId: string
  name: string
  x: number
  y: number
  accessible: boolean
  active: boolean
}

export interface CorridorEdge {
  id: string
  mapVersionId: string
  fromNodeId: string
  toNodeId: string
  distance: number
  accessible: boolean
  blocked: boolean
  active: boolean
}

export interface Book {
  id: string
  title: string
  authorIds: string[]
  exhibitorIds: string[]
  cover?: string
  synopsis: string
  categories: string[]
  tropes: string[]
  genres: string[]
  sapphic: boolean
  confirmedAtBienal: boolean
  active: boolean
}

export interface Author {
  id: string
  name: string
  photo?: string
  biography?: string
  sapphicRelevance?: string
  exhibitorIds: string[]
  active: boolean
}

export type EventStatus = 'scheduled' | 'live' | 'finished' | 'cancelled'

export interface Event {
  id: string
  date: string
  startTime: string
  endTime: string
  locationName: string
  mapSpaceId?: string
  title: string
  description: string
  speakers: string[]
  moderators: string[]
  relevanceLevel: RelevanceLevel
  categories: string[]
  exhibitorIds: string[]
  authorIds: string[]
  active: boolean
  status?: EventStatus
}

export interface Favorite {
  id: string
  userId: string
  targetType: 'exhibitor' | 'book' | 'event' | 'author'
  targetId: string
  createdAt: string
}

export interface Visit {
  id: string
  userId: string
  exhibitorId: string
  visitedAt: string
  notes?: string
}

export interface RouteStop {
  exhibitorId: string
  standCode: string
  visited: boolean
  order: number
}

export interface UserRoute {
  id: string
  userId: string
  name: string
  stops: RouteStop[]
  origin?: string
  optimized: boolean
  createdAt?: string
  updatedAt?: string
}

export type SuggestionStatus = 'pending' | 'reviewed' | 'approved' | 'rejected'

export interface CorrectionSuggestion {
  id: string
  userId: string
  targetType: 'exhibitor' | 'stand' | 'book' | 'event'
  targetId: string
  category: string
  message: string
  status: SuggestionStatus
  moderationNotes?: string
  createdAt: string
  reviewedAt?: string
}
