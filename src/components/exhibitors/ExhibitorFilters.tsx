import React from 'react'

export type ListFilterMode = 'all' | 'publishers' | 'independent' | 'autographs'

interface ExhibitorFiltersProps {
  activeMode: ListFilterMode
  onChange: (mode: ListFilterMode) => void
}

const FILTERS: Array<{ id: ListFilterMode; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'publishers', label: 'Editoras' },
  { id: 'independent', label: 'Autoras independentes' },
  { id: 'autographs', label: 'Autógrafos hoje' }
]

export const ExhibitorFilters: React.FC<ExhibitorFiltersProps> = ({ activeMode, onChange }) => (
  <div className="list-filter-row flex items-center gap-2 overflow-x-auto pb-1" aria-label="Filtros da lista">
    {FILTERS.map(filter => {
      const active = activeMode === filter.id
      return (
        <button
          key={filter.id}
          type="button"
          aria-pressed={active}
          onClick={() => onChange(filter.id)}
          className={`list-filter-chip shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ${active ? 'is-active' : ''}`}
        >
          {filter.label}
        </button>
      )
    })}
  </div>
)
