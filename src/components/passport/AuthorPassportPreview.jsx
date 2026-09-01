import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { BookOpen, CalendarDays, MapPin, X } from 'lucide-react'
import { passportAsset } from '../../lib/passport-assets'
import './passport.css'

export default function AuthorPassportPreview({ author, profile, photoUrl, events = [], onClose }) {
  const safeProfile = profile || {}
  const name = safeProfile.passport_display_name?.trim() || author?.name || 'Sua Autora'
  const city = safeProfile.passport_city?.trim() || 'Cidade não informada'

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = event => { if (event.key === 'Escape') onClose() }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  return createPortal(
    <div className="sapphic-passport-v2 fixed inset-0 z-[100] flex items-center justify-center bg-[#34101f]/85 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Prévia do novo Passaporte Sáfico">
      <div className="relative grid h-[min(760px,92dvh)] w-full max-w-[1120px] overflow-hidden rounded-2xl bg-[#fffaf6] shadow-2xl md:grid-cols-2">
        <button type="button" onClick={onClose} aria-label="Fechar prévia" className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-[#6c1232] text-white shadow-lg">
          <X className="h-5 w-5" />
        </button>

        <section className="paper-surface relative overflow-hidden border-r border-[#e6a2bd]/45 p-7 sm:p-10">
          <div className="absolute inset-5 rounded-xl border border-dashed border-[#e6a2bd]/55" />
          <div className="relative z-10">
            <img src={passportAsset('selo1.png')} alt="" className="h-20 w-auto -rotate-6 object-contain opacity-60" />
            <h2 className="mt-5 text-center font-signature text-5xl leading-none text-[#6c1232]">{name}</h2>
            <p className="mt-2 text-center text-xs font-bold uppercase tracking-[.16em] text-[#82566a]">
              {[safeProfile.passport_age ? `${safeProfile.passport_age} anos` : '', city, 'Autora sáfica'].filter(Boolean).join(' • ')}
            </p>
            <div className="mt-7 grid grid-cols-[145px_1fr] gap-5">
              <div className="aspect-[3/4] overflow-hidden rounded-xl bg-[#f8ebf0] shadow-lg">
                {photoUrl ? <img src={photoUrl} alt={name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-center text-xs uppercase tracking-[.14em] text-[#82566a]">Foto da autora</div>}
              </div>
              <div className="dashed-frame p-4">
                <p className="label-caps flex items-center gap-2"><BookOpen className="h-4 w-4" /> Sobre a autora</p>
                <p className="mt-4 text-sm leading-6 text-[#4f1730]">{safeProfile.bio || author?.bio || 'Sua biografia aparecerá aqui.'}</p>
              </div>
            </div>
            <div className="dashed-frame relative mt-5 min-h-28 p-4 pr-24">
              <p className="label-caps">Mensagem para você</p>
              <p className="mt-2 font-script text-3xl leading-tight text-[#6c1232]">{safeProfile.message || author?.message || 'Sua mensagem aparecerá aqui.'}</p>
              <img src={passportAsset('selo3.png')} alt="" className="absolute bottom-3 right-3 h-16 w-16 object-contain opacity-40" />
            </div>
          </div>
        </section>

        <section className="paper-surface relative overflow-hidden p-7 sm:p-10">
          <div className="absolute inset-5 rounded-xl border border-dashed border-[#e6a2bd]/55" />
          <div className="relative z-10">
            <p className="label-caps flex items-center gap-2"><MapPin className="h-4 w-4" /> Onde encontrar a autora</p>
            <h3 className="mt-2 font-display text-2xl font-semibold text-[#4f1730]">Programação publicada</h3>
            <div className="mt-6 space-y-3">
              {events.length ? events.slice(0, 4).map(event => (
                <article key={event.id} className="dashed-frame grid grid-cols-[1fr_auto] gap-4 p-4 text-sm">
                  <div>
                    <strong className="flex items-center gap-2 text-[#6c1232]"><CalendarDays className="h-4 w-4" />{event.date || 'Data a confirmar'}</strong>
                    <p className="mt-2">{event.startTime || event.start_time || 'Horário a confirmar'}{event.endTime || event.end_time ? ` — ${event.endTime || event.end_time}` : ''}</p>
                    {(event.bookTitle || event.title) && <p className="mt-1 text-xs text-[#82566a]">{event.bookTitle || event.title}</p>}
                  </div>
                  <span className="h-fit rounded-full bg-[#f8cfdf] px-3 py-1 text-xs font-bold text-[#6c1232]">{event.standCode || event.stand_code || 'Estande'}</span>
                </article>
              )) : <p className="dashed-frame p-6 text-center text-sm text-[#82566a]">A programação aprovada aparecerá nesta página.</p>}
            </div>
            <img src={passportAsset('saopaulo.png')} alt="" className="absolute inset-x-0 bottom-2 w-full object-contain opacity-20" />
          </div>
        </section>
        <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-10 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#4f1730]/15 to-transparent md:block" />
      </div>
    </div>,
    document.body
  )
}
