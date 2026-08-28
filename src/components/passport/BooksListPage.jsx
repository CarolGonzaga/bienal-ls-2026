import React from 'react'
import { BadgeCheck, BookOpen, Check } from 'lucide-react'
import PaperPage from './PaperPage'
import { PassportStamp, RoundStamp, Skyline } from './Decor'

export default function BooksListPage({ books = [], authorName = 'Autora sáfica' }) {
  return (
    <PaperPage className="h-full">
      <div className="flex h-full flex-col px-6 py-7 sm:px-9 sm:py-8">
        <div className="flex items-start justify-between">
          <PassportStamp />
          <RoundStamp src="selo3" />
        </div>

        <div className="mt-2 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-pink-800" />
          <h1 className="text-lg font-black uppercase tracking-[.08em] text-pink-900">Livros em destaque</h1>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">Conheça as obras de {authorName} e onde encontrá-las durante a Bienal.</p>

        <div className="mt-6 space-y-4 overflow-y-auto pr-1">
          {books.length ? books.map((book, index) => <BookRow key={book.id || index} book={book} />) : <p className="rounded-xl border border-pink-200 bg-white/40 p-4 text-center text-sm text-slate-500">Livros em preparação para a Bienal.</p>}
        </div>

        <div className="mt-auto flex items-end justify-between pt-6">
          <Skyline className="max-w-[180px] sm:max-w-[220px]" />
          <RoundStamp src="selo2" className="shrink-0" />
        </div>
      </div>
    </PaperPage>
  )
}

function BookRow({ book }) {
  const title = book?.title || 'Título do livro'
  const genre = book?.genre || 'Romance'
  const available = book?.on_sale ?? true
  const autographs = book?.autographs ?? Boolean(book?.autographAvailable)

  return (
    <article className="grid grid-cols-[78px_1fr] gap-4 rounded-2xl border border-pink-200/80 bg-white/40 p-3 sm:grid-cols-[92px_1fr]">
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-gradient-to-br from-[#4d235f] via-[#9e4275] to-[#dd849c] shadow-md">
        {book?.coverUrl ? <img src={book.coverUrl} alt={`Capa de ${title}`} className="h-full w-full object-cover" /> : <><span className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/35 to-white/10" /><span className="grid h-full place-items-center px-2 text-center font-display text-lg leading-tight text-white">{title}</span></>}
      </div>
      <div className="min-w-0 self-center">
        <h2 className="text-base font-black leading-tight text-slate-800">{title}</h2>
        <p className="mt-1 text-xs text-slate-500">{genre}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {available && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800"><Check className="h-3 w-3" />À venda</span>}
          {autographs && <span className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-2 py-1 text-[10px] font-bold text-pink-800"><BadgeCheck className="h-3 w-3" />Autógrafos</span>}
          {!available && !autographs && <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">Informações em breve</span>}
        </div>
      </div>
    </article>
  )
}
