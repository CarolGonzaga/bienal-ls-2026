import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useIsMobile } from '../../hooks/use-mobile'
import { passportAsset } from '../../lib/passport-assets'
import { PassportProvider } from '../../lib/passport-store'
import { buildAuthorPreviewPages } from './pages'
import '@fontsource/karla/400.css'
import '@fontsource/karla/500.css'
import '@fontsource/karla/600.css'
import '@fontsource/karla/700.css'
import '@fontsource/nunito-sans/400.css'
import '@fontsource/nunito-sans/600.css'
import '@fontsource/nunito-sans/700.css'
import '@fontsource/parisienne/400.css'
import '@fontsource/tangerine/400.css'
import '@fontsource/tangerine/700.css'
import './passport.css'

const clean = (value, fallback = '') => typeof value === 'string' && value.trim() ? value.trim() : fallback
const normalize = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase()

const dateLabel = value => {
  if (!value) return { weekday: 'Data a confirmar', date: '' }
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return { weekday: 'Data a confirmar', date: value }
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' })
  return {
    weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
  }
}

const timeLabel = (start, end) => start
  ? `${String(start).slice(0, 5)}${end ? ` — ${String(end).slice(0, 5)}` : ''}`
  : 'Horário a confirmar'

const findExhibitor = (exhibitors, row = {}) => exhibitors.find(item => item.id === row.exhibitor_id)
  || exhibitors.find(item => normalize(item.stand_code || item.standCode) === normalize(row.stand_code || row.standCode))

const mapSchedule = (row, kind, exhibitors, fallbackId) => {
  const dateValue = row.date || row.presence_date || row.event_date
  const startValue = String(row.start_time || row.startTime || '').slice(0, 5)
  const date = dateLabel(dateValue)
  const exhibitor = findExhibitor(exhibitors, row)
  const standCode = clean(row.stand_code || row.standCode)
  const related = Array.isArray(row.books) ? row.books.filter(Boolean).join(', ') : clean(row.book_title || row.bookTitle)
  return {
    id: clean(row.id, fallbackId),
    weekday: date.weekday,
    date: date.date,
    time: timeLabel(row.start_time || row.startTime, row.end_time || row.endTime),
    booth: standCode ? `Estande ${standCode}` : clean(row.location_text || row.locationName, 'Local a confirmar'),
    publisher: exhibitor?.name || clean(row.publisher || row.location_text || row.locationName, 'Expositor a confirmar'),
    kind,
    related,
    sortKey: `${dateValue || ''}-${startValue}`,
    dedupeKey: [kind, dateValue, startValue, normalize(row.exhibitor_id || standCode || row.location_text || row.locationName)].join('|'),
  }
}

const buildPreviewCatalog = ({ author, profile, photoUrl, requests, exhibitors, code }) => {
  const safeProfile = profile || {}
  const activeRequests = (requests || []).filter(request => request.status !== 'rejected')
  const displayName = clean(safeProfile.passport_display_name, author?.name || 'Sua Autora')
  const cityValue = clean(safeProfile.passport_city)
  const [city = 'Cidade não informada', state = ''] = cityValue.split('/').map(part => part.trim())
  const saleLocations = Array.isArray(safeProfile.sale_locations) ? safeProfile.sale_locations : []
  const booksByKey = new Map()

  const addBook = (row, id) => {
    if (!row || !clean(row.title)) return
    const sale = saleLocations.find(item => item.book_id === row.id) || row
    const exhibitor = findExhibitor(exhibitors, sale)
    const book = {
      id: clean(row.id, id),
      title: clean(row.title, 'Livro sem título'),
      author: displayName,
      authorId: author?.id,
      cover: clean(row.cover_url || row.coverUrl, passportAsset('logo-ls-watermark.png')),
      genre: clean(row.genre, 'Livro'),
      publisher: clean(row.publisher, exhibitor?.name || 'Editora não informada'),
      synopsis: clean(row.synopsis || row.notes, `Livro de ${displayName}.`),
      booth: clean(sale?.stand_code || sale?.standCode),
      price: clean(row.price),
      autographAvailable: Boolean(row.autograph_available ?? row.autographAvailable),
      onSale: Boolean(row.available_for_sale ?? sale?.available_for_sale),
    }
    booksByKey.set(normalize(book.title), book)
  }

  ;(Array.isArray(safeProfile.books) ? safeProfile.books : []).forEach((row, index) => addBook(row, `profile-book-${index}`))
  activeRequests
    .filter(request => request.request_type === 'book')
    .slice()
    .reverse()
    .forEach(request => addBook(request.payload, request.id))

  const scheduleByKey = new Map()
  const addSchedule = entry => scheduleByKey.set(entry.dedupeKey, entry)
  ;(Array.isArray(safeProfile.presences) ? safeProfile.presences : []).forEach((row, index) => addSchedule(mapSchedule(row, 'presenca', exhibitors, `profile-presence-${index}`)))
  ;(Array.isArray(safeProfile.autograph_sessions) ? safeProfile.autograph_sessions : []).forEach((row, index) => addSchedule(mapSchedule(row, 'autografos', exhibitors, `profile-autograph-${index}`)))
  activeRequests
    .filter(request => request.request_type === 'presence' || request.request_type === 'autograph')
    .slice()
    .reverse()
    .forEach(request => addSchedule(mapSchedule(request.payload || {}, request.request_type === 'autograph' ? 'autografos' : 'presenca', exhibitors, request.id)))

  const previewBooks = [...booksByKey.values()]
  const schedule = [...scheduleByKey.values()]
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(entry => ({
      id: entry.id,
      weekday: entry.weekday,
      date: entry.date,
      time: entry.time,
      booth: entry.booth,
      publisher: entry.publisher,
      kind: entry.kind,
      related: entry.related,
    }))
  const updates = activeRequests
    .filter(request => request.request_type === 'urgent')
    .map(request => ({
      date: clean(request.affected_date || request.created_at?.slice(0, 10), 'Aviso'),
      text: clean(request.payload?.message, 'Atualização enviada pela autora.'),
    }))

  return {
    previewBooks,
    previewAuthor: {
      id: author?.id || 'author-preview',
      name: displayName,
      age: Number(safeProfile.passport_age) || 0,
      city,
      state,
      photo: photoUrl || passportAsset('logo-ls-watermark.png'),
      bio: clean(safeProfile.bio || author?.bio, 'Sua biografia aparecerá aqui.'),
      message: clean(safeProfile.message || author?.message, 'Sua mensagem aparecerá aqui.'),
      code: clean(code),
      books: previewBooks.map(book => book.id),
      schedule,
      updates,
    },
  }
}

const pageLabel = id => {
  if (id.endsWith('-perfil')) return 'Perfil da autora'
  if (id.includes('-livros')) return 'Livros da autora'
  if (id.includes('-programacao')) return 'Onde encontrar a autora'
  if (id.endsWith('-carimbo')) return 'Resgate do carimbo'
  return 'Passaporte Sáfico'
}

function PreviewBook({ author, profile, photoUrl, requests, exhibitors, code, onClose }) {
  const isMobile = useIsMobile()
  const { previewAuthor, previewBooks } = useMemo(
    () => buildPreviewCatalog({ author, profile, photoUrl, requests, exhibitors, code }),
    [author, code, exhibitors, photoUrl, profile, requests],
  )
  const pages = useMemo(
    () => buildAuthorPreviewPages(previewAuthor, previewBooks, { schedulePageSize: isMobile ? 4 : 6 }),
    [isMobile, previewAuthor, previewBooks],
  )
  const [current, setCurrent] = useState(0)
  const touch = useRef(null)
  const step = isMobile ? 1 : 2

  useEffect(() => setCurrent(0), [author?.id])

  const goToIndex = useCallback(index => {
    setCurrent(Math.min(Math.max(index, 0), pages.length - 1))
  }, [pages.length])
  const next = useCallback(() => goToIndex(current + step), [current, goToIndex, step])
  const prev = useCallback(() => goToIndex(current - step), [current, goToIndex, step])

  useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') next()
      if (event.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, onClose, prev])

  const onTouchStart = event => {
    const point = event.touches[0]
    if (point) touch.current = { x: point.clientX, y: point.clientY }
  }
  const onTouchEnd = event => {
    const start = touch.current
    const point = event.changedTouches[0]
    touch.current = null
    if (!start || !point) return
    const dx = point.clientX - start.x
    const dy = point.clientY - start.y
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.45) dx < 0 ? next() : prev()
  }

  const leftIndex = isMobile ? current : current - (current % 2)
  const rightIndex = leftIndex + 1
  const visible = isMobile ? [current] : [leftIndex, rightIndex].filter(index => index < pages.length)

  return (
    <div className="author-preview-shell flex h-full w-full flex-col items-center justify-center gap-3 overflow-hidden px-3 py-4">
      <div className="passport-book-wrap author-preview-book-wrap relative w-full max-w-[min(1120px,94vw)] [perspective:1800px]">
        <button
          type="button"
          onClick={prev}
          disabled={leftIndex === 0}
          aria-label="Página anterior"
          className="absolute left-[-2.7rem] top-1/2 z-50 hidden -translate-y-1/2 rounded-full border border-[oklch(0.85_0.05_30_/_0.5)] bg-[oklch(0.96_0.02_70_/_0.95)] p-3 text-[var(--rose-burnt)] shadow-lg transition enabled:hover:-translate-x-1 enabled:hover:-translate-y-1/2 disabled:opacity-25 md:grid"
        >
          <ChevronLeft aria-hidden className="size-5" />
        </button>
        <button
          type="button"
          onClick={next}
          disabled={rightIndex >= pages.length - 1}
          aria-label="Próxima página"
          className="absolute right-[-2.7rem] top-1/2 z-50 hidden -translate-y-1/2 rounded-full border border-[oklch(0.85_0.05_30_/_0.5)] bg-[oklch(0.96_0.02_70_/_0.95)] p-3 text-[var(--rose-burnt)] shadow-lg transition enabled:hover:translate-x-1 enabled:hover:-translate-y-1/2 disabled:opacity-25 md:grid"
        >
          <ChevronRight aria-hidden className="size-5" />
        </button>

        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="passport-spread passport-spread-open relative grid gap-0 overflow-hidden rounded-[14px] md:grid-cols-2"
        >
          {visible.map((index, position) => {
            const page = pages[index]
            return (
              <section
                key={page.id}
                aria-label={`Página ${index + 1} de ${pages.length}: ${pageLabel(page.id)}`}
                className={`${page.id.endsWith('-carimbo') ? 'paper-surface-pink' : 'paper-surface'} passport-book-page page-enter relative flex h-full min-h-0 flex-col`}
                style={{
                  boxShadow: position === 0 && visible.length > 1
                    ? 'inset -18px 0 26px -22px oklch(0.35 0.06 20 / 0.7)'
                    : visible.length > 1
                      ? 'inset 18px 0 26px -22px oklch(0.35 0.06 20 / 0.7)'
                      : undefined,
                }}
              >
                <div className="passport-page-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain" style={{ touchAction: 'pan-y' }}>
                  {page.render()}
                </div>
                <footer className="flex items-center justify-between px-[clamp(0.9rem,2.4vw,1.9rem)] pb-2 text-[0.55rem] uppercase tracking-[0.26em] text-[var(--ink-soft)]">
                  <span>Passaporte Sáfico</span>
                  <span className="tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                </footer>
              </section>
            )
          })}
          {!isMobile && visible.length > 1 && <div aria-hidden className="passport-book-gutter pointer-events-none absolute inset-y-0 left-1/2 w-[34px] -translate-x-1/2" />}
        </div>
      </div>

      <nav aria-label="Paginação da pré-visualização" className="author-preview-mobile-pagination w-full max-w-[30rem] shrink-0 md:hidden">
        <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2 rounded-2xl border border-white/20 bg-[#4f1730]/70 p-2 shadow-lg backdrop-blur-sm">
          <button type="button" onClick={prev} disabled={current === 0} aria-label="Página anterior" className="grid size-11 place-items-center rounded-full bg-white/90 text-[var(--rose-burnt)] transition active:scale-95 disabled:opacity-25">
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <div className="min-w-0 text-center text-white">
            <p className="truncate text-[0.62rem] font-bold uppercase tracking-[0.15em]">{pageLabel(pages[current]?.id || '')}</p>
            <p aria-live="polite" className="mt-0.5 text-[0.55rem] uppercase tracking-[0.18em] opacity-75">Página {current + 1} de {pages.length}</p>
          </div>
          <button type="button" onClick={next} disabled={current >= pages.length - 1} aria-label="Próxima página" className="grid size-11 place-items-center rounded-full bg-white/90 text-[var(--rose-burnt)] transition active:scale-95 disabled:opacity-25">
            <ChevronRight aria-hidden className="size-5" />
          </button>
        </div>
      </nav>

      <p aria-live="polite" className="hidden text-[0.62rem] uppercase tracking-[0.22em] text-white/75 md:block">
        páginas {String(leftIndex + 1).padStart(2, '0')}–{String(Math.min(rightIndex + 1, pages.length)).padStart(2, '0')} de {pages.length}
      </p>
    </div>
  )
}

export default function AuthorPassportPreview({ author, profile, photoUrl, requests = [], exhibitors = [], code = '', onClose }) {
  const integration = useMemo(() => ({
    userId: `author-preview-${author?.id || 'draft'}`,
    cloudSync: false,
    profile: {
      fullName: '',
      birthDate: '',
      nationality: '',
      birthplace: '',
      issuedAt: new Date().toLocaleDateString('pt-BR'),
      passportCode: 'PRÉVIA',
      serialNumber: 'PRÉVIA',
    },
    stamps: [],
    redeem: async () => ({ ok: false, message: 'Este é apenas o modo de pré-visualização.' }),
  }), [author?.id])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#260d21]/90 p-0 sm:p-3" role="dialog" aria-modal="true" aria-label="Pré-visualização do Passaporte Sáfico">
      <div className="relative h-[100dvh] w-full overflow-hidden sm:h-[min(820px,96dvh)] sm:max-w-[1240px] sm:rounded-2xl sm:shadow-2xl">
        <button type="button" onClick={onClose} aria-label="Fechar pré-visualização" className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[80] grid size-10 place-items-center rounded-full border border-white/25 bg-[#6c1232] text-white shadow-lg transition hover:scale-105 sm:right-4 sm:top-4">
          <X className="size-5" />
        </button>
        <div className="sapphic-passport-v2 author-passport-preview">
          <PassportProvider integration={integration} persistence={false}>
            <PreviewBook author={author} profile={profile} photoUrl={photoUrl} requests={requests} exhibitors={exhibitors} code={code} onClose={onClose} />
          </PassportProvider>
        </div>
      </div>
    </div>,
    document.body,
  )
}
