import { Book } from '../types'

export const INITIAL_BOOKS: Book[] = [
  {
    id: "book-01",
    title: "Os Sete Maridos de Evelyn Hugo",
    authorIds: ["author-taylor-jenkins-reid"],
    exhibitorIds: ["companhia-das-letras", "editora-rocco"],
    synopsis: "A lendária estrela de Hollywood Evelyn Hugo revela os segredos de sua vida e seu verdadeiro amor sáfico.",
    categories: ["Romance Sáfico", "Ficção Contemporânea", "LGTBQIAP+"],
    tropes: ["celebrity romance", "secret relationship", "historical fiction"],
    genres: ["Romance", "Drama"],
    sapphic: true,
    confirmedAtBienal: true,
    active: true
  },
  {
    id: "book-02",
    title: "Delilah Green Não Quer Saber",
    authorIds: ["author-ashley-herring-blake"],
    exhibitorIds: ["editora-sunbee", "intrinseca"],
    synopsis: "Um romance sáfico divertido e apaixonante entre uma fotógrafa rebelde e a melhor amiga da sua meia-irmã.",
    categories: ["Romance Sáfico", "Comédia Romântica"],
    tropes: ["enemies to lovers", "small town", "fake dating"],
    genres: ["Romance", "Humor"],
    sapphic: true,
    confirmedAtBienal: true,
    active: true
  },
  {
    id: "book-03",
    title: "Gideon a Nona",
    authorIds: ["author-tamsyn-muir"],
    exhibitorIds: ["aditora-aleph", "grupo-editorial-record"],
    synopsis: "Necromantes lésbicas no espaço exploram um palácio assombrado em uma mistura explosiva de fantasia e sci-fi.",
    categories: ["Fantasia Sáfica", "Ficção Científica"],
    tropes: ["enemies to lovers", "gothic space opera", "grumpy x sunshine"],
    genres: ["Fantasia", "Sci-Fi", "Mistério"],
    sapphic: true,
    confirmedAtBienal: true,
    active: true
  },
  {
    id: "book-04",
    title: "Ela Fica Com a Garota",
    authorIds: ["author-rachel-lippincott", "author-alyson-derrick"],
    exhibitorIds: ["editora-globo", "editora-planeta"],
    synopsis: "Duas garotas opostas se unem para conquistar suas paqueras, mas acabam se apaixonando uma pela outra.",
    categories: ["Young Adult", "Romance Sáfico"],
    tropes: ["opposites attract", "fake dating", "college romance"],
    genres: ["Romance", "Y.A."],
    sapphic: true,
    confirmedAtBienal: true,
    active: true
  },
  {
    id: "book-05",
    title: "O Canto da Sereia Sáfica",
    authorIds: ["author-autora-independente"],
    exhibitorIds: ["autores-independentes-do-brasil", "editora-caliope"],
    synopsis: "Uma obra nacional sobre a jornada de descoberta e amor entre duas jovens artistas brasileiras.",
    categories: ["Literatura Nacional", "Romance Sáfico"],
    tropes: ["artistic connection", "slow burn", "found family"],
    genres: ["Romance", "Nacional"],
    sapphic: true,
    confirmedAtBienal: true,
    active: true
  }
]
