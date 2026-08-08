import React, { useState } from 'react'
import { 
  Upload, 
  Layers, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Sliders, 
  Sparkles,
  AlertCircle,
  Save,
  RotateCcw
} from 'lucide-react'
import { useAdminMapStore } from '../../stores/useAdminMapStore'
import { useExhibitorStore } from '../../stores/useExhibitorStore'
import { MAP_ORIGINAL_WIDTH, MAP_ORIGINAL_HEIGHT, Point2D } from '../../utils/coordinates'

export const AdminSuite: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'polygon' | 'validation'>('polygon')
  
  const currentVersion = useAdminMapStore(s => s.currentVersion)
  const geometries = useAdminMapStore(s => s.geometries)
  const activeDraft = useAdminMapStore(s => s.activePolygonDraft)
  const opacityBackground = useAdminMapStore(s => s.opacityBackground)
  const isDrawing = useAdminMapStore(s => s.isDrawing)

  const setOpacityBackground = useAdminMapStore(s => s.setOpacityBackground)
  const setIsDrawing = useAdminMapStore(s => s.setIsDrawing)
  const addPointToDraft = useAdminMapStore(s => s.addPointToDraft)
  const removeLastDraftPoint = useAdminMapStore(s => s.removeLastDraftPoint)
  const clearDraft = useAdminMapStore(s => s.clearDraft)
  const saveDraftAsGeometry = useAdminMapStore(s => s.saveDraftAsGeometry)
  const verifyGeometry = useAdminMapStore(s => s.verifyGeometry)
  const deleteGeometry = useAdminMapStore(s => s.deleteGeometry)

  const exhibitors = useExhibitorStore(s => s.exhibitors)

  const [selectedExhibitorId, setSelectedExhibitorId] = useState(exhibitors[0]?.id || '')
  const [standCodeInput, setStandCodeInput] = useState('K33')
  const [heightInput, setHeightInput] = useState(1.5)

  // Handle click on 2D SVG canvas to add polygon vertices
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing) return
    const rect = e.currentTarget.getBoundingClientRect()
    const xPixels = ((e.clientX - rect.left) / rect.width) * MAP_ORIGINAL_WIDTH
    const yPixels = ((e.clientY - rect.top) / rect.height) * MAP_ORIGINAL_HEIGHT

    // Normalized point 0..1
    addPointToDraft({
      x: xPixels / MAP_ORIGINAL_WIDTH,
      y: yPixels / MAP_ORIGINAL_HEIGHT
    })
  }

  const handleSavePolygon = () => {
    if (activeDraft.length < 3) {
      alert('Desenhe pelo menos 3 vértices para fechar um polígono.')
      return
    }
    saveDraftAsGeometry(selectedExhibitorId, standCodeInput, heightInput)
    alert(`Polígono salvo com sucesso para o estande ${standCodeInput}!`)
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-pink-400" />
            <h2 className="text-2xl font-black text-white">Editor Administrativo de Mapeamento</h2>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">Calibração, vetorização de polígonos e validação de estandes da Bienal.</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('polygon')}
            className={`px-4 py-2 rounded-xl transition-all ${activeTab === 'polygon' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Editor de Polígonos
          </button>
          <button
            onClick={() => setActiveTab('validation')}
            className={`px-4 py-2 rounded-xl transition-all ${activeTab === 'validation' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Validação ({geometries.filter(g => g.verified).length}/{geometries.length})
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-xl transition-all ${activeTab === 'upload' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Upload Planta
          </button>
        </div>
      </div>

      {activeTab === 'polygon' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Sidebar */}
          <div className="glass-card p-6 rounded-3xl border border-slate-800 flex flex-col gap-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              Ferramentas de Desenho
            </h3>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-semibold text-slate-300">Modo Desenho</span>
              <button
                onClick={() => setIsDrawing(!isDrawing)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isDrawing ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isDrawing ? 'Desativar' : 'Ativar Clique'}
              </button>
            </div>

            {/* Association Form */}
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-slate-300">Editora Associada</label>
              <select
                value={selectedExhibitorId}
                onChange={(e) => {
                  setSelectedExhibitorId(e.target.value)
                  const ex = exhibitors.find(exh => exh.id === e.target.value)
                  if (ex) setStandCodeInput(ex.standCode)
                }}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
              >
                {exhibitors.map(ex => (
                  <option key={ex.id} value={ex.id}>
                    {ex.standCode} - {ex.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300">Código Estande</label>
                <input
                  type="text"
                  value={standCodeInput}
                  onChange={(e) => setStandCodeInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300">Altura 3D (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={heightInput}
                  onChange={(e) => setHeightInput(parseFloat(e.target.value) || 1.5)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white mt-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={removeLastDraftPoint}
                disabled={activeDraft.length === 0}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold disabled:opacity-50"
              >
                Desfazer Vértice
              </button>
              <button
                onClick={clearDraft}
                disabled={activeDraft.length === 0}
                className="py-2 px-3 rounded-xl bg-rose-950/80 border border-rose-700/60 text-rose-300 text-xs font-semibold disabled:opacity-50"
              >
                Limpar
              </button>
            </div>

            <button
              onClick={handleSavePolygon}
              disabled={activeDraft.length < 3}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white text-xs font-extrabold shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Estande ({activeDraft.length} Vértices)</span>
            </button>
          </div>

          {/* 2D Canvas Editor */}
          <div className="lg:col-span-2 glass-panel p-4 rounded-3xl border border-slate-800 flex flex-col gap-3 relative overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-2">
              <span>Planta de Referência ($2026 \times 1684$)</span>
              <span>Vértices no Rascunho: {activeDraft.length}</span>
            </div>

            <div className="relative w-full aspect-[2026/1684] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800">
              <svg
                viewBox={`0 0 ${MAP_ORIGINAL_WIDTH} ${MAP_ORIGINAL_HEIGHT}`}
                onClick={handleSvgClick}
                className={`w-full h-full ${isDrawing ? 'cursor-crosshair' : 'cursor-default'}`}
              >
                {/* Background Grid */}
                <rect width={MAP_ORIGINAL_WIDTH} height={MAP_ORIGINAL_HEIGHT} fill="#090d16" />

                {/* Existing Polygons */}
                {geometries.map(geo => {
                  if (geo.polygon.length === 0) return null
                  const pointsStr = geo.polygon.map(p => `${p.x * MAP_ORIGINAL_WIDTH},${p.y * MAP_ORIGINAL_HEIGHT}`).join(' ')
                  return (
                    <polygon
                      key={geo.id}
                      points={pointsStr}
                      fill={geo.verified ? '#6366f1' : '#f59e0b'}
                      fillOpacity="0.4"
                      stroke={geo.verified ? '#818cf8' : '#fbbf24'}
                      strokeWidth="4"
                    />
                  )
                })}

                {/* Active Polygon Draft */}
                {activeDraft.length > 0 && (
                  <g>
                    <polygon
                      points={activeDraft.map(p => `${p.x * MAP_ORIGINAL_WIDTH},${p.y * MAP_ORIGINAL_HEIGHT}`).join(' ')}
                      fill="#ec4899"
                      fillOpacity="0.5"
                      stroke="#f472b6"
                      strokeWidth="6"
                      strokeDasharray="10 5"
                    />
                    {activeDraft.map((p, idx) => (
                      <circle
                        key={idx}
                        cx={p.x * MAP_ORIGINAL_WIDTH}
                        cy={p.y * MAP_ORIGINAL_HEIGHT}
                        r="14"
                        fill="#ffffff"
                        stroke="#ec4899"
                        strokeWidth="4"
                      />
                    ))}
                  </g>
                )}
              </svg>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'validation' && (
        <div className="glass-card p-6 rounded-3xl border border-slate-800 flex flex-col gap-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Lista de Validação de Estandes
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {geometries.map(geo => {
              const exhibitor = exhibitors.find(e => e.id === geo.exhibitorId)
              return (
                <div key={geo.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 text-xs font-bold">
                        {geo.standCode}
                      </span>
                      <h4 className="text-sm font-bold text-white">{exhibitor?.name || 'Estande Neutro'}</h4>
                    </div>

                    <span className="text-xs text-slate-400 mt-1 block">
                      {geo.verified ? `Verificado por: ${geo.verifiedBy}` : 'Aguardando validação'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!geo.verified && (
                      <button
                        onClick={() => verifyGeometry(geo.id, 'admin')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                      >
                        Validar
                      </button>
                    )}

                    <button
                      onClick={() => deleteGeometry(geo.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="glass-card p-8 rounded-3xl border border-slate-800 flex flex-col items-center gap-4 text-center">
          <Upload className="w-12 h-12 text-indigo-400" />
          <h3 className="text-lg font-bold text-white">Upload da Planta Vetorial</h3>
          <p className="text-slate-400 text-xs max-w-md">Faça upload da imagem oficial (PNG, JPG, WEBP ou SVG) da planta da Bienal SP 2026.</p>
          
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                alert(`Planta ${e.target.files[0].name} enviada com sucesso!`)
              }
            }}
            className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
          />
        </div>
      )}
    </div>
  )
}
