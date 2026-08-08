import React, { useMemo, useState } from 'react'
import { BookOpen, Calendar, Heart, MapPin, Plus, X } from 'lucide-react'
import { INITIAL_EVENTS } from '../../data/initialEvents'
import { useExhibitorStore } from '../../stores/useExhibitorStore'
import { useMapStore } from '../../stores/useMapStore'

const formatEventDay = (date: string) => new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'short'
}).format(new Date(`${date}T12:00:00`)).replace('.', '')

export const ScheduleView: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<string>('all')
  const [favoriteEvents, setFavoriteEvents] = useState<Set<string>>(() => new Set())
  const [showSubmitNotice, setShowSubmitNotice] = useState(false)
  const setSelectedStandId = useMapStore(s => s.setSelectedStandId)
  const setSelectedExhibitorId = useExhibitorStore(s => s.setSelectedExhibitorId)
  const setActiveTabMode = useExhibitorStore(s => s.setActiveTabMode)

  const eventDays = useMemo(() => [...new Set(INITIAL_EVENTS.filter(event => event.active).map(event => event.date))].sort(), [])
  const groupedEvents = useMemo(() => {
    const visible = INITIAL_EVENTS.filter(event => event.active && (selectedDay === 'all' || event.date === selectedDay))
    return eventDays
      .filter(day => selectedDay === 'all' || day === selectedDay)
      .map(day => ({ day, events: visible.filter(event => event.date === day).sort((a, b) => a.startTime.localeCompare(b.startTime)) }))
      .filter(group => group.events.length > 0)
  }, [eventDays, selectedDay])

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
                const hour = event.startTime.split(':')[0]
                const displayName = event.speakers[0] || event.title
                return (
                  <article key={event.id} className="schedule-card grid grid-cols-[60px_minmax(0,1fr)_44px] items-center gap-4 rounded-3xl border p-4">
                    <div className="schedule-time flex h-[62px] w-[60px] flex-col items-center justify-center rounded-2xl text-white">
                      <strong className="text-xl leading-none">{hour}</strong><span className="mt-1 text-[10px] font-bold">horas</span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="schedule-title truncate text-base font-black">{displayName}</h4>
                      <button type="button" onClick={() => handleVerNoMapa(event.mapSpaceId, event.exhibitorIds)} disabled={!event.mapSpaceId} className="schedule-location mt-0.5 flex max-w-full items-center gap-1 truncate text-left text-xs font-medium disabled:cursor-default">
                        <MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{event.locationName}</span>
                      </button>
                      <p className="schedule-book mt-1 flex items-center gap-1 truncate text-xs"><BookOpen className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{event.title}</span></p>
                    </div>
                    <button type="button" aria-label={`${favorite ? 'Remover' : 'Adicionar'} ${event.title} dos favoritos`} aria-pressed={favorite} onClick={() => toggleFavorite(event.id)} className={`schedule-favorite flex h-11 w-11 items-center justify-center rounded-xl ${favorite ? 'is-active' : ''}`}>
                      <Heart className={`h-5 w-5 ${favorite ? 'fill-current' : ''}`} />
                    </button>
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
