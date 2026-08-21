import React, { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { appPath } from '../lib/paths'

export default function PasswordResetPage() {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async event => {
    event.preventDefault()
    setError('')
    if (password.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.')
    if (password !== confirmation) return setError('As senhas não coincidem.')
    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateError) return setError(updateError.message || 'O link expirou. Solicite uma nova recuperação.')
    setDone(true)
  }

  return (
    <main className="auth-page flex min-h-[100dvh] items-center justify-center px-4 py-8">
      <section className="auth-card w-full max-w-md rounded-[2rem] border p-6 sm:p-8">
        <img src={appPath('/logo-completo.png')} alt="Mapa Sáfico" className="mx-auto mb-6 h-20 object-contain" />
        {done ? (
          <div className="text-center">
            <h1 className="auth-title text-2xl font-black">Senha atualizada</h1>
            <p className="auth-muted my-4 text-sm">Sua nova senha já está ativa.</p>
            <a href={appPath('/login')} className="auth-submit inline-flex rounded-xl px-6 py-3 text-sm font-black text-white">
              Entrar no site
            </a>
          </div>
        ) : (
          <>
            <h1 className="auth-title text-2xl font-black">Crie uma nova senha</h1>
            <p className="auth-muted mb-6 mt-1 text-sm">Use pelo menos 8 caracteres.</p>
            {error && <div className="auth-error mb-4 rounded-xl border p-3 text-xs font-semibold">{error}</div>}
            <form onSubmit={submit} className="flex flex-col gap-4">
              <label className="auth-field-label flex flex-col gap-2 text-xs font-bold">
                Nova senha
                <div className="relative">
                  <Lock className="auth-field-icon absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" />
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    minLength={8}
                    className="auth-input w-full rounded-xl border py-3 pl-11 pr-11 text-sm outline-none"
                    placeholder="Digite a nova senha"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    onClick={() => setShowPassword(v => !v)}
                    className="auth-password-toggle absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              <label className="auth-field-label flex flex-col gap-2 text-xs font-bold">
                Confirmar nova senha
                <div className="relative">
                  <Lock className="auth-field-icon absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" />
                  <input
                    required
                    type={showConfirmation ? 'text' : 'password'}
                    minLength={8}
                    className="auth-input w-full rounded-xl border py-3 pl-11 pr-11 text-sm outline-none"
                    placeholder="Repita a nova senha"
                    value={confirmation}
                    onChange={e => setConfirmation(e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={showConfirmation ? 'Ocultar senha' : 'Mostrar senha'}
                    onClick={() => setShowConfirmation(v => !v)}
                    className="auth-password-toggle absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                  >
                    {showConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              <button disabled={loading} className="auth-submit mt-2 rounded-xl py-3 text-sm font-black text-white disabled:opacity-60">
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  )
}

