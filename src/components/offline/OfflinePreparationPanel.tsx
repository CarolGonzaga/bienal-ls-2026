import React, { useEffect } from 'react'
import { Check, Download, RefreshCw, WifiOff, X } from 'lucide-react'
import { useOfflineStore } from '../../stores/useOfflineStore'

const LABELS: Record<string, string> = { exhibitors: 'Expositores', books: 'Livros', schedule: 'Programação', authors: 'Autoras', passport: 'Passaporte', passport_codes: 'Códigos' }

export const OfflinePreparationPanel: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { online, preparing, progress, error, readiness, refreshStatus, prepare } = useOfflineStore()
  useEffect(() => { if (open) void refreshStatus() }, [open, refreshStatus])
  if (!open) return null
  const date = readiness?.lastUpdated ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(readiness.lastUpdated)) : null
  return <div className="fixed inset-0 z-[95] flex items-end justify-center bg-[#2d0920]/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="offline-title">
    <section className="auth-card max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border p-6 shadow-2xl sm:rounded-3xl">
      <div className="flex items-start justify-between gap-4"><div><h2 id="offline-title" className="auth-title text-xl font-black">Prepare o Mapa Sáfico para funcionar sem internet</h2><p className="auth-muted mt-2 text-sm">Baixe os dados e recursos essenciais antes de chegar à Bienal.</p></div><button onClick={onClose} aria-label="Fechar" className="rounded-full p-2"><X className="h-5 w-5"/></button></div>
      {!online && <div className="mt-4 flex gap-2 rounded-xl bg-amber-100 p-3 text-xs font-bold text-amber-900"><WifiOff className="h-4 w-4 shrink-0"/>Você está offline. As informações correspondem à última atualização disponível neste aparelho.</div>}
      <div className="mt-5 grid grid-cols-2 gap-2">
        {Object.entries(LABELS).map(([key, label]) => <div key={key} className="flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-bold"><span>{label}</span>{readiness?.datasets?.[key] ? <Check className="h-4 w-4 text-emerald-600"/> : <span className="text-amber-600">Pendente</span>}</div>)}
        <div className="col-span-2 flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-bold"><span>Mapa e imagens essenciais</span>{readiness?.assets ? <Check className="h-4 w-4 text-emerald-600"/> : <span className="text-amber-600">Pendente</span>}</div>
      </div>
      {readiness?.ready && <div className="mt-4 rounded-xl bg-emerald-100 p-3 text-sm font-black text-emerald-800">Pronto para uso offline</div>}
      {date && <p className="auth-muted mt-3 text-xs">Dados atualizados em: {date}</p>}
      {progress && <p className="mt-3 text-xs font-bold text-[#9b376c]">{progress}</p>}
      {error && <p role="alert" className="mt-3 rounded-xl bg-rose-100 p-3 text-xs font-bold text-rose-700">{error}</p>}
      <button disabled={preparing || !online} onClick={() => void prepare(Boolean(readiness?.ready))} className="auth-submit mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-black text-white disabled:opacity-50">{preparing ? <RefreshCw className="h-4 w-4 animate-spin"/> : <Download className="h-4 w-4"/>}{preparing ? 'Preparando...' : readiness?.ready ? 'Verificar atualizações' : 'Baixar para uso offline'}</button>
    </section>
  </div>
}
