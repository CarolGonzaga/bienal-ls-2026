import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, BookOpen, Check, Search, Sparkles } from 'lucide-react'
import { usePassportStore } from '../../stores/usePassportStore'
import { useContentStore } from '../../stores/useContentStore'
import { useUserStore } from '../../stores/useUserStore'
import { useExhibitorStore } from '../../stores/useExhibitorStore'
import { supabase } from '../../lib/supabase'
import { LOCAL_PASSPORT_READER_AUTHORS, LOCAL_PASSPORT_READER_BOOKS } from '../../data/localPassportReaderDemo'
import BookShell from './BookShell'
import PageNav from './PageNav'
import ProfilePage from './ProfilePage'
import BooksListPage from './BooksListPage'
import SchedulePage from './SchedulePage'
import HowItWorksPage from './HowItWorksPage'
import StampPage from './StampPage'
import { StampFilter } from './Decor'
import { QrScannerModal } from './QrScannerModal'

type IndexTab = 'authors' | 'stamps'

const normalize = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase()
const chunkSize = 4

export function SapphicPassport() {
  const user = useUserStore(s => s.user)
  const { authors, profiles, stamps, redeemPassportCode, loaded } = usePassportStore()
  const books = useContentStore(s => s.books)
  const events = useContentStore(s => s.events)
  const setActiveTabMode = useExhibitorStore(s => s.setActiveTabMode)
  const localDemo = import.meta.env.DEV && new URLSearchParams(window.location.search).get('passaporteTeste') === '1'
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null)
  const [indexTab, setIndexTab] = useState<IndexTab>('authors')
  const [page, setPage] = useState(0)
  const [spread, setSpread] = useState(0)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [authorSearch, setAuthorSearch] = useState('')
  const [toastMessage, setToastMessage] = useState('')

  const authorList = useMemo(() => localDemo ? LOCAL_PASSPORT_READER_AUTHORS : authors.filter(author => author.active && author.published), [authors, localDemo])
  const currentAuthor = useMemo(() => authorList.find(author => author.id === selectedAuthorId), [authorList, selectedAuthorId])
  const profile = useMemo(() => profiles.find(item => item.author_id === currentAuthor?.id), [profiles, currentAuthor?.id])
  const photo = profile?.photo_path ? (profile.photo_path.startsWith('http') ? profile.photo_path : supabase.storage.from('passport-photos').getPublicUrl(profile.photo_path).data.publicUrl) : ''
  const authorBooks = useMemo(() => {
    if (!currentAuthor) return []
    const source = localDemo ? LOCAL_PASSPORT_READER_BOOKS : books
    const selected = source.filter(book => normalize(book.authorName) === normalize(currentAuthor.name))
    return selected.length ? selected : (localDemo ? LOCAL_PASSPORT_READER_BOOKS.slice(0, 3) : [])
  }, [books, currentAuthor, localDemo])
  const appearances = useMemo(() => {
    if (!currentAuthor) return []
    return events.filter(event => event.active && (event.authorSourceId === currentAuthor.id || normalize(event.speakers?.[0]) === normalize(currentAuthor.name))).sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)).map(event => ({ id: event.id, kind: event.eventType === 'autograph' ? 'autografos' : 'presenca', day_label: event.date ? new Date(`${event.date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }) : 'Data a confirmar', time_range: event.startTime ? `${event.startTime}${event.endTime ? ` – ${event.endTime}` : ''}` : 'Horário a confirmar', stand: event.standCode ? `Estande ${event.standCode}` : 'Estande a confirmar', book_note: event.bookTitle || '', partners: event.locationName ? [event.locationName] : [] }))
  }, [currentAuthor, events])
  const schedulePages = useMemo(() => Array.from({ length: Math.max(1, Math.ceil(appearances.length / chunkSize)) }, (_, index) => appearances.slice(index * chunkSize, (index + 1) * chunkSize)), [appearances])
  const authorData = useMemo(() => currentAuthor ? ({ id: currentAuthor.id, name: currentAuthor.name, photo_url: photo, age: '34', city: 'São Paulo / SP', tagline: 'Autora sáfica', about: profile?.bio || currentAuthor.bio || 'Autora de romances sáficos e histórias sobre encontros, descobertas e coragem.', message: profile?.message || 'Obrigada por ler e por existir. Nos vemos na Bienal!', event_name: 'Bienal do Livro de São Paulo 2026', event_period: '4 e 13 de setembro' }) : null, [currentAuthor, photo, profile])
  const stampData = useMemo(() => {
    if (!currentAuthor) return null
    const stamp = stamps.find(item => item.authorId === currentAuthor.id)
    return { author_name: currentAuthor.name, event_label: 'BIENAL DO LIVRO SP 2026', stand: appearances[0]?.stand || 'Estande G40', date_label: appearances[0]?.day_label || 'Data da presença', is_unlocked: Boolean(stamp), synced_at: stamp?.redeemedAtLocal ? new Date(stamp.redeemedAtLocal).toLocaleString('pt-BR') : '' }
  }, [appearances, currentAuthor, stamps])
  const showToast = (message: string) => { setToastMessage(message); window.setTimeout(() => setToastMessage(''), 3200) }
  const openAuthor = (id: string) => { setSelectedAuthorId(id); setPage(0); setSpread(0) }
  const handleRedeem = async (code: string, source: 'manual' | 'qr' = 'manual') => {
    if (!user) return { ok: false, message: 'Faça login para resgatar carimbos no Passaporte.' }
    if (!currentAuthor || !code.trim()) return { ok: false, message: 'Código inválido.' }
    const result = await redeemPassportCode(user.id, code.trim(), source, currentAuthor.id)
    showToast(result.message || (result.ok ? 'Carimbo resgatado com sucesso! 💜' : 'Não foi possível resgatar.'))
    if (result.ok) { const stampPage = 2 + schedulePages.length; setPage(stampPage); setSpread(Math.floor(stampPage / 2)) }
    return result
  }
  const pages = useMemo(() => {
    if (!authorData || !stampData) return []
    return [
      { label: 'Perfil', node: <ProfilePage author={authorData} /> },
      { label: 'Livros', node: <BooksListPage books={authorBooks} authorName={authorData.name} /> },
      ...schedulePages.map((items, index) => ({ label: schedulePages.length > 1 ? `Programação ${index + 1}` : 'Programação', node: <SchedulePage author={authorData} appearances={items} updates={index === schedulePages.length - 1 ? [{ id: 'event-updates', posted_at: 'Aviso', text: 'Fique de olho! Atualizações podem acontecer até o dia do evento.' }] : []} /> })),
      { label: 'Carimbo', node: <StampPage stamp={stampData} onRedeemCode={handleRedeem} onScanQr={() => setScannerOpen(true)} /> },
      { label: 'Como funciona', node: <HowItWorksPage /> },
    ]
  }, [authorBooks, authorData, schedulePages, stampData])
  const spreads = useMemo(() => Array.from({ length: Math.ceil(pages.length / 2) }, (_, index) => [pages[index * 2], pages[index * 2 + 1]]), [pages])
  const filteredAuthors = useMemo(() => authorList.filter(author => author.name.toLowerCase().includes(authorSearch.toLowerCase())), [authorList, authorSearch])
  const stampedAuthors = useMemo(() => stamps.map(stamp => ({ stamp, author: authorList.find(author => author.id === stamp.authorId) })).filter(item => item.author), [authorList, stamps])

  if (!selectedAuthorId) return <PassportIndex activeTab={indexTab} authorCount={authorList.length} authors={filteredAuthors} stamps={stampedAuthors} search={authorSearch} loading={!loaded && !localDemo} onTabChange={setIndexTab} onSearchChange={setAuthorSearch} onOpenAuthor={openAuthor} onBackToMap={() => setActiveTabMode('map')} />
  if (!currentAuthor || !pages.length) return <PassportEmpty onBack={() => setSelectedAuthorId(null)} />
  const activeSpread = spreads[spread] || spreads[0]
  return <div className="min-h-full bg-gradient-to-b from-[#4A1228] via-[#3A0E20] to-[#260814] px-2 py-4 text-slate-100 sm:px-4 sm:py-8"><StampFilter /><PassportHeader authorName={currentAuthor.name} onBack={() => setSelectedAuthorId(null)} onBackToMap={() => setActiveTabMode('map')} /><main className="mx-auto max-w-[1120px]"><div className="lg:hidden"><BookShell><AnimatePresence mode="wait"><motion.div key={page} className="min-h-[680px]" initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -22 }} transition={{ duration: .25 }}>{pages[page]?.node}</motion.div></AnimatePresence></BookShell><PageNav index={page} count={pages.length} labels={pages.map(item => item.label)} onGo={setPage} onPrev={() => setPage(value => Math.max(0, value - 1))} onNext={() => setPage(value => Math.min(pages.length - 1, value + 1))} /></div><div className="hidden lg:block"><BookShell><AnimatePresence mode="wait"><motion.div key={spread} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .3 }} className="relative grid h-[820px] grid-cols-2"><div className="flex h-full flex-col overflow-hidden border-r border-pink-300/40">{activeSpread?.[0]?.node}</div><div className="flex h-full flex-col overflow-hidden">{activeSpread?.[1]?.node || <PassportBlankPage />}</div><div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-16 -translate-x-1/2" style={{ background: 'linear-gradient(90deg, transparent, rgba(92, 25, 68, .17) 45%, rgba(92, 25, 68, .17) 55%, transparent)' }} /></motion.div></AnimatePresence></BookShell><PageNav index={spread} count={spreads.length} labels={spreads.map(pair => pair.filter(Boolean).map(item => item.label).join(' · '))} onGo={setSpread} onPrev={() => setSpread(value => Math.max(0, value - 1))} onNext={() => setSpread(value => Math.min(spreads.length - 1, value + 1))} /></div></main><QrScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onCode={value => void handleRedeem(value, 'qr')} />{toastMessage && <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl border border-pink-300/40 bg-[#56132f] px-5 py-3 text-sm font-bold text-white shadow-2xl"><Sparkles className="h-4 w-4 text-pink-300" />{toastMessage}</div>}</div>
}

function PassportHeader({ authorName, onBack, onBackToMap }: { authorName: string; onBack: () => void; onBackToMap: () => void }) { return <header className="mx-auto mb-4 flex max-w-[1120px] items-center justify-between gap-3 px-1 text-pink-100 sm:mb-6"><button type="button" onClick={onBackToMap} className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold transition hover:bg-white/20"><ArrowLeft className="h-4 w-4" />Mapa</button><button type="button" onClick={onBack} className="max-w-[60%] truncate text-sm font-black text-pink-100 hover:text-white">{authorName}</button><span className="w-[62px] text-right text-[10px] font-bold uppercase tracking-[.14em] text-pink-200/75">Passaporte</span></header> }
function PassportIndex({ activeTab, authorCount, authors, stamps, search, loading, onTabChange, onSearchChange, onOpenAuthor, onBackToMap }: { activeTab: IndexTab; authorCount: number; authors: any[]; stamps: Array<any>; search: string; loading: boolean; onTabChange: (tab: IndexTab) => void; onSearchChange: (value: string) => void; onOpenAuthor: (id: string) => void; onBackToMap: () => void }) { return <div className="min-h-full bg-gradient-to-b from-[#4A1228] via-[#3A0E20] to-[#260814] px-2 py-4 text-slate-100 sm:px-4 sm:py-8"><StampFilter /><PassportHeader authorName="Meu Passaporte" onBack={() => undefined} onBackToMap={onBackToMap} /><main className="mx-auto max-w-[1120px]"><BookShell><div className="min-h-[700px] lg:min-h-[760px]"><div className="relative flex h-full flex-col overflow-hidden bg-[#F8F0E3] text-slate-800"><div className="pointer-events-none absolute inset-3 rounded-xl border border-dashed border-pink-300/50" /><div className="relative flex flex-1 flex-col px-5 py-6 sm:px-9 sm:py-8"><div className="flex items-center gap-7 border-b border-pink-300/60"><IndexTabButton active={activeTab === 'authors'} onClick={() => onTabChange('authors')}>Autoras</IndexTabButton><IndexTabButton active={activeTab === 'stamps'} onClick={() => onTabChange('stamps')}>Carimbos</IndexTabButton></div><div className="mt-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.16em] text-pink-900">Passaporte Sáfico</p><h1 className="mt-1 text-xl font-black text-slate-800">{activeTab === 'authors' ? 'Autoras da Bienal 2026' : 'Seus carimbos'}</h1></div><div className="rounded-xl border border-pink-200 bg-white/50 px-3 py-2 text-right"><strong className="block text-sm text-pink-800">{authorCount} disponíveis</strong><span className="text-[11px] text-slate-500">{stamps.length} resgatado{stamps.length === 1 ? '' : 's'}</span></div></div>{activeTab === 'authors' ? <><label className="relative mt-5 block max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pink-700" /><input type="search" value={search} onChange={event => onSearchChange(event.target.value)} placeholder="Buscar autora..." className="w-full rounded-xl border border-pink-200 bg-white/60 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-pink-500" /></label><div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{authors.map((author, index) => <AuthorIndexCard key={author.id} author={author} index={index} onClick={() => onOpenAuthor(author.id)} />)}</div>{loading && <p className="mt-6 text-sm text-slate-500">Carregando autoras publicadas…</p>}{!loading && !authors.length && <p className="mt-6 text-sm text-slate-500">Nenhuma autora foi encontrada.</p>}</> : <div className="mt-5 space-y-3">{stamps.length ? stamps.map(({ stamp, author }: any) => <button key={stamp.authorId} type="button" onClick={() => onOpenAuthor(author.id)} className="flex w-full items-center gap-4 rounded-2xl border border-pink-200 bg-white/50 p-4 text-left transition hover:border-pink-400 hover:bg-white/75"><div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-[#59277f] to-[#c53e79] font-display text-xl text-white">{initials(author.name)}</div><div><strong className="block text-sm">{author.name}</strong><span className="mt-1 block text-xs text-pink-800">Carimbo resgatado em {new Date(stamp.redeemedAtLocal).toLocaleDateString('pt-BR')}</span></div><Check className="ml-auto h-5 w-5 text-emerald-600" /></button>) : <p className="rounded-2xl border border-pink-200 bg-white/40 p-5 text-sm text-slate-600">Você ainda não resgatou nenhum carimbo. Visite uma autora para iniciar sua coleção.</p>}</div>}</div></div></div></BookShell></main></div> }
function IndexTabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} className={`border-b-2 px-1 pb-3 text-sm font-black transition ${active ? 'border-pink-800 text-pink-900' : 'border-transparent text-slate-500 hover:text-pink-800'}`}>{children}</button> }
function AuthorIndexCard({ author, index, onClick }: { author: any; index: number; onClick: () => void }) { const palettes = ['from-[#5a277d] to-[#8b4cad]', 'from-[#bd326d] to-[#df5c8b]', 'from-[#1f7778] to-[#4aa6a7]', 'from-[#8b3464] to-[#b65b91]']; return <button type="button" onClick={onClick} className="rounded-2xl border border-pink-200 bg-white/45 p-3 text-center transition hover:-translate-y-0.5 hover:border-pink-400 hover:bg-white/75"><div className={`grid aspect-square place-items-center rounded-xl bg-gradient-to-br ${palettes[index % palettes.length]} font-display text-3xl text-white shadow-sm`}>{initials(author.name)}</div><strong className="mt-3 block truncate text-sm">{author.name}</strong><span className="mt-1 block text-xs font-bold text-pink-800">Ver passaporte</span></button> }
function PassportBlankPage() { return <div className="relative h-full overflow-hidden bg-[#F8F0E3]"><div className="absolute inset-3 rounded-xl border border-dashed border-pink-300/50" /></div> }
function PassportEmpty({ onBack }: { onBack: () => void }) { return <div className="min-h-full bg-[#4A1228] p-8 text-center text-pink-100"><p>Esta autora não está mais disponível no Passaporte.</p><button type="button" onClick={onBack} className="mt-4 rounded-xl bg-white/15 px-4 py-2 text-sm font-bold">Voltar ao índice</button></div> }
function initials(name = '') { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() }

export default SapphicPassport
