import React, { useState } from 'react'
import { ArrowLeft, ArrowRight, AtSign, Check, Eye, EyeOff, Lock, Mail, ShieldCheck, User } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const DISCOVERY_OPTIONS = ['Google', 'Instagram', 'X (Twitter)', 'Tik Tok', 'Grupo de Whatsapp', 'Outros']

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [mode, setMode] = useState('login')
  const [identifier, setIdentifier] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [discoverySource, setDiscoverySource] = useState('')
  const [rememberConnected, setRememberConnected] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  if (!isOpen) return null

  const configuredSupabase = isSupabaseConfigured

  const resetMessages = () => {
    setError(null)
    setNotice(null)
  }

  const changeMode = nextMode => {
    setMode(nextMode)
    resetMessages()
  }

  const handleRecovery = async () => {
    resetMessages()
    if (!identifier.includes('@')) {
      setError('Informe seu e-mail no campo de acesso para recuperar a senha.')
      return
    }
    try {
      if (!configuredSupabase) throw new Error('O Supabase não está configurado neste ambiente.')
      if (configuredSupabase) {
        const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(identifier, { redirectTo: window.location.origin })
        if (recoveryError) throw recoveryError
      }
      setNotice('Enviamos as instruções de recuperação para o e-mail informado.')
    } catch (recoveryError) {
      setError(recoveryError.message || 'Não foi possível iniciar a recuperação da senha.')
    }
  }

  const handleSubmit = async event => {
    event.preventDefault()
    resetMessages()

    if (mode === 'register') {
      if (password.length < 8) {
        setError('A senha precisa ter pelo menos 8 caracteres.')
        return
      }
      if (password !== passwordConfirmation) {
        setError('As senhas informadas não coincidem.')
        return
      }
    }

    setLoading(true)
    try {
      if (!configuredSupabase) throw new Error('O Supabase não está configurado neste ambiente.')
      if (mode === 'login') {
        if (configuredSupabase && !identifier.includes('@')) throw new Error('Para este acesso, informe o e-mail cadastrado.')
        let authenticatedUser
        if (configuredSupabase) {
          const { data, error: loginError } = await supabase.auth.signInWithPassword({ email: identifier, password })
          if (loginError) throw loginError
          authenticatedUser = data.user
        }
        onLoginSuccess(authenticatedUser, rememberConnected)
      } else {
        let registeredUser
        if (configuredSupabase) {
          const { data, error: registerError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name: username, username, discoverySource } }
          })
          if (registerError) throw registerError
          if (!data.session) throw new Error('O cadastro foi criado, mas a confirmação de e-mail está ativa no Supabase. Desative “Confirm email” para permitir acesso imediato.')
          registeredUser = data.user
        }
        onLoginSuccess(registeredUser, true)
      }
      onClose()
    } catch (submitError) {
      setError(submitError.message || 'Não foi possível concluir a autenticação.')
    } finally {
      setLoading(false)
    }
  }

  const fieldClass = 'auth-input w-full rounded-xl border py-3 pl-11 pr-4 text-sm outline-none'

  return (
    <section className="auth-page flex min-h-full w-full items-start justify-center overflow-y-auto px-4 py-8 sm:items-center sm:py-12">
      <div className="auth-card w-full max-w-lg rounded-[2rem] border p-5 sm:p-8">
        <button type="button" onClick={onClose} className="auth-back-button mb-5 flex items-center gap-2 text-xs font-bold">
          <ArrowLeft className="h-4 w-4" />Voltar ao site
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="relative h-12 w-12 overflow-hidden"><img src="/logo-icon.png" alt="" className="absolute left-1/2 top-1/2 h-16 w-16 max-w-none -translate-x-1/2 -translate-y-1/2 object-contain" /></div>
          <div><h1 className="auth-title text-2xl font-black">{mode === 'login' ? 'Boas-vindas de volta' : 'Crie sua conta'}</h1><p className="auth-muted mt-0.5 text-sm">{mode === 'login' ? 'Acesse seu mapa e seus favoritos.' : 'Faça parte da comunidade mapasáfico.'}</p></div>
        </div>

        <div className="auth-mode-tabs mb-6 grid grid-cols-2 rounded-2xl border p-1">
          <button type="button" onClick={() => changeMode('login')} className={`rounded-xl py-2.5 text-xs font-black ${mode === 'login' ? 'is-active' : ''}`}>Entrar</button>
          <button type="button" onClick={() => changeMode('register')} className={`rounded-xl py-2.5 text-xs font-black ${mode === 'register' ? 'is-active' : ''}`}>Criar conta</button>
        </div>

        {error && <div role="alert" className="auth-error mb-4 rounded-xl border px-3 py-2.5 text-xs font-semibold">{error}</div>}
        {notice && <div role="status" className="auth-notice mb-4 rounded-xl border px-3 py-2.5 text-xs font-semibold">{notice}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'login' ? (
            <>
              <label className="auth-field-label flex flex-col gap-1.5 text-xs font-bold">E-mail ou nome de usuário
                <span className="relative"><AtSign className="auth-field-icon absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"/><input required autoComplete="username" value={identifier} onChange={event => setIdentifier(event.target.value)} className={fieldClass} placeholder="seu e-mail ou usuário" /></span>
              </label>
              <label className="auth-field-label flex flex-col gap-1.5 text-xs font-bold">Senha
                <span className="relative"><Lock className="auth-field-icon absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"/><input required minLength={8} type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className={`${fieldClass} pr-11`} placeholder="Sua senha"/><button type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPassword(value => !value)} className="auth-password-toggle absolute right-3 top-1/2 -translate-y-1/2">{showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button></span>
              </label>
              <div className="flex items-center justify-between gap-3 text-xs">
                <label className="auth-remember flex cursor-pointer items-center gap-2 font-semibold"><input type="checkbox" checked={rememberConnected} onChange={event => setRememberConnected(event.target.checked)} className="h-4 w-4 accent-[#d43276]"/>Manter conectado</label>
                <button type="button" onClick={handleRecovery} className="auth-link font-bold">Recuperar senha</button>
              </div>
            </>
          ) : (
            <>
              <label className="auth-field-label flex flex-col gap-1.5 text-xs font-bold">Nome de usuário
                <span className="relative"><User className="auth-field-icon absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"/><input required autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} className={fieldClass} placeholder="Como você quer ser chamada" /></span>
              </label>
              <label className="auth-field-label flex flex-col gap-1.5 text-xs font-bold">E-mail
                <span className="relative"><Mail className="auth-field-icon absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"/><input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className={fieldClass} placeholder="voce@exemplo.com" /></span>
              </label>
              <label className="auth-field-label flex flex-col gap-1.5 text-xs font-bold">Senha
                <span className="relative"><Lock className="auth-field-icon absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"/><input required minLength={8} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} className={`${fieldClass} pr-11`} placeholder="Crie uma senha"/><button type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPassword(value => !value)} className="auth-password-toggle absolute right-3 top-1/2 -translate-y-1/2">{showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button></span>
              </label>
              <div className="auth-password-hint flex items-start gap-2 rounded-xl px-3 py-2 text-[11px]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0"/><span>Use pelo menos 8 caracteres. Combine letras, números e símbolos para uma senha mais segura.</span></div>
              <label className="auth-field-label flex flex-col gap-1.5 text-xs font-bold">Repita a senha
                <span className="relative"><Check className="auth-field-icon absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"/><input required minLength={8} type="password" autoComplete="new-password" value={passwordConfirmation} onChange={event => setPasswordConfirmation(event.target.value)} className={fieldClass} placeholder="Digite a senha novamente" /></span>
              </label>
              <label className="auth-field-label flex flex-col gap-1.5 text-xs font-bold">Como conheceu o site?
                <select required value={discoverySource} onChange={event => setDiscoverySource(event.target.value)} className="auth-input w-full rounded-xl border px-3 py-3 text-sm outline-none"><option value="" disabled>Selecione uma opção</option>{DISCOVERY_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}</select>
              </label>
            </>
          )}

          <button type="submit" disabled={loading} className="auth-submit mt-1 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-black text-white disabled:opacity-60">
            <span>{loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar minha conta'}</span><ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </section>
  )
}
