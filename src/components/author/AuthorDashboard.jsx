import React, { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Copy, Download, Eye, KeyRound, Printer, QrCode, Save, Send } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { appPath } from '../../lib/paths'
import { optimizePassportPhoto } from '../../utils/optimizeImage'
import AuthorContentRequests from './AuthorContentRequests'
import { LOCAL_AUTHOR_EXHIBITORS, LOCAL_AUTHOR_SCENARIOS } from '../../data/localAuthorScenarios'
import AuthorPassportPreview from '../passport/AuthorPassportPreview'

const CONSENT_VERSION = 'bienal-2026-v1'
const BIO_MAX_LENGTH = 360
const emptyProfile = { bio: '', message: '', passport_display_name: '', passport_age: '', passport_city: '', status: 'draft', participation_status: null }
const normalizePassportIdentity = profile => ({
  ...profile,
  passport_display_name: profile.passport_display_name?.trim() || null,
  passport_city: profile.passport_city?.trim() || null,
  passport_age: profile.passport_age === '' || profile.passport_age == null ? null : Number(profile.passport_age),
})
const validatePassportProfile = profile => {
  if (!String(profile.photo_path || '').trim()) return 'Envie uma foto para o perfil do Passaporte.'
  if (!String(profile.bio || '').trim()) return 'Preencha a bio antes de enviar para revisão.'
  if (!String(profile.message || '').trim()) return 'Preencha a mensagem para as leitoras antes de enviar para revisão.'
  if (String(profile.bio || '').length > BIO_MAX_LENGTH) return `A bio deve ter no máximo ${BIO_MAX_LENGTH} caracteres.`
  return ''
}

export default function AuthorDashboard() {
  const localScenarioKey = (import.meta.env.DEV || import.meta.env.VITE_PASSPORT_TEST === '1')
    ? new URLSearchParams(window.location.search).get('cenario')
    : null
  const localScenario = localScenarioKey ? LOCAL_AUTHOR_SCENARIOS[localScenarioKey] : null
  const [account, setAccount] = useState(null)
  const [author, setAuthor] = useState(null)
  const [profile, setProfile] = useState(emptyProfile)
  const [accessState, setAccessState] = useState('loading')
  const [code, setCode] = useState('')
  const [qr, setQr] = useState('')
  const [qrVisible, setQrVisible] = useState(false)
  const [preview, setPreview] = useState(false)
  const [previewData, setPreviewData] = useState({ requests: [], exhibitors: [], books: [], presences: [], autographSessions: [], saleLocations: [] })
  const [participationModalOpen, setParticipationModalOpen] = useState(false)
  const [participationSaving, setParticipationSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [urgentType, setUrgentType] = useState('schedule_change')
  const [urgentText, setUrgentText] = useState('')
  const [urgentDate, setUrgentDate] = useState('')

  useEffect(() => { void (async () => {
    if (localScenario) {
      setAccessState('linked')
      setAccount(localScenario.account)
      setAuthor(localScenario.author)
      setProfile(localScenario.profile)
      setCode(localScenario.code)
      setParticipationModalOpen(!(localScenario.profile.participation_status || localScenario.profile.consent_accepted_at || localScenario.profile.status === 'published'))
      return
    }
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { setAccessState('signed-out'); return }
    const { data: link } = await supabase.from('author_accounts').select('author_id').eq('user_id', auth.user.id).eq('active', true).maybeSingle()
    if (!link) { setAccessState('unlinked'); return }
    setAccessState('linked')
    setAccount({ user: auth.user, authorId: link.author_id })
    const [{ data: authorData }, { data: profileData }, { data: draftRequest }, { data: codeData }] = await Promise.all([
      supabase.from('authors').select('id,name,first_name,bio,message').eq('id', link.author_id).maybeSingle(),
      supabase.from('passport_profiles').select('author_id,photo_path,photo_width,photo_height,photo_mime,photo_size,bio,message,books,presences,autograph_sessions,sale_locations,passport_display_name,passport_age,passport_city,status,participation_status,consent_version,consent_accepted_at,updated_at').eq('author_id', link.author_id).maybeSingle(),
      supabase.from('author_change_requests').select('id,payload,status').eq('author_id', link.author_id).eq('request_type', 'profile').in('status', ['draft', 'pending']).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.rpc('get_my_passport_code')
    ])
    const editable = draftRequest?.payload ? { ...profileData, ...draftRequest.payload, change_request_id: draftRequest.id, status: draftRequest.status, published_status: profileData?.status } : profileData || emptyProfile
    setAuthor(authorData)
    setProfile(editable)
    setParticipationModalOpen(!(editable.participation_status || editable.consent_accepted_at || editable.published_status === 'published' || editable.status === 'published'))
    setCode(codeData?.[0]?.code_plaintext || '')
  })() }, [localScenario])

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
    if (localScenario) {
      const accepted = decision === 'participating'
      setProfile(current => ({ ...current, participation_status: decision, consent_version: accepted ? CONSENT_VERSION : null, consent_accepted_at: accepted ? new Date().toISOString() : null }))
      setParticipationModalOpen(false)
      setNotice(accepted ? 'Simulação: participação aceita localmente.' : 'Simulação: agenda sem Passaporte selecionada localmente.')
      return
    }
    setParticipationSaving(true)
    const accepted = decision === 'participating'
    const timestamp = accepted ? new Date().toISOString() : null
    const payload = { ...normalizePassportIdentity(profile), participation_status: decision, consent_version: accepted ? CONSENT_VERSION : null, consent_accepted_at: timestamp, consent_accepted_by_user_id: accepted ? account.user.id : null }
    delete payload.change_request_id; delete payload.published_status; delete payload.status; delete payload.author_id; delete payload.updated_at
    const published = profile.published_status === 'published' || profile.status === 'published'
    const request = { author_id: account.authorId, submitted_by: account.user.id, request_type: 'profile', payload, status: 'pending', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    const operation = published
      ? (profile.change_request_id ? supabase.from('author_change_requests').update(request).eq('id', profile.change_request_id) : supabase.from('author_change_requests').insert(request).select('id').single())
      : supabase.from('passport_profiles').upsert({ ...payload, author_id: account.authorId, status: profile.status || 'draft', updated_at: new Date().toISOString() })
    const { data, error } = await operation
    setParticipationSaving(false)
    if (error) return setNotice(error.message)
    setProfile(current => ({ ...current, ...payload, change_request_id: published ? data?.id || current.change_request_id : current.change_request_id, status: published ? 'pending' : current.status }))
    setParticipationModalOpen(false)
    setNotice(published ? 'Sua alteração foi enviada para revisão.' : accepted ? 'Participação confirmada. Agora preencha seu perfil e envie-o para revisão.' : 'Tudo bem — você poderá cadastrar sua agenda sem participar do Passaporte.')
  }

  const save = async submit => {
    if (!account || !participating) return
    if (submit) {
      const validationError = validatePassportProfile(profile)
      if (validationError) return setNotice(validationError)
    }
    if (localScenario) return setNotice(submit ? 'Simulação: perfil enviado para revisão local.' : 'Simulação: rascunho salvo localmente.')
    const payload = { ...normalizePassportIdentity(profile), participation_status: 'participating', consent_version: CONSENT_VERSION, consent_accepted_at: profile.consent_accepted_at || new Date().toISOString(), consent_accepted_by_user_id: account.user.id }
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
    if (!account) return
    if (!urgentText.trim()) return setNotice('Descreva a alteração antes de enviar para aprovação.')
    if (urgentType !== 'important_information' && !urgentDate) return setNotice('Informe a data afetada pela alteração.')
    if (localScenario) { setNotice('Simulação: alteração urgente registrada localmente.'); setUrgentText(''); setUrgentDate(''); return }
    const { error } = await supabase.from('author_change_requests').insert({ author_id: account.authorId, submitted_by: account.user.id, request_type: 'urgent', urgent_type: urgentType, affected_date: urgentDate || null, payload: { message: urgentText.trim() }, status: 'pending', submitted_at: new Date().toISOString() })
    setNotice(error ? error.message : 'Alteração urgente enviada para aprovação.')
    if (!error) { setUrgentText(''); setUrgentDate('') }
  }

  const generateQr = async () => {
    if (qr) return qr
    if (!code) return ''
    const QRCode = await import('qrcode')
    const value = await QRCode.toDataURL(code, { width: 512, margin: 2, errorCorrectionLevel: 'M' })
    setQr(value)
    return value
  }
  const showQr = async () => { await generateQr(); setQrVisible(true) }
  const downloadQr = async () => { const value = await generateQr(); if (!value) return; const link = document.createElement('a'); link.href = value; link.download = `passaporte-${author?.first_name || 'autora'}.png`; link.click() }
  const openPreview = async () => {
    if (localScenario) {
      setPreviewData({ requests: localScenario.existingRequests || [], exhibitors: LOCAL_AUTHOR_EXHIBITORS, books: [], presences: [], autographSessions: [], saleLocations: [] })
      setPreview(true)
      return
    }
    const [requestResult, exhibitorResult, presenceResult, bookLinkResult, eventLinkResult, saleResult] = await Promise.all([
      supabase
        .from('author_change_requests')
        .select('id,request_type,payload,status,affected_date,created_at')
        .eq('author_id', account.authorId)
        .in('request_type', ['presence', 'book', 'autograph', 'urgent'])
        .order('created_at', { ascending: false }),
      supabase
        .from('exhibitors')
        .select('id,name,stand_code')
        .eq('active', true)
        .is('deleted_at', null)
        .order('stand_code'),
      supabase
        .from('author_presences')
        .select('id,presence_date,start_time,end_time,stand_code,exhibitor_id,notes,guaranteed,status')
        .eq('author_id', account.authorId)
        .is('deleted_at', null)
        .order('presence_date')
        .order('start_time'),
      supabase.from('author_books').select('book_id').eq('author_id', account.authorId).is('deleted_at', null),
      supabase.from('event_authors').select('event_id').eq('author_id', account.authorId),
      supabase.from('book_stand_availability').select('book_id,stand_code,exhibitor_id,available_for_sale').eq('author_id', account.authorId).is('deleted_at', null),
    ])
    const bookIds = (bookLinkResult.data || []).map(item => item.book_id)
    const eventIds = (eventLinkResult.data || []).map(item => item.event_id)
    const [bookResult, eventResult] = await Promise.all([
      bookIds.length
        ? supabase.from('books').select('id,title,publisher,cover_url,genre,notes,autograph_available').in('id', bookIds).is('deleted_at', null).order('title')
        : Promise.resolve({ data: [], error: null }),
      eventIds.length
        ? supabase.from('events').select('id,event_date,start_time,end_time,stand_code,exhibitor_id,books,location_text,notes').in('id', eventIds).eq('event_type', 'autograph').is('deleted_at', null).order('event_date').order('start_time')
        : Promise.resolve({ data: [], error: null }),
    ])
    const previewError = requestResult.error || exhibitorResult.error || presenceResult.error || bookLinkResult.error || eventLinkResult.error || saleResult.error || bookResult.error || eventResult.error
    if (previewError) setNotice(`Não foi possível carregar todos os dados da pré-visualização: ${previewError.message}`)
    setPreviewData({
      requests: requestResult.data || [],
      exhibitors: exhibitorResult.data || [],
      books: bookResult.data || [],
      presences: presenceResult.data || [],
      autographSessions: eventResult.data || [],
      saleLocations: saleResult.data || [],
    })
    setPreview(true)
  }

  const handleGoBack = (e) => {
    if (window.opener && !window.opener.closed) {
      e?.preventDefault()
      window.close()
    }
  }

  if (accessState === 'loading') return <div className="site-theme flex min-h-[100dvh] items-center justify-center text-sm font-bold">Verificando acesso...</div>
  if (!account) return <div className="site-theme flex min-h-[100dvh] items-center justify-center p-5"><div className="auth-card rounded-3xl border p-8 text-center"><h1 className="auth-title text-2xl font-black">Painel de autoras</h1><p className="auth-muted mt-3 text-sm">{accessState === 'signed-out' ? 'Entre na sua conta para acessar este painel.' : 'Sua conta ainda não foi vinculada a uma autora verificada.'}</p><a href={appPath(accessState === 'signed-out' ? '/login' : '/')} onClick={handleGoBack} className="auth-link mt-4 inline-block font-bold">Voltar</a></div></div>

  const photo = profile.photo_path ? supabase.storage.from('passport-photos').getPublicUrl(profile.photo_path).data.publicUrl : ''
  const previewProfile = {
    ...profile,
    books: previewData.books.length ? previewData.books : profile.books,
    presences: previewData.presences.length ? previewData.presences : profile.presences,
    autograph_sessions: previewData.autographSessions.length ? previewData.autographSessions : profile.autograph_sessions,
    sale_locations: previewData.saleLocations.length ? previewData.saleLocations : profile.sale_locations,
  }
  return <div className="site-theme min-h-[100dvh] bg-[#fff8fb] p-4 text-[#56132f] sm:p-8"><main className="mx-auto max-w-5xl">
    <a href={appPath('/')} onClick={handleGoBack} className="text-sm font-bold text-[#d43276] hover:underline inline-flex items-center gap-1">← Voltar ao mapa</a>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-black">Painel da autora</h1><p className="mt-1 text-sm text-[#805269]">{author?.name}</p></div>{participating ? <div className="flex flex-wrap gap-2"><button onClick={() => setParticipationModalOpen(true)} className="route-soft-button rounded-xl border px-4 py-3 text-sm font-black">Gerenciar participação</button><button onClick={() => void openPreview()} className="route-soft-button flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-black"><Eye className="h-4 w-4"/>Pré-visualizar meu Passaporte</button></div> : <button onClick={() => setParticipationModalOpen(true)} className="route-primary-button rounded-xl px-4 py-3 text-sm font-black">Participar do Passaporte</button>}</div>
    {localScenario && <p className="mt-4 rounded-xl border border-dashed border-[#8750a0] bg-[#f7eefb] p-3 text-xs font-bold text-[#5e2674]">Modo de teste local — nenhum dado é enviado ao Supabase. Cenário: {localScenarioKey}.</p>}
    {notice && <p role="status" className="mt-4 rounded-xl bg-[#fff0f6] p-3 text-sm font-bold">{notice}</p>}

    {participating && <section className="mt-5 grid gap-5 lg:grid-cols-2"><div className="auth-card rounded-3xl border p-5"><h2 className="text-lg font-black">Perfil do Passaporte</h2><p className="mt-1 text-xs opacity-70">Os campos com * são obrigatórios para enviar. Livros, locais de venda e agenda são cadastrados nas seções próprias abaixo.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="block text-xs font-bold sm:col-span-2">Nome exibido no Passaporte <span className="font-normal opacity-60">(opcional)</span><input value={profile.passport_display_name || ''} onChange={event => setProfile({ ...profile, passport_display_name: event.target.value })} placeholder={author?.name || 'Nome que aparecerá no Passaporte'} className="auth-input mt-2 w-full rounded-xl border p-3"/></label><label className="block text-xs font-bold">Idade <span className="font-normal opacity-60">(opcional)</span><input type="number" min="0" max="130" value={profile.passport_age ?? ''} onChange={event => setProfile({ ...profile, passport_age: event.target.value })} className="auth-input mt-2 w-full rounded-xl border p-3"/></label><label className="block text-xs font-bold">Cidade natal <span className="font-normal opacity-60">(opcional)</span><input value={profile.passport_city || ''} onChange={event => setProfile({ ...profile, passport_city: event.target.value })} placeholder="Ex.: São Paulo / SP" className="auth-input mt-2 w-full rounded-xl border p-3"/></label></div><label className="mt-4 block text-xs font-bold">Foto do perfil *<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => event.target.files?.[0] && void uploadPhoto(event.target.files[0])} className="mt-2 block w-full text-xs"/><span className="mt-1 block font-normal opacity-60">JPEG, PNG ou WebP. A imagem será convertida e otimizada automaticamente.</span></label>{photo && <img src={photo} alt="Prévia" className="mt-3 h-32 w-28 rounded-xl object-cover"/>}<label className="mt-4 block text-xs font-bold"><span className="flex items-center justify-between gap-3"><span>Bio *</span><span className="font-normal tabular-nums opacity-60">{String(profile.bio || '').length}/{BIO_MAX_LENGTH}</span></span><textarea value={profile.bio || ''} maxLength={BIO_MAX_LENGTH} onChange={event => setProfile({ ...profile, bio: event.target.value })} className="auth-input mt-2 h-28 w-full rounded-xl border p-3"/></label><label className="mt-4 block text-xs font-bold">Mensagem às leitoras *<textarea value={profile.message} onChange={event => setProfile({ ...profile, message: event.target.value })} className="auth-input mt-2 h-24 w-full rounded-xl border p-3"/></label><div className="mt-5 flex gap-2"><button onClick={() => void save(false)} className="route-soft-button flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-black"><Save className="h-4 w-4"/>Salvar rascunho</button><button onClick={() => void save(true)} className="route-primary-button flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black"><Send className="h-4 w-4"/>Enviar para revisão</button></div></div>
      <div className="space-y-5"><section className="auth-card rounded-3xl border p-5"><h2 className="flex items-center gap-2 text-lg font-black"><KeyRound className="h-5 w-5"/>Minha chave do Passaporte</h2><p className="mt-2 text-xs opacity-70">Compartilhe a chave ou o QR Code somente com leitoras presentes. Elas poderão apresentar o código na tela do celular, usar um cartão de visita ou escanear o QR Code.</p>{code ? <><p className="mt-4 rounded-xl bg-[#fff0f6] p-3 text-center font-mono text-xl font-black">{code}</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => navigator.clipboard.writeText(code)} className="route-soft-button flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold"><Copy className="h-4 w-4"/>Copiar código</button><button onClick={() => qrVisible ? setQrVisible(false) : void showQr()} className="route-soft-button flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold"><QrCode className="h-4 w-4"/>{qrVisible ? 'Ocultar QR Code' : 'Mostrar QR Code'}</button><button onClick={() => void downloadQr()} className="route-soft-button flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold"><Download className="h-4 w-4"/>Baixar QR</button><button onClick={() => { void showQr(); window.setTimeout(() => window.print(), 100) }} className="route-soft-button flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold"><Printer className="h-4 w-4"/>Imprimir</button></div>{qrVisible && qr && <div className="mt-4 text-center"><img src={qr} alt="QR Code do Passaporte" className="mx-auto w-56"/><p className="mt-2 font-black">Peça meu carimbo no Passaporte Sáfico</p></div>}</> : <p className="mt-3 text-sm">A chave será gerada pela administração após a aprovação.</p>}</section>
        <UrgentForm urgentType={urgentType} setUrgentType={setUrgentType} urgentDate={urgentDate} setUrgentDate={setUrgentDate} urgentText={urgentText} setUrgentText={setUrgentText} onSend={sendUrgent}/></div></section>}
    {!participating && <div className="mt-5"><UrgentForm urgentType={urgentType} setUrgentType={setUrgentType} urgentDate={urgentDate} setUrgentDate={setUrgentDate} urgentText={urgentText} setUrgentText={setUrgentText} onSend={sendUrgent}/></div>}
    <AuthorContentRequests authorId={account.authorId} notice={setNotice} agendaOnly={!participating} localScenario={localScenario} passportRequestStatus={profile.change_request_id ? profile.status : (profile.status === 'draft' || profile.status === 'pending' ? profile.status : '')} passportRequestUpdatedAt={profile.updated_at || ''}/>
    {preview && <AuthorPassportPreview author={author} profile={previewProfile} photoUrl={photo} requests={previewData.requests} exhibitors={previewData.exhibitors} code={code} onClose={() => setPreview(false)}/>}
    {participationModalOpen && <ParticipationModal saving={participationSaving} onChoose={chooseParticipation}/>}</main></div>
}

const ParticipationModal = ({ saving, onChoose }) => <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#260d21]/70 p-0 sm:items-center sm:p-5"><section role="dialog" aria-modal="true" aria-labelledby="passport-choice-title" className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8"><div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[#efbfd6] sm:hidden"/><p className="text-xs font-black uppercase tracking-[.16em] text-[#b94185]">Passaporte Sáfico</p><h2 id="passport-choice-title" className="mt-2 text-2xl font-black">Você quer participar do Passaporte?</h2><p className="mt-3 text-sm leading-6 text-[#71475d]">O Passaporte Sáfico é uma experiência opcional para aproximar autoras e leitoras durante a Bienal do Livro.</p><p className="mt-2 text-sm leading-6 text-[#71475d]">Você pode usar este painel normalmente para cadastrar sua agenda mesmo que não queira participar do Passaporte.</p><div className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><InfoBlock number="1" title="Agenda" text="Cadastre onde e quando estará na Bienal."/><InfoBlock number="2" title="Passaporte" text="Crie sua página especial para as leitoras, com foto, bio, até 3 livros e uma mensagem."/><InfoBlock number="3" title="Encontro" text="Informe pelo menos uma presença garantida para participar."/><InfoBlock number="4" title="Carimbo" text="A leitora encontra você, recebe sua chave ou QR Code e desbloqueia o carimbo."/></div><div className="mt-4 rounded-lg border border-[#f0cddd] bg-[#fff7fa] px-3 py-2 text-[11px] leading-4 text-[#75455d]"><span>Ao clicar em participar, você autoriza o uso da sua imagem e informações aprovadas na página do Passaporte.</span><strong className="ml-1">Nada é publicado automaticamente. Todas as informações passam pela revisão da equipe Lendo Sáficos.</strong></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><button disabled={saving} onClick={() => void onChoose('declined')} className="route-soft-button rounded-xl border px-4 py-3 text-sm font-black disabled:opacity-60">Só quero cadastrar minha agenda</button><button disabled={saving} onClick={() => void onChoose('participating')} className="route-primary-button flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black disabled:opacity-60"><CheckCircle2 className="h-4 w-4"/>Quero participar do Passaporte</button></div><p className="mt-3 text-center text-xs text-[#805269]">Você poderá mudar essa escolha depois.</p></section></div>

const InfoBlock = ({ number, title, text }) => <div className="rounded-2xl border border-[#efd8e3] bg-[#fffafc] p-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#f5d7e5] text-xs font-black text-[#9b3c72]">{number}</span><strong className="mt-2 block">{title}</strong><p className="mt-1 text-xs leading-5 text-[#71475d]">{text}</p></div>

const UrgentForm = ({ urgentType, setUrgentType, urgentDate, setUrgentDate, urgentText, setUrgentText, onSend }) => <section className="auth-card rounded-3xl border p-5"><h2 className="flex items-center gap-2 text-lg font-black"><AlertTriangle className="h-5 w-5 text-amber-600"/>Informar alteração urgente</h2><select value={urgentType} onChange={event => setUrgentType(event.target.value)} className="auth-input mt-3 w-full rounded-xl border p-3 text-sm"><option value="schedule_change">Mudança de horário</option><option value="stand_change">Mudança de estande</option><option value="presence_cancelled">Cancelamento de presença</option><option value="autograph_cancelled">Cancelamento de autógrafo</option><option value="important_information">Nova informação importante</option></select><input type="date" value={urgentDate} onChange={event => setUrgentDate(event.target.value)} className="auth-input mt-3 w-full rounded-xl border p-3 text-sm" aria-label="Data afetada"/><textarea value={urgentText} onChange={event => setUrgentText(event.target.value)} className="auth-input mt-3 h-28 w-full rounded-xl border p-3" placeholder="Descreva a alteração..."/><button onClick={() => void onSend()} className="mt-3 rounded-xl bg-amber-600 px-4 py-3 text-sm font-black text-white">Enviar para aprovação</button></section>
