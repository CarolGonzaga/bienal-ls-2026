import React, { useEffect, useMemo, useState } from 'react'
import { BookOpen, Building2, CalendarDays, Check, ClipboardList, LayoutDashboard, LogOut, Pencil, RefreshCw, Save, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { appPath } from '../../lib/paths'
import { useMapStore } from '../../stores/useMapStore'

const TABS = [
  ['overview', 'Visão geral', LayoutDashboard],
  ['reviews', 'Revisões', ClipboardList],
  ['exhibitors', 'Expositores', Building2],
  ['books', 'Livros', BookOpen],
  ['events', 'Eventos', CalendarDays]
]
const TYPE_LABEL = { sapphic_book: 'Livro sáfico', autograph_session: 'Sessão de autógrafo', exhibitor: 'Estande/Editora', correction: 'Correção' }
const ROLE_LABEL = { reader: 'Leitora', author: 'Autora', publisher: 'Editora' }

const JsonEditor = ({ value, onSave, onCancel }) => {
  const [draft, setDraft] = useState(JSON.stringify(value, null, 2))
  const [error, setError] = useState('')
  return <div className="mt-3"><textarea value={draft} onChange={event => setDraft(event.target.value)} className="admin-input min-h-72 w-full rounded-xl border p-3 font-mono text-xs"/>{error && <p className="mt-1 text-xs font-bold text-rose-500">{error}</p>}<div className="mt-2 flex gap-2"><button onClick={() => { try { onSave(JSON.parse(draft)) } catch { setError('JSON inválido. Verifique vírgulas e aspas.') } }} className="admin-primary flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-black text-white"><Save className="h-4 w-4"/>Registrar</button><button onClick={onCancel} className="admin-secondary rounded-lg border px-3 py-2 text-xs font-black">Cancelar</button></div></div>
}

export default function AdminDashboard() {
  const mapTheme = useMapStore(state => state.mapTheme)
  const [authorized, setAuthorized] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [data, setData] = useState({ contributions: [], exhibitors: [], books: [], events: [] })
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    const [contributions, exhibitors, books, events] = await Promise.all([
      supabase.from('community_contributions').select('*').order('created_at', { ascending: false }),
      supabase.from('exhibitors').select('*').order('name'),
      supabase.from('books').select('*').order('created_at', { ascending: false }),
      supabase.from('events').select('*').order('event_date', { ascending: true })
    ])
    setData({ contributions: contributions.data || [], exhibitors: exhibitors.data || [], books: books.data || [], events: events.data || [] })
    setLoading(false)
  }

  useEffect(() => {
    document.documentElement.dataset.theme = mapTheme
    void supabase.auth.getUser().then(async ({ data: authData }) => {
      if (!authData.user) return setAuthorized(false)
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', authData.user.id).maybeSingle()
      const allowed = profile?.role === 'admin'
      setAuthorized(allowed)
      if (allowed) void load()
    })
  }, [mapTheme])

  const counts = useMemo(() => ({ pending: data.contributions.filter(item => item.status === 'pending').length, approved: data.contributions.filter(item => item.status === 'approved').length }), [data.contributions])
  const notify = text => { setMessage(text); window.setTimeout(() => setMessage(''), 3000) }

  const saveContribution = async (item, payload) => {
    const { error } = await supabase.from('community_contributions').update({ payload, updated_at: new Date().toISOString() }).eq('id', item.id)
    if (error) return notify(error.message)
    setEditing(null); notify('Alterações registradas.'); void load()
  }
  const approve = async id => { const { error } = await supabase.rpc('approve_community_contribution', { contribution_id: id }); if (error) return notify(error.message); notify('Contribuição aprovada e publicada.'); void load() }
  const reject = async id => { const { error } = await supabase.from('community_contributions').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', id); if (error) return notify(error.message); notify('Contribuição rejeitada.'); void load() }
  const remove = async (table, id) => { if (!window.confirm('Excluir este registro permanentemente?')) return; const { error } = await supabase.from(table).delete().eq('id', id); if (error) return notify(error.message); notify('Registro excluído.'); void load() }
  const saveRecord = async (table, item, next) => { const clean = { ...next, updated_at: new Date().toISOString() }; delete clean.id; delete clean.created_at; const { error } = await supabase.from(table).update(clean).eq('id', item.id); if (error) return notify(error.message); setEditing(null); notify('Registro salvo no banco.'); void load() }

  if (authorized === null) return <div className={`site-theme theme-${mapTheme} flex min-h-[100dvh] items-center justify-center`}>Verificando acesso...</div>
  if (!authorized) return <div className={`site-theme theme-${mapTheme} flex min-h-[100dvh] items-center justify-center p-5`}><div className="auth-card max-w-md rounded-3xl border p-8 text-center"><h1 className="auth-title text-2xl font-black">Acesso restrito</h1><p className="auth-muted my-4 text-sm">Esta área está disponível apenas para administradores.</p><a href={appPath('/login')} className="auth-submit inline-flex rounded-xl px-5 py-3 text-sm font-black text-white">Voltar ao mapa</a></div></div>

  const records = activeTab === 'exhibitors' ? data.exhibitors : activeTab === 'books' ? data.books : data.events
  const table = activeTab
  return <div className={`site-theme theme-${mapTheme} admin-page min-h-[100dvh]`}>
    <header className="admin-header sticky top-0 z-30 flex h-16 items-center justify-between border-b px-4 lg:px-6"><div><h1 className="text-lg font-black">Painel LS</h1><p className="text-[10px] opacity-60">Mapa Sáfico · Administração editorial</p></div><div className="flex gap-2"><button onClick={load} className="admin-secondary rounded-xl border p-2.5" title="Atualizar"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/></button><a href={appPath('/')} className="admin-secondary flex items-center gap-2 rounded-xl border px-3 text-xs font-black"><LogOut className="h-4 w-4"/>Mapa</a></div></header>
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col lg:flex-row">
      <aside className="admin-sidebar border-b p-3 lg:w-60 lg:border-b-0 lg:border-r lg:p-4"><nav className="flex gap-2 overflow-x-auto lg:flex-col">{TABS.map(([id,label,Icon]) => <button key={id} onClick={() => { setActiveTab(id); setEditing(null) }} className={`admin-nav flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black ${activeTab === id ? 'is-active' : ''}`}><Icon className="h-4 w-4"/>{label}{id === 'reviews' && counts.pending > 0 && <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] text-white">{counts.pending}</span>}</button>)}</nav></aside>
      <main className="min-w-0 flex-1 p-4 lg:p-6">{message && <div className="admin-notice fixed right-5 top-20 z-50 rounded-xl border px-4 py-3 text-xs font-bold shadow-xl">{message}</div>}
        {activeTab === 'overview' && <><h2 className="mb-5 text-2xl font-black">Visão geral</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[[counts.pending,'Pendentes',ClipboardList],[counts.approved,'Aprovadas',Check],[data.exhibitors.length,'Expositores',Building2],[data.books.length + data.events.length,'Conteúdos',BookOpen]].map(([count,label,Icon]) => <article key={label} className="admin-card rounded-2xl border p-5"><Icon className="mb-3 h-5 w-5 text-[#d43276]"/><strong className="block text-3xl font-black">{count}</strong><span className="text-xs opacity-65">{label}</span></article>)}</div></>}
        {activeTab === 'reviews' && <><div className="mb-5"><h2 className="text-2xl font-black">Fila de revisão</h2><p className="text-sm opacity-65">Edite, registre e aprove informações enviadas pela comunidade.</p></div><div className="grid gap-4">{data.contributions.map(item => <article key={item.id} className="admin-card rounded-2xl border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><span className={`admin-status status-${item.status}`}>{item.status === 'pending' ? 'Pendente' : item.status === 'approved' ? 'Aprovada' : 'Rejeitada'}</span><span className="text-xs font-black">{TYPE_LABEL[item.contribution_type]}</span><span className="text-xs opacity-60">por {ROLE_LABEL[item.contributor_role]}</span></div><p className="mt-2 text-xs opacity-70">Enviado por {item.submitter_name}{item.submitter_contact ? ` · ${item.submitter_contact}` : ''}</p></div><div className="flex gap-1"><button onClick={() => setEditing(editing === item.id ? null : item.id)} className="admin-icon"><Pencil className="h-4 w-4"/></button><button onClick={() => remove('community_contributions', item.id)} className="admin-icon text-rose-500"><Trash2 className="h-4 w-4"/></button></div></div>{editing === item.id ? <JsonEditor value={item.payload} onSave={payload => saveContribution(item, payload)} onCancel={() => setEditing(null)}/> : <dl className="mt-3 grid gap-2 rounded-xl bg-black/5 p-3 text-xs dark:bg-white/5 sm:grid-cols-2">{Object.entries(item.payload || {}).filter(([,value]) => value && (!Array.isArray(value) || value.length)).map(([key,value]) => <div key={key}><dt className="font-black text-[#b94185]">{key.replaceAll('_',' ')}</dt><dd className="break-words opacity-75">{Array.isArray(value) ? value.join(', ') : String(value)}</dd></div>)}</dl>}{item.status === 'pending' && editing !== item.id && <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => setEditing(item.id)} className="admin-secondary flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-black"><Pencil className="h-4 w-4"/>Editar</button><button onClick={() => approve(item.id)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white">Aprovar e publicar</button><button onClick={() => reject(item.id)} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-black text-white">Rejeitar</button></div>}</article>)}{!data.contributions.length && <p className="admin-card rounded-2xl border p-8 text-center text-sm opacity-60">Nenhuma contribuição recebida.</p>}</div></>}
        {['exhibitors','books','events'].includes(activeTab) && <><div className="mb-5"><h2 className="text-2xl font-black">{TABS.find(([id]) => id === activeTab)?.[1]}</h2><p className="text-sm opacity-65">Alterações salvas aqui são aplicadas diretamente ao banco.</p></div><div className="grid gap-3">{records.map(item => <article key={item.id} className="admin-card rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><strong className="block truncate">{item.name || item.title || item.author_name}</strong><span className="text-xs opacity-60">{item.stand_code || item.event_date || item.publisher || item.id}</span></div><div className="flex gap-1"><button onClick={() => setEditing(editing === item.id ? null : item.id)} className="admin-icon"><Pencil className="h-4 w-4"/></button><button onClick={() => remove(table, item.id)} className="admin-icon text-rose-500"><Trash2 className="h-4 w-4"/></button></div></div>{editing === item.id && <JsonEditor value={item} onSave={next => saveRecord(table, item, next)} onCancel={() => setEditing(null)}/>}</article>)}</div></>}
      </main>
    </div>
  </div>
}
