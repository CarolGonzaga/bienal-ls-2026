import React from 'react'
import { BookOpen, Heart } from 'lucide-react'
import PaperPage from './PaperPage'
import SectionTitle from './SectionTitle'
import { PassportStamp, RoundStamp, Skyline } from './Decor'

export default function ProfilePage({ author }) {
  const authorName = author?.name || 'Autora Sáfica'
  const authorPhoto = author?.photo_url || author?.photo || author?.photoUrl
  const authorAge = author?.age
  const authorCity = author?.city
  const authorTagline = author?.tagline || author?.participation_tag || 'Autora sáfica'
  const authorAbout = author?.about || author?.bio || 'Escreve romances sáficos e histórias sobre encontros, descobertas e coragem.'
  const authorMessage = author?.message || 'Obrigada por ler e por existir. Nos vemos na Bienal!'

  return (
    <PaperPage className="h-full">
      <div className="px-4 sm:px-9 pt-6 sm:pt-8 pb-5 sm:pb-6 flex flex-col h-full">
        <div className="flex items-start justify-between">
          <PassportStamp />
          <RoundStamp src="selo3" className="hidden sm:block" />
        </div>

        <div className="mt-4 sm:mt-7 text-center">
          <h1 className="font-display text-[32px] sm:text-[46px] leading-none text-pink-900 drop-shadow-sm">
            {authorName}
          </h1>
          <p className="mt-2 sm:mt-3 text-[11.5px] sm:text-[13px] text-slate-700 font-medium">
            {[authorAge ? `${authorAge} anos` : '', authorCity, authorTagline].filter(Boolean).map((item, index) => <React.Fragment key={item}>{index > 0 && <span className="text-pink-400 mx-1">•</span>}{item}</React.Fragment>)}
          </p>
        </div>

        {/* Foto ao lado do texto mesmo no mobile */}
        <div className="mt-5 sm:mt-7 grid grid-cols-[105px_1fr] sm:grid-cols-[150px_1fr] gap-3 sm:gap-5 items-stretch">
          {authorPhoto ? (
            <img
              src={authorPhoto}
              alt={authorName}
              className="w-full sm:w-[150px] h-[160px] sm:h-[242px] rounded-xl object-cover shadow-md"
            />
          ) : (
            <div className="w-full sm:w-[150px] h-[160px] sm:h-[242px] rounded-xl bg-gradient-to-br from-[#603576] to-[#df6892] text-white flex items-center justify-center font-display text-[44px] sm:text-[64px] shadow-md select-none">
              {authorName[0] || 'A'}
            </div>
          )}

          <div className="min-w-0 rounded-xl border border-pink-200/70 bg-white/25 p-3 sm:h-[242px] sm:p-4">
            <div>
              <SectionTitle icon={BookOpen}>Sobre a autora</SectionTitle>
              <p className="mt-1.5 sm:mt-2.5 text-[11px] sm:text-[13px] leading-relaxed text-slate-700 line-clamp-6 sm:line-clamp-8">
                {authorAbout}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 sm:mt-5 rounded-xl border border-pink-200/60 bg-white/20 p-3 sm:p-4">
          <SectionTitle icon={Heart}>Mensagem para você</SectionTitle>
          <p className="mt-1.5 sm:mt-2.5 font-display text-[15px] sm:text-[18px] leading-snug text-pink-900 line-clamp-3">
            {authorMessage} <span className="text-pink-400 font-normal">♡</span>
          </p>
        </div>

        <div className="mt-auto pt-5 sm:pt-8 flex items-end justify-between">
          <Skyline className="max-w-[170px] sm:max-w-[240px]" />
          <RoundStamp src="selo2" className="hidden shrink-0 sm:block" />
        </div>
      </div>
    </PaperPage>
  )
}
