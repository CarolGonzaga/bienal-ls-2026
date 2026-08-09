import React, { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Camera, Check, Lock, Save, User } from 'lucide-react'
import { supabase } from '../lib/supabase'

const MAX_AVATAR_SIZE = 2 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function ProfilePage() {
  const fileInput = useRef(null)
  const [account, setAccount] = useState(null)
  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        window.location.replace('/')
        return
      }
      setAccount(data.user)
      const { data: profile } = await supabase.from('profiles').select('display_name, username, avatar_url').eq('id', data.user.id).maybeSingle()
      setName(profile?.display_name || data.user.user_metadata?.name || data.user.user_metadata?.username || '')
      setAvatarUrl(profile?.avatar_url || data.user.user_metadata?.avatar_url || '')
      setLoading(false)
    })
  }, [])

  const showResult = (nextMessage = '', nextError = '') => { setMessage(nextMessage); setError(nextError) }

  const uploadAvatar = async event => {
    const file = event.target.files?.[0]
    if (!file || !account) return
    showResult()
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) return showResult('', 'Use uma imagem JPG, PNG ou WEBP.')
    if (file.size > MAX_AVATAR_SIZE) return showResult('', 'A imagem deve ter no máximo 2 MB.')
    setLoading(true)
    try {
      const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
      const path = `${account.id}/avatar.${extension}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${data.publicUrl}?v=${Date.now()}`
      const { error: profileError } = await supabase.from('profiles').update({ avatar_url: url, updated_at: new Date().toISOString() }).eq('id', account.id)
      if (profileError) throw profileError
      await supabase.auth.updateUser({ data: { ...account.user_metadata, avatar_url: url } })
      setAvatarUrl(url)
      showResult('Imagem do perfil atualizada.')
    } catch (uploadError) {
      showResult('', uploadError.message || 'Não foi possível enviar a imagem.')
    } finally { setLoading(false); event.target.value = '' }
  }

  const saveName = async event => {
    event.preventDefault()
    showResult()
    const normalizedName = name.trim()
    if (normalizedName.length < 2 || normalizedName.length > 40) return showResult('', 'O nome deve ter entre 2 e 40 caracteres.')
    setLoading(true)
    try {
      const { error: profileError } = await supabase.from('profiles').update({ display_name: normalizedName, username: normalizedName, updated_at: new Date().toISOString() }).eq('id', account.id)
      if (profileError) throw profileError
      const { data, error: authError } = await supabase.auth.updateUser({ data: { ...account.user_metadata, name: normalizedName, username: normalizedName, avatar_url: avatarUrl } })
      if (authError) throw authError
      setAccount(data.user)
      showResult('Nome atualizado com sucesso.')
    } catch (saveError) { showResult('', saveError.message || 'Não foi possível atualizar o nome.') }
    finally { setLoading(false) }
  }

  const changePassword = async event => {
    event.preventDefault()
    showResult()
    if (password.length < 8) return showResult('', 'A nova senha precisa ter pelo menos 8 caracteres.')
    if (password !== passwordConfirmation) return showResult('', 'As senhas não coincidem.')
    setLoading(true)
    const { error: passwordError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (passwordError) return showResult('', passwordError.message)
    setPassword(''); setPasswordConfirmation(''); showResult('Senha alterada com sucesso.')
  }

  if (loading && !account) return <div className="auth-page flex min-h-[100dvh] items-center justify-center"><span className="auth-muted text-sm font-bold">Carregando perfil...</span></div>

  return <main className="auth-page min-h-[100dvh] px-4 py-8">
    <div className="mx-auto w-full max-w-2xl">
      <button onClick={() => window.close()} className="auth-back-button mb-4 flex items-center gap-2 text-xs font-bold"><ArrowLeft className="h-4 w-4"/>Fechar perfil</button>
      <section className="auth-card rounded-[2rem] border p-5 sm:p-8">
        <div className="mb-7 flex items-center gap-4">
          <button type="button" onClick={() => fileInput.current?.click()} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-[#f3c1d8] bg-[#fff0f6]" aria-label="Alterar imagem do perfil">
            {avatarUrl ? <img src={avatarUrl} alt="Imagem do perfil" className="h-full w-full object-cover"/> : <User className="m-auto h-full w-10 text-[#d43276]"/>}
            <span className="absolute bottom-0 right-0 rounded-full bg-[#d43276] p-2 text-white"><Camera className="h-4 w-4"/></span>
          </button>
          <div><h1 className="auth-title text-2xl font-black">Meu perfil</h1><p className="auth-muted mt-1 break-all text-sm">{account?.email}</p><button disabled={loading} onClick={() => fileInput.current?.click()} className="auth-link mt-2 text-xs font-bold">Alterar imagem</button></div>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} className="hidden"/>
        </div>
        {error && <div className="auth-error mb-5 rounded-xl border p-3 text-xs font-semibold">{error}</div>}
        {message && <div className="auth-notice mb-5 flex items-center gap-2 rounded-xl p-3 text-xs font-semibold"><Check className="h-4 w-4"/>{message}</div>}
        <form onSubmit={saveName} className="mb-7 border-b border-[#f0c4d8] pb-7">
          <label className="auth-field-label flex flex-col gap-2 text-xs font-bold">Nome ou apelido<input className="auth-input rounded-xl border px-4 py-3 text-sm outline-none" value={name} maxLength={40} onChange={event => setName(event.target.value)}/></label>
          <button disabled={loading} className="auth-submit mt-4 flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white disabled:opacity-60"><Save className="h-4 w-4"/>Salvar nome</button>
        </form>
        <form onSubmit={changePassword} className="flex flex-col gap-4">
          <h2 className="auth-title flex items-center gap-2 text-lg font-black"><Lock className="h-5 w-5"/>Alterar senha</h2>
          <input required minLength={8} type="password" autoComplete="new-password" className="auth-input rounded-xl border px-4 py-3 text-sm outline-none" placeholder="Nova senha" value={password} onChange={event => setPassword(event.target.value)}/>
          <input required minLength={8} type="password" autoComplete="new-password" className="auth-input rounded-xl border px-4 py-3 text-sm outline-none" placeholder="Repita a nova senha" value={passwordConfirmation} onChange={event => setPasswordConfirmation(event.target.value)}/>
          <button disabled={loading} className="auth-submit flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-black text-white disabled:opacity-60">Alterar senha</button>
        </form>
      </section>
    </div>
  </main>
}
