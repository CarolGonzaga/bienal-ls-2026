import React, { useMemo, useState } from 'react'
import { BookOpen, CalendarDays, Check, CircleHelp, MapPin, MessageCircle, Navigation, ScanLine, Search, Stamp } from 'lucide-react'
import { usePassportStore } from '../../stores/usePassportStore'
import { useContentStore } from '../../stores/useContentStore'
import { useUserStore } from '../../stores/useUserStore'
import { useExhibitorStore } from '../../stores/useExhibitorStore'
import { QrScannerModal } from './QrScannerModal'
import { PassportPaper, PassportSeal, PassportTicket } from './PassportArt'
import { supabase } from '../../lib/supabase'

type Page = 'index' | 'profile' | 'agenda' | 'stamp' | 'how'
type Filter = 'all' | 'found' | 'missing'
type PassportLocation = { exhibitor_id?: string; stand_code?: string; date?: string; start_time?: string; end_time?: string; location_text?: string; books?: string[]; guaranteed?: boolean }

const normalizeName = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toLocaleLowerCase('pt-BR')

const formatDay = (date?: string) => date ? new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }) : 'Data a confirmar'
const formatTime = (time?: string) => time ? String(time).slice(0, 5) : 'Horário não informado'

export const SapphicPassport: React.FC = () => {
  const user = useUserStore(s => s.user)
  const addToRoute = useUserStore(s => s.addToRoute)
  const setActiveTabMode = useExhibitorStore(s => s.setActiveTabMode)
  const setSelectedExhibitorId = useExhibitorStore(s => s.setSelectedExhibitorId)
  const { authors, profiles, stamps, redeemPassportCode } = usePassportStore()
  const scheduleEvents = useContentStore(s => s.events)
  const [page, setPage] = useState<Page>('index')
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [manualCode, setManualCode] = useState('')
  const [notice, setNotice] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const passportAuthors = useMemo(() => [...authors, ...stamps.filter(stamp => !authors.some(author => author.id === stamp.authorId)).map(stamp => ({ id: stamp.authorId, slug: stamp.authorSlug || stamp.authorId, name: stamp.authorName || 'Autora arquivada', first_name: '', bio: '', message: '', active: false, published: false }))], [authors, stamps])
  const visible = useMemo(() => passportAuthors.filter(author => {
    const found = stamps.some(stamp => stamp.authorId === author.id)
    return ((author.active && author.published) || found) && author.name.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')) && (filter === 'all' || (filter === 'found' ? found : !found))
  }), [filter, passportAuthors, query, stamps])
  const selected = passportAuthors.find(author => author.id === selectedId) || visible[0]
  const profile = profiles.find(item => item.author_id === selected?.id)
  const found = Boolean(selected && stamps.some(stamp => stamp.authorId === selected.id))
  const selectedStamp = selected ? stamps.find(stamp => stamp.authorId === selected.id) : undefined
  const photoUrl = profile?.photo_path ? (profile.photo_path.startsWith('http') ? profile.photo_path : supabase.storage.from('passport-photos').getPublicUrl(profile.photo_path).data.publicUrl) : ''
  const agenda = useMemo(() => {
    const officialEvents = scheduleEvents
      .filter(event => event.active && (event.authorSourceId === selected?.id || normalizeName(event.speakers[0]) === normalizeName(selected?.name)))
      .map(event => ({
        id: event.id,
        kind: event.eventType,
        date: event.date,
        start_time: event.startTime,
        end_time: event.endTime,
        stand_code: event.standCode,
        exhibitor_id: event.exhibitorIds[0],
        location_text: event.locationName,
        books: event.bookTitle ? event.bookTitle.split(',').map(book => book.trim()) : []
      }))
    const profileEvents = [
      ...(profile?.presences || []).map((item: any) => ({ ...item, kind: 'presence' })),
      ...(profile?.autograph_sessions || []).map((item: any) => ({ ...item, kind: 'autograph' }))
    ]
    const unique = new Map<string, any>()
    for (const item of [...officialEvents, ...profileEvents]) {
      const key = item.id || `${item.kind}:${item.date || ''}:${item.start_time || ''}:${item.stand_code || ''}`
      if (!unique.has(key)) unique.set(key, item)
    }
    return [...unique.values()].sort((a: any, b: any) => `${a.date || ''}${a.start_time || ''}`.localeCompare(`${b.date || ''}${b.start_time || ''}`))
  }, [profile, scheduleEvents, selected?.id, selected?.name])
  const selectAuthor = (id: string) => { setSelectedId(id); setPage('profile'); setNotice('') }
  const showOnMap = (item: PassportLocation) => { if (!item.exhibitor_id) return setNotice('Este local ainda não está vinculado a um estande navegável no mapa.'); setSelectedExhibitorId(item.exhibitor_id); setActiveTabMode('map') }
  const addLocationToRoute = (item: PassportLocation) => { if (!item.exhibitor_id || !item.stand_code) return setNotice('Este local ainda não possui um estande navegável para adicionar à rota.'); addToRoute(item.exhibitor_id, item.stand_code); setNotice('Local adicionado à sua rota.') }
  const redeem = async (source: 'manual' | 'qr', rawCode = manualCode) => { if (!user || !selected) return; const result = await redeemPassportCode(user.id, rawCode, source, selected.id); setNotice(result.message); if (result.ok) { setManualCode(''); setPage('stamp') } }
  const active = (target: Page) => page === target ? ' is-active' : ''
  const pageClass = (target: Page) => page === target ? ' passport-mobile-active' : ''
  const spreadClass = (...pages: Page[]) => pages.includes(page) ? ' passport-desktop-visible' : ''
  const Index = <div className="passport-index"><div className="flex flex-col gap-3 border-b border-[#ebd8dd] pb-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="passport-title text-3xl">Meu Passaporte</h2><p className="mt-1 text-sm text-[#76586b]">{stamps.length} de {passportAuthors.filter(author => author.active && author.published).length} autoras encontradas</p></div><label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8d50a0]"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Pesquisar autora" className="rounded-xl border border-[#e5cad9] bg-white px-3 py-2 pl-9 text-sm"/></label></div><div className="mt-4 flex gap-2">{([['all','Todas'],['found','Encontradas'],['missing','Ainda não encontrei']] as const).map(([id,label]) => <button key={id} onClick={() => setFilter(id)} className={`passport-filter${filter === id ? ' is-active' : ''}`}>{label}</button>)}</div><div className="passport-index-grid mt-5">{visible.map(author => { const authorProfile = profiles.find(item => item.author_id === author.id); const image = authorProfile?.photo_path ? (authorProfile.photo_path.startsWith('http') ? authorProfile.photo_path : supabase.storage.from('passport-photos').getPublicUrl(authorProfile.photo_path).data.publicUrl) : ''; const stamped = stamps.some(stamp => stamp.authorId === author.id); return <button key={author.id} onClick={() => selectAuthor(author.id)} className={`passport-index-card${author.id === selected?.id ? ' is-active' : ''}`}><span className="passport-index-photo">{image ? <img src={image} alt={author.name}/> : author.name[0]}</span><strong className="mt-2 block text-sm">{author.name}</strong><p className="mt-1 text-xs text-[#785b68]">{stamped ? '✓ Carimbo encontrado' : '○ Ainda não encontrei'}</p></button> })}</div>{!visible.length && <p className="py-10 text-center text-sm text-[#795769]">Nenhuma autora encontrada neste filtro.</p>}</div>

  const ProfilePage = <PassportPaper className={`${pageClass('profile')}${spreadClass('profile', 'agenda')}`}><div className="passport-page-content"><div className="flex items-start justify-between gap-3"><PassportTicket className="passport-ticket"/><PassportSeal className="passport-seal"/></div><h2 className="passport-script passport-title mt-3 text-center">{selected?.name}</h2><p className="mt-3 text-center text-sm">Autora sáfica <span className="mx-2 text-[#bd62a8]">•</span> Bienal do Livro 2026</p><div className="passport-profile-grid mt-7"><div>{photoUrl ? <img src={photoUrl} alt={selected?.name} className="passport-photo"/> : <div className="passport-photo-placeholder">{selected?.name[0]}</div>}</div><div><div className="passport-note"><p className="passport-kicker flex items-center gap-2"><BookOpen className="h-5 w-5"/>Sobre a autora</p><p className="mt-3 whitespace-pre-line text-sm leading-6">{profile?.bio || selected?.bio || 'Perfil em preparação.'}</p></div>{profile?.message && <div className="mt-5"><p className="passport-kicker flex items-center gap-2"><MessageCircle className="h-5 w-5"/>Mensagem para você</p><p className="passport-script mt-3 text-lg leading-7">{profile.message}</p></div>}</div></div><div className="mt-7"><p className="passport-kicker flex items-center gap-2"><BookOpen className="h-5 w-5"/>Livros em destaque</p><div className="passport-books mt-4">{(profile?.books || []).slice(0, 3).map((book: any,index: number) => <div key={book.id || index} className="passport-book-card"><div className="passport-book-cover">{typeof book === 'string' ? book : book.title}</div><strong className="mt-3 block text-xs">{typeof book === 'string' ? book : book.title}</strong><p className="mt-2 text-[.65rem]"><span className="passport-check">●</span> À venda</p><p className="text-[.65rem]"><span className="passport-check--lilac">●</span> Autógrafos</p></div>)}</div></div></div></PassportPaper>

  const AgendaPage = <PassportPaper className={`${pageClass('agenda')}${spreadClass('profile', 'agenda')}`}><div className="passport-page-content"><div className="flex items-start justify-between"><div><p className="passport-kicker flex items-center gap-2"><MapPin className="h-5 w-5"/>Onde encontrar a autora</p><h2 className="passport-title mt-3 text-3xl">Agenda na Bienal</h2><p className="mt-3 text-sm">Encontre {selected?.first_name || selected?.name} entre 4 e 13 de setembro de 2026.</p></div><PassportSeal className="passport-seal"/></div><div className="passport-note mt-7 passport-agenda">{agenda.map((item: any,index: number) => <div key={item.id || index} className="passport-agenda-item"><div><p className="font-black"><CalendarDays className="mr-2 inline h-4 w-4"/>{formatDay(item.date)}</p><p className="mt-3 text-base">{formatTime(item.start_time)}{item.end_time ? ` – ${formatTime(item.end_time)}` : ''}</p>{item.kind === 'autograph' && <p className="mt-2">Livro: {(item.books || []).join(', ') || 'não informado'}</p>}</div><div><span className={`passport-badge ${item.kind === 'presence' ? 'passport-badge--presence' : 'passport-badge--autograph'}`}>{item.kind === 'presence' ? 'Presença confirmada' : 'Sessão de autógrafos'}</span><p className="mt-3"><span className="passport-stand">Estande {item.stand_code || 'a confirmar'}</span></p><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => showOnMap(item)} className="passport-action">Ver no mapa</button><button onClick={() => addLocationToRoute(item)} className="passport-action">Adicionar à rota</button></div></div></div>)}{!agenda.length && <p className="p-4 text-center text-sm">Os horários desta autora serão publicados em breve.</p>}</div><div className="passport-note mt-6"><p className="passport-kicker">Atualizações de última hora</p><p className="mt-3 text-sm">Fique de olho: informações podem ser atualizadas até o dia do evento.</p></div></div></PassportPaper>

  const StampPage = <PassportPaper className={`${pageClass('stamp')}${spreadClass('stamp')}`}><div className="passport-page-content passport-stamp-page"><div className="w-full"><PassportSeal title={found ? 'PRESENÇA CONFIRMADA' : 'CARIMBO BLOQUEADO'} name="BIENAL DO LIVRO SP 2026" className="passport-seal--stamp"/><h2 className="mt-5 text-2xl font-black">{found ? `Estande ${agenda[0]?.stand_code || 'Bienal'} — ${selected?.name}` : 'Encontre a autora para receber este carimbo'}</h2><p className="mt-2 text-lg">{found ? 'Presença confirmada' : 'Peça o código presencialmente.'}</p>{found ? <div className="passport-stamp-status mt-8 text-left"><p className="flex items-center gap-3 text-lg font-black"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#d9efc8] text-green-700"><Check className="h-6 w-6"/></span>Carimbo confirmado</p><p className="mt-2 text-sm text-green-700">Sincronizado em {selectedStamp ? new Date(selectedStamp.redeemedAtLocal).toLocaleString('pt-BR') : 'breve'}</p></div> : <div className="passport-stamp-status mt-8"><p className="passport-kicker"><Stamp className="mr-2 inline h-5 w-5"/>Receber carimbo</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={manualCode} onChange={event => setManualCode(event.target.value)} placeholder="Digite a chave da autora" className="min-w-0 flex-1 rounded-xl border border-[#dfbdd0] bg-white/70 px-3 py-3 text-sm uppercase"/><button onClick={() => void redeem('manual')} className="passport-primary">Validar</button><button onClick={() => setScannerOpen(true)} className="passport-action flex items-center justify-center gap-2"><ScanLine className="h-4 w-4"/>Ler QR</button></div></div>}{notice && <p role="status" className="mt-4 rounded-xl bg-[#f8e7ef] p-3 text-sm font-bold text-[#9f3d73]">{notice}</p>}</div></div></PassportPaper>

  const HowPage = <PassportPaper className={`${pageClass('how')}${spreadClass('how')}`}><div className="passport-page-content"><div className="flex justify-between"><PassportTicket className="passport-ticket"/><PassportSeal title="COLECIONE MEMÓRIAS" className="passport-seal"/></div><h2 className="passport-title mt-14 text-center text-4xl">Como funciona<br/>o Passaporte?</h2><div className="passport-how">{[[MapPin,'Vá até o estande da autora'],[MessageCircle,'Peça o código da autora'],[Stamp,'Resgate seu carimbo'],[BookOpen,'Colecione memórias!']].map(([Icon,label]: any) => <div key={label} className="passport-how-step"><span className="passport-how-icon"><Icon className="h-6 w-6"/></span>{label}</div>)}</div></div></PassportPaper>

  return <div className="passport-shell"><div className="passport-index-wrap">{page === 'index' && Index}</div>{page !== 'index' && <div className="passport-book">{ProfilePage}{AgendaPage}{StampPage}{HowPage}</div>}<nav className="passport-thumbbar" aria-label="Páginas do passaporte"><button onClick={() => setPage('index')} className={`passport-thumb${active('index')}`}>Índice</button><button onClick={() => setPage('profile')} className={`passport-thumb${active('profile')}`}>1. Autora</button><button onClick={() => setPage('agenda')} className={`passport-thumb${active('agenda')}`}>2. Presenças</button><button onClick={() => setPage('stamp')} className={`passport-thumb${active('stamp')}`}>3. Carimbo</button><button onClick={() => setPage('how')} className={`passport-thumb${active('how')}`}>4. Como funciona</button></nav><QrScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onCode={value => void redeem('qr', value)}/></div>
}
