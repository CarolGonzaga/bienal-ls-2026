import React, { useMemo, useState } from 'react'
import { AlertCircle, Bookmark, Check, CheckCircle2, ChevronRight, Heart, MapPin, Plus } from 'lucide-react'
import { useExhibitorStore } from '../../stores/useExhibitorStore'
import { useMapStore } from '../../stores/useMapStore'
import { useUserStore } from '../../stores/useUserStore'
import { useAdminMapStore } from '../../stores/useAdminMapStore'
import { INITIAL_EVENTS } from '../../data/initialEvents'
import { SearchBar } from '../search/SearchBar'
import { ExhibitorFilters, type ListFilterMode } from './ExhibitorFilters'

const FEATURED_ORDER = ['amazon', 'editora-rocco', 'intrinseca', 'aditora-aleph']

const normalize = (value: string) => value
  .toLocaleLowerCase('pt-BR')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')

const formatStandLocation = (standCode: string) => {
  const match = standCode.toUpperCase().match(/^([A-Z]+)(\d+)$/)
  if (!match) return `Estande ${standCode}`
  return `Estande ${standCode} · Rua ${match[1]}, posição ${Number(match[2])}`
}

export const ExhibitorList: React.FC = () => {
  const [listMode, setListMode] = useState<ListFilterMode>('all')
  const exhibitors = useExhibitorStore(s => s.exhibitors)
  const searchQuery = useExhibitorStore(s => s.searchQuery)
  const setSelectedExhibitorId = useExhibitorStore(s => s.setSelectedExhibitorId)
  const setActiveTabMode = useExhibitorStore(s => s.setActiveTabMode)
  const setSelectedStandId = useMapStore(s => s.setSelectedStandId)
  const favorites = useUserStore(s => s.favorites)
  const visits = useUserStore(s => s.visits)
  const routeStops = useUserStore(s => s.routeStops)
  const geometries = useAdminMapStore(s => s.geometries)

  const autographExhibitors = useMemo(() => new Set(
    INITIAL_EVENTS
      .filter(event => event.active && (normalize(event.title).includes('autografo') || event.categories.some(category => normalize(category).includes('autografo'))))
      .flatMap(event => event.exhibitorIds)
  ), [])

  const filteredExhibitors = useMemo(() => {
    const query = normalize(searchQuery.trim())

    return exhibitors
      .filter(exhibitor => {
        const independent = exhibitor.categories.some(category => normalize(category).includes('autoras independentes')) || normalize(exhibitor.name).includes('autores independentes')
        if (listMode === 'publishers' && independent) return false
        if (listMode === 'independent' && !independent) return false
        if (listMode === 'autographs' && !autographExhibitors.has(exhibitor.id)) return false
        if (!query) return true

        return [
          exhibitor.name,
          exhibitor.standCode,
          exhibitor.description,
          exhibitor.reasonToVisit,
          ...exhibitor.categories
        ].some(value => normalize(value).includes(query))
      })
      .sort((a, b) => {
        const aPriority = FEATURED_ORDER.indexOf(a.id)
        const bPriority = FEATURED_ORDER.indexOf(b.id)
        if (aPriority !== -1 || bPriority !== -1) {
          if (aPriority === -1) return 1
          if (bPriority === -1) return -1
          return aPriority - bPriority
        }
        return a.name.localeCompare(b.name, 'pt-BR')
      })
  }, [autographExhibitors, exhibitors, listMode, searchQuery])

  const handleSelectExhibitor = (exhibitorId: string) => {
    setSelectedExhibitorId(exhibitorId)
    const geometry = geometries.find(item => item.exhibitorId === exhibitorId && item.verified)
    if (geometry) setSelectedStandId(geometry.id)
  }

  return (
    <div className="list-page flex min-h-full w-full flex-col gap-4 px-3 py-4 sm:px-4 sm:py-6 lg:px-5">
      <div className="lg:hidden"><SearchBar /></div>
      <ExhibitorFilters activeMode={listMode} onChange={setListMode} />

      <div className="sr-only" aria-live="polite">
        Exibindo {filteredExhibitors.length} de {exhibitors.length} espaços
      </div>

      {filteredExhibitors.length === 0 ? (
        <div className="list-empty flex min-h-52 flex-col items-center justify-center gap-2 rounded-3xl border p-8 text-center">
          <AlertCircle className="h-6 w-6" />
          <h2 className="text-base font-black">Nenhum resultado encontrado</h2>
          <p className="text-sm">Tente outro termo ou selecione “Todos”.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredExhibitors.map(exhibitor => {
            const geometry = geometries.find(item => item.exhibitorId === exhibitor.id)
            const isVerified = geometry?.verified === true
            const isFavorite = favorites.includes(exhibitor.id)
            const isVisited = Boolean(visits[exhibitor.id])
            const isInRoute = routeStops.some(stop => stop.exhibitorId === exhibitor.id)

            return (
              <button
                type="button"
                key={exhibitor.id}
                onClick={() => handleSelectExhibitor(exhibitor.id)}
                className="list-card group flex min-h-[122px] w-full flex-col justify-between rounded-3xl border p-4 text-left transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-black">{exhibitor.name}</h3>
                    <p className="list-location mt-1 flex items-center gap-1 text-xs font-medium">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{formatStandLocation(exhibitor.standCode)}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="list-stand-code rounded-xl px-3 py-1.5 text-sm font-black">{exhibitor.standCode}</span>
                    <ChevronRight className="list-chevron h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {exhibitor.categories.slice(0, 2).map(category => (
                    <span key={category} className="list-category rounded-full px-2.5 py-1 text-[10px] font-semibold">{category}</span>
                  ))}
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-3">
                  {isVerified ? (
                    <span className="list-verified inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold">
                      <Check className="h-3 w-3" />Verificado pelo LS
                    </span>
                  ) : (
                    <span className="list-pending inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold">
                      <AlertCircle className="h-3 w-3" />Localização pendente
                    </span>
                  )}
                  <span className="flex items-center gap-2" aria-label="Status pessoal">
                    {isFavorite && <Heart className="h-3.5 w-3.5 fill-current text-[#e72878]" />}
                    {isVisited && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                    {isInRoute && <Bookmark className="h-3.5 w-3.5 fill-current text-[#b94185]" />}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <button
        type="button"
        aria-label="Montar minha rota"
        title="Montar minha rota"
        onClick={() => setActiveTabMode('route')}
        className="list-floating-action fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl md:bottom-8 md:right-8"
      >
        <Plus className="h-7 w-7" />
      </button>
    </div>
  )
}
