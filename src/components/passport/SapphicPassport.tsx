import React from 'react'
import { Award, CheckCircle2, Heart, Sparkles, Trophy, Calendar, BookOpen } from 'lucide-react'
import { useUserStore } from '../../stores/useUserStore'
import { useExhibitorStore } from '../../stores/useExhibitorStore'

export const SapphicPassport: React.FC = () => {
  const visits = useUserStore(s => s.visits)
  const favorites = useUserStore(s => s.favorites)
  const exhibitors = useExhibitorStore(s => s.exhibitors)

  const visitedList = Object.values(visits)
  const totalExhibitors = exhibitors.length
  const visitedCount = visitedList.length

  const achievements = [
    { id: 1, title: 'Primeiros Passos', desc: 'Visitou a primeira editora sáfica', unlocked: visitedCount >= 1 },
    { id: 2, title: 'Exploradora da Bienal', desc: 'Visitou 5 editoras da curadoria', unlocked: visitedCount >= 5 },
    { id: 3, title: 'Passaporte Ouro', desc: 'Visitou 15 ou mais editoras', unlocked: visitedCount >= 15 },
    { id: 4, title: 'Curadora Sáfica', desc: 'Favoritou 3 editoras de curadoria direta', unlocked: favorites.length >= 3 }
  ]

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-500/30 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-pink-500/20 flex-shrink-0">
            <Award className="w-8 h-8" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-950/80 border border-pink-700/60 text-pink-300 text-xs font-bold mb-1">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span>Passaporte Sáfico 2026</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white">Sua Coleção de Selos</h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-0.5">Registre suas visitas aos estandes da Bienal sem necessidade de GPS.</p>
          </div>
        </div>

        {/* Counter */}
        <div className="flex flex-col items-center sm:items-end bg-slate-900/80 px-6 py-4 rounded-2xl border border-slate-800">
          <span className="text-3xl font-black text-white">
            {visitedCount} <span className="text-slate-500 text-lg font-normal">/ {totalExhibitors}</span>
          </span>
          <span className="text-xs font-bold text-indigo-400">Editoras Visitadas</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-300">Progresso do Passaporte</span>
          <span className="text-pink-400">{Math.round((visitedCount / totalExhibitors) * 100)}% concluído</span>
        </div>
        <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden p-0.5 border border-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${(visitedCount / totalExhibitors) * 100}%` }}
          />
        </div>
      </div>

      {/* Achievements Section */}
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          Conquistas Desbloqueadas
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {achievements.map(ach => (
            <div
              key={ach.id}
              className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${
                ach.unlocked 
                  ? 'bg-slate-900/90 border-amber-500/40 shadow-lg' 
                  : 'bg-slate-950/40 border-slate-800/60 opacity-60'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                ach.unlocked ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-500'
              }`}>
                <Trophy className="w-5 h-5" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-white">{ach.title}</h4>
                <p className="text-slate-400 text-xs mt-0.5">{ach.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stamp Grid */}
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          Histórico de Carimbos
        </h3>

        {visitedList.length === 0 ? (
          <div className="glass-card p-8 rounded-2xl text-center flex flex-col items-center gap-3">
            <Sparkles className="w-8 h-8 text-slate-600" />
            <p className="text-slate-400 text-sm">Você ainda não marcou nenhuma editora como visitada.</p>
            <span className="text-xs text-slate-500">Abra qualquer editora no mapa ou lista e clique em "Marcar Visita".</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visitedList.map(visit => {
              const exhibitor = exhibitors.find(e => e.id === visit.exhibitorId)
              if (!exhibitor) return null

              return (
                <div key={visit.id} className="glass-card p-4 rounded-2xl border border-emerald-500/30 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700/60 text-emerald-400 flex items-center justify-center font-extrabold text-sm">
                      {exhibitor.standCode}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{exhibitor.name}</h4>
                      <span className="text-[11px] text-slate-400">
                        Visitado em: {new Date(visit.visitedAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
