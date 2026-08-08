import React, { useMemo, useRef, useState } from 'react'
import {
  Crosshair,
  MapPin,
  RotateCcw,
  UserRound,
  X,
  Zap,
  ZoomIn,
  ZoomOut
} from 'lucide-react'
import { useMapStore, type GraphicsQuality } from '../../stores/useMapStore'
import { useAdminMapStore } from '../../stores/useAdminMapStore'
import { useExhibitorStore } from '../../stores/useExhibitorStore'
import { buildMapLayout, MAP_HEIGHT, MAP_WIDTH, type MapFeature } from '../../data/map/map-layout.ts'
import { toWorldCoordinates } from '../../utils/coordinates'
import { CUSTOM_ROUTE_ORIGIN_ID } from '../../data/map/map-routing-graph.ts'

type MapControlsVariant = 'desktop' | 'mobile-map' | 'mobile-settings'

const featureCenter = (feature: MapFeature) => {
  if (feature.entrances?.length) return feature.entrances[0]
  if (feature.geometry.type === 'rect') return {
    x: feature.geometry.x + feature.geometry.width / 2,
    y: feature.geometry.y + feature.geometry.height / 2
  }
  const xs = feature.geometry.points.map(point => point.x)
  const ys = feature.geometry.points.map(point => point.y)
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
}

export const MapControls: React.FC<{ panelOpen?: boolean; variant?: MapControlsVariant }> = ({ panelOpen = false, variant = 'desktop' }) => {
  const graphicsQuality = useMapStore(s => s.graphicsQuality)
  const setGraphicsQuality = useMapStore(s => s.setGraphicsQuality)
  const userPosition = useMapStore(s => s.userPosition)
  const setUserPosition = useMapStore(s => s.setUserPosition)
  const setIsChoosingUserPosition = useMapStore(s => s.setIsChoosingUserPosition)
  const setIsChoosingRouteOrigin = useMapStore(s => s.setIsChoosingRouteOrigin)
  const routeOriginGateId = useMapStore(s => s.routeOriginGateId)
  const geometries = useAdminMapStore(s => s.geometries)
  const exhibitors = useExhibitorStore(s => s.exhibitors)
  const [positionDialogOpen, setPositionDialogOpen] = useState(false)
  const [selectedFeatureId, setSelectedFeatureId] = useState('')
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)
  const [personDragOffset, setPersonDragOffset] = useState({ x: 0, y: 0 })

  const standOptions = useMemo(() => buildMapLayout(geometries)
    .filter(feature => feature.type === 'booth' && feature.boothCode)
    .sort((a, b) => (a.boothCode || '').localeCompare(b.boothCode || '', 'pt-BR', { numeric: true })), [geometries])

  const handleResetView = () => (window as any).__mapControls?.resetView?.()
  const handleZoom = (direction: 'in' | 'out') => direction === 'in'
    ? (window as any).__mapControls?.zoomIn?.()
    : (window as any).__mapControls?.zoomOut?.()
  const focus = (target: 'focusOrigin' | 'focusDestination') => (window as any).__mapControls?.[target]?.()

  const setPositionFromStand = () => {
    const feature = standOptions.find(item => item.id === selectedFeatureId)
    if (!feature) return
    const point = featureCenter(feature)
    setUserPosition(toWorldCoordinates(point.x / MAP_WIDTH, point.y / MAP_HEIGHT))
    setIsChoosingUserPosition(false)
    setPositionDialogOpen(false)
  }

  const choosePositionOnMap = () => {
    setIsChoosingRouteOrigin(false)
    setIsChoosingUserPosition(true)
    setPositionDialogOpen(false)
  }

  const removePosition = () => {
    setUserPosition(null)
    setIsChoosingUserPosition(false)
    setPositionDialogOpen(false)
  }

  const positionDialog = positionDialogOpen && (
    <div className="site-dialog-backdrop fixed inset-0 z-[90] flex items-center justify-center p-4 backdrop-blur-sm" onMouseDown={event => { if (event.currentTarget === event.target) setPositionDialogOpen(false) }}>
      <div role="dialog" aria-modal="true" aria-labelledby="position-dialog-title" className="site-dialog w-full max-w-md rounded-3xl border p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div><h3 id="position-dialog-title" className="text-lg font-black">Informar minha posição</h3><p className="mt-1 text-xs opacity-70">Escolha o estande onde você está ou marque um ponto diretamente no mapa.</p></div>
          <button type="button" aria-label="Fechar" onClick={() => setPositionDialogOpen(false)} className="rounded-full p-2"><X className="h-4 w-4" /></button>
        </div>
        <label className="mt-5 flex flex-col gap-2 text-xs font-bold text-[#7b3a60]">
          Estande atual
          <select value={selectedFeatureId} onChange={event => setSelectedFeatureId(event.target.value)} className="route-origin-select w-full rounded-xl border px-3 py-3 text-sm outline-none">
            <option value="">Selecione um estande</option>
            {standOptions.map(feature => {
              const exhibitor = exhibitors.find(item => item.id === feature.exhibitorId)
              return <option key={feature.id} value={feature.id}>{feature.boothCode}{exhibitor ? ` — ${exhibitor.name}` : ''}</option>
            })}
          </select>
        </label>
        <button type="button" disabled={!selectedFeatureId} onClick={setPositionFromStand} className="route-primary-button mt-3 w-full rounded-xl px-4 py-3 text-sm font-black disabled:opacity-50">Confirmar estande</button>
        <div className="my-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest opacity-50"><span className="h-px flex-1 bg-current"/>ou<span className="h-px flex-1 bg-current"/></div>
        <button type="button" onClick={choosePositionOnMap} className="route-secondary-button flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black"><Crosshair className="h-4 w-4"/>Marcar manualmente no mapa</button>
        {userPosition && <button type="button" onClick={removePosition} className="route-remove-button mt-3 w-full rounded-xl py-2 text-xs font-bold">Remover posição atual</button>}
      </div>
    </div>
  )

  if (variant === 'mobile-map') {
    return <div data-testid="mobile-map-controls" className="absolute right-2.5 top-2.5 z-[35] flex flex-col items-center gap-1.5 lg:hidden">
      <button aria-label="Centralizar mapa" title="Centralizar mapa" onClick={handleResetView} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50 active:scale-95"><Crosshair className="h-4 w-4"/></button>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md">
        <button aria-label="Aumentar zoom" title="Aumentar zoom" onClick={() => handleZoom('in')} className="flex h-9 w-9 items-center justify-center text-slate-800 transition hover:bg-slate-50 active:bg-slate-100"><ZoomIn className="h-4 w-4"/></button>
        <span className="mx-1.5 block h-px bg-slate-200" aria-hidden="true"/>
        <button aria-label="Diminuir zoom" title="Diminuir zoom" onClick={() => handleZoom('out')} className="flex h-9 w-9 items-center justify-center text-slate-800 transition hover:bg-slate-50 active:bg-slate-100"><ZoomOut className="h-4 w-4"/></button>
      </div>
      <button
        aria-label="Arraste para definir o ponto de partida"
        title="Arraste para definir o ponto de partida"
        onPointerDown={event => {
          event.preventDefault()
          event.currentTarget.setPointerCapture(event.pointerId)
          dragStartRef.current = { x: event.clientX, y: event.clientY }
        }}
        onPointerMove={event => {
          if (!dragStartRef.current) return
          setPersonDragOffset({ x: event.clientX - dragStartRef.current.x, y: event.clientY - dragStartRef.current.y })
        }}
        onPointerUp={event => {
          if (!dragStartRef.current) return
          const dragged = Math.hypot(event.clientX - dragStartRef.current.x, event.clientY - dragStartRef.current.y) >= 8
          if (dragged) (window as any).__mapControls?.setCustomOriginAtClientPoint?.(event.clientX, event.clientY)
          dragStartRef.current = null
          setPersonDragOffset({ x: 0, y: 0 })
        }}
        onPointerCancel={() => { dragStartRef.current = null; setPersonDragOffset({ x: 0, y: 0 }) }}
        style={{ transform: `translate(${personDragOffset.x}px, ${personDragOffset.y}px)`, touchAction: 'none' }}
        className={`flex h-9 w-9 cursor-grab items-center justify-center rounded-lg border border-slate-200 bg-white shadow-md transition active:cursor-grabbing ${routeOriginGateId === CUSTOM_ROUTE_ORIGIN_ID ? 'text-[#0f8f83] ring-2 ring-[#0f8f83]/25' : 'text-amber-500'}`}
      ><UserRound className="h-[18px] w-[18px]" strokeWidth={2.4}/></button>
    </div>
  }

  if (variant === 'mobile-settings') {
    return <>
      <div data-testid="mobile-map-settings" className="theme-settings-panel grid gap-3 rounded-2xl border p-3 shadow-sm lg:hidden">
        <button onClick={() => setPositionDialogOpen(true)} data-testid="user-position-toggle" aria-pressed={Boolean(userPosition)} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold ${userPosition ? 'border-[#d43276] bg-[#fff0f6] text-[#b94185]' : 'border-[#efc4d9] text-[#6f2a52]'}`}>
          <MapPin className="h-4 w-4"/><span>{userPosition ? 'Alterar minha posição' : 'Informar minha posição'}</span>
        </button>
        <div className="grid grid-cols-[auto_1fr] items-center gap-3">
          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#98617f]"><Zap className="h-3 w-3 text-[#d43276]"/>Qualidade</span>
          <div className="grid grid-cols-3 rounded-lg border border-[#efc4d9] bg-[#fff7fb] p-0.5 text-[10px] font-bold">{(['auto', 'high', 'eco'] as GraphicsQuality[]).map(q => <button key={q} data-testid={`quality-${q}`} aria-pressed={graphicsQuality === q} onClick={() => setGraphicsQuality(q)} className={`rounded py-1.5 ${graphicsQuality === q ? 'bg-[#d43276] text-white' : 'text-[#98617f]'}`}>{q === 'auto' ? 'Auto' : q === 'high' ? 'Alta' : 'Eco'}</button>)}</div>
        </div>
      </div>
      {positionDialog}
    </>
  }

  return <>
    <div className={`absolute right-4 top-4 z-[60] hidden w-72 max-w-[calc(100%-1rem)] flex-col gap-3 pointer-events-auto lg:flex ${panelOpen ? 'lg:right-[466px]' : 'lg:right-4'}`}>
      <div className="map-control-panel grid grid-cols-3 gap-2 rounded-2xl border p-2 shadow-xl" aria-label="Controles do mapa">
        <button aria-label="Diminuir zoom" onClick={() => handleZoom('out')} className="map-control-button"><ZoomOut className="w-4 h-4" /></button>
        <button aria-label="Aumentar zoom" onClick={() => handleZoom('in')} className="map-control-button"><ZoomIn className="w-4 h-4" /></button>
        <button
          aria-label="Arraste para definir o ponto de partida"
          title="Arraste para definir o ponto de partida"
          onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); dragStartRef.current = { x: event.clientX, y: event.clientY } }}
          onPointerMove={event => { if (dragStartRef.current) setPersonDragOffset({ x: event.clientX - dragStartRef.current.x, y: event.clientY - dragStartRef.current.y }) }}
          onPointerUp={event => { if (!dragStartRef.current) return; const dragged = Math.hypot(event.clientX - dragStartRef.current.x, event.clientY - dragStartRef.current.y) >= 8; if (dragged) (window as any).__mapControls?.setCustomOriginAtClientPoint?.(event.clientX, event.clientY); dragStartRef.current = null; setPersonDragOffset({ x: 0, y: 0 }) }}
          onPointerCancel={() => { dragStartRef.current = null; setPersonDragOffset({ x: 0, y: 0 }) }}
          style={{ transform: `translate(${personDragOffset.x}px, ${personDragOffset.y}px)`, touchAction: 'none' }}
          className={`map-control-button cursor-grab active:cursor-grabbing ${routeOriginGateId === CUSTOM_ROUTE_ORIGIN_ID ? 'is-active' : ''}`}
        ><UserRound className="h-4 w-4"/></button>
      </div>

      <div className="map-control-panel flex flex-col gap-2 rounded-2xl border p-3 shadow-xl">
        <span className="map-control-heading text-[10px] font-black uppercase tracking-wider">Rotas</span>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => focus('focusOrigin')} className="map-control-button text-[10px]">Origem</button>
          <button onClick={() => focus('focusDestination')} className="map-control-button text-[10px]">Destino</button>
        </div>
        <button onClick={handleResetView} className="map-control-action" title="Centralizar mapa"><RotateCcw className="h-4 w-4"/><span>Centralizar</span></button>
        <button
          aria-label="Arraste para definir o ponto de partida"
          onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); dragStartRef.current = { x: event.clientX, y: event.clientY } }}
          onPointerMove={event => { if (dragStartRef.current) setPersonDragOffset({ x: event.clientX - dragStartRef.current.x, y: event.clientY - dragStartRef.current.y }) }}
          onPointerUp={event => { if (!dragStartRef.current) return; const dragged = Math.hypot(event.clientX - dragStartRef.current.x, event.clientY - dragStartRef.current.y) >= 8; if (dragged) (window as any).__mapControls?.setCustomOriginAtClientPoint?.(event.clientX, event.clientY); dragStartRef.current = null; setPersonDragOffset({ x: 0, y: 0 }) }}
          onPointerCancel={() => { dragStartRef.current = null; setPersonDragOffset({ x: 0, y: 0 }) }}
          style={{ transform: `translate(${personDragOffset.x}px, ${personDragOffset.y}px)`, touchAction: 'none' }}
          className="hidden"
        ><UserRound className="h-4 w-4"/><span>Arraste sua posição</span></button>
        <button onClick={() => setPositionDialogOpen(true)} data-testid="user-position-toggle" aria-pressed={Boolean(userPosition)} className={`map-control-action ${userPosition ? 'is-active' : ''}`}>
          <MapPin className="h-4 w-4"/><span>{userPosition ? 'Alterar minha posição' : 'Minha posição'}</span>
        </button>
      </div>

      <div className="map-control-panel flex flex-col gap-2 rounded-2xl border p-3 shadow-xl">
        <div className="flex items-center justify-between"><span className="map-control-heading text-[10px] font-black uppercase tracking-wider">Qualidade do mapa</span><Zap className="h-3.5 w-3.5 text-[#d43276]" /></div>
        <div className="map-quality-options grid grid-cols-3 rounded-xl border p-1 text-[10px] font-bold">
          {(['auto', 'high', 'eco'] as GraphicsQuality[]).map(q => <button key={q} data-testid={`quality-${q}`} aria-pressed={graphicsQuality === q} onClick={() => setGraphicsQuality(q)} className={`rounded py-1 transition-all ${graphicsQuality === q ? 'is-active' : ''}`}>{q === 'auto' ? 'Auto' : q === 'high' ? 'Alta' : 'Eco'}</button>)}
        </div>
      </div>
    </div>
    {positionDialog}
  </>
}
