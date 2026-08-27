import React, { useState } from 'react'
import { Check, Sparkles, Stamp as StampIcon, QrCode, Clipboard } from 'lucide-react'
import { PassportStamp, RoundStamp, Skyline, Waves } from './Decor'

export default function StampPage({ stamp, onRedeemCode, onScanQr }) {
  const [code, setCode] = useState('')
  const [redeemNotice, setRedeemNotice] = useState('')
  const isUnlocked = Boolean(stamp?.is_unlocked || stamp?.unlocked || stamp?.synced_at)

  const authorName = stamp?.author_name || 'Lívia Montclair'
  const firstName = authorName.split(' ')[0]
  const eventLabel = stamp?.event_label || 'BIENAL DO LIVRO SP 2026'
  const stand = stamp?.stand || 'Estande G40'
  const dateLabel = stamp?.date_label || '06 de Setembro de 2026'
  const syncedAt = stamp?.synced_at || (stamp?.redeemedAtLocal ? new Date(stamp.redeemedAtLocal).toLocaleString('pt-BR') : 'Presença confirmada')

  const handleRedeem = async () => {
    if (!code.trim()) return
    if (onRedeemCode) {
      const result = await onRedeemCode(code.trim())
      if (result?.message) setRedeemNotice(result.message)
      if (result?.ok) setCode('')
    }
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) setCode(text.trim())
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative overflow-hidden bg-[#FBF1F2] h-full flex flex-col">
      <div className="absolute inset-2 xs:inset-3 sm:inset-4 rounded-lg sm:rounded-xl border border-dashed border-pink-300/50 pointer-events-none" />

      <div className="relative px-4 sm:px-9 pt-6 sm:pt-8 pb-5 sm:pb-6 flex flex-col h-full">
        <div className="flex items-start justify-between">
          <PassportStamp />
          <RoundStamp src="selo2" />
        </div>

        {/* Círculo do Carimbo fluido e responsivo */}
        <div
          className={`mt-4 sm:mt-6 mx-auto w-[68vw] max-w-[250px] sm:max-w-[260px] aspect-square rounded-full border-[3px] flex items-center justify-center transition-all duration-300 ${
            isUnlocked
              ? 'border-pink-400/80 text-pink-600 shadow-md bg-white/30'
              : 'border-pink-300/40 text-pink-300/60 opacity-60 grayscale'
          }`}
        >
          <div className="w-[calc(100%-18px)] sm:w-[calc(100%-24px)] h-[calc(100%-18px)] sm:h-[calc(100%-24px)] rounded-full border border-dashed border-pink-400/60 flex flex-col items-center justify-center px-4 text-center">
            <span className="text-[8.5px] sm:text-[10px] font-bold tracking-[0.2em]">PRESENÇA CONFIRMADA</span>
            <span className="font-display text-[22px] sm:text-[34px] leading-none mt-2 sm:mt-3 text-pink-900 truncate max-w-full">
              {authorName}
            </span>
            <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 mt-2 opacity-70" strokeWidth={1.4} />
            <span className="text-[8.5px] sm:text-[10px] font-bold tracking-[0.16em] mt-2 sm:mt-3">{eventLabel}</span>
          </div>
        </div>

        <p className="mt-4 sm:mt-6 text-center text-[14px] sm:text-[17px] font-bold text-slate-800">
          {stand} – {dateLabel}
        </p>
        <p className="text-center text-[12px] sm:text-[14px] text-slate-600 mt-0.5">
          {isUnlocked ? 'Presença confirmada' : 'Aguardando validação da presença'}
        </p>

        {isUnlocked ? (
          <>
            {/* Status sincronizado */}
            <div className="mt-4 sm:mt-5 rounded-xl bg-pink-100/70 border border-pink-200 px-3.5 sm:px-4 py-2.5 sm:py-3 flex items-center gap-3">
              <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" strokeWidth={2.5} />
              </span>
              <div className="min-w-0">
                <p className="text-[12.5px] sm:text-[14px] font-bold text-slate-800">Carimbo confirmado</p>
                <p className="text-[11px] sm:text-[12px] text-emerald-700 truncate">Sincronizado em {syncedAt}</p>
              </div>
            </div>

            {/* O que significa */}
            <div className="mt-3.5 sm:mt-4 rounded-xl border border-pink-200 bg-white/40 px-3.5 sm:px-4 py-3 sm:py-4">
              <p className="text-[12px] sm:text-[13px] font-bold text-pink-800">O que significa esse carimbo?</p>
              <p className="mt-1.5 text-[11px] sm:text-[12px] leading-relaxed text-slate-700">
                Este carimbo confirma que {firstName} esteve presente na {eventLabel}, no {stand?.toLowerCase()}, em {dateLabel}.
              </p>
              <p className="mt-1 text-[11px] sm:text-[12px] leading-relaxed text-slate-700">
                Ele representa momentos, conexões e histórias que fazem parte da sua jornada literária.
              </p>
              <p className="mt-2 font-display text-[14px] sm:text-[16px] leading-snug text-pink-700">
                Colecione memórias, celebre encontros e continue escrevendo sua história. <span className="text-pink-400">♡</span>
              </p>
            </div>
          </>
        ) : (
          <div className="mt-4 rounded-xl border border-pink-200 bg-white/50 p-3 sm:p-4 text-center">
            <p className="text-xs font-bold text-slate-700">Resgate o carimbo com a autora</p>
            <div className="mt-2.5 flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="EX.: LIVIA-R7KQ-4MX9"
                className="flex-1 rounded-lg border border-pink-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 tracking-wider placeholder:font-sans placeholder:font-normal uppercase"
              />
              <button
                type="button"
                onClick={handleRedeem}
                disabled={!code.trim()}
                className="rounded-lg bg-pink-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-pink-700 disabled:opacity-40 flex items-center gap-1.5 shrink-0"
              >
                <StampIcon className="w-3.5 h-3.5" /> Validar
              </button>
            </div>

            <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-pink-800 font-bold">
              {onScanQr && (
                <button type="button" onClick={onScanQr} className="hover:underline flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5" /> Escanear QR
                </button>
              )}
              <button type="button" onClick={handlePaste} className="hover:underline flex items-center gap-1">
                <Clipboard className="w-3.5 h-3.5" /> Colar código
              </button>
            </div>
            {redeemNotice && <p className="mt-2 text-[11px] font-bold text-pink-700">{redeemNotice}</p>}
          </div>
        )}

        <div className="mt-auto pt-5 sm:pt-8 flex items-end justify-between">
          <Skyline className="max-w-[160px] sm:max-w-[200px]" />
          <Waves className="hidden sm:block" />
        </div>
      </div>
    </div>
  )
}
