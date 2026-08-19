import React, { useEffect, useMemo, useState } from 'react'
import {
  BookOpen, Building2, CalendarDays, Check, ChevronUp,
  Activity, ClipboardList, LayoutDashboard, LogOut, Pencil, Plus, RefreshCw,
  Save, Trash2, Users
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { appPath } from '../../lib/paths'
import { useMapStore } from '../../stores/useMapStore'
import AuthorsAdminPanel from './AuthorsAdminPanel'
import SystemHealthPanel from './SystemHealthPanel'

const TABS = [
  ['overview', 'Visão geral', LayoutDashboard],
  ['reviews', 'Revisões', ClipboardList],
  ['exhibitors', 'Expositores', Building2],
  ['books', 'Livros', BookOpen],
  ['events', 'Programação', CalendarDays],
  ['authors', 'Autoras', Users],
  ['audit', 'Auditoria', ClipboardList],
  ['health', 'Saúde', Activity]
]
const TYPE_LABEL = { sapphic_book: 'Livro sáfico', autograph_session: 'Sessão de autógrafo', exhibitor: 'Estande/Editora', correction: 'Correção' }
const ROLE_LABEL = { reader: 'Leitora', author: 'Autora', publisher: 'Editora' }
const RELEVANCE_OPTIONS = [
  ['curadoria_direta', 'Curadoria direta'],
  ['catalogo_confirmado', 'Catálogo confirmado'],
  ['titulos_pontuais', 'Títulos pontuais'],
  ['neutro', 'Neutro']
]

/* ── Shared helpers ─────────────────────────────────────── */
const Field = ({ label, children }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-black uppercase tracking-wider opacity-60">{label}</label>
    {children}
  </div>
)

const TextInput = ({ value, onChange, placeholder, type = 'text' }) => (
  <input
    type={type}
    value={value ?? ''}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    className="admin-input w-full rounded-xl border px-3 py-2 text-xs"
  />
)

const Textarea = ({ value, onChange, placeholder, rows = 3 }) => (
  <textarea
    value={value ?? ''}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    rows={rows}
    className="admin-input w-full rounded-xl border px-3 py-2 text-xs"
  />
)

const Toggle = ({ label, value, onChange }) => (
  <label className="flex cursor-pointer items-center gap-2 text-xs font-bold">
    <span
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${value ? 'bg-[#d43276]' : 'bg-black/20 dark:bg-white/20'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0'}`} />
    </span>
    {label}
  </label>
)

const TagsInput = ({ value = [], onChange }) => {
  const [raw, setRaw] = useState(value.join(', '))
  return (
    <input
      type="text"
      value={raw}
      onChange={e => { setRaw(e.target.value); onChange(e.target.value.split(',').map(t => t.trim()).filter(Boolean)) }}
      placeholder="tag1, tag2, tag3"
      className="admin-input w-full rounded-xl border px-3 py-2 text-xs"
    />
  )
}

const ArrayInput = ({ value = [], onChange, placeholder }) => {
  const [raw, setRaw] = useState(value.join('\n'))
  return (
    <textarea
      value={raw}
      onChange={e => { setRaw(e.target.value); onChange(e.target.value.split('\n').map(t => t.trim()).filter(Boolean)) }}
      placeholder={placeholder}
      rows={3}
      className="admin-input w-full rounded-xl border px-3 py-2 text-xs"
    />
  )
}

const SelectInput = ({ value, onChange, options }) => (
  <select value={value ?? ''} onChange={e => onChange(e.target.value)} className="admin-input w-full rounded-xl border px-3 py-2 text-xs">
    <option value="">— selecionar —</option>
    {options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
  </select>
)

const FormActions = ({ onSave, onCancel }) => (
  <div className="mt-4 flex gap-2">
    <button
      onClick={onSave}
      className="admin-primary flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-black text-white"
    >
      <Save className="h-3.5 w-3.5" />Salvar
    </button>
    <button onClick={onCancel} className="admin-secondary rounded-xl border px-4 py-2.5 text-xs font-black">
      Cancelar
    </button>
  </div>
)

/* ── Event Editor ───────────────────────────────────────── */
const EventEditor = ({ item, exhibitors, onSave, onCancel }) => {
  const [form, setForm] = useState({
    author_name: item.author_name || '',
    event_type: item.event_type || 'autograph',
    event_date: item.event_date || '',
    start_time: item.start_time ? String(item.start_time).slice(0, 5) : '',
    end_time: item.end_time ? String(item.end_time).slice(0, 5) : '',
    stand_code: item.stand_code || '',
    exhibitor_id: item.exhibitor_id || '',
    location_text: item.location_text || '',
    official_link: item.official_link || '',
    books: item.books || [],
    notes: item.notes || '',
    tags: item.tags || [],
    active: item.active !== false
  })
  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))
  return (
    <div className="mt-4 grid gap-4 rounded-2xl bg-black/5 p-4 dark:bg-white/5 sm:grid-cols-2">
      <Field label="Nome da autora"><TextInput value={form.author_name} onChange={v => set('author_name', v)} placeholder="Nome da autora" /></Field>
      <Field label="Tipo de evento">
        <SelectInput value={form.event_type} onChange={v => set('event_type', v)} options={[['autograph', 'Sessão de autógrafo'], ['presence', 'Presença']]} />
      </Field>
      <Field label="Data">
        <TextInput type="date" value={form.event_date} onChange={v => set('event_date', v)} />
      </Field>
      <Field label="Horário início">
        <TextInput type="time" value={form.start_time} onChange={v => set('start_time', v)} />
      </Field>
      <Field label="Horário fim">
        <TextInput type="time" value={form.end_time} onChange={v => set('end_time', v)} />
      </Field>
      <Field label="Código do estande">
        <TextInput value={form.stand_code} onChange={v => set('stand_code', v)} placeholder="Ex: K33" />
      </Field>
      <Field label="Expositor vinculado">
        <select value={form.exhibitor_id} onChange={e => set('exhibitor_id', e.target.value)} className="admin-input w-full rounded-xl border px-3 py-2 text-xs">
          <option value="">— nenhum —</option>
          {exhibitors.map(ex => <option key={ex.id} value={ex.id}>{ex.stand_code} · {ex.name}</option>)}
        </select>
      </Field>
      <Field label="Texto do local">
        <TextInput value={form.location_text} onChange={v => set('location_text', v)} placeholder="Ex: Pavilhão Leandro Klein" />
      </Field>
      <Field label="Link oficial">
        <TextInput value={form.official_link} onChange={v => set('official_link', v)} placeholder="https://..." />
      </Field>
      <Field label="Livros (um por linha)">
        <ArrayInput value={form.books} onChange={v => set('books', v)} placeholder={"Título do livro 1\nTítulo do livro 2"} />
      </Field>
      <Field label="Notas / observações">
        <Textarea value={form.notes} onChange={v => set('notes', v)} placeholder="Notas internas..." />
      </Field>
      <Field label="Tags (vírgula separada)">
        <TagsInput value={form.tags} onChange={v => set('tags', v)} />
      </Field>
      <div className="sm:col-span-2">
        <Toggle label="Evento ativo (visível no site)" value={form.active} onChange={v => set('active', v)} />
      </div>
      <div className="sm:col-span-2">
        <FormActions onSave={() => onSave(form)} onCancel={onCancel} />
      </div>
    </div>
  )
}

/* ── Book Editor ────────────────────────────────────────── */
const BookEditor = ({ item, exhibitors, onSave, onCancel }) => {
  const [form, setForm] = useState({
    title: item.title || '',
    author_name: item.author_name || '',
    publisher: item.publisher || '',
    stand_code: item.stand_code || '',
    exhibitor_id: item.exhibitor_id || '',
    notes: item.notes || '',
    tags: item.tags || [],
    active: item.active !== false
  })
  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))
  return (
    <div className="mt-4 grid gap-4 rounded-2xl bg-black/5 p-4 dark:bg-white/5 sm:grid-cols-2">
      <Field label="Título"><TextInput value={form.title} onChange={v => set('title', v)} placeholder="Título do livro" /></Field>
      <Field label="Nome da autora"><TextInput value={form.author_name} onChange={v => set('author_name', v)} placeholder="Nome da autora" /></Field>
      <Field label="Editora"><TextInput value={form.publisher} onChange={v => set('publisher', v)} placeholder="Nome da editora" /></Field>
      <Field label="Código do estande"><TextInput value={form.stand_code} onChange={v => set('stand_code', v)} placeholder="Ex: K33" /></Field>
      <Field label="Expositor vinculado">
        <select value={form.exhibitor_id} onChange={e => set('exhibitor_id', e.target.value)} className="admin-input w-full rounded-xl border px-3 py-2 text-xs">
          <option value="">— nenhum —</option>
          {exhibitors.map(ex => <option key={ex.id} value={ex.id}>{ex.stand_code} · {ex.name}</option>)}
        </select>
      </Field>
      <Field label="Notas / observações">
        <Textarea value={form.notes} onChange={v => set('notes', v)} placeholder="Notas internas..." />
      </Field>
      <Field label="Tags (vírgula separada)">
        <TagsInput value={form.tags} onChange={v => set('tags', v)} />
      </Field>
      <div className="sm:col-span-2">
        <Toggle label="Livro ativo (visível no site)" value={form.active} onChange={v => set('active', v)} />
      </div>
      <div className="sm:col-span-2">
        <FormActions onSave={() => onSave(form)} onCancel={onCancel} />
      </div>
    </div>
  )
}

/* ── Exhibitor Editor ───────────────────────────────────── */
const ExhibitorEditor = ({ item, onSave, onCancel }) => {
  const [form, setForm] = useState({
    name: item.name || '',
    stand_code: item.stand_code || '',
    description: item.description || '',
    reason_to_visit: item.reason_to_visit || '',
    logo: item.logo || '',
    relevance_level: item.relevance_level || 'neutro',
    relevance_reasons: item.relevance_reasons || [],
    categories: item.categories || [],
    featured: item.featured || false,
    active: item.active !== false
  })
  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))
  return (
    <div className="mt-4 grid gap-4 rounded-2xl bg-black/5 p-4 dark:bg-white/5 sm:grid-cols-2">
      <Field label="Nome"><TextInput value={form.name} onChange={v => set('name', v)} placeholder="Nome do expositor" /></Field>
      <Field label="Código do estande"><TextInput value={form.stand_code} onChange={v => set('stand_code', v)} placeholder="Ex: K33" /></Field>
      <div className="sm:col-span-2">
        <Field label="Descrição"><Textarea value={form.description} onChange={v => set('description', v)} placeholder="Descrição para o público..." rows={3} /></Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Motivo para visitar"><Textarea value={form.reason_to_visit} onChange={v => set('reason_to_visit', v)} placeholder="Por que visitar este estande?" rows={2} /></Field>
      </div>
      <Field label="URL do logo"><TextInput value={form.logo} onChange={v => set('logo', v)} placeholder="https://..." /></Field>
      <Field label="Nível de relevância">
        <SelectInput value={form.relevance_level} onChange={v => set('relevance_level', v)} options={RELEVANCE_OPTIONS} />
      </Field>
      <Field label="Motivos de relevância (um por linha)">
        <ArrayInput value={form.relevance_reasons} onChange={v => set('relevance_reasons', v)} placeholder={"Motivo 1\nMotivo 2"} />
      </Field>
      <Field label="Categorias (vírgula separada)">
        <TagsInput value={form.categories} onChange={v => set('categories', v)} />
      </Field>
      <div className="sm:col-span-2 flex flex-wrap gap-4">
        <Toggle label="Destaque" value={form.featured} onChange={v => set('featured', v)} />
        <Toggle label="Ativo (visível no site)" value={form.active} onChange={v => set('active', v)} />
      </div>
      <div className="sm:col-span-2">
        <FormActions onSave={() => onSave(form)} onCancel={onCancel} />
      </div>
    </div>
  )
}

/* ── JSON fallback for contributions ───────────────────── */
const JsonEditor = ({ value, onSave, onCancel }) => {
  const [draft, setDraft] = useState(JSON.stringify(value, null, 2))
  const [error, setError] = useState('')
  return (
    <div className="mt-3">
      <textarea value={draft} onChange={e => setDraft(e.target.value)} className="admin-input min-h-72 w-full rounded-xl border p-3 font-mono text-xs" />
      {error && <p className="mt-1 text-xs font-bold text-rose-500">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button onClick={() => { try { onSave(JSON.parse(draft)) } catch { setError('JSON inválido. Verifique vírgulas e aspas.') } }} className="admin-primary flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-black text-white">
          <Save className="h-4 w-4" />Registrar
        </button>
        <button onClick={onCancel} className="admin-secondary rounded-lg border px-3 py-2 text-xs font-black">Cancelar</button>
      </div>
    </div>
  )
}

const ReviewResolution = ({ item, books, events, exhibitors, onApprove, onReject, busy }) => {
  const [resolution, setResolution] = useState('create')
  const [targetId, setTargetId] = useState('')
  const [notes, setNotes] = useState('')
  const candidates = item.contribution_type === 'sapphic_book'
    ? books.map(book => ({ id: book.id, label: `${book.title} · ${book.author_name}` }))
    : item.contribution_type === 'autograph_session'
      ? events.map(event => ({ id: event.id, label: `${event.event_date || 'sem data'} · ${event.start_time?.slice(0, 5) || 'sem horário'} · ${event.author_name}` }))
      : item.contribution_type === 'exhibitor'
        ? exhibitors.map(exhibitor => ({ id: exhibitor.id, label: `${exhibitor.stand_code} · ${exhibitor.name}` }))
        : []
  const requiresTarget = resolution === 'link' || resolution === 'update'
  const isCorrection = item.contribution_type === 'correction'
  return (
    <div className="mt-4 rounded-2xl border border-[#efb4d0] bg-[#fff8fb] p-4 dark:bg-white/5">
      <h3 className="text-sm font-black">Decisão editorial</h3>
      <p className="mt-1 text-xs opacity-70">A aprovação só acontece depois que você define o destino. Nenhum expositor é escolhido automaticamente pelo código do estande.</p>
      {isCorrection ? <p className="mt-3 rounded-lg bg-amber-100 p-3 text-xs font-bold text-amber-900">Correções estruturadas serão incluídas na próxima etapa. Por enquanto, registre a alteração diretamente no conteúdo e rejeite esta sugestão com uma observação.</p> : <>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {[['create', 'Criar novo'], ['link', 'Vincular existente'], ['update', 'Atualizar existente']].map(([value, label]) => <button key={value} type="button" onClick={() => { setResolution(value); if (value === 'create') setTargetId('') }} className={`rounded-xl border px-3 py-2 text-xs font-black ${resolution === value ? 'border-[#d43276] bg-[#d43276] text-white' : 'admin-secondary'}`}>{label}</button>)}
        </div>
        {requiresTarget && <label className="mt-3 block text-xs font-bold">Registro de destino<select value={targetId} onChange={event => setTargetId(event.target.value)} className="admin-input mt-1 w-full rounded-xl border px-3 py-2 text-xs"><option value="">— selecionar —</option>{candidates.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}</select></label>}
      </>}
      <label className="mt-3 block text-xs font-bold">Observação da revisão (opcional)<textarea value={notes} onChange={event => setNotes(event.target.value)} className="admin-input mt-1 min-h-20 w-full rounded-xl border p-3 text-xs" /></label>
      <div className="mt-3 flex flex-wrap gap-2">
        {!isCorrection && <button disabled={busy || (requiresTarget && !targetId)} onClick={() => onApprove({ resolution, targetId, notes })} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">{busy ? 'Registrando…' : 'Confirmar aprovação'}</button>}
        <button disabled={busy} onClick={() => onReject(notes)} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">Rejeitar</button>
      </div>
    </div>
  )
}

/* ── Main Dashboard ─────────────────────────────────────── */
export default function AdminDashboard() {
  const mapTheme = useMapStore(state => state.mapTheme)
  const [authorized, setAuthorized] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [data, setData] = useState({ contributions: [], exhibitors: [], books: [], events: [], authors: [], passportProfiles: [], authorRequests: [], auditLogs: [], health: null, budget: null })
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [reviewing, setReviewing] = useState('')

  const load = async () => {
    setLoading(true)
    const [contributions, exhibitors, books, events, authors, passportProfiles, authorRequests, auditLogs, health, budget] = await Promise.all([
      supabase.from('community_contributions').select('id,user_id,client_submission_id,contribution_type,contributor_role,payload,submitter_name,submitter_contact,status,admin_notes,reviewed_at,review_resolution,review_target_type,review_target_id,review_payload,review_version,created_at,updated_at').is('deleted_at', null).order('created_at', { ascending: false }),
      supabase.from('exhibitors').select('id,logo,name,description,reason_to_visit,stand_code,active,relevance_level,relevance_reasons,categories,featured,created_at,updated_at,deleted_at').is('deleted_at', null).order('name'),
      supabase.from('books').select('id,title,author_name,publisher,stand_code,exhibitor_id,notes,tags,active,source_contribution_id,created_at,updated_at,deleted_at').is('deleted_at', null).order('created_at', { ascending: false }),
      supabase.from('events').select('id,event_type,author_name,books,event_date,start_time,end_time,stand_code,exhibitor_id,location_text,official_link,notes,tags,active,source_contribution_id,created_at,updated_at,deleted_at').is('deleted_at', null).order('event_date', { ascending: true }).order('start_time', { ascending: true }),
      supabase.from('authors').select('id,slug,name,first_name,bio,message,active,published,created_at,updated_at,deleted_at').is('deleted_at', null).order('name'),
      supabase.from('passport_profiles').select('author_id,photo_path,bio,message,books,presences,autograph_sessions,sale_locations,status,consent_version,consent_accepted_at,submitted_at,reviewed_at,updated_at,deleted_at'),
      supabase.from('author_change_requests').select('id,author_id,submitted_by,request_type,urgent_type,affected_date,payload,status,admin_notes,submitted_at,reviewed_at,created_at,updated_at').order('affected_date', { ascending: true, nullsFirst: false }),
      supabase.from('audit_log').select('id,actor_user_id,actor_role,action,entity_type,entity_id,source_contribution_id,created_at').order('created_at', { ascending: false }).limit(100),
      supabase.rpc('get_system_health'),
      supabase.from('system_budget_config').select('database_budget_bytes,storage_budget_bytes,warning_thresholds,updated_at').maybeSingle()
    ])
    setData({
      contributions: contributions.data || [],
      exhibitors: exhibitors.data || [],
      books: books.data || [],
      events: events.data || [],
      authors: authors.data || [],
      passportProfiles: passportProfiles.data || [],
      authorRequests: authorRequests.data || [],
      auditLogs: auditLogs.data || [],
      health: health.data || null,
      budget: budget.data || null
    })
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

  const counts = useMemo(() => ({
    pending: data.contributions.filter(item => item.status === 'pending').length,
    approved: data.contributions.filter(item => item.status === 'approved').length
  }), [data.contributions])

  const notify = text => { setMessage(text); window.setTimeout(() => setMessage(''), 4000) }

  const saveContribution = async (item, payload) => {
    const { error } = await supabase.rpc('update_contribution_for_review', { p_contribution_id: item.id, p_payload: payload, p_expected_updated_at: item.updated_at })
    if (error) return notify(error.message)
    setEditing(null); notify('Alterações registradas.'); void load()
  }

  const approve = async (item, { resolution, targetId, notes }) => {
    setReviewing(item.id)
    const { error } = await supabase.rpc('review_community_contribution', { p_contribution_id: item.id, p_decision: 'approved', p_resolution: resolution, p_reviewed_payload: item.payload, p_target_entity_id: targetId || null, p_expected_updated_at: item.updated_at, p_admin_notes: notes || null })
    setReviewing('')
    if (error) return notify(error.message)
    notify('Contribuição aprovada e publicada.'); void load()
  }

  const reject = async (item, notes = '') => {
    setReviewing(item.id)
    const { error } = await supabase.rpc('review_community_contribution', { p_contribution_id: item.id, p_decision: 'rejected', p_resolution: 'none', p_reviewed_payload: item.payload, p_target_entity_id: null, p_expected_updated_at: item.updated_at, p_admin_notes: notes || null })
    setReviewing('')
    if (error) return notify(error.message)
    notify('Contribuição rejeitada.'); void load()
  }

  const remove = async (table, id) => {
    if (table === 'community_contributions') {
      if (!window.confirm('Arquivar esta contribuição? Ela permanecerá disponível na auditoria.')) return
      const { error } = await supabase.rpc('archive_community_contribution', { p_contribution_id: id })
      if (error) return notify(error.message)
      notify('Contribuição arquivada.'); void load(); return
    }
    const softDelete = ['exhibitors', 'books', 'events'].includes(table)
    if (!window.confirm(softDelete ? 'Arquivar este registro? Ele poderá ser recuperado diretamente no banco.' : 'Excluir este registro permanentemente?')) return
    const operation = softDelete
      ? supabase.from(table).update({ deleted_at: new Date().toISOString(), active: false }).eq('id', id)
      : supabase.from(table).delete().eq('id', id)
    const { error } = await operation
    if (error) return notify(error.message)
    notify('Registro excluído.'); void load()
  }

  const saveRecord = async (table, item, next) => {
    const clean = { ...next, updated_at: new Date().toISOString() }
    delete clean.id; delete clean.created_at; delete clean.source_contribution_id
    const nullableFields = ['exhibitor_id', 'publisher', 'stand_code', 'location_text', 'official_link', 'end_time', 'logo']
    for (const f of nullableFields) { if (clean[f] === '') clean[f] = null }
    const { error } = await supabase.from(table).update(clean).eq('id', item.id)
    if (error) return notify(error.message)
    setEditing(null); notify('Registro salvo com sucesso.'); void load()
  }

  const createRecord = async (table, next) => {
    const clean = { ...next }
    const nullableFields = ['exhibitor_id', 'publisher', 'stand_code', 'location_text', 'official_link', 'end_time', 'logo']
    for (const f of nullableFields) { if (clean[f] === '') clean[f] = null }
    const { error } = await supabase.from(table).insert(clean)
    if (error) return notify(error.message)
    setCreating(false); notify('Registro criado com sucesso.'); void load()
  }

  const formatDate = d => d ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${d}T12:00:00`)) : '—'
  const formatTime = t => t ? String(t).slice(0, 5) : ''

  if (authorized === null) return <div className={`site-theme theme-${mapTheme} flex min-h-[100dvh] items-center justify-center`}>Verificando acesso...</div>
  if (!authorized) return (
    <div className={`site-theme theme-${mapTheme} flex min-h-[100dvh] items-center justify-center p-5`}>
      <div className="auth-card max-w-md rounded-3xl border p-8 text-center">
        <h1 className="auth-title text-2xl font-black">Acesso restrito</h1>
        <p className="auth-muted my-4 text-sm">Esta área está disponível apenas para administradores.</p>
        <a href={appPath('/login')} className="auth-submit inline-flex rounded-xl px-5 py-3 text-sm font-black text-white">Voltar ao mapa</a>
      </div>
    </div>
  )

  return (
    <div className={`site-theme theme-${mapTheme} admin-page min-h-[100dvh]`}>
      <header className="admin-header sticky top-0 z-30 flex h-16 items-center justify-between border-b px-4 lg:px-6">
        <div>
          <h1 className="text-lg font-black">Painel LS</h1>
          <p className="text-[10px] opacity-60">Mapa Sáfico · Administração editorial</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="admin-secondary rounded-xl border p-2.5" title="Atualizar">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <a href={appPath('/')} className="admin-secondary flex items-center gap-2 rounded-xl border px-3 text-xs font-black">
            <LogOut className="h-4 w-4" />Mapa
          </a>
        </div>
      </header>

      <div className="flex min-h-[calc(100dvh-4rem)] flex-col lg:flex-row">
        <aside className="admin-sidebar border-b p-3 lg:w-60 lg:border-b-0 lg:border-r lg:p-4">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col">
            {TABS.map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => { setActiveTab(id); setEditing(null); setCreating(false) }}
                className={`admin-nav flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black ${activeTab === id ? 'is-active' : ''}`}
              >
                <Icon className="h-4 w-4" />{label}
                {id === 'reviews' && counts.pending > 0 && (
                  <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] text-white">{counts.pending}</span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-4 lg:p-6">
          {message && (
            <div className="admin-notice fixed right-5 top-20 z-50 rounded-xl border px-4 py-3 text-xs font-bold shadow-xl">{message}</div>
          )}

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              <h2 className="mb-5 text-2xl font-black">Visão geral</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  [counts.pending, 'Pendentes', ClipboardList],
                  [counts.approved, 'Aprovadas', Check],
                  [data.exhibitors.length, 'Expositores', Building2],
                  [data.events.length, 'Eventos', CalendarDays],
                  [data.books.length, 'Livros', BookOpen]
                ].map(([count, label, Icon]) => (
                  <article key={label} className="admin-card rounded-2xl border p-5">
                    <Icon className="mb-3 h-5 w-5 text-[#d43276]" />
                    <strong className="block text-3xl font-black">{count}</strong>
                    <span className="text-xs opacity-65">{label}</span>
                  </article>
                ))}
              </div>
            </>
          )}

          {/* REVIEWS */}
          {activeTab === 'reviews' && (
            <>
              <div className="mb-5">
                <h2 className="text-2xl font-black">Fila de revisão</h2>
                <p className="text-sm opacity-65">Edite, registre e aprove informações enviadas pela comunidade.</p>
              </div>
              <div className="grid gap-4">
                {data.contributions.map(item => (
                  <article key={item.id} className="admin-card rounded-2xl border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`admin-status status-${item.status}`}>
                            {item.status === 'pending' ? 'Pendente' : item.status === 'approved' ? 'Aprovada' : 'Rejeitada'}
                          </span>
                          <span className="text-xs font-black">{TYPE_LABEL[item.contribution_type]}</span>
                          <span className="text-xs opacity-60">por {ROLE_LABEL[item.contributor_role]}</span>
                        </div>
                        <p className="mt-2 text-xs opacity-70">
                          Enviado por {item.submitter_name}{item.submitter_contact ? ` · ${item.submitter_contact}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setEditing(editing === item.id ? null : item.id)} className="admin-icon"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => remove('community_contributions', item.id)} className="admin-icon text-rose-500"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    {editing === item.id
                      ? <JsonEditor value={item.payload} onSave={payload => saveContribution(item, payload)} onCancel={() => setEditing(null)} />
                      : (
                        <dl className="mt-3 grid gap-2 rounded-xl bg-black/5 p-3 text-xs dark:bg-white/5 sm:grid-cols-2">
                          {Object.entries(item.payload || {})
                            .filter(([, value]) => value && (!Array.isArray(value) || value.length))
                            .map(([key, value]) => (
                              <div key={key}>
                                <dt className="font-black text-[#b94185]">{key.replaceAll('_', ' ')}</dt>
                                <dd className="break-words opacity-75">{Array.isArray(value) ? value.join(', ') : String(value)}</dd>
                              </div>
                            ))}
                        </dl>
                      )}
                    {item.status === 'pending' && editing !== item.id && <ReviewResolution item={item} books={data.books} events={data.events} exhibitors={data.exhibitors} busy={reviewing === item.id} onApprove={details => approve(item, details)} onReject={notes => reject(item, notes)} />}
                  </article>
                ))}
                {!data.contributions.length && <p className="admin-card rounded-2xl border p-8 text-center text-sm opacity-60">Nenhuma contribuição recebida.</p>}
              </div>
            </>
          )}

          {activeTab === 'audit' && (
            <section>
              <h2 className="text-2xl font-black">Auditoria</h2>
              <p className="mt-1 text-sm opacity-65">Últimas 100 ações administrativas registradas no banco.</p>
              <div className="mt-5 grid gap-2">{data.auditLogs.map(log => <article key={log.id} className="admin-card flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-xs"><div><strong>{log.action}</strong> · {log.entity_type}{log.entity_id ? ` · ${log.entity_id}` : ''}</div><span className="opacity-60">{new Date(log.created_at).toLocaleString('pt-BR')}</span></article>)}{!data.auditLogs.length && <p className="admin-card rounded-xl border p-6 text-center text-sm opacity-60">Nenhuma ação registrada ainda.</p>}</div>
            </section>
          )}

          {/* EVENTS / PROGRAMAÇÃO */}
          {activeTab === 'events' && (
            <>
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black">Programação</h2>
                  <p className="text-sm opacity-65">{data.events.length} evento(s) · Alterações diretas no banco.</p>
                </div>
                <button
                  onClick={() => { setCreating(v => !v); setEditing(null) }}
                  className="admin-primary flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-black text-white"
                >
                  <Plus className="h-4 w-4" />Novo evento
                </button>
              </div>

              {creating && (
                <div className="mb-5 admin-card rounded-2xl border p-4">
                  <p className="mb-2 text-xs font-black uppercase tracking-wider opacity-60">Novo evento</p>
                  <EventEditor
                    item={{ active: true }}
                    exhibitors={data.exhibitors}
                    onSave={form => createRecord('events', form)}
                    onCancel={() => setCreating(false)}
                  />
                </div>
              )}

              <div className="grid gap-3">
                {data.events.map(item => (
                  <article key={item.id} className="admin-card rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="truncate text-sm font-black">{item.author_name}</strong>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.event_type === 'presence' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' : 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300'}`}>
                            {item.event_type === 'presence' ? 'Presença' : 'Autógrafo'}
                          </span>
                          {!item.active && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-900/40 dark:text-rose-300">Inativo</span>}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs opacity-65">
                          <span>{formatDate(item.event_date)}{item.start_time ? ` · ${formatTime(item.start_time)}${item.end_time ? `–${formatTime(item.end_time)}` : ''}` : ''}</span>
                          {item.stand_code && <span>Estande {item.stand_code}</span>}
                          {item.location_text && <span>{item.location_text}</span>}
                        </div>
                        {(item.books || []).length > 0 && (
                          <p className="mt-1 text-xs opacity-55">📚 {item.books.join(', ')}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => { setEditing(editing === item.id ? null : item.id); setCreating(false) }}
                          className="admin-icon"
                          title="Editar"
                        >
                          {editing === item.id ? <ChevronUp className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                        </button>
                        <button onClick={() => remove('events', item.id)} className="admin-icon text-rose-500" title="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {editing === item.id && (
                      <EventEditor
                        item={item}
                        exhibitors={data.exhibitors}
                        onSave={form => saveRecord('events', item, form)}
                        onCancel={() => setEditing(null)}
                      />
                    )}
                  </article>
                ))}
                {!data.events.length && <p className="admin-card rounded-2xl border p-8 text-center text-sm opacity-60">Nenhum evento cadastrado.</p>}
              </div>
            </>
          )}

          {/* BOOKS */}
          {activeTab === 'books' && (
            <>
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black">Livros</h2>
                  <p className="text-sm opacity-65">{data.books.length} livro(s) · Alterações diretas no banco.</p>
                </div>
                <button
                  onClick={() => { setCreating(v => !v); setEditing(null) }}
                  className="admin-primary flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-black text-white"
                >
                  <Plus className="h-4 w-4" />Novo livro
                </button>
              </div>

              {creating && (
                <div className="mb-5 admin-card rounded-2xl border p-4">
                  <p className="mb-2 text-xs font-black uppercase tracking-wider opacity-60">Novo livro</p>
                  <BookEditor
                    item={{ active: true }}
                    exhibitors={data.exhibitors}
                    onSave={form => createRecord('books', form)}
                    onCancel={() => setCreating(false)}
                  />
                </div>
              )}

              <div className="grid gap-3">
                {data.books.map(item => (
                  <article key={item.id} className="admin-card rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="truncate text-sm font-black">{item.title}</strong>
                          {!item.active && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-900/40 dark:text-rose-300">Inativo</span>}
                        </div>
                        <p className="mt-0.5 text-xs opacity-65">
                          {item.author_name}{item.publisher ? ` · ${item.publisher}` : ''}{item.stand_code ? ` · Estande ${item.stand_code}` : ''}
                        </p>
                        {(item.tags || []).length > 0 && <p className="mt-0.5 text-xs opacity-50">{item.tags.join(', ')}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => { setEditing(editing === item.id ? null : item.id); setCreating(false) }}
                          className="admin-icon"
                          title="Editar"
                        >
                          {editing === item.id ? <ChevronUp className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                        </button>
                        <button onClick={() => remove('books', item.id)} className="admin-icon text-rose-500" title="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {editing === item.id && (
                      <BookEditor
                        item={item}
                        exhibitors={data.exhibitors}
                        onSave={form => saveRecord('books', item, form)}
                        onCancel={() => setEditing(null)}
                      />
                    )}
                  </article>
                ))}
                {!data.books.length && <p className="admin-card rounded-2xl border p-8 text-center text-sm opacity-60">Nenhum livro cadastrado.</p>}
              </div>
            </>
          )}

          {/* EXHIBITORS */}
          {activeTab === 'exhibitors' && (
            <>
              <div className="mb-5">
                <h2 className="text-2xl font-black">Expositores</h2>
                <p className="text-sm opacity-65">{data.exhibitors.length} expositor(es) · Alterações diretas no banco.</p>
              </div>
              <div className="grid gap-3">
                {data.exhibitors.map(item => (
                  <article key={item.id} className="admin-card rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {item.stand_code && (
                            <span className="rounded-lg bg-black/10 px-2 py-0.5 text-[10px] font-black dark:bg-white/10">{item.stand_code}</span>
                          )}
                          <strong className="truncate text-sm font-black">{item.name}</strong>
                          {item.featured && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Destaque</span>}
                          {!item.active && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-900/40 dark:text-rose-300">Inativo</span>}
                        </div>
                        <p className="mt-0.5 text-xs opacity-65">{item.relevance_level}</p>
                      </div>
                      <button
                        onClick={() => { setEditing(editing === item.id ? null : item.id); setCreating(false) }}
                        className="admin-icon shrink-0"
                        title="Editar"
                      >
                        {editing === item.id ? <ChevronUp className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                      </button>
                    </div>
                    {editing === item.id && (
                      <ExhibitorEditor
                        item={item}
                        onSave={form => saveRecord('exhibitors', item, form)}
                        onCancel={() => setEditing(null)}
                      />
                    )}
                  </article>
                ))}
                {!data.exhibitors.length && <p className="admin-card rounded-2xl border p-8 text-center text-sm opacity-60">Nenhum expositor cadastrado.</p>}
              </div>
            </>
          )}

          {activeTab === 'authors' && (
            <AuthorsAdminPanel
              authors={data.authors}
              profiles={data.passportProfiles}
              requests={data.authorRequests}
              onReload={load}
              notify={notify}
            />
          )}

          {activeTab === 'health' && (
            <SystemHealthPanel
              health={data.health}
              budget={data.budget}
              onReload={load}
              loading={loading}
            />
          )}
        </main>
      </div>
    </div>
  )
}
