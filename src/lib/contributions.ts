import { supabase } from './supabase.js'

const QUEUE_KEY = 'mapasafico-pending-contributions'

export type ContributionInsert = {
  user_id: string
  contribution_type: 'sapphic_book' | 'autograph_session' | 'exhibitor' | 'correction'
  contributor_role: 'reader' | 'author' | 'publisher'
  payload: Record<string, unknown>
  submitter_name: string
  submitter_contact?: string | null
}

export const submitContribution = async (contribution: ContributionInsert) => {
  const { error } = await supabase.from('community_contributions').insert(contribution)
  if (!error) return { queued: false }
  if (navigator.onLine) throw error
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  queue.push(contribution)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  return { queued: true }
}

export const flushQueuedContributions = async () => {
  const queue: ContributionInsert[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  if (!queue.length) return
  const remaining: ContributionInsert[] = []
  for (const contribution of queue) {
    const { error } = await supabase.from('community_contributions').insert(contribution)
    if (error) remaining.push(contribution)
  }
  if (remaining.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining))
  else localStorage.removeItem(QUEUE_KEY)
}
