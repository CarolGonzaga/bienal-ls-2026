import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useAdminMapStore } from '../../stores/useAdminMapStore'
import { useExhibitorStore } from '../../stores/useExhibitorStore'
import { useMapStore } from '../../stores/useMapStore'
import { useUserStore } from '../../stores/useUserStore'
import { useMapInteraction } from '../../hooks/useMapInteraction'
import { MAP_ANNOTATIONS, MAP_HEIGHT, MAP_STREETS, MAP_WIDTH, buildMapLayout, type MapFeature } from '../../data/map/map-layout.ts'
import { buildRoutingGraph, CUSTOM_ROUTE_ORIGIN_ID, withCustomRouteOrigin } from '../../data/map/map-routing-graph.ts'
import { buildRouteSegments, parseMapRouteParams } from '../../services/mapRoutingService.ts'
import { MapBooth } from './MapBooth.tsx'
import { MapRoute } from './MapRoute.tsx'
import { toWorldCoordinates } from '../../utils/coordinates.ts'

const pointsString = (points: Array<{ x: number; y: number }>) => points.map(point => `${point.x},${point.y}`).join(' ')

export const BienalMap: React.FC = () => {
  const databaseGeometries = useAdminMapStore(state => state.geometries)
  const exhibitors = useExhibitorStore(state => state.exhibitors)
  const searchQuery = useExhibitorStore(state => state.searchQuery)
  const setSelectedExhibitorId = useExhibitorStore(state => state.setSelectedExhibitorId)
  const selectedStandId = useMapStore(state => state.selectedStandId)
  const setSelectedStandId = useMapStore(state => state.setSelectedStandId)
  const mapTheme = useMapStore(state => state.mapTheme)
  const graphicsQuality = useMapStore(state => state.graphicsQuality)
  const reducedMotion = useMapStore(state => state.reducedMotion)
  const userPosition = useMapStore(state => state.userPosition)
  const setUserPosition = useMapStore(state => state.setUserPosition)
  const routeOriginGateId = useMapStore(state => state.routeOriginGateId)
  const setRouteOriginGateId = useMapStore(state => state.setRouteOriginGateId)
  const isChoosingRouteOrigin = useMapStore(state => state.isChoosingRouteOrigin)
  const setIsChoosingRouteOrigin = useMapStore(state => state.setIsChoosingRouteOrigin)
  const isChoosingUserPosition = useMapStore(state => state.isChoosingUserPosition)
  const setIsChoosingUserPosition = useMapStore(state => state.setIsChoosingUserPosition)
  const favorites = useUserStore(state => state.favorites)
  const visits = useUserStore(state => state.visits)
  const routeStops = useUserStore(state => state.routeStops)
  const addToRoute = useUserStore(state => state.addToRoute)
  const features = useMemo(() => buildMapLayout(databaseGeometries), [databaseGeometries])
  const svgRef = useRef<SVGSVGElement>(null)
  const lastHandledSearchRef = useRef('')
  const [compactViewport, setCompactViewport] = useState(() => window.matchMedia('(max-width: 1023px)').matches)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)')
    const updateViewport = () => setCompactViewport(media.matches)
    media.addEventListener('change', updateViewport)
    return () => media.removeEventListener('change', updateViewport)
  }, [])

  const { transform, containerRef, handlers, animateToStand, resetView, zoomIn, zoomOut } = useMapInteraction({ initialTilt: 0, initialZoom: compactViewport ? 3.2 : 1.05, minZoom: .55, maxZoom: 10, zoomStep: .7, focusZoom: 4.4, reducedMotion })

  useEffect(() => {
    ;(window as any).__mapControls = {
      resetView, animateToStand, zoomIn, zoomOut,
      setCustomOriginAtClientPoint: (clientX: number, clientY: number) => {
        if (!svgRef.current) return
        const point = svgRef.current.createSVGPoint()
        point.x = clientX
        point.y = clientY
        const matrix = svgRef.current.getScreenCTM()
        if (!matrix) return
        const mapped = point.matrixTransform(matrix.inverse())
        const x = Math.max(0, Math.min(MAP_WIDTH, mapped.x))
        const y = Math.max(0, Math.min(MAP_HEIGHT, mapped.y))
        setUserPosition(toWorldCoordinates(x / MAP_WIDTH, y / MAP_HEIGHT))
        setRouteOriginGateId(CUSTOM_ROUTE_ORIGIN_ID)
      }
    }
    return () => { delete (window as any).__mapControls }
  }, [resetView, animateToStand, zoomIn, zoomOut, setRouteOriginGateId, setUserPosition])

  const customOriginPoint = userPosition ? { x: (userPosition.worldX / 40 + .5) * MAP_WIDTH, y: (.5 - userPosition.worldZ / 33.25) * MAP_HEIGHT } : null
  const graph = useMemo(() => withCustomRouteOrigin(buildRoutingGraph(features), customOriginPoint), [features, customOriginPoint?.x, customOriginPoint?.y])
  const routeSegments = useMemo(() => buildRouteSegments(graph, features, routeOriginGateId, routeStops), [features, graph, routeOriginGateId, routeStops])
  const routePoints = useMemo(() => routeSegments.flatMap(segment => segment.points), [routeSegments])

  useEffect(() => {
    const controls = (window as any).__mapControls
    if (!controls) return
    controls.focusRoute = () => {
      if (!routePoints.length) return
      const center = routePoints.reduce((sum, point) => ({ x: sum.x + point.x / routePoints.length, y: sum.y + point.y / routePoints.length }), { x: 0, y: 0 })
      animateToStand(center.x / MAP_WIDTH, center.y / MAP_HEIGHT)
    }
    controls.focusOrigin = () => {
      const point = routeSegments[0]?.points[0]; if (point) animateToStand(point.x / MAP_WIDTH, point.y / MAP_HEIGHT)
    }
    controls.focusDestination = () => {
      const point = routeSegments.at(-1)?.points.at(-1); if (point) animateToStand(point.x / MAP_WIDTH, point.y / MAP_HEIGHT)
    }
  }, [animateToStand, routePoints, routeSegments])

  useEffect(() => {
    const { origin, destination: destinationCode } = parseMapRouteParams(window.location.search)
    if (origin && graph.nodes.some(node => node.id === origin)) setRouteOriginGateId(origin)
    if (!destinationCode) return
    const feature = features.find(item => item.boothCode?.toUpperCase() === destinationCode && item.exhibitorId)
    if (!feature?.exhibitorId || !feature.boothCode) return
    setSelectedStandId(feature.id)
    setSelectedExhibitorId(feature.exhibitorId)
    addToRoute(feature.exhibitorId, feature.boothCode)
  }, [addToRoute, features, graph.nodes, setRouteOriginGateId, setSelectedExhibitorId, setSelectedStandId])

  useEffect(() => {
    const query = searchQuery.trim().toUpperCase()
    if (!query) {
      lastHandledSearchRef.current = ''
      return
    }
    if (lastHandledSearchRef.current === query) return
    lastHandledSearchRef.current = query
    const feature = features.find(item => item.boothCode?.toUpperCase() === query && item.exhibitorId)
    if (!feature?.exhibitorId || feature.geometry.type !== 'rect') return
    setSelectedStandId(feature.id)
    setSelectedExhibitorId(feature.exhibitorId)
    animateToStand((feature.geometry.x + feature.geometry.width / 2) / MAP_WIDTH, (feature.geometry.y + feature.geometry.height / 2) / MAP_HEIGHT)
  }, [animateToStand, features, searchQuery, setSelectedExhibitorId, setSelectedStandId])

  const selectFeature = (feature: MapFeature) => {
    if (isChoosingUserPosition) {
      const point = feature.entrances?.[0] || (feature.geometry.type === 'rect'
        ? { x: feature.geometry.x + feature.geometry.width / 2, y: feature.geometry.y + feature.geometry.height / 2 }
        : { x: feature.geometry.points.reduce((sum, item) => sum + item.x, 0) / feature.geometry.points.length, y: feature.geometry.points.reduce((sum, item) => sum + item.y, 0) / feature.geometry.points.length })
      setUserPosition(toWorldCoordinates(point.x / MAP_WIDTH, point.y / MAP_HEIGHT))
      setIsChoosingUserPosition(false)
      return
    }
    setSelectedStandId(feature.id)
    if (feature.exhibitorId) setSelectedExhibitorId(feature.exhibitorId)
    if (feature.type === 'gate' && feature.metadata?.routeOrigin) {
      const routeCode = typeof feature.metadata.routeCode === 'string' ? feature.metadata.routeCode : routeOriginGateId
      if (routeCode === 'HALL1') setRouteOriginGateId(routeCode)
    }
    if (feature.geometry.type === 'rect') animateToStand((feature.geometry.x + feature.geometry.width / 2) / MAP_WIDTH, (feature.geometry.y + feature.geometry.height / 2) / MAP_HEIGHT)
  }

  const svgPointFromEvent = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return null
    const point = svgRef.current.createSVGPoint(); point.x = event.clientX; point.y = event.clientY
    const matrix = svgRef.current.getScreenCTM(); return matrix ? point.matrixTransform(matrix.inverse()) : null
  }

  const handleMapChoice = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!isChoosingRouteOrigin && !isChoosingUserPosition) return
    const point = svgPointFromEvent(event)
    if (!point) return
    const candidates = graph.nodes.filter(node => node.id === 'HALL1' || node.type === 'intersection' || node.type === 'booth-access')
    const nearest = candidates.reduce((best, node) => Math.hypot(node.x - point.x, node.y - point.y) < Math.hypot(best.x - point.x, best.y - point.y) ? node : best, candidates[0])
    if (!nearest) return
    if (isChoosingUserPosition) {
      setUserPosition(toWorldCoordinates(nearest.x / MAP_WIDTH, nearest.y / MAP_HEIGHT))
      setIsChoosingUserPosition(false)
    } else {
      setRouteOriginGateId(nearest.id)
      setIsChoosingRouteOrigin(false)
    }
  }

  const dark = mapTheme === 'dark'
  const user = userPosition ? { x: (userPosition.worldX / 40 + .5) * MAP_WIDTH, y: (.5 - userPosition.worldZ / 33.25) * MAP_HEIGHT } : null
  const mapItems = features.filter(feature => !['wall', 'external-area', 'street'].includes(feature.type))
  const buildingItems = features.filter(feature => feature.type === 'wall' || feature.type === 'external-area')

  const showMapDetails = graphicsQuality !== 'eco' || transform.zoom >= 2

  return <div ref={containerRef} data-testid="bienal-map" data-map-quality={graphicsQuality} data-reduced-motion={reducedMotion} className={`map-quality-${graphicsQuality} absolute inset-0 min-h-[520px] overflow-hidden select-none ${dark ? 'bg-slate-950' : 'bg-slate-100'}`}>
    <div data-testid="map-zoom-surface" className="absolute inset-0 flex items-center justify-center overflow-hidden p-2 sm:p-4" style={{ touchAction: 'none' }} {...handlers}>
      <div className="h-full w-full" style={{ transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.zoom})`, transformOrigin: 'center center' }}>
        <svg ref={svgRef} viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%" className={`block h-full w-full ${isChoosingRouteOrigin || isChoosingUserPosition ? 'cursor-crosshair' : ''}`} role="img" aria-labelledby="bienal-map-title bienal-map-description" onClick={handleMapChoice}>
          <title id="bienal-map-title">Mapa indoor da Bienal do Livro</title>
          <desc id="bienal-map-description">Mapa vetorial com pavilhões, ruas, estandes, portões, serviços e rota acessível pelos corredores.</desc>
          <g id="background-layer"><rect width={MAP_WIDTH} height={MAP_HEIGHT} fill={dark ? '#0f172a' : '#f1f5f9'} /></g>
          <g id="external-layer">{buildingItems.map(feature => feature.geometry.type === 'polygon' ? <polygon key={feature.id} points={pointsString(feature.geometry.points)} fill={feature.type === 'wall' ? dark ? '#172033' : '#fff' : feature.id === 'external-north' ? dark ? '#35152f' : '#f8d9e8' : dark ? '#111827' : '#e5e7eb'} stroke={dark ? '#64748b' : '#94a3b8'} strokeWidth={1} vectorEffect="non-scaling-stroke"/> : null)}</g>
          <g id="street-layer">{MAP_STREETS.map(street => <g key={street.id}>{street.segments.map(([start, end], index) => {
            const labelX = (start.x + end.x) / 2
            const labelY = (start.y + end.y) / 2
            return <g key={index}>
              <path d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`} stroke={dark ? '#334155' : '#dbe1e8'} strokeWidth={street.width} strokeLinecap="butt"/>
              {showMapDetails && <g data-street-label={street.name} className="pointer-events-none">
                <rect x={labelX - 25} y={labelY - 6} width="50" height="12" rx="6" fill={dark ? '#25102f' : '#fff'} stroke="none"/>
                <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" fontSize="7" fontWeight="900" letterSpacing=".45" fill={dark ? '#f8fafc' : '#334155'}>{street.name.toUpperCase()}</text>
              </g>}
            </g>
          })}</g>)}</g>
          {showMapDetails && <g id="annotation-layer" className="pointer-events-none">{MAP_ANNOTATIONS.map(annotation => <text key={annotation.id} x={annotation.position.x} y={annotation.position.y} textAnchor="middle" dominantBaseline="middle" fontSize={annotation.fontSize || 7} fontWeight="900" letterSpacing=".25" fill={dark ? '#cbd5e1' : '#475569'}>{annotation.label}</text>)}</g>}
          <g id="booth-and-service-layer">{mapItems.map(feature => {
            const exhibitor = feature.exhibitorId ? exhibitors.find(item => item.id === feature.exhibitorId) : undefined
            return <MapBooth key={feature.id} feature={feature} exhibitor={exhibitor} selected={selectedStandId === feature.id} favorite={Boolean(exhibitor && favorites.includes(exhibitor.id))} visited={Boolean(exhibitor && visits[exhibitor.id])} inRoute={Boolean(exhibitor && routeStops.some(stop => stop.exhibitorId === exhibitor.id))} isometric={false} zoom={transform.zoom} dark={dark} quality={graphicsQuality} compact={compactViewport} onSelect={() => selectFeature(feature)}/>
          })}</g>
          <MapRoute segments={routeSegments} compact={compactViewport}/>
          <g id="marker-layer">{user && <g data-testid="user-position-marker" transform={`translate(${user.x} ${user.y})`}>{!reducedMotion && <circle className="user-ping" r="14" fill="#d43276"/>}<circle r="9" fill="#d43276" stroke="#fff" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/><circle r="2.5" fill="#fff"/><text y="-13" textAnchor="middle" fontSize="8" fontWeight="900" fill="#b94185">VOCÊ ESTÁ AQUI</text></g>}</g>
        </svg>
      </div>
    </div>
    <div className={`absolute bottom-3 left-3 hidden rounded-xl border px-3 py-2 text-xs font-bold shadow-lg lg:block ${dark ? 'border-slate-700 bg-slate-900/90 text-slate-100' : 'border-slate-300 bg-white/95 text-slate-700'}`}><span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-pink-500"/>Mapa 2D • {Math.round(transform.zoom * 100)}%</span></div>
    {isChoosingRouteOrigin && <div className="absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-xl bg-[#b94185] px-4 py-2 text-sm font-black text-white shadow-xl">Clique em uma rua ou ponto próximo para definir a origem</div>}
    {isChoosingUserPosition && <div className="absolute left-1/2 top-3 z-30 max-w-[calc(100%-7rem)] -translate-x-1/2 rounded-xl bg-[#b94185] px-4 py-2 text-center text-xs font-black text-white shadow-xl sm:text-sm">Clique em uma rua, espaço livre ou estande para marcar sua posição</div>}
  </div>
}
