import React, { useMemo, useState } from 'react'
import { Check, KeyRound, Link2, Plus, Save, ShieldAlert, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const slugify = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export default function AuthorsAdminPanel({ authors, profiles, requests, books = [], events = [], onReload, notify }) {
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', first_name: '', slug: '' })
  const [linkEmail, setLinkEmail] = useState({})
  const [busy, setBusy] = useState('')
  const [previewId, setPreviewId] = useState('')
  const [requestTarget, setRequestTarget] = useState({})

  const profileByAuthor = useMemo(() => new Map(profiles.map(item => [item.author_id, item])), [profiles])
  const urgent = requests.filter(item => item.request_type === 'urgent' && item.status === 'pending')
    .sort((a, b) => String(a.affected_date || '9999').localeCompare(String(b.affected_date || '9999')))
  const profileRequests = requests.filter(item => item.request_type === 'profile' && item.status === 'pending')
  const contentRequests = requests.filter(item => ['presence', 'book', 'availability', 'autograph'].includes(item.request_type) && item.status === 'pending')

  const run = async (key, action, success) => {
    setBusy(key)
    const { error } = await action()
    setBusy('')
    if (error) return notify(error.message)
    notify(success); await onReload()
  }

  const createAuthor = async () => {
    const name = form.name.trim()
    const firstName = (form.first_name || name.split(/\s+/)[0]).trim()
    if (!name || !firstName) return notify('Informe o nome da autora.')
    const slug = (form.slug || slugify(name)).trim()
    await run('create', () => supabase.from('authors').insert({ name, first_name: firstName, slug }), 'Autora criada como rascunho.')
    setCreating(false); setForm({ name: '', first_name: '', slug: '' })
  }

  const linkAccount = async author => {
    const email = (linkEmail[author.id] || '').trim()
    if (!email) return notify('Informe o e-mail de uma conta já cadastrada.')
    await run(`link-${author.id}`, () => supabase.rpc('admin_link_author_by_email', { target_author_id: author.id, target_email: email }), 'Conta vinculada à autora.')
  }

  const generateCode = author => run(`code-${author.id}`, () => supabase.rpc('generate_passport_code', { target_author_id: author.id }), 'Código do passaporte gerado com segurança.')
  const approveProfile = author => run(`approve-${author.id}`, () => supabase.rpc('approve_passport_profile', { target_author_id: author.id }), 'Perfil publicado no passaporte.')
  const reviewRequest = (request, decision) => run(`request-${request.id}`, () => supabase.rpc('review_author_change_request', { target_request_id: request.id, decision, notes: null }), decision === 'approved' ? 'Solicitação aprovada.' : 'Solicitação rejeitada.')
  const reviewContentRequest = (request, decision) => {
    const approvedMessage = request.request_type === 'book'
      ? 'Livro aprovado. Publique o perfil da autora quando os requisitos do Passaporte estiverem completos.'
      : request.request_type === 'presence'
        ? 'Presença aprovada. Publique o perfil da autora quando os requisitos do Passaporte estiverem completos.'
        : 'Informação aprovada e publicada.'
    return run(`content-${request.id}`, () => supabase.rpc('review_author_content_request', { p_request_id: request.id, p_decision: decision, p_payload: request.payload, p_target_id: requestTarget[request.id] || null, p_notes: null }), decision === 'approved' ? approvedMessage : 'Solicitação rejeitada.')
  }
  const rejectInitialProfile = author => run(`reject-${author.id}`, () => supabase.from('passport_profiles').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('author_id', author.id), 'Perfil rejeitado e devolvido para revisão.')
  const softDelete = author => {
    if (!window.confirm(`Arquivar ${author.name}? O registro poderá ser recuperado no banco.`)) return
    return run(`delete-${author.id}`, () => supabase.from('authors').update({ deleted_at: new Date().toISOString(), active: false, published: false }).eq('id', author.id), 'Autora arquivada.')
  }

  return (
    <section>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div><h2 className="text-2xl font-black">Autoras e passaporte</h2><p className="text-sm opacity-65">Vínculos, consentimentos, publicação e códigos privados.</p></div>
        <button onClick={() => setCreating(value => !value)} className="admin-primary flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-black text-white"><Plus className="h-4 w-4" />Nova autora</button>
      </div>

      <div className="mb-5 rounded-2xl border border-[#d43276]/25 bg-[#fff0f6] p-4 text-xs text-[#7b3a60] dark:bg-[#59163f] dark:text-[#ffd2e5]">
        <p className="font-black">As contas são criadas manualmente no Supabase Auth.</p>
        <p className="mt-1">Depois que a conta existir, crie ou localize a autora abaixo, informe exatamente o e-mail cadastrado e clique em <strong>Vincular</strong>. Nenhuma chave administrativa fica exposta no site.</p>
      </div>

      {urgent.length > 0 && <div className="mb-5 rounded-2xl border border-amber-400/60 bg-amber-100/60 p-4 dark:bg-amber-950/30"><p className="flex items-center gap-2 text-sm font-black"><ShieldAlert className="h-4 w-4" />{urgent.length} alteração(ões) urgente(s)</p>{urgent.map(item => <div key={item.id} className="mt-3 rounded-xl bg-white/60 p-3 text-xs dark:bg-black/20"><p className="font-black">{item.affected_date || 'Sem data'} · {item.urgent_type?.replaceAll('_', ' ')} · {authors.find(author => author.id === item.author_id)?.name || 'Autora'}</p><p className="mt-1">{item.payload?.message}</p><p className="mt-2 opacity-60">Edite primeiro o evento/expositor correspondente; depois marque esta solicitação como resolvida.</p><div className="mt-2 flex gap-2"><button onClick={() => reviewRequest(item, 'approved')} className="rounded-lg bg-emerald-600 px-3 py-2 font-black text-white">Resolvida/aprovada</button><button onClick={() => reviewRequest(item, 'rejected')} className="rounded-lg bg-rose-600 px-3 py-2 font-black text-white">Rejeitar</button></div></div>)}</div>}

      {profileRequests.length > 0 && <div className="mb-5"><h3 className="mb-3 text-sm font-black">Alterações de perfil aguardando revisão</h3><div className="grid gap-3">{profileRequests.map(item => { const author = authors.find(value => value.id === item.author_id); const payload = item.payload || {}; const photo = payload.photo_path ? supabase.storage.from('passport-photos').getPublicUrl(payload.photo_path).data.publicUrl : ''; return <article key={item.id} className="admin-card rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><div><strong className="text-sm">{author?.name || 'Autora'}</strong><p className="text-xs opacity-60">Consentimento {payload.consent_version || 'ausente'} · {payload.consent_accepted_at ? 'aceito' : 'não aceito'}</p></div><button onClick={() => setPreviewId(previewId === item.id ? '' : item.id)} className="admin-secondary rounded-lg border px-3 py-2 text-xs font-black">{previewId === item.id ? 'Fechar preview' : 'Preview'}</button></div>{previewId === item.id && <div className="mt-3 rounded-xl bg-black/5 p-3 text-sm dark:bg-white/5">{photo && <img src={photo} alt="" className="mb-3 h-32 w-24 rounded-xl object-cover"/>}<p className="whitespace-pre-line">{payload.bio}</p><p className="mt-2 italic">{payload.message}</p><p className="mt-3 text-xs">Livros: {(payload.books || []).map(value => typeof value === 'string' ? value : value.title).join(', ') || 'não informados'}</p></div>}<div className="mt-3 flex gap-2"><button onClick={() => reviewRequest(item, 'approved')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white">Aprovar e publicar</button><button onClick={() => reviewRequest(item, 'rejected')} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-black text-white">Rejeitar</button></div></article> })}</div></div>}

      {contentRequests.length > 0 && <div className="mb-5"><h3 className="mb-3 text-sm font-black">Informações editoriais aguardando revisão</h3><div className="grid gap-3">{contentRequests.map(item => { const author = authors.find(value => value.id === item.author_id); const payload = item.payload || {}; const isBook = item.request_type === 'book'; const isAutograph = item.request_type === 'autograph'; return <article key={item.id} className="admin-card rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><div><strong className="text-sm">{author?.name || 'Autora'}</strong><p className="mt-1 text-xs font-black capitalize text-[#b94185]">{item.request_type === 'presence' ? 'Presença' : item.request_type === 'availability' ? 'Local de venda' : item.request_type === 'autograph' ? 'Sessão de autógrafo' : 'Livro'}</p></div></div><dl className="mt-3 grid gap-2 rounded-xl bg-black/5 p-3 text-xs dark:bg-white/5">{Object.entries(payload).filter(([, value]) => value !== '' && value !== null && value !== false).map(([key, value]) => <div key={key}><dt className="font-black text-[#b94185]">{key.replaceAll('_', ' ')}</dt><dd className="break-words opacity-75">{Array.isArray(value) ? value.join(', ') : String(value)}</dd></div>)}</dl>{isBook && <label className="mt-3 block text-xs font-bold">Livro existente (opcional; deixe vazio para criar)<select value={requestTarget[item.id] || ''} onChange={event => setRequestTarget({ ...requestTarget, [item.id]: event.target.value })} className="admin-input mt-1 w-full rounded-xl border px-3 py-2 text-xs"><option value="">Criar novo livro</option>{books.map(book => <option key={book.id} value={book.id}>{book.title} · {book.author_name}</option>)}</select></label>}{isAutograph && <label className="mt-3 block text-xs font-bold">Sessão já cadastrada (opcional)<select value={requestTarget[item.id] || ''} onChange={event => setRequestTarget({ ...requestTarget, [item.id]: event.target.value })} className="admin-input mt-1 w-full rounded-xl border px-3 py-2 text-xs"><option value="">Criar nova sessão</option>{events.filter(event => event.event_type === 'autograph' && event.active && !event.deleted_at).map(event => <option key={event.id} value={event.id}>{event.author_name} · {event.event_date} · {String(event.start_time || '').slice(0, 5)} · {event.stand_code || event.location_text || 'local a confirmar'}</option>)}</select><span className="mt-1 block font-normal opacity-60">Ao selecionar uma sessão existente, ela será vinculada à autora sem criar uma duplicata.</span></label>}{item.request_type === 'availability' && <p className="mt-3 text-xs opacity-65">Livro selecionado pela autora: {books.find(book => book.id === payload.book_id)?.title || payload.book_id || 'não informado'}.</p>}<div className="mt-3 flex gap-2"><button disabled={busy === `content-${item.id}`} onClick={() => reviewContentRequest(item, 'approved')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white">Aprovar e publicar</button><button disabled={busy === `content-${item.id}`} onClick={() => reviewContentRequest(item, 'rejected')} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-black text-white">Rejeitar</button></div></article> })}</div></div>}

      {creating && <div className="admin-card mb-5 grid gap-3 rounded-2xl border p-4 sm:grid-cols-3"><input className="admin-input rounded-xl border px-3 py-2 text-xs" placeholder="Nome completo" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /><input className="admin-input rounded-xl border px-3 py-2 text-xs" placeholder="Primeiro nome" value={form.first_name} onChange={event => setForm({ ...form, first_name: event.target.value })} /><input className="admin-input rounded-xl border px-3 py-2 text-xs" placeholder="slug (opcional)" value={form.slug} onChange={event => setForm({ ...form, slug: event.target.value })} /><div className="flex gap-2 sm:col-span-3"><button disabled={busy === 'create'} onClick={createAuthor} className="admin-primary flex items-center gap-1 rounded-xl px-4 py-2 text-xs font-black text-white"><Save className="h-4 w-4" />Registrar</button><button onClick={() => setCreating(false)} className="admin-secondary flex items-center gap-1 rounded-xl border px-4 py-2 text-xs font-black"><X className="h-4 w-4" />Cancelar</button></div></div>}

      <div className="grid gap-3">
        {authors.map(author => {
          const profile = profileByAuthor.get(author.id)
          return <article key={author.id} className="admin-card rounded-2xl border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><strong className="text-sm font-black">{author.name}</strong><p className="text-xs opacity-60">/{author.slug} · perfil {profile?.status || 'não iniciado'} · {author.published ? 'publicado' : 'não publicado'}</p></div><div className="flex gap-1"><button title="Gerar/renovar código" disabled={busy === `code-${author.id}`} onClick={() => generateCode(author)} className="admin-icon"><KeyRound className="h-4 w-4" /></button>{profile?.status === 'pending' && <><button title="Aprovar perfil" disabled={busy === `approve-${author.id}`} onClick={() => approveProfile(author)} className="admin-icon text-emerald-600"><Check className="h-4 w-4" /></button><button title="Rejeitar perfil" disabled={busy === `reject-${author.id}`} onClick={() => rejectInitialProfile(author)} className="admin-icon text-rose-500"><X className="h-4 w-4" /></button></>}<button title="Arquivar" onClick={() => softDelete(author)} className="admin-icon text-rose-500"><Trash2 className="h-4 w-4" /></button></div></div><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input type="email" value={linkEmail[author.id] || ''} onChange={event => setLinkEmail({ ...linkEmail, [author.id]: event.target.value })} placeholder="E-mail de conta já cadastrada" className="admin-input min-w-0 flex-1 rounded-xl border px-3 py-2 text-xs" /><button disabled={busy === `link-${author.id}`} onClick={() => linkAccount(author)} className="admin-secondary flex items-center justify-center gap-1 rounded-xl border px-3 py-2 text-xs font-black"><Link2 className="h-4 w-4" />Vincular</button></div></article>
        })}
        {!authors.length && <p className="admin-card rounded-2xl border p-8 text-center text-sm opacity-60">Nenhuma autora cadastrada.</p>}
      </div>
    </section>
  )
}
