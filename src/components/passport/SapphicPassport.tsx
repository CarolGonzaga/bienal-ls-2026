import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Search, Stamp as StampIcon, Sparkles, Check, Heart, BookOpen, Users } from 'lucide-react'
import { usePassportStore } from '../../stores/usePassportStore'
import { useContentStore } from '../../stores/useContentStore'
import { useUserStore } from '../../stores/useUserStore'
import { supabase } from '../../lib/supabase'
import { appPath } from '../../lib/paths'
import { LOCAL_PASSPORT_READER_AUTHORS, LOCAL_PASSPORT_READER_BOOKS } from '../../data/localPassportReaderDemo'

import BookShell from './BookShell'
import PageNav from './PageNav'
import ProfilePage from './ProfilePage'
import SchedulePage from './SchedulePage'
import HowItWorksPage from './HowItWorksPage'
import StampPage from './StampPage'
import { StampFilter } from './Decor'
import { QrScannerModal } from './QrScannerModal'

const normalize = (value = '') => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]/gi, '')
  .toLowerCase()

export function SapphicPassport() {
  const user = useUserStore((s) => s.user)
  const { authors, profiles, stamps, redeemPassportCode, loaded } = usePassportStore()
  const allBooks = useContentStore((s) => s.books)
  const events = useContentStore((s) => s.events)

  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [spread, setSpread] = useState(0)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [authorSearch, setAuthorSearch] = useState('')
  const [authorDrawerOpen, setAuthorDrawerOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)

  const localDemo = import.meta.env.DEV && new URLSearchParams(window.location.search).get('passaporteTeste') === '1'

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 3200)
  }

  // Lista de autoras disponíveis
  const authorList = useMemo(() => {
    if (localDemo) return LOCAL_PASSPORT_READER_AUTHORS
    return authors.filter((a) => a.active && a.published)
  }, [authors, localDemo])

  // Autora atualmente selecionada (padrão primeira autora)
  const activeAuthorId = selectedAuthorId || authorList[0]?.id || ''
  const currentAuthor = useMemo(() => {
    return authorList.find((a) => a.id === activeAuthorId) || authorList[0]
  }, [authorList, activeAuthorId])

  // Perfil da autora
  const currentProfile = useMemo(() => {
    return profiles.find((p) => p.author_id === currentAuthor?.id)
  }, [profiles, currentAuthor?.id])

  // Foto da autora
  const photoUrl = useMemo(() => {
    if (currentProfile?.photo_path) {
      return currentProfile.photo_path.startsWith('http')
        ? currentProfile.photo_path
        : supabase.storage.from('passport-photos').getPublicUrl(currentProfile.photo_path).data.publicUrl
    }
    return ''
  }, [currentProfile?.photo_path])

  // Livros da autora
  const authorBooks = useMemo(() => {
    const sourceBooks = localDemo ? LOCAL_PASSPORT_READER_BOOKS : allBooks
    if (!currentAuthor) return []
    const authorNorm = normalize(currentAuthor.name)
    const matches = sourceBooks.filter((b) => normalize(b.authorName) === authorNorm)
    return matches.length ? matches : (localDemo ? LOCAL_PASSPORT_READER_BOOKS.slice(0, 3) : [])
  }, [allBooks, currentAuthor, localDemo])

  // Agenda da autora
  const authorAppearances = useMemo(() => {
    if (!currentAuthor) return []
    const authorNorm = normalize(currentAuthor.name)
    const foundEvents = events.filter(
      (e) =>
        e.active &&
        (e.authorSourceId === currentAuthor.id || normalize(e.speakers?.[0]) === authorNorm)
    )

    if (foundEvents.length) {
      return foundEvents.map((e) => ({
        id: e.id,
        kind: e.eventType === 'autograph' ? 'autografos' : 'presenca',
        day_label: e.date ? new Date(`${e.date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }) : 'Data a confirmar',
        time_range: e.startTime ? `${e.startTime}${e.endTime ? ` – ${e.endTime}` : ''}` : 'Horário a confirmar',
        stand: e.standCode ? `Estande ${e.standCode}` : 'Estande a confirmar',
        book_note: e.bookTitle || '',
        partners: e.locationName ? [e.locationName] : [],
      }))
    }

    // Fallback padrão representativo para demo
    return [
      {
        id: 'demo-app-1',
        kind: 'presenca',
        day_label: 'Sábado, 05 de setembro',
        time_range: '14:00 – 16:00',
        stand: 'Estande G40',
        book_note: authorBooks[0]?.title || '',
        partners: ['Editora Aurora'],
      },
      {
        id: 'demo-app-2',
        kind: 'autografos',
        day_label: 'Domingo, 06 de setembro',
        time_range: '15:00 – 17:00',
        stand: 'Estande G40',
        book_note: authorBooks[0]?.title || '',
        partners: ['Sessão Oficial'],
      },
    ]
  }, [authorBooks, currentAuthor, events])

  // Atualizações de última hora da autora
  const authorUpdates = useMemo(() => {
    return [
      {
        id: 'up-1',
        text: 'Presença confirmada no estande G40 com marcadores exclusivos!',
        posted_at: 'Confirmado',
      },
    ]
  }, [])

  // Carimbo da autora para o usuário
  const stampData = useMemo(() => {
    if (!currentAuthor) return null
    const userStamp = stamps.find((s) => s.authorId === currentAuthor.id)
    return {
      author_name: currentAuthor.name,
      event_label: 'BIENAL DO LIVRO SP 2026',
      stand: authorAppearances[0]?.stand || 'Estande G40',
      date_label: authorAppearances[0]?.day_label || '06 de Setembro de 2026',
      status: userStamp ? 'Presença confirmada' : 'Aguardando validação',
      synced_at: userStamp?.redeemedAtLocal
        ? new Date(userStamp.redeemedAtLocal).toLocaleString('pt-BR')
        : userStamp
        ? 'Presença confirmada'
        : '',
      is_unlocked: Boolean(userStamp),
    }
  }, [authorAppearances, currentAuthor, stamps])

  // Total de carimbos desbloqueados
  const unlockedCount = stamps.length

  const handleRedeemCode = async (codeToUse: string) => {
    if (!user) {
      showToast('Faça login para resgatar carimbos no Passaporte.')
      return { ok: false, message: 'Faça login para resgatar carimbos.' }
    }
    if (!currentAuthor || !codeToUse.trim()) {
      return { ok: false, message: 'Código inválido.' }
    }

    const result = await redeemPassportCode(user.id, codeToUse.trim(), 'manual', currentAuthor.id)
    showToast(result.message || (result.ok ? 'Carimbo resgatado com sucesso! 💜' : 'Não foi possível resgatar.'))
    if (result.ok) {
      setPage(3)
      setSpread(1)
    }
    return result
  }

  const handleScanSuccess = async (qrValue: string) => {
    setScannerOpen(false)
    await handleRedeemCode(qrValue)
  }

  // Autor preparado para os componentes de página
  const authorData = useMemo(() => {
    if (!currentAuthor) return null
    return {
      id: currentAuthor.id,
      name: currentAuthor.name,
      photo_url: photoUrl,
      age: '34',
      city: 'São Paulo / SP',
      tagline: 'Autora sáfica',
      about: currentProfile?.bio || currentAuthor.bio || 'Autora de romances sáficos e histórias sobre encontros, descobertas e coragem.',
      message: currentProfile?.message || 'Obrigada por ler e por existir. Nos vemos na Bienal!',
      event_name: 'Bienal do Livro de São Paulo 2026',
      event_period: '4 e 13 de setembro',
    }
  }, [currentAuthor, currentProfile, photoUrl])

  // Páginas do passaporte
  const pages = useMemo(() => {
    if (!authorData) return []
    return [
      <ProfilePage key="profile" author={authorData} books={authorBooks} />,
      <SchedulePage key="schedule" author={authorData} appearances={authorAppearances} updates={authorUpdates} />,
      <HowItWorksPage key="how" />,
      <StampPage
        key="stamp"
        stamp={stampData}
        onRedeemCode={handleRedeemCode}
        onScanQr={() => setScannerOpen(true)}
      />,
    ]
  }, [authorAppearances, authorBooks, authorData, authorUpdates, stampData])

  const labels = ['Passaporte', 'Presenças', 'Como funciona', 'Carimbo']
  const spreads = [
    [0, 1],
    [2, 3],
  ]

  const filteredAuthors = useMemo(() => {
    return authorList.filter((a) => a.name.toLowerCase().includes(authorSearch.toLowerCase()))
  }, [authorList, authorSearch])

  if (!currentAuthor) {
    return (
      <div className="min-h-full w-full bg-gradient-to-b from-[#4A1228] via-[#3A0E20] to-[#260814] px-4 py-12 text-center text-pink-100">
        <BookOpen className="mx-auto h-8 w-8 text-pink-300" />
        <h1 className="mt-4 text-lg font-black">Passaporte Sáfico</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-pink-100/80">
          {loaded ? 'Ainda não há páginas publicadas no Passaporte.' : 'Carregando as páginas do Passaporte…'}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#4A1228] via-[#3A0E20] to-[#260814] py-4 sm:py-10 px-2 sm:px-4 text-slate-100 font-sans">
      <StampFilter />

      {/* Topbar: Voltar ao mapa + Trocar autora + Badge de carimbos */}
      <div className="max-w-[1120px] mx-auto mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-3 px-1">
        <a
          href={appPath('/')}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-pink-200 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao mapa
        </a>

        {/* Barra de seleção rápida de autoras */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAuthorDrawerOpen(!authorDrawerOpen)}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold bg-pink-500/30 hover:bg-pink-500/40 border border-pink-400/40 text-pink-100 px-3.5 py-2 rounded-xl transition"
          >
            <Users className="w-4 h-4 text-pink-300" />
            <span className="truncate max-w-[140px] sm:max-w-[220px]">{currentAuthor?.name || 'Escolher autora'}</span>
          </button>

          {/* Badge de carimbos desbloqueados */}
          <div className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/10 border border-white/20 text-pink-200 px-3 py-2 rounded-xl">
            <StampIcon className="w-3.5 h-3.5 text-pink-400" />
            <span>{unlockedCount} carimbo{unlockedCount === 1 ? '' : 's'}</span>
          </div>
        </div>
      </div>

      {/* Menu / Drawer de seleção de autoras */}
      {authorDrawerOpen && (
        <div className="max-w-[1120px] mx-auto mb-6 p-4 rounded-2xl bg-black/40 border border-pink-500/30 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-pink-300">Escolha uma autora participante</h3>
            <span className="text-[11px] text-pink-200/70">{authorList.length} autoras</span>
          </div>

          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-pink-300/60" />
            <input
              type="search"
              placeholder="Buscar autora..."
              value={authorSearch}
              onChange={(e) => setAuthorSearch(e.target.value)}
              className="w-full bg-white/10 border border-pink-300/30 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-pink-200/50 outline-none focus:border-pink-400"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
            {filteredAuthors.map((author) => {
              const isSelected = author.id === activeAuthorId
              const hasStamp = stamps.some((s) => s.authorId === author.id)
              return (
                <button
                  key={author.id}
                  type="button"
                  onClick={() => {
                    setSelectedAuthorId(author.id)
                    setAuthorDrawerOpen(false)
                    setPage(0)
                    setSpread(0)
                  }}
                  className={`flex items-center gap-2 p-2 rounded-xl text-left text-xs font-bold transition ${
                    isSelected
                      ? 'bg-pink-600 text-white shadow-sm'
                      : 'bg-white/5 hover:bg-white/15 text-pink-100'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-pink-900/60 flex items-center justify-center text-[10px] text-pink-200 shrink-0 font-display">
                    {author.name[0]}
                  </div>
                  <span className="truncate flex-1">{author.name}</span>
                  {hasStamp && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Container Principal do Passaporte */}
      <div className="max-w-[1120px] mx-auto">
        {/* Mobile: uma página por vez com animação deslizante suave */}
        <div className="lg:hidden">
          <BookShell>
            <AnimatePresence mode="wait">
              <motion.div
                key={page}
                className="min-h-[580px] sm:min-h-[680px] flex flex-col"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                {pages[page]}
              </motion.div>
            </AnimatePresence>
          </BookShell>

          <PageNav
            index={page}
            count={pages.length}
            labels={labels}
            onGo={setPage}
            onPrev={() => setPage((p) => Math.max(0, p - 1))}
            onNext={() => setPage((p) => Math.min(pages.length - 1, p + 1))}
          />
        </div>

        {/* Desktop: passaporte aberto em livro duplo (2 páginas) */}
        <div className="hidden lg:block">
          <BookShell>
            <AnimatePresence mode="wait">
              <motion.div
                key={spread}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="grid grid-cols-2 relative min-h-[720px] lg:h-[820px]"
              >
                <div className="border-r border-pink-300/40 overflow-hidden h-full flex flex-col">
                  {pages[spreads[spread][0]]}
                </div>
                <div className="overflow-hidden h-full flex flex-col">
                  {pages[spreads[spread][1]]}
                </div>

                {/* Sombra realista do vinco central / dobra das páginas */}
                <div
                  className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-16 pointer-events-none z-10"
                  style={{
                    background:
                      'linear-gradient(90deg, rgba(190,24,93,0) 0%, rgba(190,24,93,0.16) 45%, rgba(190,24,93,0.16) 55%, rgba(190,24,93,0) 100%)',
                  }}
                />
              </motion.div>
            </AnimatePresence>
          </BookShell>

          <PageNav
            index={spread}
            count={spreads.length}
            labels={['Passaporte & Presenças', 'Como funciona & Carimbo']}
            onGo={setSpread}
            onPrev={() => setSpread((s) => Math.max(0, s - 1))}
            onNext={() => setSpread((s) => Math.min(spreads.length - 1, s + 1))}
          />
        </div>
      </div>

      {/* Modal Leitor de QR Code */}
      <QrScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onCode={value => void handleScanSuccess(value)}
      />

      {/* Toast Feedback */}
      {toastVisible && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-[#56132f] border border-pink-300/40 text-white px-5 py-3 text-sm font-bold shadow-2xl animate-fade-in flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-pink-300" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}

export default SapphicPassport
