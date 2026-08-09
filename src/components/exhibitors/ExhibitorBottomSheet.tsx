import React, { useEffect, useState } from 'react'
import { appPath } from '../../lib/paths'
import { 
  X, 
  MapPin, 
  Sparkles, 
  Heart, 
  CheckCircle2, 
  Bookmark, 
  BookOpen, 
  Calendar, 
  MessageSquarePlus, 
  ExternalLink,
  Share2,
  AlertCircle
} from 'lucide-react'
import { Exhibitor, StandGeometry } from '../../types'
import { useUserStore } from '../../stores/useUserStore'
import { useExhibitorStore } from '../../stores/useExhibitorStore'
import { INITIAL_BOOKS } from '../../data/initialBooks'
import { INITIAL_EVENTS } from '../../data/initialEvents'

interface ExhibitorBottomSheetProps {
  exhibitor: Exhibitor
  geometry?: StandGeometry
  compactList?: boolean
  onClose: () => void
}

const formatStandLocation = (standCode: string) => {
  const match = standCode.toUpperCase().match(/^([A-Z]+)(\d+)$/)
  if (!match) return `Estande ${standCode}`
  return `Estande ${standCode} · Rua ${match[1]}, posição ${Number(match[2])}`
}

export const ExhibitorBottomSheet: React.FC<ExhibitorBottomSheetProps> = ({ exhibitor, geometry, compactList = false, onClose }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'books' | 'events'>('info')
  const [suggestionMessage, setSuggestionMessage] = useState('')
  const [showSuggestionForm, setShowSuggestionForm] = useState(false)
  const [logoFailed, setLogoFailed] = useState(false)

  useEffect(() => setLogoFailed(false), [exhibitor.logo])

  const isFavorite = useUserStore(s => s.isFavorite(exhibitor.id))
  const toggleFavorite = useUserStore(s => s.toggleFavorite)
  
  const isVisited = useUserStore(s => s.isVisited(exhibitor.id))
  const toggleVisited = useUserStore(s => s.toggleVisited)
  
  const isInRoute = useUserStore(s => s.isInRoute(exhibitor.id))
  const addToRoute = useUserStore(s => s.addToRoute)
  const removeFromRoute = useUserStore(s => s.removeFromRoute)

  const relatedBooks = INITIAL_BOOKS.filter(b => b.exhibitorIds.includes(exhibitor.id))
  const relatedEvents = INITIAL_EVENTS.filter(e => e.exhibitorIds.includes(exhibitor.id))

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${exhibitor.name} - Bienal SP 2026`,
        text: `Confira o estande ${exhibitor.standCode} da ${exhibitor.name} no Mapa Sáfico da Bienal!`,
        url: window.location.href
      }).catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Link do estande copiado para a área de transferência!')
    }
  }

  return (
    <>
    <button type="button" aria-label="Fechar detalhes ao tocar fora" onClick={onClose} className="site-modal-backdrop fixed inset-0 z-40 backdrop-blur-[2px] md:hidden"/>
    <div data-testid="exhibitor-bottom-sheet" className="site-modal exhibitor-sheet fixed inset-x-0 bottom-0 z-50 isolate flex max-h-[84dvh] w-full flex-col overflow-hidden rounded-t-[2rem] border-t shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[450px] md:rounded-none md:border-l md:border-t-0">
      <div className="flex h-7 shrink-0 items-center justify-center md:hidden"><span className="h-1 w-12 rounded-full bg-[#b94185]"/></div>

      {compactList && (
        <div className="compact-list-sheet flex flex-col gap-4 px-5 pb-7 pt-1 md:hidden">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-black">{exhibitor.name}</h2>
              <p className="compact-sheet-location mt-1.5 flex items-center gap-1 text-xs font-medium">
                <MapPin className="h-3.5 w-3.5" />
                <span>{formatStandLocation(exhibitor.standCode)}</span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="compact-sheet-code rounded-2xl px-3.5 py-2 text-base font-black">{exhibitor.standCode}</span>
              <button type="button" onClick={onClose} aria-label="Fechar detalhes do estande" className="compact-sheet-close flex h-10 w-10 items-center justify-center rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {geometry?.verified ? (
            <span className="compact-sheet-verified w-fit rounded-full px-3 py-1 text-[10px] font-bold">✓ Verificado pelo LS</span>
          ) : (
            <span className="compact-sheet-pending w-fit rounded-full px-3 py-1 text-[10px] font-bold">Localização pendente</span>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => toggleFavorite(exhibitor.id)} className={`compact-sheet-action ${isFavorite ? 'is-active' : ''}`}>
              <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} /><span>{isFavorite ? 'Salvo' : 'Salvar'}</span>
            </button>
            <button type="button" onClick={() => isInRoute ? removeFromRoute(exhibitor.id) : addToRoute(exhibitor.id, exhibitor.standCode)} className={`compact-sheet-action ${isInRoute ? 'is-active' : ''}`}>
              <Bookmark className={`h-4 w-4 ${isInRoute ? 'fill-current' : ''}`} /><span>{isInRoute ? 'Na rota' : 'Add à rota'}</span>
            </button>
            <button type="button" onClick={() => toggleVisited(exhibitor.id)} className={`compact-sheet-action ${isVisited ? 'is-active' : ''}`}>
              <CheckCircle2 className="h-4 w-4" /><span>{isVisited ? 'Carimbado' : 'Carimbar'}</span>
            </button>
            <button type="button" onClick={() => setShowSuggestionForm(open => !open)} className="compact-sheet-action">
              <AlertCircle className="h-4 w-4" /><span>Corrigir</span>
            </button>
          </div>

          {showSuggestionForm && (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                alert('Obrigado! Sua sugestão foi enviada para moderação.')
                setShowSuggestionForm(false)
                setSuggestionMessage('')
              }}
              className="compact-correction-form flex flex-col gap-2 rounded-2xl border p-3"
            >
              <label htmlFor="compact-correction" className="text-xs font-bold">Qual informação precisa ser corrigida?</label>
              <textarea id="compact-correction" required value={suggestionMessage} onChange={event => setSuggestionMessage(event.target.value)} className="h-20 rounded-xl border p-2 text-xs outline-none focus:ring-2 focus:ring-[#e72878]" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowSuggestionForm(false)} className="rounded-lg px-3 py-1.5 text-xs font-bold">Cancelar</button>
                <button type="submit" className="rounded-lg bg-[#e72878] px-3 py-1.5 text-xs font-bold text-white">Enviar</button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className={`${compactList ? 'hidden md:flex' : 'flex'} min-h-0 flex-1 flex-col`}>
      
      {/* Header */}
      <div className="px-5 pb-4 pt-2 border-b border-slate-800/80 flex items-start justify-between gap-4 md:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#f2bfd8] bg-white p-1.5 shadow-md shadow-[#cf005e]/15">
            {!logoFailed ? (
              <img src={appPath(`/expositores/${exhibitor.logo}`)} alt={`Logo ${exhibitor.name}`} className="max-h-full max-w-full object-contain" onError={() => setLogoFailed(true)}/>
            ) : (
              <span className="font-extrabold text-lg text-[#b94185]">{exhibitor.name.substring(0, 2).toUpperCase()}</span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-[#b94185]/70 bg-[#59163f] px-2.5 py-0.5 text-xs font-bold text-[#fc94c3]">
                {exhibitor.standCode}
              </span>
              {exhibitor.relevanceLevel === 'curadoria_direta' && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#d43276]/70 bg-[#650d3b] px-2 py-0.5 text-[10px] font-bold text-[#ffa6ce]">
                  <Sparkles className="w-3 h-3 text-pink-400" /> Curadoria Direta
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-white mt-1 leading-tight">
              {exhibitor.name}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleShare}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Compartilhar"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            aria-label="Fechar detalhes do estande"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mandatory Notice if Skeelo / Unverified Location per Section 1 & 26 */}
      {!geometry?.verified && (
        <div className="mx-6 mt-4 p-3 rounded-xl bg-amber-950/60 border border-amber-700/60 text-amber-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>Localização exata aguardando confirmação.</span>
        </div>
      )}

      {/* Primary Action Buttons */}
      <div className="px-6 py-4 border-b border-slate-800/80 grid grid-cols-3 gap-2">
        <button
          onClick={() => toggleFavorite(exhibitor.id)}
          className={`py-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
            isFavorite
              ? 'bg-rose-950/80 border-rose-600/60 text-rose-300 shadow-md'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-400 text-rose-400' : ''}`} />
          <span>{isFavorite ? 'Favoritada' : 'Favoritar'}</span>
        </button>

        <button
          onClick={() => toggleVisited(exhibitor.id)}
          className={`py-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
            isVisited
              ? 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300 shadow-md'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <CheckCircle2 className={`w-4 h-4 ${isVisited ? 'text-emerald-400' : ''}`} />
          <span>{isVisited ? 'Visitado' : 'Marcar Visita'}</span>
        </button>

        <button
          onClick={() => isInRoute ? removeFromRoute(exhibitor.id) : addToRoute(exhibitor.id, exhibitor.standCode)}
          className={`py-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
            isInRoute
              ? 'bg-amber-950/80 border-amber-600/60 text-amber-300 shadow-md'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Bookmark className={`w-4 h-4 ${isInRoute ? 'fill-amber-400 text-amber-400' : ''}`} />
          <span>{isInRoute ? 'Na Rota' : 'Add à Rota'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-[#5f2648] px-6">
        <button
          onClick={() => setActiveTab('info')}
          className={`py-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'info'
              ? 'border-[#d43276] text-[#fc94c3]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Sobre a Editora
        </button>

        <button
          onClick={() => setActiveTab('books')}
          className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'books'
              ? 'border-[#d43276] text-[#fc94c3]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Livros ({relatedBooks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'events'
              ? 'border-[#d43276] text-[#fc94c3]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Eventos ({relatedEvents.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {activeTab === 'info' && (
          <>
            {/* Description - Render only if populated per Section 7 */}
            {exhibitor.description && (
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Sobre</h3>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                  {exhibitor.description}
                </p>
              </div>
            )}

            {/* Reason to visit - Render only if populated per Section 7 */}
            {exhibitor.reasonToVisit && (
              <div className="glass-card flex flex-col gap-2 rounded-2xl border border-[#b94185]/50 p-4">
                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#fc94c3]">
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  Por que visitar este estande?
                </h3>
                <p className="text-slate-200 text-sm leading-relaxed">
                  {exhibitor.reasonToVisit}
                </p>
              </div>
            )}

            {/* Categories */}
            {exhibitor.categories.length > 0 && <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Categorias</h3>
              <div className="flex flex-wrap gap-1.5">
                {exhibitor.categories.map((cat, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium">
                    {cat}
                  </span>
                ))}
              </div>
            </div>}

            {/* Suggest Correction Button */}
            <div className="mt-auto pt-4 border-t border-slate-800/80">
              {!showSuggestionForm ? (
                <button
                  onClick={() => setShowSuggestionForm(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-[#fc94c3]"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                  <span>Sugerir uma correção de dados</span>
                </button>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    alert('Obrigado! Sua sugestão foi enviada para moderação.')
                    setShowSuggestionForm(false)
                    setSuggestionMessage('')
                  }}
                  className="flex flex-col gap-2 bg-slate-900/90 p-3 rounded-xl border border-slate-800"
                >
                  <span className="text-xs font-bold text-slate-300">Sugerir Correção</span>
                  <textarea
                    required
                    value={suggestionMessage}
                    onChange={(e) => setSuggestionMessage(e.target.value)}
                    placeholder="Descreva a correção necessária..."
                    className="h-20 w-full rounded-lg border border-[#6f2a52] bg-[#1b0714] p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#d43276]"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSuggestionForm(false)}
                      className="px-3 py-1 rounded-lg bg-slate-800 text-slate-400 text-xs font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-[#d43276] px-3 py-1 text-xs font-medium text-white"
                    >
                      Enviar
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        )}

        {activeTab === 'books' && (
          <div className="flex flex-col gap-4">
            {relatedBooks.length === 0 ? (
              <p className="text-slate-400 text-sm italic">Nenhum livro cadastrado para esta editora ainda.</p>
            ) : (
              relatedBooks.map(book => (
                <div key={book.id} className="glass-card p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">{book.title}</h4>
                    <span className="px-2 py-0.5 rounded bg-pink-950 text-pink-300 text-[10px] font-bold">
                      Sáfico
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">{book.synopsis}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {book.tropes.map((trope, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 text-[10px]">
                        #{trope}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="flex flex-col gap-4">
            {relatedEvents.length === 0 ? (
              <p className="text-slate-400 text-sm italic">Nenhum evento ou autógrafo cadastrado para esta editora ainda.</p>
            ) : (
              relatedEvents.map(evt => (
                <div key={evt.id} className="glass-card p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-indigo-400 font-bold">
                    <span>{evt.startTime} - {evt.endTime}</span>
                    <span>{evt.date}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{evt.title}</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">{evt.description}</p>
                  <span className="text-[11px] text-slate-500">{evt.locationName}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      </div>
    </div>
    </>
  )
}
