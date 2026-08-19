import React, { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Copy, Download, Eye, KeyRound, Printer, QrCode, Save, Send } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { appPath } from '../../lib/paths'
import { optimizePassportPhoto } from '../../utils/optimizeImage'
import AuthorContentRequests from './AuthorContentRequests'

const CONSENT_VERSION = 'bienal-2026-v1'
const emptyProfile = { bio: '', message: '', status: 'draft', participation_status: null }

export default function AuthorDashboard() {
  const [account, setAccount] = useState(null)
  const [author, setAuthor] = useState(null)
  const [profile, setProfile] = useState(emptyProfile)
  const [accessState, setAccessState] = useState('loading')
  const [code, setCode] = useState('')
  const [qr, setQr] = useState('')
  const [qrVisible, setQrVisible] = useState(false)
  const [preview, setPreview] = useState(false)
  const [participationModalOpen, setParticipationModalOpen] = useState(false)
  const [participationSaving, setParticipationSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [urgentType, setUrgentType] = useState('schedule_change')
  const [urgentText, setUrgentText] = useState('')
  const [urgentDate, setUrgentDate] = useState('')

  useEffect(() => { void (async () => {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { setAccessState('signed-out'); return }
    const { data: link } = await supabase.from('author_accounts').select('author_id').eq('user_id', auth.user.id).eq('active', true).maybeSingle()
    if (!link) { setAccessState('unlinked'); return }
    setAccessState('linked')
    setAccount({ user: auth.user, authorId: link.author_id })
    const [{ data: authorData }, { data: profileData }, { data: draftRequest }, { data: codeData }] = await Promise.all([
      supabase.from('authors').select('id,name,first_name,bio,message').eq('id', link.author_id).maybeSingle(),
      supabase.from('passport_profiles').select('author_id,photo_path,photo_width,photo_height,photo_mime,photo_size,bio,message,status,participation_status,consent_version,consent_accepted_at').eq('author_id', link.author_id).maybeSingle(),
      supabase.from('author_change_requests').select('id,payload,status').eq('author_id', link.author_id).eq('request_type', 'profile').in('status', ['draft', 'pending']).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.rpc('get_my_passport_code')
    ])
    const editable = draftRequest?.payload ? { ...profileData, ...draftRequest.payload, change_request_id: draftRequest.id, status: draftRequest.status, published_status: profileData?.status } : profileData || emptyProfile
    setAuthor(authorData)
    setProfile(editable)
    setParticipationModalOpen(!(editable.participation_status || editable.consent_accepted_at || editable.published_status === 'published' || editable.status === 'published'))
    setCode(codeData?.[0]?.code_plaintext || '')
  })() }, [])

  const participating = profile.participation_status === 'participating' || Boolean(profile.consent_accepted_at) || profile.published_status === 'published' || profile.status === 'published'

  const uploadPhoto = async file => {
    if (!account) return
    try {
      setNotice('Otimizando foto...')
      const optimized = await optimizePassportPhoto(file)
      const path = `${account.authorId}/drafts/${Date.now()}.webp`
      const { error } = await supabase.storage.from('passport-photos').upload(path, optimized.blob, { upsert: false, contentType: optimized.mime, cacheControl: '31536000' })
      if (error) throw error
      setProfile(current => ({ ...current, photo_path: path, photo_width: optimized.width, photo_height: optimized.height, photo_mime: optimized.mime, photo_size: optimized.size, photo_updated_at: new Date().toISOString() }))
      setNotice(`Foto otimizada: ${Math.round(optimized.size / 1024)} KB`)
    } catch (error) { setNotice(error.message) }
  }

  const chooseParticipation = async decision => {
    if (!account) return
    setParticipationSaving(true)
    const accepted = decision === 'participating'
    const timestamp = accepted ? new Date().toISOString() : null
    const value = { ...profile, author_id: account.authorId, status: profile.status || 'draft', participation_status: decision, consent_version: accepted ? CONSENT_VERSION : null, consent_accepted_at: timestamp, consent_accepted_by_user_id: accepted ? account.user.id : null, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('passport_profiles').upsert(value)
    setParticipationSaving(false)
    if (error) return setNotice(error.message)
    setProfile(current => ({ ...current, ...value }))
    setParticipationModalOpen(false)
    setNotice(accepted ? 'Participação confirmada. Agora preencha seu perfil e envie-o para revisão.' : 'Tudo bem — você poderá cadastrar sua agenda sem participar do Passaporte.')
  }

  const save = async submit => {
    if (!account || !participating) return
    const payload = { ...profile, participation_status: 'participating', consent_version: CONSENT_VERSION, consent_accepted_at: profile.consent_accepted_at || new Date().toISOString(), consent_accepted_by_user_id: account.user.id }
    delete payload.reviewed_at; delete payload.reviewed_by; delete payload.change_request_id; delete payload.published_status; delete payload.status; delete payload.author_id
    const published = profile.published_status === 'published' || profile.status === 'published'
    const request = { author_id: account.authorId, submitted_by: account.user.id, request_type: 'profile', payload, status: submit ? 'pending' : 'draft', submitted_at: submit ? new Date().toISOString() : null, updated_at: new Date().toISOString() }
    const operation = (published || profile.change_request_id)
      ? (profile.change_request_id ? supabase.from('author_change_requests').update(request).eq('id', profile.change_request_id) : supabase.from('author_change_requests').insert(request).select('id').single())
      : supabase.from('passport_profiles').upsert({ ...payload, author_id: account.authorId, status: submit ? 'pending' : 'draft', submitted_at: submit ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
    const { data, error } = await operation
    setNotice(error ? error.message : submit ? 'Perfil enviado para aprovação administrativa.' : 'Rascunho salvo.')
    if (!error) setProfile(current => ({ ...current, change_request_id: data?.id || current.change_request_id, status: submit ? 'pending' : 'draft', published_status: published ? 'published' : current.published_status }))
  }

  const sendUrgent = async () => {
    if (!account || !urgentText.trim()) return
    const { error } = await supabase.from('author_change_requests').insert({ author_id: account.authorId, submitted_by: account.user.id, request_type: 'urgent', urgent_type: urgentType, affected_date: urgentDate || null, payload: { message: urgentText.trim() }, status: 'pending', submitted_at: new Date().toISOString() })
    setNotice(error ? error.message : 'Alteração urgente enviada para aprovação.')
    if (!error) { setUrgentText(''); setUrgentDate('') }
  }

  const generateQr = async () => {
    if (qr) return qr
    if (!code) return ''
    const QRCode = await import('qrcode')
    const value = await QRCode.toDataURL(`LSB26|v1|${code}`, { width: 512, margin: 2, errorCorrectionLevel: 'M' })
    setQr(value)
    return value
  }
  const showQr = async () => { await generateQr(); setQrVisible(true) }
  const downloadQr = async () => { const value = await generateQr(); if (!value) return; const link = document.createElement('a'); link.href = value; link.download = `passaporte-${author?.first_name || 'autora'}.png`; link.click() }

  if (accessState === 'loading') return <div className="site-theme flex min-h-[100dvh] items-center justify-center text-sm font-bold">Verificando acesso...</div>
  if (!account) return <div className="site-theme flex min-h-[100dvh] items-center justify-center p-5"><div className="auth-card rounded-3xl border p-8 text-center"><h1 className="auth-title text-2xl font-black">Painel de autoras</h1><p className="auth-muted mt-3 text-sm">{accessState === 'signed-out' ? 'Entre na sua conta para acessar este painel.' : 'Sua conta ainda não foi vinculada a uma autora verificada.'}</p><a href={appPath(accessState === 'signed-out' ? '/login' : '/')} className="auth-link mt-4 inline-block font-bold">Voltar</a></div></div>

  const photo = profile.photo_path ? supabase.storage.from('passport-photos').getPublicUrl(profile.photo_path).data.publicUrl : ''
  return <div className="site-theme min-h-[100dvh] bg-[#fff8fb] p-4 text-[#56132f] sm:p-8"><main className="mx-auto max-w-5xl">
    <a href={appPath('/')} className="text-sm font-bold text-[#d43276]">← Voltar ao mapa</a>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-black">Painel da autora</h1><p className="mt-1 text-sm text-[#805269]">{author?.name}</p></div>{participating ? <button onClick={() => setPreview(true)} className="route-soft-button flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-black"><Eye className="h-4 w-4"/>Pré-visualizar meu Passaporte</button> : <button onClick={() => setParticipationModalOpen(true)} className="route-primary-button rounded-xl px-4 py-3 text-sm font-black">Participar do Passaporte</button>}</div>
    {notice && <p role="status" className="mt-4 rounded-xl bg-[#fff0f6] p-3 text-sm font-bold">{notice}</p>}

    {participating && <section className="mt-5 grid gap-5 lg:grid-cols-2"><div className="auth-card rounded-3xl border p-5"><h2 className="text-lg font-black">Perfil do Passaporte</h2><p className="mt-1 text-xs opacity-70">Foto, bio e mensagem para as leitoras. Livros, locais de venda e agenda são cadastrados nas seções próprias abaixo.</p><label className="mt-4 block text-xs font-bold">Foto otimizada<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => event.target.files?.[0] && void uploadPhoto(event.target.files[0])} className="mt-2 block w-full text-xs"/></label>{photo && <img src={photo} alt="Prévia" className="mt-3 h-32 w-28 rounded-xl object-cover"/>}<label className="mt-4 block text-xs font-bold">Bio<textarea value={profile.bio} onChange={event => setProfile({ ...profile, bio: event.target.value })} className="auth-input mt-2 h-28 w-full rounded-xl border p-3"/></label><label className="mt-4 block text-xs font-bold">Mensagem às leitoras<textarea value={profile.message} onChange={event => setProfile({ ...profile, message: event.target.value })} className="auth-input mt-2 h-24 w-full rounded-xl border p-3"/></label><div className="mt-5 flex gap-2"><button onClick={() => void save(false)} className="route-soft-button flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-black"><Save className="h-4 w-4"/>Salvar rascunho</button><button onClick={() => void save(true)} className="route-primary-button flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black"><Send className="h-4 w-4"/>Enviar para revisão</button></div></div>
      <div className="space-y-5"><section className="auth-card rounded-3xl border p-5"><h2 className="flex items-center gap-2 text-lg font-black"><KeyRound className="h-5 w-5"/>Minha chave do Passaporte</h2><p className="mt-2 text-xs opacity-70">Compartilhe a chave ou o QR Code somente com leitoras presentes. Elas poderão apresentar o código na tela do celular, usar um cartão de visita ou escanear o QR Code.</p>{code ? <><p className="mt-4 rounded-xl bg-[#fff0f6] p-3 text-center font-mono text-xl font-black">{code}</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => navigator.clipboard.writeText(code)} className="route-soft-button flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold"><Copy className="h-4 w-4"/>Copiar código</button><button onClick={() => void showQr()} className="route-soft-button flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold"><QrCode className="h-4 w-4"/>Mostrar QR Code</button><button onClick={() => void downloadQr()} className="route-soft-button flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold"><Download className="h-4 w-4"/>Baixar QR</button><button onClick={() => { void showQr(); window.setTimeout(() => window.print(), 100) }} className="route-soft-button flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold"><Printer className="h-4 w-4"/>Imprimir</button></div>{qrVisible && qr && <div className="mt-4 text-center"><img src={qr} alt="QR Code do Passaporte" className="mx-auto w-56"/><p className="mt-2 font-black">Peça meu carimbo no Passaporte Sáfico</p></div>}</> : <p className="mt-3 text-sm">A chave será gerada pela administração após a aprovação.</p>}</section>
        <UrgentForm urgentType={urgentType} setUrgentType={setUrgentType} urgentDate={urgentDate} setUrgentDate={setUrgentDate} urgentText={urgentText} setUrgentText={setUrgentText} onSend={sendUrgent}/></div></section>}
    {!participating && <div className="mt-5"><UrgentForm urgentType={urgentType} setUrgentType={setUrgentType} urgentDate={urgentDate} setUrgentDate={setUrgentDate} urgentText={urgentText} setUrgentText={setUrgentText} onSend={sendUrgent}/></div>}
    <AuthorContentRequests authorId={account.authorId} notice={setNotice} agendaOnly={!participating}/>
    {preview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div className="auth-card max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-3xl border p-6"><button onClick={() => setPreview(false)} className="float-right font-black">×</button><h2 className="text-2xl font-black">{author?.name}</h2>{photo && <img src={photo} alt="" className="mt-4 h-48 w-36 rounded-2xl object-cover"/>}<p className="mt-4 whitespace-pre-line">{profile.bio}</p><p className="mt-3 italic">{profile.message}</p><p className="mt-5 rounded-xl bg-[#f3e8ef] p-4 text-center font-black">Carimbo bloqueado</p></div></div>}
    {participationModalOpen && <ParticipationModal saving={participationSaving} onChoose={chooseParticipation}/>}</main></div>
}

const ParticipationModal = ({ saving, onChoose }) => <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#260d21]/70 p-0 sm:items-center sm:p-5"><section role="dialog" aria-modal="true" aria-labelledby="passport-choice-title" className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8"><div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[#efbfd6] sm:hidden"/><p className="text-xs font-black uppercase tracking-[.16em] text-[#b94185]">Passaporte Sáfico</p><h2 id="passport-choice-title" className="mt-2 text-2xl font-black">Você quer participar do Passaporte?</h2><p className="mt-3 text-sm leading-6 text-[#71475d]">O Passaporte é uma experiência opcional para aproximar você das leitoras durante a Bienal. A participação só é publicada após revisão da equipe Lendo Sáficos.</p><div className="mt-5 grid gap-3 text-sm"><div className="rounded-2xl bg-[#fff0f6] p-4"><strong>O que você pode fazer neste painel</strong><p className="mt-1 text-xs leading-5">Cadastrar presenças e sessões de autógrafo; informar livros e locais de venda; e comunicar alterações urgentes para aprovação.</p></div><div className="rounded-2xl bg-[#f7eefb] p-4"><strong>Como funciona o Passaporte</strong><p className="mt-1 text-xs leading-5">Se participar, você preenche foto, bio e uma mensagem. Depois de aprovado, seu perfil aparece no Passaporte das leitoras e sua chave poderá liberar um carimbo.</p></div><div className="rounded-2xl bg-[#fff8e9] p-4"><strong>Sua chave e QR Code</strong><p className="mt-1 text-xs leading-5">No dia, você pode mostrar a chave na tela do celular, exibir ou imprimir o QR Code, ou criar um cartão estilo cartão de visita para entregar. A escolha é sua.</p></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><button disabled={saving} onClick={() => void onChoose('declined')} className="route-soft-button rounded-xl border px-4 py-3 text-sm font-black disabled:opacity-60">Agora não, quero só cadastrar minha agenda</button><button disabled={saving} onClick={() => void onChoose('participating')} className="route-primary-button flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black disabled:opacity-60"><CheckCircle2 className="h-4 w-4"/>Quero participar</button></div></section></div>

const UrgentForm = ({ urgentType, setUrgentType, urgentDate, setUrgentDate, urgentText, setUrgentText, onSend }) => <section className="auth-card rounded-3xl border p-5"><h2 className="flex items-center gap-2 text-lg font-black"><AlertTriangle className="h-5 w-5 text-amber-600"/>Informar alteração urgente</h2><select value={urgentType} onChange={event => setUrgentType(event.target.value)} className="auth-input mt-3 w-full rounded-xl border p-3 text-sm"><option value="schedule_change">Mudança de horário</option><option value="stand_change">Mudança de estande</option><option value="presence_cancelled">Cancelamento de presença</option><option value="autograph_cancelled">Cancelamento de autógrafo</option><option value="important_information">Nova informação importante</option></select><input type="date" value={urgentDate} onChange={event => setUrgentDate(event.target.value)} className="auth-input mt-3 w-full rounded-xl border p-3 text-sm" aria-label="Data afetada"/><textarea value={urgentText} onChange={event => setUrgentText(event.target.value)} className="auth-input mt-3 h-28 w-full rounded-xl border p-3" placeholder="Descreva a alteração..."/><button onClick={() => void onSend()} className="mt-3 rounded-xl bg-amber-600 px-4 py-3 text-sm font-black text-white">Enviar para aprovação</button></section>
