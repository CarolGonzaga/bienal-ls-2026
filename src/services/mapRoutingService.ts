import type { Point2D, RouteStop } from '../types/index.ts'
import type { RouteEdge, RouteNode, RoutingGraph } from '../data/map/map-routing-graph.ts'
import type { MapFeature } from '../data/map/map-layout.ts'

export interface CalculatedRoute {
  nodeIds: string[]
  points: Point2D[]
  distance: number
  instructions: string[]
}

export const ROUTE_SEGMENT_COLORS = ['#d43276', '#b94185', '#cf005e', '#8f174e', '#fc649f', '#7b3a60'] as const

export interface CalculatedRouteSegment extends CalculatedRoute {
  index: number
  color: string
  fromId: string
  toId: string
  fromLabel: string
  toLabel: string
  destinationExhibitorId: string
}

export const parseMapRouteParams = (search: string) => {
  const params = new URLSearchParams(search)
  return { origin: params.get('origin')?.trim().toUpperCase() || null, destination: params.get('destination')?.trim().toUpperCase() || null }
}

export const findRoute = (graph: RoutingGraph, originId: string, destinationId: string): CalculatedRoute | null => {
  const nodeMap = new Map(graph.nodes.map(node => [node.id, node]))
  if (!nodeMap.has(originId) || !nodeMap.has(destinationId)) return null
  const adjacency = new Map<string, Array<{ node: string; edge: RouteEdge }>>()
  graph.nodes.forEach(node => adjacency.set(node.id, []))
  graph.edges.filter(edge => !edge.blocked && edge.accessible).forEach(edge => {
    adjacency.get(edge.from)?.push({ node: edge.to, edge })
    if (edge.bidirectional) adjacency.get(edge.to)?.push({ node: edge.from, edge })
  })
  const distances = new Map(graph.nodes.map(node => [node.id, Number.POSITIVE_INFINITY]))
  const previous = new Map<string, string>()
  const unvisited = new Set(graph.nodes.map(node => node.id))
  distances.set(originId, 0)
  while (unvisited.size) {
    let current: string | null = null
    unvisited.forEach(id => { if (current === null || distances.get(id)! < distances.get(current)!) current = id })
    if (current === null || distances.get(current) === Number.POSITIVE_INFINITY) break
    unvisited.delete(current)
    if (current === destinationId) break
    adjacency.get(current)?.forEach(({ node, edge }) => {
      if (!unvisited.has(node)) return
      const candidate = distances.get(current!)! + edge.distance
      if (candidate < distances.get(node)!) { distances.set(node, candidate); previous.set(node, current!) }
    })
  }
  if (!previous.has(destinationId) && originId !== destinationId) return null
  const nodeIds = [destinationId]
  while (nodeIds[0] !== originId) nodeIds.unshift(previous.get(nodeIds[0])!)
  const points = nodeIds.map(id => nodeMap.get(id)!)
  return { nodeIds, points, distance: distances.get(destinationId)!, instructions: buildDirections(points) }
}

export const buildRouteSegments = (graph: RoutingGraph, features: MapFeature[], originId: string, stops: RouteStop[]): CalculatedRouteSegment[] => {
  const segments: CalculatedRouteSegment[] = []
  let currentId = originId
  let currentLabel = originId === 'HALL1' ? 'Entrada Hall 1' : graph.nodes.find(node => node.id === originId)?.label || 'Origem'

  for (const stop of [...stops].filter(stop => !stop.visited).sort((a, b) => a.order - b.order)) {
    const destination = features.find(feature => feature.exhibitorId === stop.exhibitorId)
    if (!destination?.boothCode) continue
    const destinationId = `access-${destination.id}`
    const route = findRoute(graph, currentId, destinationId)
    if (!route) continue
    const index = segments.length
    segments.push({
      ...route,
      index,
      color: ROUTE_SEGMENT_COLORS[index % ROUTE_SEGMENT_COLORS.length],
      fromId: currentId,
      toId: destinationId,
      fromLabel: currentLabel,
      toLabel: destination.boothCode,
      destinationExhibitorId: stop.exhibitorId
    })
    currentId = destinationId
    currentLabel = destination.boothCode
  }

  return segments
}

export const optimizeRouteStops = (graph: RoutingGraph, features: MapFeature[], originId: string, stops: RouteStop[]): RouteStop[] => {
  const remaining = [...stops].filter(stop => !stop.visited)
  const optimized: RouteStop[] = []
  let currentId = originId

  while (remaining.length) {
    let bestIndex = -1
    let bestDistance = Number.POSITIVE_INFINITY
    remaining.forEach((stop, index) => {
      const destination = features.find(feature => feature.exhibitorId === stop.exhibitorId)
      if (!destination) return
      const route = findRoute(graph, currentId, `access-${destination.id}`)
      if (route && route.distance < bestDistance) {
        bestIndex = index
        bestDistance = route.distance
      }
    })
    if (bestIndex < 0) {
      optimized.push(...remaining)
      break
    }
    const [next] = remaining.splice(bestIndex, 1)
    optimized.push(next)
    const destination = features.find(feature => feature.exhibitorId === next.exhibitorId)
    if (destination) currentId = `access-${destination.id}`
  }

  return optimized.map((stop, index) => ({ ...stop, order: index + 1 }))
}

const directionBetween = (a: Point2D, b: Point2D) => Math.abs(b.x - a.x) > Math.abs(b.y - a.y) ? (b.x > a.x ? 'leste' : 'oeste') : (b.y > a.y ? 'sul' : 'norte')

export const buildDirections = (points: RouteNode[]): string[] => {
  if (points.length < 2) return []
  const instructions = [`Saia de ${points[0].label || 'sua origem'}.`]
  let lastDirection = directionBetween(points[0], points[1])
  for (let index = 1; index < points.length - 1; index += 1) {
    const nextDirection = directionBetween(points[index], points[index + 1])
    if (nextDirection !== lastDirection) {
      instructions.push(`No próximo cruzamento, siga para ${nextDirection}.`)
      lastDirection = nextDirection
    }
  }
  const destination = points[points.length - 1]
  instructions.push(`Chegue ao acesso ${destination.label || 'do destino'}.`)
  return instructions
}
