import React, { useEffect, useMemo, useState } from 'react'
import { BookOpen, MapPin, Search, Sparkles } from 'lucide-react'
import { useContentStore } from '../../stores/useContentStore'
import { useExhibitorStore } from '../../stores/useExhibitorStore'
import { useMapStore } from '../../stores/useMapStore'
import { useAdminMapStore } from '../../stores/useAdminMapStore'
import { appPath } from '../../lib/paths'

const normalize = (value = '') => value
  .toLocaleLowerCase('pt-BR')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')

export const BookShowcase: React.FC = () => {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'bienal' | 'autograph'>('all')
  const books = useContentStore(state => state.books)
  const loadContent = useContentStore(state => state.loadContent)
  const exhibitors = useExhibitorStore(state => state.exhibitors)
  const setActiveTabMode = useExhibitorStore(state => state.setActiveTabMode)
  const setSelectedExhibitorId = useExhibitorStore(state => state.setSelectedExhibitorId)
  const setSelectedStandId = useMapStore(state => state.setSelectedStandId)
  const geometries = useAdminMapStore(state => state.geometries)
  const fallbackCover = appPath('/logo-ls-watermark.png')

  useEffect(() => { void loadContent() }, [loadContent])

  const visibleBooks = useMemo(() => {
    const term = normalize(query.trim())
    return [...books]
      .filter(book => {
        if (filter === 'bienal' && !book.standCode && !book.exhibitorIds.length) return false
        if (filter === 'autograph' && !book.autographAvailable) return false
        if (!term) return true
        return [book.title, book.authorName, book.publisher || '', book.genre || '', book.standCode || '', ...book.tropes]
          .some(value => normalize(value).includes(term))
      })
      .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
  }, [books, filter, query])

  const showOnMap = (book: typeof books[number]) => {
    const exhibitor = exhibitors.find(item => book.exhibitorIds.includes(item.id))
      || exhibitors.find(item => item.standCode.toUpperCase() === book.standCode?.toUpperCase())
    const geometry = geometries.find(item => item.exhibitorId === exhibitor?.id && item.verified)
      || geometries.find(item => item.standCode.toUpperCase() === book.standCode?.toUpperCase() && item.verified)
    if (exhibitor) setSelectedExhibitorId(exhibitor.id)
    if (geometry) setSelectedStandId(geometry.id)
    setActiveTabMode('map')
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4 overflow-y-auto px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:gap-5 sm:px-5 sm:py-7">
      <header className="rounded-3xl border border-[#efbfd6] bg-gradient-to-br from-[#fff8fb] to-[#fce8f2] p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#d43276] text-white shadow-lg shadow-[#d43276]/20">
            <BookOpen className="size-5" />
          </span>
          <div>
            <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[#b94185]">Curadoria colaborativa</p>
            <h1 className="mt-1 text-2xl font-black text-[#56132f] sm:text-3xl">Vitrine de livros da Bienal</h1>
            <p className="mt-1.5 max-w-2xl text-xs leading-5 text-[#805269]">Livros enviados pela comunidade e pelas autoras, revisados antes da publicação. Os títulos disponíveis também aparecem ao adicionar um livro à lista de compras do Passaporte.</p>
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <label className="relative block">
          <span className="sr-only">Pesquisar livros</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#a06382]" />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Pesquisar por livro, autora, editora ou gênero" className="w-full rounded-2xl border border-[#efbfd6] bg-white/90 py-3 pl-11 pr-4 text-sm text-[#56132f] outline-none transition focus:border-[#d43276] focus:ring-2 focus:ring-[#d43276]/15" />
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar livros">
          {([['all', 'Todos'], ['bienal', 'Na Bienal'], ['autograph', 'Com autógrafo']] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-black transition ${filter === value ? 'border-[#d43276] bg-[#d43276] text-white' : 'border-[#efbfd6] bg-white text-[#805269] hover:border-[#d43276]'}`}>{label}</button>
          ))}
        </div>
      </div>

      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#98617f]" aria-live="polite">
        {visibleBooks.length} {visibleBooks.length === 1 ? 'livro encontrado' : 'livros encontrados'}
      </p>

      {visibleBooks.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-[#efbfd6] bg-white/70 p-8 text-center text-[#805269]">
          <BookOpen className="size-8" />
          <h2 className="mt-3 font-black text-[#56132f]">Nenhum livro encontrado</h2>
          <p className="mt-1 text-sm">Tente outra busca ou selecione “Todos”.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visibleBooks.map(book => {
            const exhibitor = exhibitors.find(item => book.exhibitorIds.includes(item.id))
              || exhibitors.find(item => item.standCode.toUpperCase() === book.standCode?.toUpperCase())
            const canLocate = Boolean(book.standCode || exhibitor)
            return (
              <article key={book.id} className="group flex min-w-0 flex-col overflow-hidden rounded-3xl border border-[#efbfd6] bg-white/90 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#b94185]/10">
                <div className="relative aspect-[2/3] overflow-hidden bg-gradient-to-br from-[#f9e6ef] to-[#eadcf2]">
                  <img src={book.coverUrl || fallbackCover} alt={`Capa de ${book.title}`} loading="lazy" onError={event => { const image = event.currentTarget; if (image.src !== new URL(fallbackCover, window.location.origin).href) { image.src = fallbackCover; image.classList.remove('object-cover'); image.classList.add('object-contain', 'p-8', 'opacity-45') } }} className={`size-full ${book.coverUrl ? 'object-cover' : 'object-contain p-8 opacity-45'} transition duration-300 group-hover:scale-[1.03]`} />
                  {book.autographAvailable && <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#d43276] px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white shadow"><Sparkles className="size-3" />Autógrafo</span>}
                </div>
                <div className="flex flex-1 flex-col p-3.5">
                  <h2 className="line-clamp-2 text-sm font-black leading-5 text-[#56132f] sm:text-base">{book.title}</h2>
                  <p className="mt-1 line-clamp-1 text-xs font-bold text-[#b94185]">{book.authorName}</p>
                  <p className="mt-1 line-clamp-1 text-[11px] text-[#805269]">{book.publisher || 'Editora não informada'}</p>
                  {(book.genre || book.tropes.length > 0) && <div className="mt-2 flex flex-wrap gap-1">{[book.genre, ...book.tropes].filter(Boolean).slice(0, 2).map(tag => <span key={tag} className="rounded-full bg-[#f6eaf3] px-2 py-1 text-[9px] font-bold text-[#76516d]">{tag}</span>)}</div>}
                  <div className="mt-auto pt-3">
                    {canLocate ? <button type="button" onClick={() => showOnMap(book)} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#efbfd6] px-2 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-[#9d275c] transition hover:border-[#d43276] hover:bg-[#fff0f6]"><MapPin className="size-3.5" />{book.standCode ? `Estande ${book.standCode}` : 'Ver no mapa'}</button> : <span className="block text-center text-[10px] font-bold text-[#a98496]">Local a confirmar</span>}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default BookShowcase
