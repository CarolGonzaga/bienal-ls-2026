import React from 'react'
import { BookOpen, CalendarDays, Heart, MapPin, X } from 'lucide-react'
import { PassportTicket } from './PassportArt'
import { appPath } from '../../lib/paths'

const formatDate = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }) : 'Data a confirmar'
const formatTime = (start, end) => start ? `${String(start).slice(0, 5)}${end ? ` – ${String(end).slice(0, 5)}` : ''}` : 'Horário a confirmar'
const passportAsset = name => appPath(`/passaporte/${name}`)

export default function AuthorPassportPreview({ author, profile, photoUrl, events = [], onClose }) {
  const agenda = events.filter(item => item.status !== 'rejected').slice(0, 4)

  return <div className="author-passport-preview fixed inset-0 z-[80] overflow-y-auto bg-[#160d1d]/95 p-3 sm:p-8">
    <div className="mx-auto max-w-[1180px]">
      <header className="mb-4 flex items-center justify-between gap-3 text-white">
        <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#efb9d9]">Visualização da autora</p><h2 className="text-lg font-black">Como sua página final aparecerá</h2></div>
        <button onClick={onClose} className="rounded-xl border border-white/40 px-3 py-2 text-sm font-bold"><X className="inline h-4 w-4"/> Fechar</button>
      </header>

      <div className="passport-preview-book">
        <section className="passport-preview-page passport-preview-page--left">
          <div className="passport-preview-page-border"/>
          <div className="flex items-start justify-between gap-3"><PassportTicket className="passport-preview-ticket"/><img src={passportAsset('selo3.png')} alt="" className="passport-preview-corner-seal"/></div>
          <h3 className="passport-preview-name">{author?.name || 'Sua autora'}</h3>
          <p className="passport-preview-meta">Autora sáfica <span>•</span> Bienal do Livro SP 2026</p>
          <div className="passport-preview-profile">
            {photoUrl ? <img src={photoUrl} alt={author?.name} className="passport-preview-photo"/> : <div className="passport-preview-photo passport-preview-photo--placeholder">{author?.name?.[0] || 'A'}</div>}
            <div><div className="passport-preview-copy"><p className="passport-preview-kicker"><BookOpen size={16}/>Sobre a autora</p><p>{profile.bio || 'Sua bio aparecerá aqui quando for preenchida.'}</p></div><div className="mt-4"><p className="passport-preview-kicker"><Heart size={16}/>Mensagem para você</p><p className="passport-preview-message">{profile.message || 'Sua mensagem para as leitoras aparecerá aqui.'}</p></div></div>
          </div>
          <div className="passport-preview-books-hint"><p className="passport-preview-kicker"><BookOpen size={16}/>Livros em destaque</p><p>Os livros aprovados aparecerão aqui.</p></div>
          <img src={passportAsset('saopaulo.png')} alt="" className="passport-preview-skyline"/><img src={passportAsset('selo2.png')} alt="" className="passport-preview-footer-seal"/>
        </section>
        <section className="passport-preview-page passport-preview-page--right">
          <div className="passport-preview-page-border"/>
          <div className="flex items-start justify-between gap-3"><div><p className="passport-preview-kicker"><MapPin size={16}/>Onde encontrar a autora</p><p className="mt-3 text-sm leading-6">Sua agenda aprovada aparecerá nesta página.</p></div><img src={passportAsset('selo3.png')} alt="" className="passport-preview-corner-seal"/></div>
          <div className="passport-preview-agenda">{agenda.length ? agenda.map((item, index) => <article key={item.id || index}><div><strong><CalendarDays size={15}/>{formatDate(item.payload?.event_date || item.payload?.presence_date || item.date)}</strong><p>{formatTime(item.payload?.start_time || item.start_time, item.payload?.end_time || item.end_time)}</p></div><div><span>{item.request_type === 'presence' ? 'Presença confirmada' : 'Sessão de autógrafos'}</span><p>Estande {item.payload?.stand_code || item.stand_code || 'a confirmar'}</p></div></article>) : <p className="py-8 text-center text-sm">Cadastre sua presença ou sessão de autógrafos para vê-la aqui.</p>}</div>
          <div className="passport-preview-update"><p className="passport-preview-kicker">Atualizações de última hora</p><p>Informações aprovadas pela equipe aparecerão aqui.</p></div>
          <img src={passportAsset('saopaulo.png')} alt="" className="passport-preview-skyline"/><img src={passportAsset('ondas.png')} alt="" className="passport-preview-waves"/>
        </section>
      </div>
    </div>
  </div>
}
