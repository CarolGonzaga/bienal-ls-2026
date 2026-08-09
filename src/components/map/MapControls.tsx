import React, { useEffect, useRef, useState } from 'react'
import {
  Crosshair,
  RotateCcw,
  Trash2,
  UserRound,
  Zap,
  ZoomIn,
  ZoomOut
} from 'lucide-react'
import { useMapStore, type GraphicsQuality } from '../../stores/useMapStore'
import { CUSTOM_ROUTE_ORIGIN_ID } from '../../data/map/map-routing-graph.ts'
import { useUserStore } from '../../stores/useUserStore.ts'

type MapControlsVariant = 'desktop' | 'mobile-map' | 'mobile-settings'

export const MapControls: React.FC<{ panelOpen?: boolean; variant?: MapControlsVariant }> = ({ panelOpen = false, variant = 'desktop' }) => {
  const graphicsQuality = useMapStore(s => s.graphicsQuality)
  const setGraphicsQuality = useMapStore(s => s.setGraphicsQuality)
  const userPosition = useMapStore(s => s.userPosition)
  const setUserPosition = useMapStore(s => s.setUserPosition)
  const setIsChoosingUserPosition = useMapStore(s => s.setIsChoosingUserPosition)
  const setIsChoosingRouteOrigin = useMapStore(s => s.setIsChoosingRouteOrigin)
  const routeOriginGateId = useMapStore(s => s.routeOriginGateId)
  const setRouteOriginGateId = useMapStore(s => s.setRouteOriginGateId)
  const clearRoute = useUserStore(s => s.clearRoute)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)
  const lastDragPointRef = useRef<{ x: number; y: number } | null>(null)
  const [personDragOffset, setPersonDragOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const movePerson = (clientX: number, clientY: number) => {
      const start = dragStartRef.current
      if (!start) return
      lastDragPointRef.current = { x: clientX, y: clientY }
      setPersonDragOffset({ x: clientX - start.x, y: clientY - start.y })
    }
    const finishPerson = (clientX: number, clientY: number) => {
      const start = dragStartRef.current
      if (!start) return
      const dragged = Math.hypot(clientX - start.x, clientY - start.y) >= 8
      if (dragged) (window as any).__mapControls?.setCustomOriginAtClientPoint?.(clientX, clientY)
      dragStartRef.current = null
      lastDragPointRef.current = null
      setPersonDragOffset({ x: 0, y: 0 })
    }
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      if (!dragStartRef.current) return
      event.preventDefault()
      movePerson(event.clientX, event.clientY)
    }
    const onPointerUp = (event: PointerEvent) => { if (event.pointerType !== 'touch') finishPerson(event.clientX, event.clientY) }
    const onPointerCancel = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      dragStartRef.current = null; lastDragPointRef.current = null; setPersonDragOffset({ x: 0, y: 0 })
    }
    const onTouchMove = (event: TouchEvent) => {
      if (!dragStartRef.current || !event.touches[0]) return
      event.preventDefault()
      movePerson(event.touches[0].clientX, event.touches[0].clientY)
    }
    const onTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0]
      if (touch) finishPerson(touch.clientX, touch.clientY)
    }
    const onTouchCancel = () => {
      const point = lastDragPointRef.current
      if (point) finishPerson(point.x, point.y)
    }
    const onMouseMove = (event: MouseEvent) => movePerson(event.clientX, event.clientY)
    const onMouseUp = (event: MouseEvent) => finishPerson(event.clientX, event.clientY)

    document.addEventListener('pointermove', onPointerMove, { passive: false })
    document.addEventListener('pointerup', onPointerUp)
    document.addEventListener('pointercancel', onPointerCancel)
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd)
    document.addEventListener('touchcancel', onTouchCancel)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('pointercancel', onPointerCancel)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('touchcancel', onTouchCancel)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const beginPersonDrag = (clientX: number, clientY: number) => {
    dragStartRef.current = { x: clientX, y: clientY }
    lastDragPointRef.current = { x: clientX, y: clientY }
    setPersonDragOffset({ x: 0, y: 0 })
  }

  const handleResetView = () => (window as any).__mapControls?.resetView?.()
  const handleZoom = (direction: 'in' | 'out') => direction === 'in'
    ? (window as any).__mapControls?.zoomIn?.()
    : (window as any).__mapControls?.zoomOut?.()
  const focus = (target: 'focusOrigin' | 'focusDestination') => (window as any).__mapControls?.[target]?.()

  const handleClearRoutes = () => {
    clearRoute()
    setUserPosition(null)
    setRouteOriginGateId('HALL1')
    setIsChoosingRouteOrigin(false)
    setIsChoosingUserPosition(false)
    handleResetView()
  }

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
          if (event.pointerType === 'touch') return
          event.preventDefault()
          event.stopPropagation()
          beginPersonDrag(event.clientX, event.clientY)
        }}
        onTouchStart={event => {
          if (!event.touches[0]) return
          event.preventDefault()
          event.stopPropagation()
          beginPersonDrag(event.touches[0].clientX, event.touches[0].clientY)
        }}
        onMouseDown={event => {
          if ('PointerEvent' in window) return
          event.preventDefault()
          event.stopPropagation()
          beginPersonDrag(event.clientX, event.clientY)
        }}
        onContextMenu={event => event.preventDefault()}
        draggable={false}
        style={{ transform: `translate(${personDragOffset.x}px, ${personDragOffset.y}px)`, touchAction: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', userSelect: 'none' }}
        className={`flex h-9 w-9 cursor-grab items-center justify-center rounded-lg border border-slate-200 bg-white shadow-md transition active:cursor-grabbing ${routeOriginGateId === CUSTOM_ROUTE_ORIGIN_ID ? 'text-[#0f8f83] ring-2 ring-[#0f8f83]/25' : 'text-amber-500'}`}
      ><UserRound className="h-[18px] w-[18px]" strokeWidth={2.4}/></button>
    </div>
  }

  if (variant === 'mobile-settings') {
    return <>
      <div data-testid="mobile-map-settings" className="theme-settings-panel grid gap-3 rounded-2xl border p-3 shadow-sm lg:hidden">
        <button onClick={handleClearRoutes} data-testid="clear-map-routes" className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#efc4d9] px-3 text-xs font-semibold text-[#6f2a52]">
          <Trash2 className="h-4 w-4"/><span>Limpar rotas</span>
        </button>
        <div className="grid grid-cols-[auto_1fr] items-center gap-3">
          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#98617f]"><Zap className="h-3 w-3 text-[#d43276]"/>Qualidade</span>
          <div className="grid grid-cols-3 rounded-lg border border-[#efc4d9] bg-[#fff7fb] p-0.5 text-[10px] font-bold">{(['auto', 'high', 'eco'] as GraphicsQuality[]).map(q => <button key={q} data-testid={`quality-${q}`} aria-pressed={graphicsQuality === q} onClick={() => setGraphicsQuality(q)} className={`rounded py-1.5 ${graphicsQuality === q ? 'bg-[#d43276] text-white' : 'text-[#98617f]'}`}>{q === 'auto' ? 'Auto' : q === 'high' ? 'Alta' : 'Eco'}</button>)}</div>
        </div>
      </div>
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
          onPointerDown={event => { if (event.pointerType === 'touch') return; event.preventDefault(); event.stopPropagation(); beginPersonDrag(event.clientX, event.clientY) }}
          onTouchStart={event => { if (!event.touches[0]) return; event.preventDefault(); event.stopPropagation(); beginPersonDrag(event.touches[0].clientX, event.touches[0].clientY) }}
          onMouseDown={event => { if ('PointerEvent' in window) return; event.preventDefault(); event.stopPropagation(); beginPersonDrag(event.clientX, event.clientY) }}
          onContextMenu={event => event.preventDefault()}
          draggable={false}
          style={{ transform: `translate(${personDragOffset.x}px, ${personDragOffset.y}px)`, touchAction: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', userSelect: 'none' }}
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
        <button onClick={handleClearRoutes} data-testid="clear-map-routes" className="map-control-action">
          <Trash2 className="h-4 w-4"/><span>Limpar rotas</span>
        </button>
      </div>

      <div className="map-control-panel flex flex-col gap-2 rounded-2xl border p-3 shadow-xl">
        <div className="flex items-center justify-between"><span className="map-control-heading text-[10px] font-black uppercase tracking-wider">Qualidade do mapa</span><Zap className="h-3.5 w-3.5 text-[#d43276]" /></div>
        <div className="map-quality-options grid grid-cols-3 rounded-xl border p-1 text-[10px] font-bold">
          {(['auto', 'high', 'eco'] as GraphicsQuality[]).map(q => <button key={q} data-testid={`quality-${q}`} aria-pressed={graphicsQuality === q} onClick={() => setGraphicsQuality(q)} className={`rounded py-1 transition-all ${graphicsQuality === q ? 'is-active' : ''}`}>{q === 'auto' ? 'Auto' : q === 'high' ? 'Alta' : 'Eco'}</button>)}
        </div>
      </div>
    </div>
  </>
}
