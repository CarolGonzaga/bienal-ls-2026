import React from 'react'
import { Store, MessageSquare, Stamp as StampIcon, BookHeart } from 'lucide-react'
import PaperPage from './PaperPage'
import { PassportStamp, RoundStamp, Skyline, Waves } from './Decor'

const steps = [
  { icon: Store, text: 'Vá até o estande da autora' },
  { icon: MessageSquare, text: 'Peça o código da autora' },
  { icon: StampIcon, text: 'Resgate seu carimbo' },
  { icon: BookHeart, text: 'Colecione memórias!' },
]

export default function HowItWorksPage() {
  return (
    <PaperPage className="h-full">
      <div className="px-5 sm:px-9 pt-6 sm:pt-8 pb-5 sm:pb-6 flex flex-col h-full">
        <div className="flex items-start justify-end">
          <PassportStamp className="rotate-6" />
        </div>

        <h2 className="mt-5 sm:mt-8 text-center text-[23px] sm:text-[30px] font-extrabold tracking-tight text-pink-900 font-heading leading-tight">
          COMO FUNCIONA<br />O PASSAPORTE? <span className="text-pink-400 font-normal">♡</span>
        </h2>

        <div className="mt-6 sm:mt-9 space-y-0">
          {steps.map(({ icon: Icon, text }, i) => (
            <div
              key={text}
              className={`flex items-center gap-3.5 sm:gap-5 py-3.5 sm:py-4.5 ${
                i === steps.length - 1 ? '' : 'border-b border-dashed border-pink-300/60'
              }`}
            >
              <span className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl border-2 border-pink-800/80 flex items-center justify-center shrink-0 bg-white/40">
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-pink-900" strokeWidth={1.6} />
              </span>
              <p className="text-[13.5px] sm:text-[15px] font-bold text-slate-800">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-6 sm:pt-10 flex items-end justify-between">
          <Skyline className="max-w-[170px] sm:max-w-[220px]" />
          <div className="flex items-end gap-2"><Waves className="hidden sm:block" /><RoundStamp src="selo3" className="shrink-0" /></div>
        </div>
      </div>
    </PaperPage>
  )
}
