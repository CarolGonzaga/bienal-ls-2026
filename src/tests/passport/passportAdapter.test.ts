import test from "node:test";
import assert from "node:assert/strict";
import { buildPassportCatalog } from "../../data/passportAdapter.ts";

const exhibitors = [
  {
    id: "ex-1",
    logo: "",
    name: "Editora Horizonte",
    description: "",
    reasonToVisit: "",
    standCode: "G40",
    active: true,
    relevanceLevel: "curadoria_direta" as const,
    categories: [],
  },
];

test("adapta autoras, livros, estandes e agenda publicados ao novo passaporte", () => {
  const catalog = buildPassportCatalog({
    authors: [
      {
        id: "author-1",
        slug: "livia",
        name: "Lívia Montclair",
        first_name: "Lívia",
        bio: "Bio base",
        message: "Mensagem base",
        active: true,
        published: true,
      },
      {
        id: "hidden",
        slug: "oculta",
        name: "Autora Oculta",
        first_name: "Oculta",
        bio: "",
        message: "",
        active: false,
        published: true,
      },
    ],
    profiles: [
      {
        author_id: "author-1",
        photo_path: "livia.webp",
        bio: "Bio aprovada",
        message: "Mensagem aprovada",
        passport_display_name: "Lívia M.",
        passport_age: 34,
        passport_city: "São Paulo / SP",
        books: [{ id: "book-1", title: "Entre Estrelas", publisher: "Editora Horizonte", genre: "Romance", synopsis: "Sinopse", autograph_available: true, featured: true, display_order: 1 }],
        presences: [],
        autograph_sessions: [],
        sale_locations: [
          {
            book_id: "book-1",
            exhibitor_id: "ex-1",
            stand_code: "G40",
            available_for_sale: true,
          },
        ],
      },
    ],
    books: [
      {
        id: "book-1",
        title: "Entre Estrelas",
        authorName: "Lívia Montclair",
        publisher: "Editora Horizonte",
        coverUrl: "https://example.com/capa.webp",
        genre: "Romance",
        autographAvailable: true,
        synopsis: "Sinopse",
        tropes: [],
        exhibitorIds: ["ex-1"],
        standCode: "G40",
      },
    ],
    events: [
      {
        id: "event-1",
        eventType: "autograph",
        authorSourceId: "author-1",
        date: "2026-09-05",
        startTime: "14:00",
        endTime: "16:00",
        standCode: "G40",
        locationName: "Editora Horizonte",
        bookTitle: "Entre Estrelas",
        title: "Sessão",
        description: "",
        speakers: ["Lívia Montclair"],
        categories: [],
        exhibitorIds: ["ex-1"],
        active: true,
      },
    ],
    exhibitors,
    photoUrl: (path) => `https://cdn.example.com/${path}`,
  });

  assert.equal(catalog.authors.length, 1);
  assert.equal(catalog.authors[0]?.name, "Lívia M.");
  assert.equal(catalog.authors[0]?.city, "São Paulo");
  assert.equal(catalog.authors[0]?.state, "SP");
  assert.equal(catalog.authors[0]?.photo, "https://cdn.example.com/livia.webp");
  assert.equal(catalog.authors[0]?.schedule[0]?.kind, "autografos");
  assert.equal(catalog.authors[0]?.schedule[0]?.booth, "Estande G40");
  assert.equal(catalog.books[0]?.onSale, true);
  assert.equal(catalog.books[0]?.autographAvailable, true);
  assert.deepEqual(catalog.authors[0]?.books, ["book-1"]);
  assert.deepEqual(catalog.booths, [
    { id: "G40", label: "Estande G40", exhibitor: "Editora Horizonte" },
  ]);
});

test("mantém livros comunitários aprovados no catálogo de compras", () => {
  const catalog = buildPassportCatalog({
    authors: [],
    profiles: [],
    books: [
      {
        id: "community-book",
        title: "Livro enviado pela comunidade",
        authorName: "Autora Convidada",
        publisher: "Editora Horizonte",
        synopsis: "Livro aprovado pela curadoria.",
        tropes: ["romance"],
        exhibitorIds: ["ex-1"],
        standCode: "G40",
      },
    ],
    events: [],
    exhibitors,
    photoUrl: () => "",
  });

  assert.equal(catalog.authors.length, 0);
  assert.equal(catalog.books.length, 1);
  assert.equal(catalog.books[0]?.id, "community-book");
  assert.equal(catalog.books[0]?.author, "Autora Convidada");
  assert.equal(catalog.books[0]?.booth, "G40");
  assert.equal(catalog.books[0]?.onSale, true);
});

test("exibe somente três livros destacados e mantém os demais no catálogo", () => {
  const author = {
    id: "author-limit",
    slug: "autora-limite",
    name: "Autora Limite",
    first_name: "Autora",
    bio: "Bio",
    message: "Mensagem",
    active: true,
    published: true,
  };
  const books = Array.from({ length: 4 }, (_, index) => ({
    id: `book-${index + 1}`,
    title: `Livro ${index + 1}`,
    authorName: author.name,
    publisher: "Editora",
    synopsis: "Sinopse",
    tropes: [],
    exhibitorIds: [],
  }));

  const catalog = buildPassportCatalog({
    authors: [author],
    profiles: [{ author_id: author.id, books: books.map((book, index) => ({ ...book, featured: index !== 2, display_order: index + 1 })), presences: [], autograph_sessions: [], sale_locations: [] }],
    books,
    events: [],
    exhibitors: [],
    photoUrl: () => "",
  });

  assert.deepEqual(catalog.authors[0]?.books, ["book-1", "book-2", "book-4"]);
  assert.equal(catalog.books.length, 4);
});

test("tolera campos opcionais nulos recebidos do banco", () => {
  const catalog = buildPassportCatalog({
    authors: [{ id: "author-null", slug: "autora-null", name: "Autora Nula", first_name: "Autora", bio: null, message: null, active: true, published: true } as any],
    profiles: [{ author_id: "author-null", passport_city: null, books: [], presences: [], autograph_sessions: [], sale_locations: [] } as any],
    books: [{ id: "book-null", title: "Livro", authorName: null, exhibitorIds: [], standCode: null } as any],
    events: [],
    exhibitors: [{ ...exhibitors[0], standCode: null } as any],
    photoUrl: () => "",
  });

  assert.equal(catalog.authors.length, 1);
  assert.equal(catalog.books.length, 1);
  assert.equal(catalog.booths.length, 0);
});
