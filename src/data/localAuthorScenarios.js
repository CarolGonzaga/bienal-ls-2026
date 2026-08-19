export const LOCAL_AUTHOR_SCENARIOS = {
  'autora-com-eventos': {
    account: { user: { id: 'local-author-events-user', email: 'marina.teste@local' }, authorId: 'local-author-events' },
    author: { id: 'local-author-events', name: 'Marina Teste', first_name: 'Marina' },
    profile: { bio: '', message: '', status: 'draft', participation_status: null },
    code: '',
    existingRequests: [
      { id: 'local-event-1', request_type: 'autograph', status: 'approved', created_at: '2026-08-19', payload: { event_date: '2026-09-06', start_time: '15:00', stand_code: 'G40', books: ['Entre Estrelas'] } },
      { id: 'local-event-2', request_type: 'presence', status: 'approved', created_at: '2026-08-19', payload: { presence_date: '2026-09-08', start_time: '14:00', stand_code: 'G40' } }
    ]
  },
  'autora-passaporte-sem-eventos': {
    account: { user: { id: 'local-author-passport-user', email: 'livia.teste@local' }, authorId: 'local-author-passport' },
    author: { id: 'local-author-passport', name: 'Lívia Teste', first_name: 'Lívia' },
    profile: { bio: 'Autora de romances sáficos e histórias sobre encontros.', message: 'Nos vemos na Bienal!', status: 'published', participation_status: 'participating', consent_version: 'bienal-2026-v1', consent_accepted_at: '2026-08-18T10:00:00.000Z' },
    code: 'LIVIA-R7KQ-4MX9',
    existingRequests: []
  }
}

export const LOCAL_AUTHOR_EXHIBITORS = [
  { id: 'local-g40', name: 'Editora Exemplo', stand_code: 'G40' },
  { id: 'local-j20', name: 'Livraria Exemplo', stand_code: 'J20' }
]
