import React from 'react'
import { MapPin, Megaphone } from 'lucide-react'
import PaperPage from './PaperPage'
import SectionTitle from './SectionTitle'
import AppearanceRow from './AppearanceRow'
import { RoundStamp, Skyline, Waves } from './Decor'

export default function SchedulePage({ author, appearances = [], updates = [], decorationVariant = 0 }) {
  const firstName = author?.name ? author.name.split(' ')[0] : 'A autora'
  const eventName = author?.event_name || 'Bienal do Livro de São Paulo'
  const eventPeriod = author?.event_period || '4 e 13 de setembro de 2026'

  return (
    <PaperPage className="h-full">
      <div className="px-4 sm:px-9 pt-6 sm:pt-8 pb-5 sm:pb-6 flex flex-col h-full">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <SectionTitle icon={MapPin} rule={false}>Onde encontrar a autora</SectionTitle>
            <p className="mt-1.5 sm:mt-2.5 text-[11.5px] sm:text-[13px] leading-relaxed text-slate-700 max-w-md">
              {firstName} estará na {eventName} entre os dias {eventPeriod}.
            </p>
          </div>
          {decorationVariant % 2 === 0 && <RoundStamp src="selo3" className="shrink-0 hidden sm:block" />}
        </div>

        <div className="mt-4 sm:mt-6 rounded-2xl border border-pink-200/70 bg-white/40 overflow-hidden">
          {appearances.length ? (
            appearances.slice(0, 4).map((a, i) => (
              <AppearanceRow key={a.id || i} item={a} last={i === Math.min(appearances.length - 1, 3)} />
            ))
          ) : (
            <p className="p-6 text-center text-xs text-slate-500 font-medium">
              A programação desta autora será publicada em breve.
            </p>
          )}
        </div>

        <div className="mt-4 sm:mt-6 rounded-2xl border border-pink-200/70 bg-white/30 px-3.5 sm:px-5 py-3 sm:py-4">
          <SectionTitle icon={Megaphone} rule={false}>Atualizações de última hora</SectionTitle>
          <div className="mt-2.5 space-y-2">
            {updates.length ? (
              updates.map((u) => (
                <p
                  key={u.id}
                  className="text-[11px] sm:text-[12px] text-slate-700 leading-relaxed border border-pink-200/60 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white/40"
                >
                  {u.posted_at ? <strong className="text-pink-800">{u.posted_at}: </strong> : ''}
                  {u.text}
                </p>
              ))
            ) : (
              <p className="text-[11px] sm:text-[12px] text-slate-600 italic border border-pink-200/60 rounded-lg px-3 py-2 bg-white/40">
                Fique de olho! Atualizações e novidades de horários aparecerão aqui.
              </p>
            )}
          </div>
        </div>

        <div className="mt-auto pt-5 sm:pt-8 flex items-end justify-between">
          <Skyline className="max-w-[170px] sm:max-w-[220px]" />
          <div className="flex items-end gap-2">
            <Waves className="hidden sm:block" />
            {decorationVariant % 2 === 0 ? <RoundStamp src="selo2" className="shrink-0" /> : <RoundStamp src="selo3" className="shrink-0" />}
          </div>
        </div>
      </div>
    </PaperPage>
  )
}
