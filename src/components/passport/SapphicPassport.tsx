import React, { useMemo, useState } from 'react'
import {
  BookOpen,
  Calendar,
  Check,
  Clipboard,
  Compass,
  Eye,
  Heart,
  HelpCircle,
  Lock,
  MapPin,
  MessageCircle,
  MoreVertical,
  QrCode,
  ScanLine,
  Search,
  Share2,
  Stamp,
  X
} from 'lucide-react'
import { usePassportStore } from '../../stores/usePassportStore'
import { useContentStore } from '../../stores/useContentStore'
import { useUserStore } from '../../stores/useUserStore'
import { QrScannerModal } from './QrScannerModal'
import { supabase } from '../../lib/supabase'
import { appPath } from '../../lib/paths'
import { LOCAL_PASSPORT_READER_AUTHORS, LOCAL_PASSPORT_READER_BOOKS } from '../../data/localPassportReaderDemo'

type TabIndex = 'indice' | 'carimbos' | 'como'
type DetailPage = 'profile' | 'agenda' | 'books' | 'stamp'

const normalize = (v = '') => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase()
const dateLabel = (v?: string) => v ? new Date(`${v}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }) : 'A confirmar'
const timeLabel = (start?: string, end?: string) => start ? `${String(start).slice(0, 5)}${end ? ` – ${String(end).slice(0, 5)}` : ''}` : 'A confirmar'
const passportAsset = (name: string) => appPath(`/passaporte/${name}`)

export const SapphicPassport: React.FC = () => {
  const localDemo = import.meta.env.DEV && new URLSearchParams(window.location.search).get('passaporteTeste') === '1'
  const user = useUserStore(s => s.user)
  const { authors, profiles, stamps, redeemPassportCode } = usePassportStore()
  const allBooks = useContentStore(s => s.books)
  const events = useContentStore(s => s.events)

  const [authorId, setAuthorId] = useState<string | null>(null)
  const [indexTab, setIndexTab] = useState<TabIndex>('indice')
  const [detailPage, setDetailPage] = useState<DetailPage>('profile')
  const [agendaPageIndex, setAgendaPageIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [code, setCode] = useState('')
  const [notice, setNotice] = useState('')
  const [scanner, setScanner] = useState(false)
  const [redeemOpen, setRedeemOpen] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [stampAnimating, setStampAnimating] = useState(false)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 3000)
  }

  const authorList = useMemo(() => localDemo ? LOCAL_PASSPORT_READER_AUTHORS : authors.filter(author => author.active && author.published), [authors, localDemo])
  const selected = authorList.find(author => author.id === authorId)
  const profile = profiles.find(item => item.author_id === authorId)
  const isStamped = Boolean(authorId && stamps.some(stamp => stamp.authorId === authorId))
  const stampData = authorId ? stamps.find(item => item.authorId === authorId) : undefined

  const photo = profile?.photo_path
    ? (profile.photo_path.startsWith('http') ? profile.photo_path : supabase.storage.from('passport-photos').getPublicUrl(profile.photo_path).data.publicUrl)
    : ''

  const visibleAuthors = useMemo(() => {
    return authorList.filter(author => author.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [authorList, searchQuery])

  const stampedAuthors = useMemo(() => {
    return authorList.filter(author => stamps.some(item => item.authorId === author.id))
  }, [authorList, stamps])

  const agenda = useMemo(() => {
    return events
      .filter(event => event.active && selected && (event.authorSourceId === selected.id || normalize(event.speakers[0]) === normalize(selected.name)))
      .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
  }, [events, selected])

  const books = useMemo(() => {
    return (localDemo ? LOCAL_PASSPORT_READER_BOOKS : allBooks)
      .filter(book => selected && normalize(book.authorName) === normalize(selected.name))
      .slice(0, 3)
  }, [allBooks, localDemo, selected])

  const openAuthor = (id: string) => {
    setAuthorId(id)
    setDetailPage('profile')
    setAgendaPageIndex(0)
    setNotice('')
    setPopoverOpen(false)
  }

  const handleRedeem = async (customCode?: string) => {
    const codeToUse = customCode || code
    if (!user) {
      setNotice('Faça login para resgatar carimbos no passaporte.')
      return
    }
    if (!authorId || !codeToUse.trim()) return

    const result = await redeemPassportCode(user.id, codeToUse, 'manual', authorId)
    setNotice(result.message)
    if (result.ok) {
      setRedeemOpen(false)
      setCode('')
      setDetailPage('stamp')
      setStampAnimating(true)
      setTimeout(() => setStampAnimating(false), 800)
      showToast(result.message || 'Carimbo resgatado! 💜')
    }
  }

  const pasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setCode(text)
    } catch {
      setNotice('Não foi possível acessar a área de transferência. Digite o código.')
    }
  }

  const agendaPageCount = Math.max(1, Math.ceil(agenda.length / 4))
  const pagedAgenda = agenda.slice(agendaPageIndex * 4, agendaPageIndex * 4 + 4)
  const chips: Array<{ id: string; page: DetailPage; num: number; agendaIndex?: number; label: string }> = [
    { id: 'profile', page: 'profile', num: 1, label: 'Página da autora' },
    ...Array.from({ length: agendaPageCount }, (_, agendaIndex) => ({ id: `agenda-${agendaIndex}`, page: 'agenda' as DetailPage, num: agendaIndex + 2, agendaIndex, label: `Página de presenças ${agendaIndex + 1}` })),
    { id: 'books', page: 'books', num: agendaPageCount + 2, label: 'Página de livros' },
    { id: 'stamp', page: 'stamp', num: agendaPageCount + 3, label: 'Página do carimbo' }
  ]

  return (
    <div className="passport-outer-container">
      <div className="passport-shell">
        {/* TOPBAR */}
        <header className="passport-topbar">
          {selected ? (
            <button className="passport-iconbtn" onClick={() => setAuthorId(null)} aria-label="Voltar para o índice">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          ) : (
            <button className="passport-iconbtn" style={{ visibility: 'hidden' }} aria-hidden="true" />
          )}

          {selected ? (
            <div className="passport-topbar-author">
              <span className="passport-auth-name">{selected.name}</span>
              <span className="passport-auth-sub">Passaporte Sáfico</span>
            </div>
          ) : (
            <h1>Meu Passaporte</h1>
          )}

          <button
            className="passport-iconbtn"
            onClick={() => setPopoverOpen(v => !v)}
            aria-label="Mais informações sobre o passaporte"
            aria-expanded={popoverOpen}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </header>

        {popoverOpen && (
          <div className="passport-popover">
            Colecione carimbos visitando as autoras sáficas na Bienal do Livro SP 2026. Cada carimbo guarda uma memória única da sua jornada literária! 💜
          </div>
        )}

        {/* SCROLLABLE BODY */}
        <div className="passport-scroll-area">
          {!selected ? (
            /* ============ TELA: ÍNDICE / CARIMBOS ============ */
            <div>
              <div className="passport-pill-tabs">
                <button
                  className={indexTab === 'indice' ? 'active' : ''}
                  onClick={() => setIndexTab('indice')}
                >
                  Índice
                </button>
                <button
                  className={indexTab === 'carimbos' ? 'active' : ''}
                  onClick={() => setIndexTab('carimbos')}
                >
                  Carimbos ({stamps.length})
                </button>
                <button
                  className={indexTab === 'como' ? 'active' : ''}
                  onClick={() => setIndexTab('como')}
                >
                  Como Funciona
                </button>
              </div>

              {indexTab === 'indice' && (
                <div className="passport-grid-wrap">
                  <div className="passport-grid-heading">
                    <span>Autoras da Bienal 2026</span>
                    <span className="text-[11px] font-semibold text-purple-700">
                      {stamps.length}/{authorList.length} coletados
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="passport-search">
                      <Search size={15} />
                      <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Buscar autora..."
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="text-xs text-slate-400">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="passport-author-grid">
                    {visibleAuthors.map(author => {
                      const authorProfile = profiles.find(item => item.author_id === author.id)
                      const image = authorProfile?.photo_path
                        ? (authorProfile.photo_path.startsWith('http') ? authorProfile.photo_path : supabase.storage.from('passport-photos').getPublicUrl(authorProfile.photo_path).data.publicUrl)
                        : ''
                      const isUnlocked = stamps.some(item => item.authorId === author.id)

                      return (
                        <div
                          key={author.id}
                          onClick={() => openAuthor(author.id)}
                          className={`passport-author-card ${isUnlocked ? 'unlocked' : 'locked'}`}
                        >
                          <div className={`passport-avatar ${!isUnlocked && !image ? 'locked-avatar' : ''}`}>
                            {image ? (
                              <img src={image} alt={author.name} />
                            ) : (
                              author.name[0]
                            )}
                            {isUnlocked && (
                              <div className="badge">
                                <Check size={11} strokeWidth={3} />
                              </div>
                            )}
                          </div>
                          <span className="name">{author.name}</span>
                          <span className="prog">
                            {isUnlocked ? '✓ Carimbado' : '○ Bloqueado'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {indexTab === 'carimbos' && (
                <div className="passport-grid-wrap">
                  <div className="passport-grid-heading">
                    <span>Seus Carimbos Conquistados</span>
                    <span className="text-[11px] font-semibold text-purple-700">
                      {stamps.length} desbloqueados
                    </span>
                  </div>

                  {stampedAuthors.length > 0 ? (
                    stampedAuthors.map(author => {
                      const authorProfile = profiles.find(item => item.author_id === author.id)
                      const image = authorProfile?.photo_path
                        ? (authorProfile.photo_path.startsWith('http') ? authorProfile.photo_path : supabase.storage.from('passport-photos').getPublicUrl(authorProfile.photo_path).data.publicUrl)
                        : ''
                      const sData = stamps.find(item => item.authorId === author.id)

                      return (
                        <div
                          key={author.id}
                          onClick={() => openAuthor(author.id)}
                          className="passport-stamp-row"
                        >
                          <div className="mini-avatar">
                            {image ? <img src={image} alt={author.name} /> : author.name[0]}
                          </div>
                          <div className="info flex-1">
                            <b>{author.name}</b>
                            <span>
                              Carimbado {sData?.redeemedAtLocal ? `em ${new Date(sData.redeemedAtLocal).toLocaleDateString('pt-BR')}` : 'na Bienal'}
                            </span>
                          </div>
                          <Stamp size={20} className="text-[#d94e86]" />
                        </div>
                      )
                    })
                  ) : (
                    <div className="passport-empty-state">
                      <div className="glyph">📖</div>
                      <p>
                        Você ainda não resgatou nenhum carimbo.<br />
                        Visite as autoras nos estandes e digite ou escaneie o código fornecido para colecionar memórias!
                      </p>
                    </div>
                  )}
                </div>
              )}

              {indexTab === 'como' && (
                <div className="passport-card mx-4 my-2">
                  <div className="passport-corner-row">
                    <div className="passport-corner-stamp-left">
                      <img src={passportAsset('selo1.png')} alt="Passaporte Sáfico Bienal 2026" />
                    </div>
                    <img src={passportAsset('selo3.png')} alt="" className="passport-anchor-stamp-img" />
                  </div>

                  <div className="text-center my-4">
                    <h2 className="passport-como-title flex items-center justify-center gap-2">
                      <span>COMO FUNCIONA O PASSAPORTE?</span>
                      <Heart className="passport-heart-icon" />
                    </h2>
                  </div>

                  <div className="passport-steps-list my-6">
                    <div className="passport-step-row">
                      <div className="passport-step-icon">
                        <MapPin size={20} />
                      </div>
                      <p>Vá até a estande da autora</p>
                    </div>
                    <div className="passport-step-row">
                      <div className="passport-step-icon">
                        <MessageCircle size={20} />
                      </div>
                      <p>Peça o código da autora</p>
                    </div>
                    <div className="passport-step-row">
                      <div className="passport-step-icon">
                        <Stamp size={20} />
                      </div>
                      <p>Resgate seu carimbo</p>
                    </div>
                    <div className="passport-step-row">
                      <div className="passport-step-icon">
                        <BookOpen size={20} />
                      </div>
                      <p>Colecione memórias!</p>
                    </div>
                  </div>

                  <img src={passportAsset('saopaulo.png')} alt="" className="passport-page-foot-skyline" />
                  <img src={passportAsset('selo2.png')} alt="" className="passport-foot-postmark-stamp" />
                </div>
              )}
            </div>
          ) : (
            /* ============ TELA: DETALHES DA AUTORA ============ */
            <div>
              <div className="passport-chip-row">
                {chips.map(chip => (
                  <button
                    key={chip.id}
                    onClick={() => { setDetailPage(chip.page); if (typeof chip.agendaIndex === 'number') setAgendaPageIndex(chip.agendaIndex) }}
                    className={`passport-chip ${detailPage === chip.page && (chip.page !== 'agenda' || chip.agendaIndex === agendaPageIndex) ? 'active' : ''}`}
                    aria-label={chip.label}
                    title={chip.label}
                  >
                    <span className="num">{chip.num}</span>
                  </button>
                ))}
              </div>

              <DesktopPassportBook page={detailPage} author={selected} profile={profile} photo={photo} books={books} agenda={pagedAgenda} stamped={isStamped} code={code} setCode={setCode} notice={notice} onRedeem={() => void handleRedeem()} onScan={() => setScanner(true)} onPaste={() => void pasteCode()} />

              <div className="passport-page-container passport-mobile-details">
                {/* 1. ABA PERFIL DA AUTORA */}
                {detailPage === 'profile' && (
                  <div className="passport-card">
                    <div className="passport-corner-row">
                      <div className="passport-corner-stamp-left">
                        <img src={passportAsset('selo1.png')} alt="Passaporte Sáfico Bienal 2026" />
                      </div>
                      <img src={passportAsset('selo3.png')} alt="" className="passport-anchor-stamp-img" />
                    </div>

                    <div className="passport-header-title-block">
                      <h2 className="passport-script-name">
                        {selected.name}
                        <Heart className="passport-heart-icon" />
                      </h2>
                      <div className="passport-meta-line">
                        <span>Autora sáfica</span>
                        <span className="dot">•</span>
                        <span>Bienal do Livro SP 2026</span>
                      </div>
                    </div>

                    <div className="passport-profile-layout">
                      <div className="passport-photo-square">
                        {photo ? (
                          <img src={photo} alt={selected.name} />
                        ) : (
                          <span className="init">{selected.name[0]}</span>
                        )}
                      </div>

                      <div className="passport-profile-texts">
                        <div className="passport-text-section">
                          <h4>
                            <BookOpen size={15} />
                            <span>Sobre a Autora</span>
                          </h4>
                          <p className="whitespace-pre-line">
                            {profile?.bio || selected.bio || 'Lívia escreve histórias sobre amor, descobertas e coragem. Seus romances sáficos celebram personagens reais em jornadas reais.'}
                          </p>
                        </div>

                        <div className="passport-text-section quote-section">
                          <h4>
                            <Heart size={15} className="text-[#b3306a]" />
                            <span>Mensagem para você</span>
                          </h4>
                          <p>
                            {profile?.message ? `"${profile.message}"` : 'Obrigada por ler e por existir. Nos vemos na Bienal! 💜'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* LIVROS EM DESTAQUE NA PÁGINA DA AUTORA */}
                    <div className="passport-section-divider-title">
                      <BookOpen size={16} />
                      <span>Livros em Destaque</span>
                    </div>

                    <div className="passport-books-grid">
                      {books.length > 0 ? (
                        books.map((book, idx) => (
                          <div key={book.id} className="passport-book-3d-card">
                            <div className={`passport-book-spine-cover palette-${(idx % 3) + 1}`}>
                              <span>{book.title}</span>
                            </div>
                            <div className="passport-book-details">
                              <span className="title">{book.title}</span>
                              <span className="genre">{book.genre || 'Romance'}</span>
                              <div className="passport-book-tags-list">
                                <span className="passport-tag-pill green">
                                  <Check size={9} strokeWidth={3} /> À venda
                                </span>
                                <span className="passport-tag-pill purple">
                                  <Check size={9} strokeWidth={3} /> Autógrafos
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="col-span-3 text-center text-xs text-[#76586b] py-2">
                          Livros em preparação para a Bienal.
                        </p>
                      )}
                    </div>

                    {/* SÃO PAULO FOOTER & SELO 2 NO RODAPÉ */}
                    <img src={passportAsset('saopaulo.png')} alt="" className="passport-page-foot-skyline" />
                    <img src={passportAsset('selo2.png')} alt="" className="passport-foot-postmark-stamp" />
                  </div>
                )}

                {/* 2. ABA AGENDA / PRESENÇAS */}
                {detailPage === 'agenda' && (
                  <div className="passport-card">
                    <div className="passport-corner-row">
                      <div className="passport-schedule-header-group">
                        <h3>
                          <MapPin size={16} />
                          <span>Onde encontrar a autora</span>
                        </h3>
                        <p>
                          {selected.name} estará na Bienal do Livro de São Paulo entre os dias 4 e 13 de setembro de 2026.
                        </p>
                      </div>
                      <img src={passportAsset('selo3.png')} alt="" className="passport-anchor-stamp-img" />
                    </div>

                    <div className="passport-agenda-box-frame">
                      {agenda.length > 0 ? (
                        pagedAgenda.map(event => (
                          <div key={event.id} className="passport-sched-row">
                            <div className="passport-sched-left">
                              <Calendar size={17} />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="passport-sched-day-name">{dateLabel(event.date)}</span>
                                  <span className={`passport-badge-custom ${event.eventType === 'presence' ? 'green' : 'purple'}`}>
                                    {event.eventType === 'presence' ? 'Presença confirmada' : 'Sessão de autógrafos'}
                                  </span>
                                </div>
                                <div className="passport-sched-hours">
                                  {timeLabel(event.startTime, event.endTime)}
                                </div>
                                {event.bookTitle && (
                                  <div className="passport-sched-book-name">
                                    Livro: {event.bookTitle}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="passport-sched-right">
                              <span className="passport-stand-bubble">
                                Estande {event.standCode || 'G40'}
                              </span>
                              <span className="passport-stand-publisher">
                                {event.locationName || 'Editora parceira'}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-4 text-center text-xs text-[#76586b]">
                          A programação oficial desta autora será divulgada em breve.
                        </div>
                      )}
                    </div>

                    {/* ATUALIZAÇÕES DE ÚLTIMA HORA */}
                    <div className="passport-meaning-box mt-2">
                      <h4>
                        <MessageCircle size={15} />
                        <span>Atualizações de última hora</span>
                      </h4>
                      <p>Fique de olho! Atualizações podem acontecer até o dia do evento.</p>
                      <p className="font-bold text-[#4A1B6D]">
                        Confirmado autógrafo e presença nos estandes principais! 💜
                      </p>
                    </div>

                    <img src={passportAsset('saopaulo.png')} alt="" className="passport-page-foot-skyline" />
                    <img src={passportAsset('selo2.png')} alt="" className="passport-foot-postmark-stamp" />
                  </div>
                )}

                {/* 3. ABA LIVROS */}
                {detailPage === 'books' && (
                  <div className="passport-card">
                    <div className="passport-corner-row">
                      <div className="passport-corner-stamp-left">
                        <img src={passportAsset('selo1.png')} alt="Passaporte Sáfico Bienal 2026" />
                      </div>
                      <img src={passportAsset('selo3.png')} alt="" className="passport-anchor-stamp-img" />
                    </div>

                    <div className="passport-header-title-block">
                      <h2 className="passport-script-name">
                        {selected.name}
                        <Heart className="passport-heart-icon" />
                      </h2>
                      <div className="passport-meta-line">
                        <span>Autora sáfica</span>
                        <span className="dot">•</span>
                        <span>Bienal do Livro SP 2026</span>
                      </div>
                    </div>

                    <div className="passport-section-divider-title">
                      <BookOpen size={16} />
                      <span>Livros em Destaque</span>
                    </div>

                    <div className="passport-books-grid">
                      {books.length > 0 ? (
                        books.map((book, idx) => (
                          <div key={book.id} className="passport-book-3d-card">
                            <div className={`passport-book-spine-cover palette-${(idx % 3) + 1}`}>
                              <span>{book.title}</span>
                            </div>
                            <div className="passport-book-details">
                              <span className="title">{book.title}</span>
                              <span className="genre">{book.genre || 'Romance'}</span>
                              <div className="passport-book-tags-list">
                                <span className="passport-tag-pill green">
                                  <Check size={9} strokeWidth={3} /> À venda
                                </span>
                                <span className="passport-tag-pill purple">
                                  <Check size={9} strokeWidth={3} /> Autógrafos
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="col-span-3 text-center text-xs text-[#76586b] py-6">
                          Os livros cadastrados desta autora serão exibidos aqui.
                        </p>
                      )}
                    </div>

                    <img src={passportAsset('saopaulo.png')} alt="" className="passport-page-foot-skyline" />
                    <img src={passportAsset('selo2.png')} alt="" className="passport-foot-postmark-stamp" />
                  </div>
                )}

                {/* 4. ABA CARIMBO / RESGATE */}
                {detailPage === 'stamp' && (
                  <div className="passport-card">
                    <div className="passport-corner-row">
                      <div className="passport-corner-stamp-left">
                        <img src={passportAsset('selo1.png')} alt="Passaporte Sáfico Bienal 2026" />
                      </div>
                      <img src={passportAsset('selo3.png')} alt="" className="passport-anchor-stamp-img" />
                    </div>

                    {/* CARIMBO OFICIAL CENTRAL */}
                    <div className={`passport-stamp-main-circle ${!isStamped ? 'locked' : ''} ${stampAnimating ? 'stamping' : ''}`}>
                      <PresenceStamp authorName={selected.name} unlocked={isStamped} />
                    </div>

                    <div className="passport-stamp-caption-title">
                      Estande {agenda[0]?.standCode || 'G40'} — Bienal SP 2026
                    </div>
                    <div className="passport-stamp-caption-sub">
                      Presença confirmada
                    </div>

                    {isStamped ? (
                      <>
                        <div className="passport-status-pill-green">
                          <div className="check-round">
                            <Check size={14} strokeWidth={3} />
                          </div>
                          <div>
                            <b className="text-xs text-[#1e8e4f] block">Carimbo confirmado</b>
                            <span className="text-[11px] text-[#2e6e48]">
                              Sincronizado em {stampData?.redeemedAtLocal ? new Date(stampData.redeemedAtLocal).toLocaleString('pt-BR') : 'Bienal 2026'}
                            </span>
                          </div>
                        </div>

                        <div className="passport-meaning-box">
                          <h4>
                            <BookOpen size={15} />
                            <span>O que significa esse carimbo?</span>
                          </h4>
                          <p>
                            Este carimbo confirma que {selected.name} esteve presente na Bienal do Livro de São Paulo.
                            Ele representa momentos, conexões e histórias que fazem parte da sua jornada literária.
                          </p>
                          <p className="cursive-quote">
                            Colecione memórias, celebre encontros e continue escrevendo sua história. 💜
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="passport-redeem-container">
                        <p className="hint">
                          Recebeu a chave de {selected.name} no estande? Digite abaixo para validar seu carimbo:
                        </p>
                        <input
                          type="text"
                          className="passport-code-custom-input"
                          placeholder="EX.: AUTORA-K7MV-4QTX"
                          value={code}
                          onChange={e => setCode(e.target.value)}
                        />
                        <button
                          className="passport-btn-primary"
                          onClick={() => void handleRedeem()}
                          disabled={!code.trim()}
                        >
                          <Stamp size={17} /> Validar Carimbo
                        </button>

                        <div className="mt-3 flex justify-center gap-4">
                          <button
                            onClick={() => setScanner(true)}
                            className="flex items-center gap-1.5 text-xs font-bold text-[#4A1B6D] hover:underline"
                          >
                            <ScanLine size={15} /> Escanear QR Code
                          </button>
                          <button
                            onClick={() => void pasteCode()}
                            className="flex items-center gap-1.5 text-xs font-bold text-[#4A1B6D] hover:underline"
                          >
                            <Clipboard size={15} /> Colar da área de transferência
                          </button>
                        </div>

                        {notice && (
                          <div className="passport-info-box mt-3 text-center">
                            <p className="text-xs font-bold text-[#B3306A]">{notice}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <img src={passportAsset('saopaulo.png')} alt="" className="passport-page-foot-skyline" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TOAST FLUTUANTE */}
      <div className={`passport-toast ${toastVisible ? 'show' : ''}`}>
        {toastMessage}
      </div>

      {/* MODAL SCANNER QR CODE */}
      <QrScannerModal
        open={scanner}
        onClose={() => setScanner(false)}
        onCode={value => {
          setCode(value)
          setScanner(false)
          void handleRedeem(value)
        }}
      />
    </div>
  )
}

function PresenceStamp({ authorName, unlocked }: { authorName: string; unlocked: boolean }) {
  return <div className={`passport-presence-stamp ${unlocked ? 'is-unlocked' : ''}`} aria-label={unlocked ? 'Carimbo de presença confirmado' : 'Carimbo de presença bloqueado'}>
    <div className="passport-presence-stamp__inner">
      <strong>PRESENÇA CONFIRMADA</strong>
      <span className="passport-presence-stamp__stars">✦ · ♥ · ✦</span>
      <em>{authorName}</em>
      <BookOpen aria-hidden="true" />
      <small>BIENAL DO LIVRO SP 2026</small>
    </div>
  </div>
}

function DesktopPassportBook({ page, author, profile, photo, books, agenda, stamped, code, setCode, notice, onRedeem, onScan, onPaste }: { page: DetailPage; author: any; profile: any; photo: string; books: any[]; agenda: any[]; stamped: boolean; code: string; setCode: React.Dispatch<React.SetStateAction<string>>; notice: string; onRedeem: () => void; onScan: () => void; onPaste: () => void }) {
  const profilePage = <section className="passport-desktop-page passport-desktop-page--left"><div className="passport-desktop-page-border"/><div className="flex items-start justify-between"><img src={passportAsset('selo1.png')} alt="" className="passport-desktop-ticket"/><img src={passportAsset('selo3.png')} alt="" className="passport-desktop-corner-seal"/></div><h2 className="passport-desktop-name">{author.name}<Heart/></h2><p className="passport-desktop-meta">Autora sáfica <span>•</span> Bienal do Livro SP 2026</p><div className="passport-desktop-profile"><div className="passport-desktop-photo">{photo ? <img src={photo} alt={author.name}/> : author.name[0]}</div><div><p className="passport-desktop-kicker"><BookOpen size={15}/>Sobre a autora</p><p className="passport-desktop-copy">{profile?.bio || author.bio || 'Perfil em preparação para a Bienal.'}</p><p className="passport-desktop-kicker mt-3"><Heart size={15}/>Mensagem para você</p><p className="passport-desktop-message">{profile?.message || 'Nos vemos na Bienal!'}</p></div></div><p className="passport-desktop-kicker mt-4"><BookOpen size={15}/>Livros em destaque</p><DesktopBooks books={books}/><img src={passportAsset('saopaulo.png')} alt="" className="passport-desktop-skyline"/><img src={passportAsset('selo2.png')} alt="" className="passport-desktop-footer-seal"/></section>
  const agendaPage = <section className="passport-desktop-page passport-desktop-page--right"><div className="passport-desktop-page-border"/><div className="flex items-start justify-between"><div><p className="passport-desktop-kicker"><MapPin size={15}/>Onde encontrar a autora</p><p className="passport-desktop-copy mt-2">{author.name} estará na Bienal do Livro de São Paulo entre os dias 4 e 13 de setembro de 2026.</p></div><img src={passportAsset('selo3.png')} alt="" className="passport-desktop-corner-seal"/></div><div className="passport-desktop-agenda">{agenda.length ? agenda.map(event => <article key={event.id}><div><strong><Calendar size={14}/>{dateLabel(event.date)}</strong><p>{timeLabel(event.startTime, event.endTime)}</p>{event.bookTitle && <p>Livro: {event.bookTitle}</p>}</div><div><span className={event.eventType === 'presence' ? 'is-presence' : ''}>{event.eventType === 'presence' ? 'Presença confirmada' : 'Sessão de autógrafos'}</span><p>Estande {event.standCode || 'a confirmar'}</p><small>{event.locationName || ''}</small></div></article>) : <p className="passport-desktop-empty">A agenda desta autora será publicada em breve.</p>}</div><div className="passport-desktop-update"><p className="passport-desktop-kicker"><MessageCircle size={15}/>Atualizações de última hora</p><p>Fique de olho: atualizações aprovadas pela equipe aparecerão aqui.</p></div><img src={passportAsset('saopaulo.png')} alt="" className="passport-desktop-skyline"/><img src={passportAsset('ondas.png')} alt="" className="passport-desktop-waves"/></section>
  const booksPage = <section className="passport-desktop-page passport-desktop-page--left"><div className="passport-desktop-page-border"/><div className="flex items-start justify-between"><img src={passportAsset('selo1.png')} alt="" className="passport-desktop-ticket"/><img src={passportAsset('selo3.png')} alt="" className="passport-desktop-corner-seal"/></div><h2 className="passport-desktop-name">{author.name}</h2><p className="passport-desktop-meta">Livros em destaque</p><DesktopBooks books={books} expanded/><img src={passportAsset('saopaulo.png')} alt="" className="passport-desktop-skyline"/></section>
  const stampPage = <section className="passport-desktop-page passport-desktop-page--left passport-desktop-stamp"><div className="passport-desktop-page-border"/><img src={passportAsset('selo1.png')} alt="" className="passport-desktop-ticket"/><PresenceStamp authorName={author.name} unlocked={stamped}/><h2>{stamped ? 'Carimbo confirmado' : 'Resgate seu carimbo'}</h2><p>{stamped ? 'Esta memória já faz parte da sua jornada.' : 'Digite ou escaneie o código entregue pela autora.'}</p>{!stamped && <div className="passport-desktop-redeem"><input value={code} onChange={event => setCode(event.target.value)} placeholder="EX.: AUTORA-K7MV-4QTX"/><button onClick={onRedeem} disabled={!code.trim()}><Stamp size={15}/> Validar carimbo</button><div><button type="button" onClick={onScan}><ScanLine size={14}/> Escanear QR</button><button type="button" onClick={onPaste}><Clipboard size={14}/> Colar código</button></div>{notice && <small>{notice}</small>}</div>}<img src={passportAsset('saopaulo.png')} alt="" className="passport-desktop-skyline"/></section>
  const howPage = <section className="passport-desktop-page passport-desktop-page--right passport-desktop-how"><div className="passport-desktop-page-border"/><img src={passportAsset('selo3.png')} alt="" className="passport-desktop-corner-seal"/><h2 className="passport-desktop-how-title">Como funciona o Passaporte?</h2><ol className="passport-desktop-how-list"><li>Vá até o estande da autora.</li><li>Peça o código ou escaneie o QR Code.</li><li>Resgate seu carimbo.</li><li>Colecione memórias!</li></ol><img src={passportAsset('saopaulo.png')} alt="" className="passport-desktop-skyline"/><img src={passportAsset('ondas.png')} alt="" className="passport-desktop-waves"/></section>
  return <div className="passport-desktop-book">{page === 'books' ? <>{booksPage}{agendaPage}</> : page === 'stamp' ? <>{stampPage}{howPage}</> : <>{profilePage}{agendaPage}</>}</div>
}

function DesktopBooks({ books, expanded = false }: { books: any[]; expanded?: boolean }) {
  return <div className={`passport-desktop-books${expanded ? ' is-expanded' : ''}`}>{books.length ? books.map((book, index) => <article key={book.id}><div className={`passport-desktop-cover palette-${(index % 3) + 1}`}>{book.coverUrl ? <img src={book.coverUrl} alt={`Capa de ${book.title}`}/> : <span>{book.title}</span>}</div><strong>{book.title}</strong><small>{book.genre || 'Romance'}</small><em>{book.autographAvailable ? '✓ Autógrafos' : '✓ À venda'}</em></article>) : <p className="col-span-3 text-center text-sm">Livros em preparação para a Bienal.</p>}</div>
}
