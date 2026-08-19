import { create } from 'zustand'
import { isSupabaseConfigured } from '../lib/supabase.js'
import { getOfflineDataset } from '../lib/offlineDb'
import { syncPublicContent } from '../lib/contentSync'

export type PublishedBook = { id: string; title: string; authorName: string; publisher?: string; synopsis: string; tropes: string[]; exhibitorIds: string[]; standCode?: string }
export type PublishedEvent = { id: string; eventType: 'autograph' | 'presence'; authorSourceId?: string; date: string; startTime: string; endTime: string; standCode?: string; locationName: string; mapSpaceId?: string; bookTitle?: string; title: string; description: string; speakers: string[]; categories: string[]; exhibitorIds: string[]; active: boolean }

interface ContentState {
  books: PublishedBook[]
  events: PublishedEvent[]
  loadContent: () => Promise<void>
}

export const useContentStore = create<ContentState>(set => ({
  books: [],
  events: [],
  loadContent: async () => {
    const applyBooks = (rows: any[]) => set({ books: rows.filter(row => row.active && !row.deleted_at).map(row => ({ id: row.id, title: row.title, authorName: row.author_name, publisher: row.publisher, synopsis: row.notes || `Livro de ${row.author_name}`, tropes: row.tags || [], exhibitorIds: row.exhibitor_id ? [row.exhibitor_id] : [], standCode: row.stand_code })) })
    const applyEvents = (rows: any[]) => set({ events: rows.filter(row => row.active && !row.deleted_at).map(row => {
      const books = (row.books || []).filter(Boolean)
      const eventType = row.event_type === 'presence' ? 'presence' : 'autograph'
      return { id: row.id, eventType, authorSourceId: row.author_source_id || undefined, date: row.event_date, startTime: row.start_time ? String(row.start_time).slice(0, 5) : '', endTime: row.end_time ? String(row.end_time).slice(0, 5) : '', standCode: row.stand_code || undefined, locationName: row.location_text || row.stand_code || 'Local a confirmar', bookTitle: books.join(', ') || undefined, title: eventType === 'presence' ? 'Presença na Bienal' : 'Sessão de autógrafo', description: row.notes || '', speakers: [row.author_name], categories: row.tags || [], exhibitorIds: row.exhibitor_id ? [row.exhibitor_id] : [], active: row.active }
    }) })
    const [cachedBooks, cachedEvents] = await Promise.all([getOfflineDataset<any[]>('books'), getOfflineDataset<any[]>('schedule')])
    if (cachedBooks?.data) applyBooks(cachedBooks.data)
    if (cachedEvents?.data) applyEvents(cachedEvents.data)
    if (!isSupabaseConfigured || !navigator.onLine) return
    try {
      await syncPublicContent({ force: !(cachedEvents?.data?.length), sections: ['schedule', 'books'] })
      const [freshBooks, freshEvents] = await Promise.all([getOfflineDataset<any[]>('books'), getOfflineDataset<any[]>('schedule')])
      if (freshBooks?.data) applyBooks(freshBooks.data)
      if (freshEvents?.data) applyEvents(freshEvents.data)
    } catch (error) { console.error('[Offline] sincronizar conteúdo:', error) }
  }
}))
