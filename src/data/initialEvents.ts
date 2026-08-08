import { Event } from '../types'

export const INITIAL_EVENTS: Event[] = [
  {
    id: "event-01",
    date: "2026-09-05",
    startTime: "14:00",
    endTime: "15:30",
    locationName: "Arena Cultural Sunbee (Estande K33)",
    mapSpaceId: "stand-k33",
    title: "Mesa: A Revolução do Romance Sáfico na Literatura Nacional",
    description: "Debate com autoras sáficas independentes e editoras sobre o crescimento das narrativas de protagonismo lésbico e bissexual no Brasil.",
    speakers: ["Clarice Amorim", "Fernanda Silva", "Juliana Torres"],
    moderators: ["Camila Mendes"],
    relevanceLevel: "curadoria_direta",
    categories: ["Mesa Literária", "Literatura Sáfica", "Diversidade"],
    exhibitorIds: ["editora-sunbee", "autores-independentes-do-brasil"],
    authorIds: ["author-autora-independente"],
    active: true,
    status: "scheduled"
  },
  {
    id: "event-02",
    date: "2026-09-05",
    startTime: "16:00",
    endTime: "17:30",
    locationName: "Espaço New Pop (Estande K70)",
    mapSpaceId: "stand-k70",
    title: "Sessão de Autógrafos: Lançamentos Girls Love (GL) 2026",
    description: "Sessão exclusiva de autógrafos dos novos mangás e manhuas sáficos com brindes para os 100 primeiros leitores.",
    speakers: ["Equipe New Pop GL"],
    moderators: [],
    relevanceLevel: "curadoria_direta",
    categories: ["Autógrafos", "Girls Love", "Mangás"],
    exhibitorIds: ["new-pop"],
    authorIds: [],
    active: true,
    status: "scheduled"
  },
  {
    id: "event-03",
    date: "2026-09-05",
    startTime: "18:00",
    endTime: "19:00",
    locationName: "Auditório Central Bienal",
    mapSpaceId: undefined,
    title: "Painel: Protagonismo LGBTQIAP+ nos Grandes Selos Editoriais",
    description: "Grandes editoras discutem o impacto da representatividade sáfica nos lançamentos infanto-juvenis e Y.A.",
    speakers: ["Editoras Convidadas"],
    moderators: ["Curadoria Bienal"],
    relevanceLevel: "catalogo_confirmado",
    categories: ["Painel Principal", "LGBTQIAP+"],
    exhibitorIds: ["companhia-das-letras", "grupo-editorial-record", "editora-rocco"],
    authorIds: [],
    active: true,
    status: "scheduled"
  }
]
