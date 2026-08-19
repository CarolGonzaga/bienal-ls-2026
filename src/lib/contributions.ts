import { supabase } from './supabase.js'
import { enqueueOfflineMutation, listOfflineMutations, removeOfflineMutation } from './offlineDb'

export type ContributionInsert = {
  user_id: string
  contribution_type: 'sapphic_book' | 'autograph_session' | 'exhibitor' | 'correction'
  contributor_role: 'reader' | 'author' | 'publisher'
  payload: Record<string, unknown>
  submitter_name: string
  submitter_contact?: string | null
  client_submission_id?: string
}

export const submitContribution = async (contribution: ContributionInsert) => {
  const stableContribution = { ...contribution, client_submission_id: contribution.client_submission_id || crypto.randomUUID() }
  const { error } = await supabase.from('community_contributions').upsert(stableContribution, { onConflict: 'client_submission_id', ignoreDuplicates: true })
  if (!error) return { queued: false }
  const status = Number((error as { status?: number }).status || 0)
  const transient = !navigator.onLine || status === 0 || status === 429 || status >= 500
  if (!transient) throw error
  await enqueueOfflineMutation({ id: `${contribution.user_id}:contribution:${stableContribution.client_submission_id}`, userId: contribution.user_id, type: 'contribution', payload: stableContribution, createdAt: new Date().toISOString() })
  return { queued: true }
}

export const flushQueuedContributions = async (userId: string) => {
  const queue = await listOfflineMutations<any>(userId)
  if (!queue.length) return
  for (const item of queue.filter(entry => entry.type === 'contribution')) {
    const contribution = item.payload as ContributionInsert
    const { error } = await supabase.from('community_contributions').upsert(contribution, { onConflict: 'client_submission_id', ignoreDuplicates: true })
    if (!error) await removeOfflineMutation(item.id)
  }
}
