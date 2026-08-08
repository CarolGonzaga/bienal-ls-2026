import { MAP_HEIGHT, MAP_WIDTH, type MapFeature } from '../data/map/map-layout.ts'
import type { RoutingGraph } from '../data/map/map-routing-graph.ts'

export const validateLayout = (features: MapFeature[]) => {
  const errors: string[] = []
  const ids = new Set<string>()
  features.forEach(feature => {
    if (ids.has(feature.id)) errors.push(`ID duplicado: ${feature.id}`)
    ids.add(feature.id)
    const points = feature.geometry.type === 'rect'
      ? [{ x: feature.geometry.x, y: feature.geometry.y }, { x: feature.geometry.x + feature.geometry.width, y: feature.geometry.y + feature.geometry.height }]
      : feature.geometry.points
    if (feature.geometry.type === 'rect' && (feature.geometry.width <= 0 || feature.geometry.height <= 0)) errors.push(`Dimensão inválida: ${feature.id}`)
    if (points.some(point => point.x < 0 || point.y < 0 || point.x > MAP_WIDTH || point.y > MAP_HEIGHT)) errors.push(`Fora do viewBox: ${feature.id}`)
    if (feature.type === 'booth' && feature.interactive && feature.metadata?.navigable !== false && !feature.entrances?.length) errors.push(`Estande sem acesso: ${feature.id}`)
  })
  return errors
}

export const validateGraph = (graph: RoutingGraph) => {
  const errors: string[] = []
  const nodeIds = new Set(graph.nodes.map(node => node.id))
  graph.edges.forEach(edge => {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) errors.push(`Aresta inválida: ${edge.id}`)
  })
  return errors
}

export const validateRouteObstacles = (graph: RoutingGraph, features: MapFeature[]) => {
  const errors: string[] = []
  const nodes = new Map(graph.nodes.map(node => [node.id, node]))
  const obstacles = features.filter(feature => ['booth', 'food', 'stage', 'bathroom', 'service', 'special-area', 'obstacle'].includes(feature.type) && feature.geometry.type === 'rect')
  graph.edges.forEach(edge => {
    const from = nodes.get(edge.from)
    const to = nodes.get(edge.to)
    if (!from || !to) return
    for (let step = 1; step < 20; step += 1) {
      const t = step / 20
      const point = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }
      const collision = obstacles.find(feature => {
        const rect = feature.geometry as Extract<MapFeature['geometry'], { type: 'rect' }>
        return point.x > rect.x + .5 && point.x < rect.x + rect.width - .5 && point.y > rect.y + .5 && point.y < rect.y + rect.height - .5
      })
      if (collision) { errors.push(`Aresta ${edge.id} atravessa ${collision.id}`); break }
    }
  })
  return errors
}
