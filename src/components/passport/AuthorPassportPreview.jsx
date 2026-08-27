import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Eye } from 'lucide-react'
import BookShell from './BookShell'
import ProfilePage from './ProfilePage'
import SchedulePage from './SchedulePage'
import { StampFilter } from './Decor'

export default function AuthorPassportPreview({ author, profile, photoUrl, events = [], onClose }) {
  const safeProfile = profile || {}

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  const authorData = {
    id: author?.id || 'preview-author',
    name: author?.name || 'Sua Autora',
    photo_url: photoUrl,
    age: '34',
    city: 'São Paulo / SP',
    tagline: 'Autora sáfica',
    about: safeProfile.bio || 'Sua biografia completa aparecerá aqui quando for preenchida no painel.',
    message: safeProfile.message || 'Sua mensagem especial para as leitoras aparecerá aqui.',
    event_name: 'Bienal do Livro de São Paulo 2026',
    event_period: '4 e 13 de setembro',
  }

  const authorBooks = [
    {
      id: 'preview-book-1',
      title: 'Seu Livro Principal',
      genre: 'Romance Sáfico',
      on_sale: true,
      autographs: true,
      cover_from: '#832860',
      cover_to: '#db3e84',
    },
    {
      id: 'preview-book-2',
      title: 'Segundo Livro',
      genre: 'Fantasia',
      on_sale: true,
      autographs: false,
      cover_from: '#4a2366',
      cover_to: '#8a4ca8',
    },
    {
      id: 'preview-book-3',
      title: 'Mais Uma História',
      genre: 'Contos',
      on_sale: true,
      autographs: true,
      cover_from: '#1e3c54',
      cover_to: '#3e7696',
    },
  ]

  const appearances = events.length
    ? events.map((item, index) => ({
        id: item.id || `app-${index}`,
        kind: item.request_type === 'autograph' ? 'autografos' : 'presenca',
        day_label: item.payload?.event_date || item.payload?.presence_date
          ? new Date(`${item.payload?.event_date || item.payload?.presence_date}T12:00:00`).toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: '2-digit',
              month: '2-digit',
            })
          : 'Data a confirmar',
        time_range: item.payload?.start_time
          ? `${String(item.payload.start_time).slice(0, 5)}${
              item.payload?.end_time ? ` – ${String(item.payload.end_time).slice(0, 5)}` : ''
            }`
          : 'Horário a confirmar',
        stand: item.payload?.stand_code ? `Estande ${item.payload.stand_code}` : 'Estande a confirmar',
        book_note: item.payload?.books?.join(', ') || '',
        partners: [],
      }))
    : [
        {
          id: 'prev-1',
          kind: 'presenca',
          day_label: 'Sábado, 05 de setembro',
          time_range: '14:00 – 16:00',
          stand: 'Estande a confirmar',
          book_note: 'Seu Livro Principal',
          partners: ['Editora'],
        },
      ]

  const updates = [
    {
      id: 'up-1',
      text: 'Informações aprovadas pela equipe da Bienal aparecerão aqui.',
      posted_at: 'Prévia',
    },
  ]

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="author-passport-preview-title"
      className="author-passport-preview fixed inset-0 z-[100] overflow-y-auto bg-[#160d1d]/95 p-3 sm:p-8"
    >
      <StampFilter />
      <div className="mx-auto max-w-[1120px]">
        <header className="mb-4 flex items-center justify-between gap-3 text-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-pink-300 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Pré-visualização da autora
            </p>
            <h2 id="author-passport-preview-title" className="text-lg font-black">
              Como sua página final aparecerá no Passaporte Sáfico
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="rounded-xl border border-white/40 px-3.5 py-2 text-xs font-bold hover:bg-white/10 transition flex items-center gap-1"
          >
            <X className="w-4 h-4" /> Fechar prévia
          </button>
        </header>

        {/* Desktop / Tablet: Passaporte aberto */}
        <BookShell>
          <div className="grid grid-cols-1 lg:grid-cols-2 relative min-h-[640px] lg:h-[820px]">
            <div className="border-b lg:border-b-0 lg:border-r border-pink-300/40 overflow-hidden h-full flex flex-col">
              <ProfilePage author={authorData} books={authorBooks} />
            </div>
            <div className="overflow-hidden h-full flex flex-col">
              <SchedulePage author={authorData} appearances={appearances} updates={updates} />
            </div>

            {/* Sombra central */}
            <div
              className="hidden lg:block absolute inset-y-0 left-1/2 -translate-x-1/2 w-16 pointer-events-none z-10"
              style={{
                background:
                  'linear-gradient(90deg, rgba(190,24,93,0) 0%, rgba(190,24,93,0.16) 45%, rgba(190,24,93,0.16) 55%, rgba(190,24,93,0) 100%)',
              }}
            />
          </div>
        </BookShell>
      </div>
    </div>,
    document.body
  )
}
