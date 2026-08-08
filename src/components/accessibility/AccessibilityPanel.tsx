import React from 'react'
import { Eye, Moon, Sun, X } from 'lucide-react'
import { useMapStore } from '../../stores/useMapStore'

interface AccessibilityPanelProps {
  isOpen: boolean
  onClose: () => void
}

export const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({ isOpen, onClose }) => {
  const reducedMotion = useMapStore(s => s.reducedMotion)
  const setReducedMotion = useMapStore(s => s.setReducedMotion)
  const mapTheme = useMapStore(s => s.mapTheme)
  const setMapTheme = useMapStore(s => s.setMapTheme)

  if (!isOpen) return null

  return (
    <div className="site-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="site-dialog glass-panel w-full max-w-md rounded-3xl p-6 border shadow-2xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-lg text-white">Opções de Acessibilidade</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4 text-xs">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 p-3">
            <div>
              <span className="block font-semibold text-slate-200">Tema do site</span>
              <span className="mt-0.5 block text-[10px] text-slate-400">Alterna todas as páginas entre claro e escuro.</span>
            </div>
            <button
              type="button"
              data-testid="accessibility-theme-toggle"
              onClick={() => setMapTheme(mapTheme === 'light' ? 'dark' : 'light')}
              className="flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-[#d43276]/40 bg-[#fff0f6] px-3 font-bold text-[#b94185]"
            >
              {mapTheme === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span>{mapTheme === 'light' ? 'Claro' : 'Escuro'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="font-semibold text-slate-200">Reduzir Animações & Movimentos</span>
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => setReducedMotion(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col gap-2">
            <span className="font-bold text-indigo-300">Atalhos de Teclado</span>
            <ul className="text-slate-400 space-y-1">
              <li><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">Esc</kbd> — Fechar painéis ou desmarcar estande</li>
              <li><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">Modo 2D</kbd> — Alternativa de navegação por teclado e leitor de tela</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
