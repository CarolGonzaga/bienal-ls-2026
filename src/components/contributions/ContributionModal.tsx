import React, { useState } from 'react'
import { AlertCircle, ArrowLeft, BookOpen, Building2, CalendarDays, CheckCircle2, Send, X } from 'lucide-react'
import type { Exhibitor, User } from '../../types'
import { submitContribution, type ContributionInsert } from '../../lib/contributions'

type ContributionType = ContributionInsert['contribution_type']
type ContributorRole = ContributionInsert['contributor_role']

const TAGS = ['romance', 'fantasia', 'dark romance', 'hot +18', 'nacional', 'lançamento', 'autora independente', 'YA', 'suspense', 'vampiras', 'bruxas', 'enemies to lovers', 'friends to lovers', 'slow burn']
const OPTIONS: Array<{ type: ContributionType; title: string; description: string; icon: React.ElementType }> = [
  { type: 'sapphic_book', title: 'Livro sáfico', description: 'Encontrei um livro em um estande', icon: BookOpen },
  { type: 'autograph_session', title: 'Sessão de autógrafo', description: 'Cadastrar autógrafo', icon: CalendarDays },
  { type: 'exhibitor', title: 'Estande/Editora', description: 'Adicionar estande ou editora', icon: Building2 },
  { type: 'correction', title: 'Correção', description: 'Sugerir correção', icon: AlertCircle }
]

const initialForm = { book_name: '', author: '', publisher: '', cover_url: '', stand_code: '', notes: '', author_name: '', books: '', event_date: '', start_time: '', location_text: '', official_link: '', exhibitor_name: '', location: '', entity_type: '', description: '', wrong_info: '', correct_info: '', source: '', submitter_name: '', submitter_contact: '' }

export const ContributionModal: React.FC<{ open: boolean; onClose: () => void; user: User; exhibitors: Exhibitor[] }> = ({ open, onClose, user, exhibitors }) => {
  const [type, setType] = useState<ContributionType | null>(null)
  const [role, setRole] = useState<ContributorRole>('reader')
  const [form, setForm] = useState(initialForm)
  const [tags, setTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }))
  const toggleTag = (tag: string) => setTags(current => current.includes(tag) ? current.filter(item => item !== tag) : [...current, tag])
  const resetAndClose = () => { setType(null); setForm(initialForm); setTags([]); setResult(null); setError(null); onClose() }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError(null)
    try {
      if (type === 'sapphic_book' && form.cover_url && !/^https?:\/\//i.test(form.cover_url.trim())) throw new Error('Informe uma URL de capa iniciada por http:// ou https://.')
      const payload = { ...form, tags }
      delete (payload as Partial<typeof payload>).submitter_name
      delete (payload as Partial<typeof payload>).submitter_contact
      const response = await submitContribution({
        user_id: user.id,
        contribution_type: type!,
        contributor_role: role,
        payload,
        submitter_name: form.submitter_name.trim(),
        submitter_contact: form.submitter_contact.trim() || null
      })
      setResult(response.queued ? 'Contribuição salva no aparelho. Ela será enviada automaticamente quando a conexão voltar.' : 'Contribuição enviada para revisão. Obrigada por colaborar!')
    } catch (submitError: any) { setError(submitError.message || 'Não foi possível enviar a contribuição.') }
    finally { setLoading(false) }
  }

  const field = (key: keyof typeof form, label: string, required = false, placeholder = '', typeName = 'text') => <label className="contribution-label flex flex-col gap-1.5 text-xs font-black">{label}{required && ' *'}<input required={required} type={typeName} value={form[key]} onChange={event => update(key, event.target.value)} placeholder={placeholder} className="contribution-input rounded-xl border px-4 py-3 text-sm outline-none"/></label>
  const standField = <label className="contribution-label flex flex-col gap-1.5 text-xs font-black">Estande<select value={form.stand_code} onChange={event => update('stand_code', event.target.value)} className="contribution-input rounded-xl border px-4 py-3 text-sm outline-none"><option value="">Selecione o estande...</option>{exhibitors.map(exhibitor => <option key={exhibitor.id} value={exhibitor.standCode}>{exhibitor.standCode} · {exhibitor.name}</option>)}</select></label>
  const commonFields = <><div><span className="contribution-label mb-2 block text-xs font-black">Tags</span><div className="flex flex-wrap gap-2">{TAGS.map(tag => <button key={tag} type="button" aria-pressed={tags.includes(tag)} onClick={() => toggleTag(tag)} className={`contribution-tag rounded-full px-3 py-1.5 text-xs font-bold ${tags.includes(tag) ? 'is-active' : ''}`}>{tag}</button>)}</div></div><div className="contribution-divider border-t"/>{field('submitter_name', 'Seu nome', true, 'Como podemos identificar você')}{field('submitter_contact', 'Instagram ou e-mail (opcional)', false, '@usuario ou email@exemplo.com')}</>

  return <div className="fixed inset-0 z-[120] flex items-end justify-center bg-[#190713]/65 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label="Adicionar informação">
    <section className="contribution-sheet flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[2rem] border sm:max-h-[90dvh] sm:rounded-[2rem]">
      <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-[#d9c6f8] sm:hidden"/>
      <header className="flex items-start justify-between gap-4 px-5 pb-4 pt-5 sm:px-7">
        <div><h2 className="contribution-title text-xl font-black sm:text-2xl">Adicionar informação</h2><p className="contribution-muted mt-1 text-sm">Sua contribuição entra como pendente e é revisada pelo time LS.</p></div>
        <button onClick={resetAndClose} className="contribution-close shrink-0 rounded-full p-2" aria-label="Fechar"><X className="h-5 w-5"/></button>
      </header>

      <div className="overflow-y-auto px-5 pb-6 sm:px-7">
        {result ? <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-center"><CheckCircle2 className="h-12 w-12 text-emerald-500"/><p className="contribution-title max-w-md font-bold">{result}</p><button onClick={resetAndClose} className="contribution-submit rounded-xl px-6 py-3 font-black text-white">Concluir</button></div> : !type ? <div className="flex flex-col gap-3 pb-2">
          {OPTIONS.map(option => { const Icon = option.icon; return <button key={option.type} onClick={() => setType(option.type)} className="contribution-option flex items-center gap-4 rounded-2xl border p-4 text-left"><span className="contribution-option-icon rounded-2xl p-3"><Icon className="h-6 w-6"/></span><span><strong className="contribution-title block text-base">{option.title}</strong><span className="contribution-muted text-sm">{option.description}</span></span></button> })}
        </div> : <form onSubmit={submit} className="flex flex-col gap-5 pb-2">
          <button type="button" onClick={() => setType(null)} className="contribution-link flex items-center gap-1 self-start text-sm font-bold"><ArrowLeft className="h-4 w-4"/>Voltar</button>
          <fieldset><legend className="contribution-label mb-2 text-xs font-black">Você está enviando como *</legend><div className="grid grid-cols-3 gap-2">{([['reader','Leitora'],['author','Autora'],['publisher','Editora']] as const).map(([value,label]) => <button key={value} type="button" onClick={() => setRole(value)} className={`contribution-role rounded-xl border px-2 py-2.5 text-xs font-black ${role === value ? 'is-active' : ''}`}>{label}</button>)}</div></fieldset>

          {type === 'sapphic_book' && <>{field('book_name', 'Nome do livro', true, 'Ex: Presas')}{field('author', 'Autora', true, 'Ex: Rebecca Nobre')}{field('publisher', 'Editora', false, 'Ex: Galera Record')}{field('cover_url', 'URL da capa (opcional)', false, 'https://exemplo.com/capa.jpg', 'url')}{form.cover_url && <img src={form.cover_url} alt="Prévia da capa informada" className="h-40 w-28 rounded-lg object-cover shadow"/>}{standField}<label className="contribution-label flex flex-col gap-1.5 text-xs font-black">Observação<textarea value={form.notes} onChange={event => update('notes', event.target.value)} className="contribution-input min-h-24 rounded-xl border p-4 text-sm outline-none"/></label>{commonFields}</>}
          {type === 'autograph_session' && <>{field('author_name', 'Nome da autora', true)}{field('books', 'Livros (separados por vírgula)', false, 'Ex: Presas, Coração de Ferro')}<div className="grid grid-cols-2 gap-3">{field('event_date', 'Data', true, '', 'date')}{field('start_time', 'Horário', true, '16h', 'time')}</div>{standField}{field('location_text', 'Local textual', false, 'Ex: Estande B42, Galera Record')}{field('official_link', 'Link oficial (opcional)', false)}<label className="contribution-label flex flex-col gap-1.5 text-xs font-black">Observações<textarea value={form.notes} onChange={event => update('notes', event.target.value)} className="contribution-input min-h-24 rounded-xl border p-4 text-sm outline-none"/></label>{commonFields}</>}
          {type === 'exhibitor' && <>{field('exhibitor_name', 'Nome do estande/editora', true, 'Ex: Galera Record')}{field('stand_code', 'Número do estande', true, 'Ex: B42')}{field('location', 'Localização', false, 'Ex: Rua 3, Pavilhão A')}<label className="contribution-label flex flex-col gap-1.5 text-xs font-black">Tipo<select required value={form.entity_type} onChange={event => update('entity_type', event.target.value)} className="contribution-input rounded-xl border px-4 py-3 text-sm"><option value="">Selecione...</option><option>Editora</option><option>Estande</option><option>Livraria</option><option>Coletivo</option><option>Autora independente</option></select></label><label className="contribution-label flex flex-col gap-1.5 text-xs font-black">Descrição<textarea value={form.description} onChange={event => update('description', event.target.value)} className="contribution-input min-h-24 rounded-xl border p-4 text-sm outline-none"/></label>{commonFields}</>}
          {type === 'correction' && <>{standField}<label className="contribution-label flex flex-col gap-1.5 text-xs font-black">O que está errado? *<textarea required value={form.wrong_info} onChange={event => update('wrong_info', event.target.value)} className="contribution-input min-h-24 rounded-xl border p-4 text-sm outline-none"/></label><label className="contribution-label flex flex-col gap-1.5 text-xs font-black">Informação correta<textarea value={form.correct_info} onChange={event => update('correct_info', event.target.value)} className="contribution-input min-h-24 rounded-xl border p-4 text-sm outline-none"/></label>{field('source', 'Fonte/link/foto (opcional)', false, 'Cole um link ou descreva a fonte')}{field('submitter_name', 'Seu nome', true)}{field('submitter_contact', 'Instagram ou e-mail (opcional)')}</>}
          {error && <div className="auth-error rounded-xl border p-3 text-xs font-bold">{error}</div>}
          <button disabled={loading} className="contribution-submit flex min-h-14 items-center justify-center gap-2 rounded-xl text-base font-black text-white disabled:opacity-60"><Send className="h-5 w-5"/>{loading ? 'Enviando...' : 'Enviar para revisão'}</button>
        </form>}
      </div>
    </section>
  </div>
}
