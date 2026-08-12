import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

export type PublishedBook = { id: string; title: string; authorName: string; publisher?: string; synopsis: string; tropes: string[]; exhibitorIds: string[]; standCode?: string }
export type PublishedEvent = { id: string; date: string; startTime: string; endTime: string; locationName: string; mapSpaceId?: string; title: string; description: string; speakers: string[]; categories: string[]; exhibitorIds: string[]; active: boolean }

interface ContentState {
  books: PublishedBook[]
  events: PublishedEvent[]
  loadContent: () => Promise<void>
}

export const useContentStore = create<ContentState>(set => ({
  books: [],
  events: [],
  loadContent: async () => {
    if (!isSupabaseConfigured) return
    const [booksResult, eventsResult] = await Promise.all([
      supabase.from('books').select('*').eq('active', true).order('created_at', { ascending: false }),
      supabase.from('events').select('*').eq('active', true).order('event_date').order('start_time')
    ])
    if (!booksResult.error) set({ books: (booksResult.data || []).map(row => ({ id: row.id, title: row.title, authorName: row.author_name, publisher: row.publisher, synopsis: row.notes || `Livro de ${row.author_name}`, tropes: row.tags || [], exhibitorIds: row.exhibitor_id ? [row.exhibitor_id] : [], standCode: row.stand_code })) })
    if (!eventsResult.error) set({ events: (eventsResult.data || []).map(row => ({ id: row.id, date: row.event_date, startTime: row.start_time ? String(row.start_time).slice(0, 5) : '', endTime: row.end_time ? String(row.end_time).slice(0, 5) : '', locationName: row.location_text || row.stand_code || 'Local a confirmar', title: (row.books || []).join(', ') || 'Sessão de autógrafo', description: row.notes || '', speakers: [row.author_name], categories: row.tags || [], exhibitorIds: row.exhibitor_id ? [row.exhibitor_id] : [], active: row.active })) })
  }
}))
