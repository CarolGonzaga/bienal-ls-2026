import React, { useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Camera, CheckCircle2, Search, Stamp } from 'lucide-react'
import { usePassportStore } from '../../stores/usePassportStore'
import { useUserStore } from '../../stores/useUserStore'
import { QrScannerModal } from './QrScannerModal'
import { supabase } from '../../lib/supabase'

type Filter = 'all' | 'found' | 'missing'

export const SapphicPassport: React.FC = () => {
  const user = useUserStore(s => s.user)
  const { authors, profiles, stamps, redeemPassportCode } = usePassportStore()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [manualCode, setManualCode] = useState('')
  const [notice, setNotice] = useState('')
  const [differentAuthor, setDifferentAuthor] = useState<{ id: string; name: string } | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const passportAuthors = useMemo(() => [...authors, ...stamps.filter(stamp => !authors.some(author => author.id === stamp.authorId)).map(stamp => ({ id: stamp.authorId, slug: stamp.authorSlug || stamp.authorId, name: stamp.authorName || 'Autora arquivada', first_name: '', bio: '', message: '', active: false, published: false }))], [authors, stamps])
  const visible = useMemo(() => passportAuthors.filter(author => {
    const found = stamps.some(stamp => stamp.authorId === author.id)
    return ((author.active && author.published) || found) && author.name.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')) && (filter === 'all' || (filter === 'found' ? found : !found))
  }), [filter, passportAuthors, query, stamps])
  const selected = passportAuthors.find(author => author.id === selectedId) || visible[0]
  const profile = profiles.find(item => item.author_id === selected?.id)
  const found = Boolean(selected && stamps.some(stamp => stamp.authorId === selected.id))
  const photoUrl = profile?.photo_path ? (profile.photo_path.startsWith('http') ? profile.photo_path : supabase.storage.from('passport-photos').getPublicUrl(profile.photo_path).data.publicUrl) : ''
  const redeem = async (value: string, source: 'manual' | 'qr') => {
    if (!user || !selected) return
    const result = await redeemPassportCode(user.id, value, source, selected.id)
    setNotice(result.differentAuthor ? `Este código pertence a ${result.differentAuthor.name}. Deseja abrir a página dessa autora?` : result.message)
    setDifferentAuthor(result.differentAuthor ? { id: result.differentAuthor.id, name: result.differentAuthor.name } : null)
    if (result.ok) setManualCode('')
  }
  const move = (direction: -1 | 1) => {
    const index = visible.findIndex(author => author.id === selected?.id)
    if (index >= 0) setSelectedId(visible[(index + direction + visible.length) % visible.length]?.id || null)
  }
  return <div className="passport-page mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
    <header><h2 className="route-title text-2xl font-black">Meu Passaporte</h2><p className="route-muted mt-1 text-sm">{stamps.length} / {passportAuthors.filter(item => item.active && item.published).length} carimbos</p></header>
    <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="route-panel rounded-3xl border p-4"><label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b94185]"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Pesquisar autora..." className="route-origin-select w-full rounded-xl border py-3 pl-10 pr-3 text-sm"/></label><div className="mt-3 flex gap-2">{([['all','Todas'],['found','Encontradas'],['missing','Ainda não encontrei']] as const).map(([id,label]) => <button key={id} onClick={() => setFilter(id)} className={`schedule-filter-chip ${filter === id ? 'is-active' : ''}`}>{label}</button>)}</div><div className="mt-4 max-h-[55dvh] space-y-1 overflow-y-auto">{visible.map(author => { const stamped = stamps.some(stamp => stamp.authorId === author.id); return <button key={author.id} onClick={() => setSelectedId(author.id)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold ${selected?.id === author.id ? 'bg-[#fff0f6] text-[#b52065]' : ''}`}><span>{author.name}</span>{stamped ? <CheckCircle2 className="h-4 w-4 text-emerald-600"/> : <span className="text-lg text-[#b99aac]">○</span>}</button>})}</div></aside>
      {selected ? <article onTouchStart={event => { touchStartX.current = event.touches[0]?.clientX ?? null }} onTouchEnd={event => { if (touchStartX.current === null) return; const delta = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current; touchStartX.current = null; if (Math.abs(delta) >= 60) move(delta > 0 ? -1 : 1) }} className="route-panel overflow-hidden rounded-[2rem] border p-5 sm:p-7"><div className="flex flex-col gap-5 sm:flex-row"><div className="h-40 w-32 shrink-0 overflow-hidden rounded-2xl bg-[#f7e8ef]">{photoUrl ? <img src={photoUrl} alt={selected.name} className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center text-4xl font-black text-[#d43276]">{selected.name[0]}</div>}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="route-title text-2xl font-black">{selected.name}</h3>{found && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">Carimbo encontrado</span>}</div><p className="route-muted mt-3 whitespace-pre-line text-sm leading-relaxed">{profile?.bio || selected.bio || 'Bio em preparação.'}</p>{profile?.message && <blockquote className="mt-4 border-l-4 border-[#d43276] pl-3 text-sm italic">{profile.message}</blockquote>}</div></div>
        {(profile?.books || []).length > 0 && <section className="mt-6"><h4 className="flex items-center gap-2 text-sm font-black"><BookOpen className="h-4 w-4"/>Livros</h4><div className="mt-2 flex flex-wrap gap-2">{profile!.books.map((book:any,index:number) => <span key={index} className="rounded-full bg-[#f5e9f8] px-3 py-1 text-xs font-bold">{typeof book === 'string' ? book : book.title}</span>)}</div></section>}
        {!found && <section className="mt-6 rounded-2xl border p-4"><h4 className="flex items-center gap-2 text-sm font-black"><Stamp className="h-4 w-4"/>Receber carimbo</h4><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={manualCode} onChange={event => setManualCode(event.target.value)} placeholder="Digite a chave" className="route-origin-select min-w-0 flex-1 rounded-xl border px-3 py-3 text-sm uppercase"/><button onClick={() => void redeem(manualCode, 'manual')} className="route-primary-button rounded-xl px-4 py-3 text-sm font-black">Validar código</button><button onClick={() => setScannerOpen(true)} className="route-soft-button flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-black"><Camera className="h-4 w-4"/>Ler QR</button></div></section>}
        {notice && <div role="status" className="mt-4 rounded-xl bg-[#fff0f6] p-3 text-sm font-bold text-[#9b376c]"><p>{notice}</p>{differentAuthor && <div className="mt-3 flex gap-2"><button onClick={() => { setSelectedId(differentAuthor.id); setDifferentAuthor(null); setNotice('') }} className="route-primary-button rounded-lg px-3 py-2 text-xs font-black">Abrir autora</button><button onClick={() => { setDifferentAuthor(null); setNotice('') }} className="route-soft-button rounded-lg border px-3 py-2 text-xs font-black">Agora não</button></div>}</div>}
        <footer className="mt-6 flex justify-between"><button onClick={() => move(-1)} className="route-soft-button flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold"><ArrowLeft className="h-4 w-4"/>Anterior</button><button onClick={() => move(1)} className="route-soft-button flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold">Próxima<ArrowRight className="h-4 w-4"/></button></footer>
      </article> : <div className="route-panel rounded-3xl border p-10 text-center text-sm">Nenhuma autora disponível neste filtro.</div>}
    </div><QrScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onCode={value => void redeem(value, 'qr')}/>
  </div>
}
