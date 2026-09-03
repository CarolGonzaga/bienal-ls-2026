import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'

type TutorialStep = { title: string; text: string; target?: string }

const STEPS: TutorialStep[] = [
  { title: 'Bem-vinda ao Mapa Sáfico', text: 'Este guia rápido mostra como encontrar expositores, montar sua rota e usar os controles do mapa.' },
  { title: 'Encontre rapidamente', text: 'Busque pelo nome da editora, autora, livro ou estande. Os resultados são atualizados enquanto você digita.', target: '[data-tutorial="search"]' },
  { title: 'Navegue pelo site', text: 'Use este menu para abrir o mapa, consultar a lista de expositores, conferir a programação, organizar sua rota e acessar o Passaporte.', target: '[data-tutorial="navigation"]' },
  { title: 'Monte sua rota', text: 'Adicione os estandes que deseja visitar e organize a ordem das paradas em Minha Rota.', target: '[data-tutorial="route"]' },
  { title: 'Explore o mapa', text: 'Arraste o mapa para percorrer o pavilhão. Toque em um estande para ver detalhes, favoritar, marcar como visitado ou adicionar à rota.', target: '[data-tutorial="map"]' },
  { title: 'Zoom e centralização', text: 'Use estes botões para aproximar, afastar e recentralizar o mapa.', target: '[data-tutorial="map-controls"]' },
  { title: 'Defina seu ponto de partida', text: 'Arraste o ícone de pessoa até o mapa. Se você estiver usando o navegador Safari, você também pode pressioná-lo e depois tocar no local desejado. Um toque simples não altera sua posição.', target: '[data-tutorial="person"]' },
  { title: 'Ajustes e limpeza', text: 'Aqui você pode escolher a qualidade visual, centralizar o mapa e limpar rotas e posições marcadas.', target: '[data-tutorial="map-settings"], [data-tutorial="mobile-settings"]' },
  { title: 'Seu perfil', text: 'Abra seu perfil para alterar nome, foto e senha. Use o botão de ajuda ao lado sempre que quiser rever este tutorial.', target: '[data-tutorial="profile"]' },
  { title: 'Tudo pronto!', text: 'Agora é só explorar a Bienal. O mapa e seus dados pessoais continuam disponíveis mesmo quando o sinal de internet estiver ruim.' }
]

const visibleTarget = (selector?: string) => {
  if (!selector) return null
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).find(element => {
    const rect = element.getBoundingClientRect()
    const style = window.getComputedStyle(element)
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'
  }) || null
}

export const MapTutorial: React.FC<{ open: boolean; onFinish: () => void }> = ({ open, onFinish }) => {
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const step = STEPS[stepIndex]

  useEffect(() => { if (open) setStepIndex(0) }, [open])

  useEffect(() => {
    if (!open) return
    const update = () => {
      const target = visibleTarget(step.target)
      if (target) target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
      window.setTimeout(() => setTargetRect(target?.getBoundingClientRect() || null), 80)
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, step])

  const cardStyle = useMemo<React.CSSProperties>(() => {
    const width = Math.min(360, window.innerWidth - 32)
    if (!targetRect) return { width, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
    const left = Math.max(16, Math.min(window.innerWidth - width - 16, targetRect.left + targetRect.width / 2 - width / 2))
    const below = targetRect.bottom + 16
    const top = below + 250 < window.innerHeight ? below : Math.max(16, targetRect.top - 266)
    return { width, left, top }
  }, [targetRect])

  if (!open) return null
  const last = stepIndex === STEPS.length - 1
  const padding = 7

  return <div role="dialog" aria-modal="true" aria-label="Tutorial de uso do mapa" className="fixed inset-0 z-[100]">
    <div className={`absolute inset-0 ${targetRect ? '' : 'bg-black/60'}`} aria-hidden="true" />
    {targetRect && <div aria-hidden="true" className="pointer-events-none fixed z-[101] rounded-2xl border-2 border-[#fc94c3] shadow-[0_0_0_9999px_rgba(24,5,18,0.68),0_0_0_5px_rgba(212,50,118,0.22)]" style={{ left: targetRect.left - padding, top: targetRect.top - padding, width: targetRect.width + padding * 2, height: targetRect.height + padding * 2 }} />}
    <section className="tutorial-card fixed z-[102] rounded-3xl border p-5 shadow-2xl" style={cardStyle}>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div><span className="tutorial-step-label text-[10px] font-black uppercase tracking-[0.16em]">Etapa {stepIndex + 1} de {STEPS.length}</span><h2 className="tutorial-title mt-1 text-lg font-black">{step.title}</h2></div>
        <button onClick={onFinish} aria-label="Fechar tutorial" className="tutorial-close rounded-full p-1.5"><X className="h-4 w-4"/></button>
      </div>
      <p className="tutorial-text text-sm leading-relaxed">{step.text}</p>
      <div className="mt-5 flex items-center justify-between gap-2">
        <button onClick={onFinish} className="tutorial-skip px-1 text-xs font-bold">Pular tutorial</button>
        <div className="flex gap-2">
          {stepIndex > 0 && <button onClick={() => setStepIndex(index => index - 1)} className="tutorial-secondary flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-black"><ArrowLeft className="h-3.5 w-3.5"/>Voltar</button>}
          <button onClick={() => last ? onFinish() : setStepIndex(index => index + 1)} className="tutorial-primary flex items-center gap-1 rounded-xl px-4 py-2 text-xs font-black text-white">{last ? <><Check className="h-3.5 w-3.5"/>Concluir</> : <>Próximo<ArrowRight className="h-3.5 w-3.5"/></>}</button>
        </div>
      </div>
    </section>
  </div>
}
