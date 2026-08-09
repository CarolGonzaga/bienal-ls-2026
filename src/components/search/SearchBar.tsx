import React from 'react'
import { Search, X, Sparkles } from 'lucide-react'
import { useExhibitorStore } from '../../stores/useExhibitorStore'

export const SearchBar: React.FC = () => {
  const searchQuery = useExhibitorStore(s => s.searchQuery)
  const setSearchQuery = useExhibitorStore(s => s.setSearchQuery)

  return (
    <div data-tutorial="search" className="relative w-full max-w-xl">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b94185]" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Buscar por livro, autora, editora ou trope"
        className="site-search-input w-full rounded-2xl border py-2.5 pl-11 pr-10 text-xs shadow-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#d43276] sm:text-sm"
      />

      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="site-search-clear absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
