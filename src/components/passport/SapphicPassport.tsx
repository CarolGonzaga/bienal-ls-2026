import React, { useMemo, useState } from 'react'
import { BookOpen, CalendarDays, Check, Clipboard, MapPin, MessageCircle, ScanLine, Search, Stamp } from 'lucide-react'
import { usePassportStore } from '../../stores/usePassportStore'
import { useContentStore } from '../../stores/useContentStore'
import { useUserStore } from '../../stores/useUserStore'
import { QrScannerModal } from './QrScannerModal'
import { PassportPaper, PassportSeal, PassportTicket } from './PassportArt'
import { supabase } from '../../lib/supabase'
import { LOCAL_PASSPORT_READER_AUTHORS, LOCAL_PASSPORT_READER_BOOKS } from '../../data/localPassportReaderDemo'

type Page = 'profile' | 'agenda' | 'books' | 'stamp'
type Filter = 'all' | 'found' | 'missing'
const normalize = (v = '') => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase()
const dateLabel = (v?: string) => v ? new Date(`${v}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }) : 'Data a confirmar'
const timeLabel = (start?: string, end?: string) => start ? `${String(start).slice(0, 5)}${end ? ` – ${String(end).slice(0, 5)}` : ''}` : 'Horário a confirmar'

export const SapphicPassport: React.FC = () => {
  const localDemo = import.meta.env.DEV && new URLSearchParams(window.location.search).get('passaporteTeste') === '1'
  const user = useUserStore(s => s.user)
  const { authors, profiles, stamps, redeemPassportCode } = usePassportStore()
  const allBooks = useContentStore(s => s.books)
  const events = useContentStore(s => s.events)
  const [authorId, setAuthorId] = useState<string | null>(null)
  const [page, setPage] = useState<Page>('profile')
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [code, setCode] = useState('')
  const [notice, setNotice] = useState('')
  const [scanner, setScanner] = useState(false)
  const [redeemOpen, setRedeemOpen] = useState(false)

  const authorList = useMemo(() => localDemo ? LOCAL_PASSPORT_READER_AUTHORS : authors.filter(author => author.active && author.published), [authors, localDemo])
  const selected = authorList.find(author => author.id === authorId)
  const profile = profiles.find(item => item.author_id === authorId)
  const stamped = Boolean(authorId && stamps.some(stamp => stamp.authorId === authorId))
  const stamp = authorId ? stamps.find(item => item.authorId === authorId) : undefined
  const photo = profile?.photo_path ? (profile.photo_path.startsWith('http') ? profile.photo_path : supabase.storage.from('passport-photos').getPublicUrl(profile.photo_path).data.publicUrl) : ''
  const visible = authorList.filter(author => {
    const found = stamps.some(stamp => stamp.authorId === author.id)
    return author.name.toLowerCase().includes(query.toLowerCase()) && (filter === 'all' || (filter === 'found' ? found : !found))
  })
  const agenda = useMemo(() => events.filter(event => event.active && selected && (event.authorSourceId === selected.id || normalize(event.speakers[0]) === normalize(selected.name))).sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)), [events, selected])
  const books = useMemo(() => (localDemo ? LOCAL_PASSPORT_READER_BOOKS : allBooks).filter(book => selected && normalize(book.authorName) === normalize(selected.name)).slice(0, 3), [allBooks, localDemo, selected])
  const agendaPages = Math.max(1, Math.ceil(agenda.length / 4))
  const [agendaPage, setAgendaPage] = useState(0)

  const openAuthor = (id: string) => { setAuthorId(id); setPage('profile'); setAgendaPage(0); setNotice('') }
  const redeem = async () => {
    if (!user || !authorId || !code.trim()) return
    const result = await redeemPassportCode(user.id, code, 'manual', authorId)
    setNotice(result.message)
    if (result.ok) { setRedeemOpen(false); setCode(''); setPage('stamp') }
  }
  const pasteCode = async () => {
    try { setCode(await navigator.clipboard.readText()) } catch { setNotice('Não foi possível acessar a área de transferência. Digite o código.') }
  }
  const pageButtons: Array<[Page, string]> = [['profile', '1. Autora'], ['agenda', '2. Presenças'], ['books', '3. Livros'], ['stamp', '4. Carimbo']]

  if (!selected) return <section className="passport-shell"><div className="passport-index"><div className="passport-index-heading"><div><h1 className="passport-title text-3xl">Meu Passaporte</h1><p>{stamps.length} de {authorList.length} carimbos encontrados</p></div><label className="passport-search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar autora"/></label></div><div className="passport-index-tabs"><button className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>Índice</button><button className={filter === 'found' ? 'is-active' : ''} onClick={() => setFilter('found')}>Carimbos</button></div><div className="mt-4 flex gap-2">{([['all', 'Todas'], ['found', 'Encontradas'], ['missing', 'Ainda não encontrei']] as const).map(([id, label]) => <button key={id} onClick={() => setFilter(id)} className={`passport-filter${filter === id ? ' is-active' : ''}`}>{label}</button>)}</div><div className="passport-index-grid mt-5">{visible.map(author => { const authorProfile = profiles.find(item => item.author_id === author.id); const image = authorProfile?.photo_path ? (authorProfile.photo_path.startsWith('http') ? authorProfile.photo_path : supabase.storage.from('passport-photos').getPublicUrl(authorProfile.photo_path).data.publicUrl) : ''; const found = stamps.some(item => item.authorId === author.id); return <button key={author.id} onClick={() => openAuthor(author.id)} className="passport-index-card"><span className="passport-index-photo">{image ? <img src={image} alt={author.name}/> : author.name[0]}</span><strong>{author.name}</strong><small>{found ? '✓ Carimbo encontrado' : '○ Ainda não encontrei'}</small></button> })}</div></div></section>

  const agendaSlice = agenda.slice(agendaPage * 4, agendaPage * 4 + 4)
  return <section className="passport-shell"><header className="passport-reader-header"><button onClick={() => setAuthorId(null)}>← Voltar ao índice</button><strong>{selected.name}</strong><button className="passport-primary" onClick={() => setRedeemOpen(true)}><Stamp size={16}/> Resgatar carimbo</button></header><div className="passport-book passport-book--reader"><PassportPaper className={`passport-reader-page${page === 'profile' ? ' passport-reader-active' : ''}`}><div className="passport-page-content"><div className="flex justify-between"><PassportTicket className="passport-ticket"/><img src="/passaporte/selo-feminista.png" alt="" className="passport-corner-seal"/></div><h1 className="passport-script passport-title mt-3 text-center">{selected.name}</h1><p className="mt-2 text-center text-sm">Autora sáfica <span className="mx-2 text-[#bd62a8]">•</span> Bienal do Livro 2026</p><div className="passport-profile-grid mt-7"><div>{photo ? <img src={photo} alt={selected.name} className="passport-photo"/> : <div className="passport-photo-placeholder">{selected.name[0]}</div>}</div><div><div className="passport-note"><p className="passport-kicker flex items-center gap-2"><BookOpen size={18}/>Sobre a autora</p><p className="mt-3 whitespace-pre-line text-sm leading-6">{profile?.bio || selected.bio || 'Perfil em preparação.'}</p></div>{profile?.message && <div className="mt-5"><p className="passport-kicker flex items-center gap-2"><MessageCircle size={18}/>Mensagem para você</p><p className="passport-script mt-3 text-lg">{profile.message}</p></div>}</div></div></div></PassportPaper><PassportPaper className={`passport-reader-page${page === 'agenda' ? ' passport-reader-active' : ''}`}><div className="passport-page-content"><div className="flex justify-between"><div><p className="passport-kicker flex gap-2"><MapPin size={18}/>Onde encontrar a autora</p><h2 className="passport-title mt-3 text-3xl">Agenda na Bienal</h2></div><img src="/passaporte/selo-feminista.png" alt="" className="passport-corner-seal"/></div><div className="passport-note mt-6 passport-agenda">{agendaSlice.map(event => <article key={event.id} className="passport-agenda-item"><div><strong><CalendarDays size={16}/> {dateLabel(event.date)}</strong><p className="mt-2">{timeLabel(event.startTime, event.endTime)}</p>{event.bookTitle && <p className="mt-2">Livro: {event.bookTitle}</p>}</div><div><span className={`passport-badge ${event.eventType === 'presence' ? 'passport-badge--presence' : 'passport-badge--autograph'}`}>{event.eventType === 'presence' ? 'Presença confirmada' : 'Sessão de autógrafos'}</span><p className="mt-3"><span className="passport-stand">Estande {event.standCode || 'a confirmar'}</span></p><p className="mt-2 text-xs">{event.locationName}</p></div></article>)}{!agenda.length && <p className="p-5 text-center text-sm">A agenda desta autora será publicada em breve.</p>}</div>{agendaPages > 1 && <div className="passport-page-numbers">{Array.from({ length: agendaPages }, (_, index) => <button key={index} onClick={() => setAgendaPage(index)} className={agendaPage === index ? 'is-active' : ''}>{index + 1}</button>)}</div>}</div></PassportPaper><PassportPaper className={`passport-reader-page passport-reader-single${page === 'books' ? ' passport-reader-active' : ''}`}><div className="passport-page-content"><div className="flex justify-between"><PassportTicket className="passport-ticket"/><img src="/passaporte/ondas-correio.png" alt="" className="passport-top-waves"/></div><h2 className="passport-title mt-8 text-3xl">Livros</h2><div className="passport-reader-books">{books.map(book => <article key={book.id} className="passport-reader-book"><div className="passport-book-cover">{book.title}</div><div><h3>{book.title}</h3>{book.publisher && <p>{book.publisher}</p>}<div className="mt-2 flex flex-wrap gap-1">{book.tropes.map(tag => <span key={tag} className="passport-book-tag">{tag}</span>)}</div><p className="mt-3 text-sm leading-6">{book.synopsis}</p></div></article>)}{!books.length && <p className="passport-note mt-8">Os livros desta autora serão publicados em breve.</p>}</div></div></PassportPaper><PassportPaper className={`passport-reader-page passport-reader-single${page === 'stamp' ? ' passport-reader-active' : ''}`}><div className="passport-page-content passport-stamp-page"><div><img src="/passaporte/carimbo-bienal.png" alt="Carimbo do Passaporte Sáfico" className={`passport-stamp-art${stamped ? ' is-unlocked' : ''}`}/><h2 className="passport-title mt-5 text-3xl">{stamped ? 'Carimbo confirmado' : 'Carimbo bloqueado'}</h2><p className="mt-3">{stamped ? `Sincronizado em ${stamp ? new Date(stamp.redeemedAtLocal).toLocaleString('pt-BR') : ''}` : 'Encontre a autora e resgate seu carimbo presencialmente.'}</p>{stamped && <p className="passport-stamp-status mt-7"><Check size={21}/> Uma lembrança da sua jornada literária.</p>}</div></div></PassportPaper></div><nav className="passport-reader-nav" aria-label="Navegação das páginas">{pageButtons.map(([id, label]) => <button key={id} onClick={() => setPage(id)} className={page === id ? 'is-active' : ''}>{label}</button>)}</nav>{redeemOpen && <div className="passport-redeem-backdrop" role="dialog" aria-modal="true" aria-label="Resgatar carimbo"><section className="passport-redeem-modal"><button className="passport-redeem-close" onClick={() => setRedeemOpen(false)}>×</button><Stamp size={28}/><h2>Resgatar carimbo</h2><p>Digite a chave recebida da autora ou escaneie o QR Code.</p><label>Código da autora<div className="passport-code-input"><input value={code} onChange={e => setCode(e.target.value)} placeholder="Ex.: AUTORA-A1B2"/><button onClick={() => void pasteCode()} title="Colar código"><Clipboard size={18}/></button></div></label><div className="mt-4 flex gap-2"><button className="passport-action" onClick={() => setScanner(true)}><ScanLine size={17}/> Escanear QR</button><button className="passport-primary" onClick={() => void redeem()}>Validar</button></div>{notice && <p className="mt-4 text-sm font-bold text-[#9f3d73]">{notice}</p>}</section></div>}<QrScannerModal open={scanner} onClose={() => setScanner(false)} onCode={value => { setCode(value); setScanner(false); setNotice('QR Code lido. Confira o código e toque em Validar.') }}/></section>
}
