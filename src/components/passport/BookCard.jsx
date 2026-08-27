import React from 'react'
import { Check, BadgeCheck } from 'lucide-react'

export default function BookCard({ book, authorName }) {
  const fromColor = book?.cover_from || '#7e305e'
  const toColor = book?.cover_to || '#d43276'
  const title = book?.title || 'Título do Livro'
  const genre = book?.genre || 'Romance'
  const onSale = book?.on_sale ?? true
  const autographs = book?.autographs ?? Boolean(book?.autographAvailable)

  return (
    <div className="flex flex-col items-center text-center">
      <div
        className="w-full aspect-[2/3] rounded-md shadow-[0_10px_24px_-8px_rgba(157,23,77,0.45)] flex flex-col items-center justify-center px-2 relative overflow-hidden transition hover:scale-[1.02]"
        style={{
          backgroundImage: book?.coverUrl ? undefined : `linear-gradient(160deg, ${fromColor}, ${toColor})`,
          backgroundColor: '#3b172e',
        }}
      >
        {book?.coverUrl ? (
          <img src={book.coverUrl} alt={title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <>
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle at 50% 25%, rgba(255,255,255,0.35), transparent 60%)',
              }}
            />
            {/* Vinco da lombada sutil */}
            <div
              className="absolute top-0 bottom-0 left-0 w-2.5 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, rgba(0,0,0,0.35) 0%, rgba(255,255,255,0.2) 40%, transparent 100%)',
              }}
            />
            <span className="relative font-display text-white text-[11px] sm:text-[15px] leading-tight drop-shadow px-1 my-auto">
              {title}
            </span>
            <span className="relative mt-auto mb-1.5 text-[6.5px] sm:text-[7px] tracking-[0.2em] text-white/80 uppercase truncate max-w-full px-1">
              {authorName || book?.authorName || 'Autora Sáfica'}
            </span>
          </>
        )}
      </div>

      <p className="mt-2.5 sm:mt-3 text-[10px] sm:text-[13px] font-bold text-slate-800 leading-tight line-clamp-2">
        {title}
      </p>
      <p className="text-[9px] sm:text-[11px] text-slate-500 mt-0.5 truncate max-w-full">
        {genre}
      </p>

      <div className="mt-1.5 sm:mt-2 flex flex-col gap-1 sm:gap-1.5 items-center">
        {onSale && (
          <div className="flex items-center gap-1 sm:gap-1.5 text-[9.5px] sm:text-[11px] text-slate-700">
            <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center shrink-0">
              <Check className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-rose-600" />
            </span>
            À venda
          </div>
        )}
        {autographs && (
          <div className="flex items-center gap-1 sm:gap-1.5 text-[9.5px] sm:text-[11px] text-slate-700">
            <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-pink-100 border border-pink-300 flex items-center justify-center shrink-0">
              <BadgeCheck className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-pink-600" />
            </span>
            Autógrafos
          </div>
        )}
      </div>
    </div>
  )
}
