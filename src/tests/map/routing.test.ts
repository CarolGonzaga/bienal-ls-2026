import test from 'node:test'
import assert from 'node:assert/strict'
import { boothAccessPoint, buildMapLayout } from '../../data/map/map-layout.ts'
import { INITIAL_STAND_GEOMETRIES } from '../../data/initialStands.ts'
import { buildRoutingGraph, CUSTOM_ROUTE_ORIGIN_ID, MAIN_CROSS_AISLES, withCustomRouteOrigin } from '../../data/map/map-routing-graph.ts'
import { buildRouteSegments, findRoute, optimizeRouteStops, parseMapRouteParams } from '../../services/mapRoutingService.ts'
import { validateGraph, validateRouteObstacles } from '../../services/mapLayoutValidationService.ts'

const features = buildMapLayout(INITIAL_STAND_GEOMETRIES)
const graph = buildRoutingGraph(features)
const destination = features.find(feature => feature.boothCode === 'G36' && feature.exhibitorId)!

test('grafo não possui arestas apontando para nós inexistentes', () => {
  assert.deepEqual(validateGraph(graph), [])
})

test('encontra rota do Portão 8 até a borda do estande', () => {
  const route = findRoute(graph, 'P8', `access-${destination.id}`)
  assert.ok(route)
  assert.equal(route!.nodeIds[0], 'P8')
  assert.equal(route!.nodeIds.at(-1), `access-${destination.id}`)
  const access = boothAccessPoint(destination)
  const end = route!.points.at(-1)!
  assert.equal(end.x, access?.x)
  assert.equal(end.y, access?.y)
})

test('todos os portões de A a F e acessos Hall 1 a 5 são origens navegáveis', () => {
  const origins = ['PA', 'PB', 'PC', 'PD', 'PE', 'PF', 'HALL1', 'HALL2', 'HALL3', 'HALL4', 'HALL5']
  origins.forEach(origin => {
    const route = findRoute(graph, origin, `access-${destination.id}`)
    assert.ok(route, origin)
    assert.equal(route!.nodeIds[0], origin)
  })
})

test('Hall 1 entra no pavilhão pela Rua A antes de seguir aos estandes', () => {
  const route = findRoute(graph, 'HALL1', `access-${destination.id}`)
  assert.ok(route)
  assert.deepEqual(route!.nodeIds.slice(0, 3), ['HALL1', 'HALL1-perimeter', 'street-a-far-east'])
  assert.equal(route!.points[1].y, 899)
  assert.equal(route!.points[1].x, route!.points[0].x)
})

test('as cinco travessas oficiais conectam continuamente as Ruas A e K', () => {
  MAIN_CROSS_AISLES.forEach(aisle => {
    const route = findRoute(graph, `street-a-${aisle.id}`, `street-k-${aisle.id}`)
    assert.ok(route, aisle.id)
    assert.equal(route!.points.length, 10)
    assert.ok(route!.points.every(point => point.x === aisle.x), aisle.id)
  })
})

test('somente os vãos contínuos oficiais viram travessas', () => {
  const crossEdges = graph.edges.filter(edge => edge.streetId?.startsWith('cross-aisle-'))
  assert.equal(crossEdges.length, MAIN_CROSS_AISLES.length * 9)
  assert.deepEqual(
    [...new Set(crossEdges.map(edge => edge.streetId))].sort(),
    MAIN_CROSS_AISLES.map(aisle => `cross-aisle-${aisle.id}`).sort()
  )
})

test('encontra rota entre dois estandes', () => {
  const other = features.find(feature => feature.boothCode === 'A58' && feature.exhibitorId)!
  assert.ok(findRoute(graph, `access-${destination.id}`, `access-${other.id}`))
})

test('permite iniciar em C28 e navegar até K33', () => {
  const origin = features.find(feature => feature.boothCode === 'C28' && feature.exhibitorId)!
  const target = features.find(feature => feature.boothCode === 'K33' && feature.exhibitorId)!
  const route = findRoute(graph, `access-${origin.id}`, `access-${target.id}`)
  assert.ok(route)
  assert.equal(route!.nodeIds[0], `access-${origin.id}`)
  assert.equal(route!.nodeIds.at(-1), `access-${target.id}`)
})

test('separa Hall 1 → K70 e K70 → G36 em trechos de cores diferentes', () => {
  const k70 = features.find(feature => feature.boothCode === 'K70' && feature.exhibitorId)!
  const g36 = features.find(feature => feature.boothCode === 'G36' && feature.exhibitorId)!
  const segments = buildRouteSegments(graph, features, 'HALL1', [
    { exhibitorId: k70.exhibitorId!, standCode: 'K70', visited: false, order: 1 },
    { exhibitorId: g36.exhibitorId!, standCode: 'G36', visited: false, order: 2 }
  ])
  assert.equal(segments.length, 2)
  assert.deepEqual(segments.map(segment => [segment.fromLabel, segment.toLabel]), [['Entrada Hall 1', 'K70'], ['K70', 'G36']])
  assert.notEqual(segments[0].color, segments[1].color)
  assert.equal(segments[0].nodeIds.at(-1), segments[1].nodeIds[0])
})

test('todos os 32 expositores presentes no mapa possuem acesso e rota pelo grafo', () => {
  const confirmed = features.filter(feature => feature.exhibitorId)
  assert.equal(confirmed.length, 32)
  confirmed.forEach(feature => assert.ok(findRoute(graph, 'P8', `access-${feature.id}`), feature.boothCode))
})

test('interpreta origin e destination da URL sem diferenciar maiúsculas', () => {
  assert.deepEqual(parseMapRouteParams('?origin=p9&destination=h70'), { origin: 'P9', destination: 'H70' })
})

test('origem ou destino inexistente retorna nulo', () => {
  assert.equal(findRoute(graph, 'inexistente', `access-${destination.id}`), null)
  assert.equal(findRoute(graph, 'P8', 'inexistente'), null)
})

test('rota bloqueada retorna nulo', () => {
  const blocked = { ...graph, edges: graph.edges.map(edge => ({ ...edge, blocked: true })) }
  assert.equal(findRoute(blocked, 'P8', `access-${destination.id}`), null)
})

test('origem personalizada atualiza o início e preserva a ordem dos destinos', () => {
  const first = features.find(feature => feature.boothCode === 'G36' && feature.exhibitorId)!
  const second = features.find(feature => feature.boothCode === 'K33' && feature.exhibitorId)!
  const stops = [
    { exhibitorId: first.exhibitorId!, standCode: first.boothCode!, visited: false, order: 1 },
    { exhibitorId: second.exhibitorId!, standCode: second.boothCode!, visited: false, order: 2 }
  ]
  const customPoint = { x: 644, y: 700 }
  const customGraph = withCustomRouteOrigin(graph, customPoint)
  const segments = buildRouteSegments(customGraph, features, CUSTOM_ROUTE_ORIGIN_ID, stops)
  assert.equal(segments.length, 2)
  assert.equal(segments[0].fromId, CUSTOM_ROUTE_ORIGIN_ID)
  assert.equal(segments[0].points[0].x, customPoint.x)
  assert.equal(segments[0].points[0].y, customPoint.y)
  assert.deepEqual(segments.map(segment => segment.destinationExhibitorId), [first.exhibitorId, second.exhibitorId])
})

test('ordena automaticamente os destinos do mais próximo ao mais distante', () => {
  const near = features.find(feature => feature.boothCode === 'A58' && feature.exhibitorId)!
  const far = features.find(feature => feature.boothCode === 'K70' && feature.exhibitorId)!
  const optimized = optimizeRouteStops(graph, features, 'HALL1', [
    { exhibitorId: far.exhibitorId!, standCode: far.boothCode!, visited: false, order: 1 },
    { exhibitorId: near.exhibitorId!, standCode: near.boothCode!, visited: false, order: 2 }
  ])
  assert.deepEqual(optimized.map(stop => stop.exhibitorId), [near.exhibitorId, far.exhibitorId])
})

test('não desenha novamente um destino marcado como visitado', () => {
  const target = features.find(feature => feature.boothCode === 'G36' && feature.exhibitorId)!
  const segments = buildRouteSegments(graph, features, 'HALL1', [
    { exhibitorId: target.exhibitorId!, standCode: target.boothCode!, visited: true, order: 1 }
  ])
  assert.deepEqual(segments, [])
})

test('arestas caminháveis não atravessam estandes ou áreas fechadas', () => {
  assert.deepEqual(validateRouteObstacles(graph, features), [])
})
