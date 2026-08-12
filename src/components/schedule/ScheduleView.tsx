import React, { useMemo, useState } from 'react'
import { BookOpen, Calendar, Heart, MapPin, Plus, Route, X } from 'lucide-react'
import { useContentStore } from '../../stores/useContentStore'
import { useExhibitorStore } from '../../stores/useExhibitorStore'
import { useMapStore } from '../../stores/useMapStore'
import { useAdminMapStore } from '../../stores/useAdminMapStore'
import { useUserStore } from '../../stores/useUserStore'

const formatEventDay = (date: string) => new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'short'
}).format(new Date(`${date}T12:00:00`)).replace('.', '')

export const ScheduleView: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<'all' | 'autograph' | 'presence'>('all')
  const [favoriteEvents, setFavoriteEvents] = useState<Set<string>>(() => new Set())
  const [showSubmitNotice, setShowSubmitNotice] = useState(false)
  const setSelectedStandId = useMapStore(s => s.setSelectedStandId)
  const setSelectedExhibitorId = useExhibitorStore(s => s.setSelectedExhibitorId)
  const setActiveTabMode = useExhibitorStore(s => s.setActiveTabMode)
  const events = useContentStore(s => s.events)
  const exhibitors = useExhibitorStore(s => s.exhibitors)
  const geometries = useAdminMapStore(s => s.geometries)
  const routeStops = useUserStore(s => s.routeStops)
  const addToRoute = useUserStore(s => s.addToRoute)
  const removeFromRoute = useUserStore(s => s.removeFromRoute)

  const eventDays = useMemo(() => [...new Set(events.filter(event => event.active).map(event => event.date))].sort(), [events])
  const groupedEvents = useMemo(() => {
    const visible = events.filter(event => event.active && (selectedDay === 'all' || event.date === selectedDay) && (selectedType === 'all' || event.eventType === selectedType))
    return eventDays
      .filter(day => selectedDay === 'all' || day === selectedDay)
      .map(day => ({ day, events: visible.filter(event => event.date === day).sort((a, b) => a.startTime.localeCompare(b.startTime)) }))
      .filter(group => group.events.length > 0)
  }, [eventDays, events, selectedDay, selectedType])

  const toggleFavorite = (eventId: string) => setFavoriteEvents(current => {
    const next = new Set(current)
    if (next.has(eventId)) next.delete(eventId)
    else next.add(eventId)
    return next
  })

  const handleVerNoMapa = (mapSpaceId?: string, exhibitorIds?: string[]) => {
    if (!mapSpaceId) return
    setSelectedStandId(mapSpaceId)
    if (exhibitorIds?.length) setSelectedExhibitorId(exhibitorIds[0])
    setActiveTabMode('map')
  }

  return (
    <div className="schedule-page mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 sm:py-8">
      <div>
        <h2 className="schedule-title text-xl font-black sm:text-2xl">Agenda de autógrafos</h2>
        <p className="schedule-muted mt-1 text-sm">Sessões cadastradas pela comunidade e editoras</p>
      </div>

      <div className="schedule-filter-row flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar agenda por dia">
        <button type="button" aria-pressed={selectedDay === 'all'} onClick={() => setSelectedDay('all')} className={`schedule-filter-chip ${selectedDay === 'all' ? 'is-active' : ''}`}>Todos os dias</button>
        {eventDays.map(day => <button key={day} type="button" aria-pressed={selectedDay === day} onClick={() => setSelectedDay(day)} className={`schedule-filter-chip ${selectedDay === day ? 'is-active' : ''}`}>{formatEventDay(day)}</button>)}
      </div>

      <div className="schedule-filter-row flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar agenda por tipo">
        <button type="button" aria-pressed={selectedType === 'all'} onClick={() => setSelectedType('all')} className={`schedule-filter-chip ${selectedType === 'all' ? 'is-active' : ''}`}>Todos os eventos</button>
        <button type="button" aria-pressed={selectedType === 'autograph'} onClick={() => setSelectedType('autograph')} className={`schedule-filter-chip ${selectedType === 'autograph' ? 'is-active' : ''}`}>Sessões de autógrafo</button>
        <button type="button" aria-pressed={selectedType === 'presence'} onClick={() => setSelectedType('presence')} className={`schedule-filter-chip ${selectedType === 'presence' ? 'is-active' : ''}`}>Presenças</button>
      </div>

      {showSubmitNotice && (
        <div className="schedule-notice flex items-start justify-between gap-3 rounded-2xl border p-4 text-sm">
          <div><strong>Cadastro de sessão</strong><p className="mt-1 text-xs opacity-75">O envio comunitário será conectado ao novo painel de aprovação.</p></div>
          <button type="button" aria-label="Fechar aviso" onClick={() => setShowSubmitNotice(false)}><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {groupedEvents.map(group => (
          <section key={group.day} className="flex flex-col gap-3">
            <h3 className="schedule-day-heading flex items-center gap-2 text-base font-black">
              <Calendar className="h-5 w-5" />{formatEventDay(group.day)}
            </h3>
            <div className="grid gap-3 lg:grid-cols-2">
              {group.events.map(event => {
                const favorite = favoriteEvents.has(event.id)
                const hour = event.startTime ? event.startTime.split(':')[0] : '--'
                const displayName = event.speakers[0] || event.title
                const standExhibitors = event.standCode ? exhibitors.filter(exhibitor => exhibitor.standCode.toUpperCase() === event.standCode?.toUpperCase()) : []
                const routeExhibitor = standExhibitors[0] || exhibitors.find(exhibitor => event.exhibitorIds.includes(exhibitor.id))
                const geometry = event.standCode ? geometries.find(item => item.standCode.toUpperCase() === event.standCode?.toUpperCase()) : undefined
                const inRoute = Boolean(routeExhibitor && routeStops.some(stop => stop.exhibitorId === routeExhibitor.id))
                const locationLabel = event.standCode
                  ? `${event.standCode}${standExhibitors.length ? ` · ${standExhibitors.map(item => item.name).join(' + ')}` : ''}`
                  : event.locationName
                const timeLabel = event.startTime ? `${event.startTime}${event.endTime ? `–${event.endTime}` : ''}` : 'Sem horário'
                return (
                  <article key={event.id} className="schedule-card grid grid-cols-[60px_minmax(0,1fr)] items-start gap-4 rounded-3xl border p-4 sm:grid-cols-[60px_minmax(0,1fr)_auto]">
                    <div className="schedule-time flex h-[62px] w-[60px] flex-col items-center justify-center rounded-2xl text-white">
                      <strong className="text-xl leading-none">{hour}</strong><span className="mt-1 text-[10px] font-bold">{event.startTime ? 'horas' : 'a definir'}</span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="schedule-title truncate text-base font-black">{displayName}</h4>
                      <div className="mt-1 flex flex-wrap gap-1.5"><span className="rounded-full bg-[#fce7f1] px-2 py-1 text-[10px] font-bold text-[#b52065]">{event.eventType === 'presence' ? 'Presença' : 'Sessão de autógrafo'}</span><span className="rounded-full bg-[#f4edf8] px-2 py-1 text-[10px] font-bold text-[#76516d]">{timeLabel}</span></div>
                      <button type="button" onClick={() => handleVerNoMapa(geometry?.id, event.exhibitorIds)} disabled={!geometry} className="schedule-location mt-2 flex max-w-full items-center gap-1 text-left text-xs font-medium disabled:cursor-default">
                        <MapPin className="h-3.5 w-3.5 shrink-0" /><span>{locationLabel}</span>
                      </button>
                      <p className="schedule-book mt-1 flex items-center gap-1 text-xs"><BookOpen className="h-3.5 w-3.5 shrink-0" /><span>{event.bookTitle || 'Não informado'}</span></p>
                    </div>
                    <div className="col-span-2 flex gap-2 sm:col-span-1 sm:flex-col">
                      <button type="button" aria-label={`${favorite ? 'Remover' : 'Adicionar'} ${event.title} dos favoritos`} aria-pressed={favorite} onClick={() => toggleFavorite(event.id)} className={`schedule-favorite flex h-11 w-11 items-center justify-center rounded-xl ${favorite ? 'is-active' : ''}`}><Heart className={`h-5 w-5 ${favorite ? 'fill-current' : ''}`} /></button>
                      <button type="button" disabled={!routeExhibitor || !geometry} aria-label={inRoute ? 'Remover local da rota' : 'Adicionar local à rota'} onClick={() => routeExhibitor && (inRoute ? removeFromRoute(routeExhibitor.id) : addToRoute(routeExhibitor.id, routeExhibitor.standCode))} className={`schedule-favorite flex h-11 w-11 items-center justify-center rounded-xl disabled:cursor-not-allowed disabled:opacity-35 ${inRoute ? 'is-active' : ''}`}><Route className="h-5 w-5" /></button>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <button type="button" aria-label="Cadastrar sessão de autógrafos" title="Cadastrar sessão" onClick={() => setShowSubmitNotice(true)} className="schedule-floating-action fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full text-white md:bottom-8 md:right-8">
        <Plus className="h-7 w-7" />
      </button>
    </div>
  )
}
