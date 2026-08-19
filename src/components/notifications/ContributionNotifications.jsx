import React, { useCallback, useEffect, useState } from 'react'
import { BellRing, CheckCircle2, XCircle } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'

const TYPE_LABEL = { sapphic_book: 'Livro', autograph_session: 'Evento', exhibitor: 'Estande/Editora', correction: 'Correção' }

export function ContributionNotifications({ user }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !user?.id) return
    const { data, error } = await supabase.from('contribution_notifications').select('id,contribution_id,contribution_type,status,record_label,created_at,read_at').eq('user_id', user.id).is('read_at', null).order('created_at')
    if (!error) setItems(data || [])
  }, [user?.id])

  useEffect(() => {
    void load()
    const refresh = () => { if (navigator.onLine) void load() }
    const foreground = () => { if (document.visibilityState === 'visible') refresh() }
    window.addEventListener('online', refresh)
    document.addEventListener('visibilitychange', foreground)
    return () => { window.removeEventListener('online', refresh); document.removeEventListener('visibilitychange', foreground) }
  }, [load, user?.id])

  if (!items.length) return null
  const item = items[0]
  const approved = item.status === 'approved'

  const acknowledge = async () => {
    if (loading) return
    setLoading(true)
    const readAt = new Date().toISOString()
    const { error } = await supabase.from('contribution_notifications').update({ read_at: readAt }).eq('id', item.id).eq('user_id', user.id).is('read_at', null)
    if (!error) setItems(current => current.filter(notification => notification.id !== item.id))
    setLoading(false)
  }

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#2d0920]/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="contribution-notification-title">
    <div className="auth-card w-full max-w-md rounded-3xl border p-6 shadow-2xl">
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${approved ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{approved ? <CheckCircle2 className="h-6 w-6"/> : <XCircle className="h-6 w-6"/>}</div>
        <div><div className="flex items-center gap-2"><BellRing className="h-4 w-4 text-[#d43276]"/><h2 id="contribution-notification-title" className="auth-title text-lg font-black">Atualização da sua contribuição</h2></div><p className="auth-muted mt-2 text-sm">Sua sugestão de <strong>{TYPE_LABEL[item.contribution_type] || 'registro'}</strong> foi <strong>{approved ? 'aprovada e publicada' : 'reprovada'}</strong>.</p>{item.record_label && <p className="mt-3 rounded-xl bg-[#fff0f6] p-3 text-sm font-bold text-[#7b3a60] dark:bg-[#59163f] dark:text-[#fc94c3]">{item.record_label}</p>}</div>
      </div>
      <button type="button" disabled={loading} onClick={acknowledge} className="auth-submit mt-6 w-full rounded-xl py-3 text-sm font-black text-white disabled:opacity-60">{loading ? 'Confirmando...' : 'OK, entendi'}</button>
      {items.length > 1 && <p className="auth-muted mt-2 text-center text-[11px]">Você tem mais {items.length - 1} {items.length === 2 ? 'aviso' : 'avisos'}.</p>}
    </div>
  </div>
}
