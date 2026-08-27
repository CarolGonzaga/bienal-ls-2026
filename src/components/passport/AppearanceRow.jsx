import React from 'react'
import { CalendarDays } from 'lucide-react'

export default function AppearanceRow({ item, last }) {
  const isAuto = item.kind === 'autografos' || item.eventType === 'autograph' || item.request_type === 'autograph'
  const dayLabel = item.day_label || item.dateLabel || item.date || 'Data a confirmar'
  const timeRange = item.time_range || item.timeRange || (item.startTime ? `${item.startTime}${item.endTime ? ` – ${item.endTime}` : ''}` : '')
  const stand = item.stand || item.standCode || (item.payload?.stand_code ? `Estande ${item.payload.stand_code}` : 'Estande a confirmar')
  const bookNote = item.book_note || item.bookTitle || item.payload?.books?.join(', ')

  return (
    <div
      className={`px-4 sm:px-5 py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-start gap-2.5 sm:gap-3 ${
        last ? '' : 'border-b border-dashed border-pink-300/50'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-pink-700 shrink-0" />
          <span className="text-[12px] sm:text-[13px] font-bold text-slate-800 truncate">{dayLabel}</span>
        </div>
        <div className="mt-1.5 ml-6">
          <span
            className={`inline-block text-[8.5px] sm:text-[9px] font-bold tracking-[0.08em] uppercase px-2 py-0.5 sm:py-1 rounded ${
              isAuto ? 'bg-pink-100 text-pink-700' : 'bg-rose-100 text-rose-700'
            }`}
          >
            {isAuto ? 'Sessão de autógrafos' : 'Presença confirmada'}
          </span>
        </div>
        {timeRange && <p className="mt-1.5 text-[11.5px] sm:text-[12px] text-slate-600 ml-6">{timeRange}</p>}
        {bookNote && <p className="text-[11.5px] sm:text-[12px] text-slate-600 ml-6 truncate">Livro: {bookNote}</p>}
      </div>

      <div className="sm:text-right sm:w-40 ml-6 sm:ml-0 shrink-0">
        <span className="inline-block text-[11px] sm:text-[12px] font-bold text-slate-800 bg-pink-200/60 rounded px-2 py-0.5">
          {stand}
        </span>
        <div className="mt-1 space-y-0.5">
          {(item.partners || (item.locationName ? [item.locationName] : [])).map((p) => (
            <p key={p} className="text-[10px] sm:text-[11px] text-slate-500 truncate">
              {p}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}
