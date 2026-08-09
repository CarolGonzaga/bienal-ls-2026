import React, { useMemo } from 'react'
import { Bookmark, MapPin, Trash2, ArrowRight, ArrowUp, ArrowDown, Navigation } from 'lucide-react'
import { useUserStore } from '../../stores/useUserStore'
import { useExhibitorStore } from '../../stores/useExhibitorStore'
import { useMapStore } from '../../stores/useMapStore'
import { useAdminMapStore } from '../../stores/useAdminMapStore'
import { CUSTOM_ROUTE_ORIGIN_ID } from '../../data/map/map-routing-graph.ts'
import { ROUTE_SEGMENT_COLORS } from '../../services/mapRoutingService.ts'

export const RoutePlanner: React.FC = () => {
  const routeStops = useUserStore(s => s.routeStops)
  const removeFromRoute = useUserStore(s => s.removeFromRoute)
  const moveRouteStop = useUserStore(s => s.moveRouteStop)
  const clearRoute = useUserStore(s => s.clearRoute)
  const exhibitors = useExhibitorStore(s => s.exhibitors)
  const setSelectedStandId = useMapStore(s => s.setSelectedStandId)
  const routeOriginGateId = useMapStore(s => s.routeOriginGateId)
  const setRouteOriginGateId = useMapStore(s => s.setRouteOriginGateId)
  const userPosition = useMapStore(s => s.userPosition)
  const setUserPosition = useMapStore(s => s.setUserPosition)
  const setSelectedExhibitorId = useExhibitorStore(s => s.setSelectedExhibitorId)
  const setActiveTabMode = useExhibitorStore(s => s.setActiveTabMode)
  const geometries = useAdminMapStore(s => s.geometries)
  const orderedStops = useMemo(() => [...routeStops].sort((a, b) => a.order - b.order), [routeStops])
  const originLabel = routeOriginGateId === CUSTOM_ROUTE_ORIGIN_ID && userPosition ? 'Personalizado' : 'Entrada Hall 1'

  const showRouteOnMap = () => {
    setActiveTabMode('map')
  }

  const handleClearRoute = () => {
    clearRoute()
    setUserPosition(null)
    setRouteOriginGateId('HALL1')
  }

  const handleOriginChange = (originId: string) => {
    if (originId === CUSTOM_ROUTE_ORIGIN_ID && userPosition) setRouteOriginGateId(CUSTOM_ROUTE_ORIGIN_ID)
    else {
      setUserPosition(null)
      setRouteOriginGateId('HALL1')
    }
  }

  const handleFocusStand = (exhibitorId: string) => {
    setSelectedExhibitorId(exhibitorId)
    const geo = geometries.find(g => g.exhibitorId === exhibitorId && g.verified)
    if (geo) setSelectedStandId(geo.id)
    setActiveTabMode('map')
  }

  return (
    <div className="route-page mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-8 overflow-x-hidden px-4 py-7 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-[#d43276]" />
            <h2 className="route-title text-xl font-bold leading-tight sm:text-2xl">Minha Rota Personalizada</h2>
          </div>
          <p className="route-muted mt-1 text-xs sm:text-sm">Todas as rotas começam na Entrada Hall 1 ou no ponto personalizado marcado pelo ícone de pessoa.</p>
        </div>
        {routeStops.length > 0 && (
          <button onClick={handleClearRoute} className="route-clear-button flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar rota</span>
          </button>
        )}
      </div>

      <div className="route-panel grid min-w-0 gap-5 rounded-3xl border p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_180px] lg:items-end">
        <div className="flex min-w-0 flex-col gap-4">
          <label className="route-origin-label flex min-w-0 flex-col gap-2 text-xs font-bold">
            <span className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4" /> Ponto de partida único</span>
            <select
              aria-label="Origem da rota"
              value={routeOriginGateId}
              onChange={event => handleOriginChange(event.target.value)}
              className="route-origin-select w-full min-w-0 max-w-full rounded-xl border px-4 py-3 text-sm font-semibold outline-none"
            >
              <optgroup label="Entrada principal"><option value="HALL1">Hall 1 · Entrada principal</option></optgroup>
              {userPosition && <optgroup label="Local definido no mapa"><option value={CUSTOM_ROUTE_ORIGIN_ID}>Personalizado</option></optgroup>}
            </select>
          </label>
        </div>
        <button onClick={showRouteOnMap} disabled={routeStops.length === 0} className="route-primary-button min-h-12 w-full min-w-0 rounded-xl px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed">
          Traçar no mapa
        </button>
      </div>

      {routeStops.length === 0 ? (
        <div className="route-panel route-empty flex flex-col items-center gap-3 rounded-3xl border p-12 text-center">
          <Bookmark className="h-10 w-10 text-[#b94185]" />
          <h3 className="route-title text-base font-bold">Sua lista de rota está vazia</h3>
          <p className="route-muted max-w-sm text-xs">Escolha uma editora no mapa ou na busca e adicione-a à rota.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1"><h3 className="route-title text-base font-black">Destinos em ordem</h3><span className="route-muted text-[11px]">Use as setas para reorganizar</span></div>
          {orderedStops.map((stop, idx) => {
            const exhibitor = exhibitors.find(e => e.id === stop.exhibitorId)
            if (!exhibitor) return null
            const fromLabel = idx === 0 ? originLabel : orderedStops[idx - 1].standCode
            const color = ROUTE_SEGMENT_COLORS[idx % ROUTE_SEGMENT_COLORS.length]
            return (
              <div key={stop.exhibitorId} data-route-order={idx + 1} className="route-panel route-stop-card grid min-w-0 grid-cols-[44px_minmax(0,1fr)] items-center gap-x-3 gap-y-4 rounded-3xl border p-5 transition-all sm:grid-cols-[44px_minmax(0,1fr)_auto] sm:gap-x-4 sm:p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-black text-white shadow-md" style={{ backgroundColor: color }}>{idx + 1}</div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 text-[11px] font-bold" style={{ color }}>{fromLabel} → {stop.standCode}</div>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="route-stand-code rounded px-2 py-0.5 text-xs font-bold">{exhibitor.standCode}</span>
                    <h4 className="route-title truncate text-sm font-bold sm:text-base">{exhibitor.name}</h4>
                  </div>
                  {exhibitor.categories.length > 0 && <span className="route-muted mt-1 block break-words text-xs">{exhibitor.categories.join(', ')}</span>}
                </div>
                <div className="col-span-2 flex shrink-0 items-center justify-end gap-2 sm:col-span-1 sm:justify-start">
                  <div className="flex flex-col gap-1">
                    <button disabled={idx === 0} aria-label={`Mover ${stop.standCode} para cima`} onClick={() => moveRouteStop(stop.exhibitorId, 'up')} className="route-icon-button rounded-lg p-1 disabled:opacity-25"><ArrowUp className="h-3.5 w-3.5"/></button>
                    <button disabled={idx === orderedStops.length - 1} aria-label={`Mover ${stop.standCode} para baixo`} onClick={() => moveRouteStop(stop.exhibitorId, 'down')} className="route-icon-button rounded-lg p-1 disabled:opacity-25"><ArrowDown className="h-3.5 w-3.5"/></button>
                  </div>
                  <button onClick={() => handleFocusStand(exhibitor.id)} className="route-soft-button flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all">
                    <span>Ver no mapa</span><ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button aria-label={`Remover ${exhibitor.name} da rota`} onClick={() => removeFromRoute(exhibitor.id)} className="route-remove-button rounded-xl p-2 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
