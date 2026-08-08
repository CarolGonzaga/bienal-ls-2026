import type { Point2D } from '../../types/index.ts'
import { MAP_STREETS, boothAccessPoint, streetForBoothCode, type MapFeature } from './map-layout.ts'

export interface RouteNode extends Point2D {
  id: string
  type: 'intersection' | 'gate' | 'entrance' | 'booth-access' | 'service-access'
  label?: string
  featureId?: string
}

export interface RouteEdge {
  id: string
  from: string
  to: string
  distance: number
  streetId?: string
  accessible: boolean
  blocked: boolean
  bidirectional: boolean
}

export interface RoutingGraph { nodes: RouteNode[]; edges: RouteEdge[] }

export const CUSTOM_ROUTE_ORIGIN_ID = 'CUSTOM'

export const withCustomRouteOrigin = (graph: RoutingGraph, point?: Point2D | null): RoutingGraph => {
  if (!point) return graph
  const candidates = graph.nodes.filter(node => node.type === 'intersection' || node.type === 'booth-access')
  if (!candidates.length) return graph
  const nearest = candidates.reduce((best, node) => distance(node, point) < distance(best, point) ? node : best)
  const customNode: RouteNode = { id: CUSTOM_ROUTE_ORIGIN_ID, x: point.x, y: point.y, type: 'entrance', label: 'Personalizado' }
  const customEdge: RouteEdge = {
    id: `edge-${CUSTOM_ROUTE_ORIGIN_ID}-${nearest.id}`,
    from: CUSTOM_ROUTE_ORIGIN_ID,
    to: nearest.id,
    distance: distance(customNode, nearest),
    accessible: true,
    blocked: false,
    bidirectional: true
  }
  return { nodes: [...graph.nodes, customNode], edges: [...graph.edges, customEdge] }
}

const distance = (a: Point2D, b: Point2D) => Math.hypot(a.x - b.x, a.y - b.y)

// Passagens verticais contínuas confirmadas no MAPA.png. Estes eixos atravessam
// os vãos entre os blocos de estandes e conectam as Ruas A a K. Intervalos
// internos de um mesmo bloco (como B38/B30) não entram nesta lista.
export const MAIN_CROSS_AISLES = [
  { id: 'west', x: 498 },
  { id: 'central', x: 644 },
  { id: 'mid-east', x: 860 },
  { id: 'east', x: 1014 },
  { id: 'far-east', x: 1147 }
] as const

const centralSpineX = MAIN_CROSS_AISLES.find(aisle => aisle.id === 'central')!.x

export const buildRoutingGraph = (features: MapFeature[]): RoutingGraph => {
  const nodes: RouteNode[] = []
  const edges: RouteEdge[] = []
  const byStreet = new Map<string, RouteNode[]>()

  MAP_STREETS.forEach(street => {
    const isMainStreet = street.name.length === 5
    const streetNodes = (isMainStreet ? MAIN_CROSS_AISLES : [{ id: 'central', x: centralSpineX }]).map(aisle => ({
      id: `${street.id}-${aisle.id}`,
      x: aisle.x,
      y: street.centerline[0].y,
      type: 'intersection' as const,
      label: street.name
    }))
    byStreet.set(street.id, streetNodes)
    nodes.push(...streetNodes)
  })

  features.filter(feature => feature.type === 'booth' && feature.boothCode && feature.interactive && feature.exhibitorId).forEach(feature => {
    const access = feature.entrances?.[0] || boothAccessPoint(feature)
    if (!access) return
    const street = streetForBoothCode(feature.boothCode!)
    if (!street) return
    const streetNode: RouteNode = { id: `street-access-${feature.id}`, x: access.x, y: street.centerline[0].y, type: 'intersection', label: street.name }
    const accessNode: RouteNode = { id: `access-${feature.id}`, x: access.x, y: access.y, type: 'booth-access', label: feature.boothCode, featureId: feature.id }
    byStreet.get(street.id)!.push(streetNode)
    nodes.push(streetNode, accessNode)
    edges.push({ id: `edge-${streetNode.id}-${accessNode.id}`, from: streetNode.id, to: accessNode.id, distance: distance(streetNode, accessNode), streetId: street.id, accessible: true, blocked: false, bidirectional: true })
  })

  MAP_STREETS.forEach(street => {
    const ordered = byStreet.get(street.id)!.sort((a, b) => a.x - b.x)
    for (let index = 1; index < ordered.length; index += 1) {
      edges.push({ id: `edge-${ordered[index - 1].id}-${ordered[index].id}`, from: ordered[index - 1].id, to: ordered[index].id, distance: distance(ordered[index - 1], ordered[index]), streetId: street.id, accessible: true, blocked: false, bidirectional: true })
    }
  })

  MAIN_CROSS_AISLES.forEach(aisle => {
    const aisleNodes = MAP_STREETS
      .filter(street => street.name.length === 5)
      .map(street => nodes.find(node => node.id === `${street.id}-${aisle.id}`)!)
    for (let index = 1; index < aisleNodes.length; index += 1) {
      edges.push({
        id: `edge-${aisleNodes[index - 1].id}-${aisleNodes[index].id}`,
        from: aisleNodes[index - 1].id,
        to: aisleNodes[index].id,
        distance: distance(aisleNodes[index - 1], aisleNodes[index]),
        streetId: `cross-aisle-${aisle.id}`,
        accessible: true,
        blocked: false,
        bidirectional: true
      })
    }
  })

  const northY = 180
  const southY = 960
  const northHub: RouteNode = { id: 'north-hub', x: centralSpineX, y: northY, type: 'intersection', label: 'Acesso norte' }
  const southHub: RouteNode = { id: 'south-hub', x: centralSpineX, y: southY, type: 'intersection', label: 'Entrada pública' }
  const southOutdoorHub: RouteNode = { id: 'south-outdoor-hub', x: centralSpineX, y: 1016, type: 'intersection', label: 'Via externa dos halls' }
  nodes.push(northHub, southHub, southOutdoorHub)
  const streetK = nodes.find(node => node.id === 'street-k-central')!
  const streetA = nodes.find(node => node.id === 'street-a-central')!
  edges.push({ id: 'edge-north-hub-k', from: northHub.id, to: streetK.id, distance: distance(northHub, streetK), accessible: true, blocked: false, bidirectional: true })
  edges.push({ id: 'edge-south-hub-a', from: southHub.id, to: streetA.id, distance: distance(southHub, streetA), accessible: true, blocked: false, bidirectional: true })
  edges.push({ id: 'edge-south-outdoor-hub', from: southOutdoorHub.id, to: southHub.id, distance: distance(southOutdoorHub, southHub), accessible: true, blocked: false, bidirectional: true })

  features.filter(feature => feature.type === 'gate' && feature.metadata?.routeOrigin).forEach(feature => {
    if (feature.geometry.type !== 'rect') return
    const routeCode = typeof feature.metadata.routeCode === 'string' ? feature.metadata.routeCode : feature.label?.replace('Portão ', 'P') || feature.id
    const node: RouteNode = { id: routeCode, x: feature.geometry.x + feature.geometry.width / 2, y: feature.geometry.y + feature.geometry.height / 2, type: 'gate', label: feature.label, featureId: feature.id }
    nodes.push(node)
    const isHallAccess = node.id.startsWith('HALL')
    const entersThroughStreetA = node.id === 'HALL1'
    const isSouthAccess = node.id === 'P5' || node.id === 'PA' || isHallAccess
    const perimeter: RouteNode = { id: `${node.id}-perimeter`, x: node.x, y: entersThroughStreetA ? streetA.y : isHallAccess ? southOutdoorHub.y : isSouthAccess ? southY : northY, type: 'entrance', label: node.label }
    nodes.push(perimeter)
    edges.push({ id: `edge-${node.id}-${perimeter.id}`, from: node.id, to: perimeter.id, distance: distance(node, perimeter), accessible: true, blocked: false, bidirectional: true })
    if (entersThroughStreetA) {
      const nearestAisle = MAIN_CROSS_AISLES.reduce((nearest, aisle) => Math.abs(aisle.x - node.x) < Math.abs(nearest.x - node.x) ? aisle : nearest)
      const streetAEntrance = nodes.find(candidate => candidate.id === `street-a-${nearestAisle.id}`)!
      edges.push({ id: `edge-${perimeter.id}-${streetAEntrance.id}`, from: perimeter.id, to: streetAEntrance.id, distance: distance(perimeter, streetAEntrance), streetId: 'street-a', accessible: true, blocked: false, bidirectional: true })
    } else {
      const hub = isHallAccess ? southOutdoorHub : isSouthAccess ? southHub : northHub
      edges.push({ id: `edge-${perimeter.id}-${hub.id}`, from: perimeter.id, to: hub.id, distance: distance(perimeter, hub), accessible: true, blocked: false, bidirectional: true })
    }
  })

  return { nodes, edges }
}
