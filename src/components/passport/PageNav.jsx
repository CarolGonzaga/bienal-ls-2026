import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function PageNav({ index, count, onPrev, onNext, onGo, labels }) {
  return (
    <div className="flex items-center justify-between gap-3 sm:gap-4 mt-5 sm:mt-6 select-none">
      <button
        onClick={onPrev}
        disabled={index === 0}
        aria-label="Página anterior"
        className="w-11 h-11 rounded-full bg-white/15 border border-white/25 text-white/90 flex items-center justify-center disabled:opacity-25 transition hover:bg-white/25 active:scale-95 shadow-sm"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex flex-col items-center gap-1.5 sm:gap-2 min-w-0">
        <span className="text-[10.5px] sm:text-[11px] font-bold tracking-[0.18em] uppercase text-white/80 truncate max-w-[240px] text-center">
          {labels[index]}
        </span>
        <div className="flex items-center gap-2">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              onClick={() => onGo(i)}
              aria-label={`Ir para página ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? 'w-6 bg-white/90' : 'w-1.5 bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={index === count - 1}
        aria-label="Próxima página"
        className="w-11 h-11 rounded-full bg-white/15 border border-white/25 text-white/90 flex items-center justify-center disabled:opacity-25 transition hover:bg-white/25 active:scale-95 shadow-sm"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  )
}
