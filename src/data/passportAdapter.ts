import type { PassportAuthor, PassportProfile } from "../stores/usePassportStore";
import type { PublishedBook, PublishedEvent } from "../stores/useContentStore";
import type { Exhibitor } from "../types";
import { passportAsset } from "../lib/passport-assets.ts";
import type { Author, Book, Booth, PassportCatalog, ScheduleEntry } from "./passport";

const normalize = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();

const text = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const dateParts = (isoDate?: string) => {
  if (!isoDate) return { weekday: "Data a confirmar", date: "" };
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return { weekday: "Data a confirmar", date: isoDate };
  const weekday = date.toLocaleDateString("pt-BR", { weekday: "long" });
  return {
    weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    date: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
  };
};

const timeRange = (start?: string, end?: string) =>
  start ? `${start.slice(0, 5)}${end ? ` — ${end.slice(0, 5)}` : ""}` : "Horário a confirmar";

const scheduleIdentity = (entry: ScheduleEntry) =>
  [entry.kind, normalize(entry.date), normalize(entry.time.split("—")[0]), normalize(entry.booth)].join("|");

const resolveExhibitor = (
  exhibitors: Exhibitor[],
  exhibitorId?: string,
  standCode?: string,
) =>
  exhibitors.find((item) => item.id === exhibitorId) ??
  exhibitors.find((item) => normalize(item.standCode) === normalize(standCode));

const scheduleFromEvent = (
  event: PublishedEvent,
  exhibitors: Exhibitor[],
): ScheduleEntry => {
  const date = dateParts(event.date);
  const exhibitor = resolveExhibitor(exhibitors, event.exhibitorIds?.[0], event.standCode);
  const standCode = event.standCode || exhibitor?.standCode;
  return {
    id: event.id,
    weekday: date.weekday,
    date: date.date,
    time: timeRange(event.startTime, event.endTime),
    booth: standCode ? `Estande ${standCode}` : text(event.locationName, "Local a confirmar"),
    publisher: exhibitor?.name || text(event.locationName, "Expositor a confirmar"),
    kind: event.eventType === "autograph" ? "autografos" : "presenca",
    related: event.bookTitle,
  };
};

const scheduleFromProfile = (
  row: any,
  kind: ScheduleEntry["kind"],
  exhibitors: Exhibitor[],
  index: number,
): ScheduleEntry => {
  const date = dateParts(row.date || row.presence_date || row.event_date);
  const exhibitor = resolveExhibitor(exhibitors, row.exhibitor_id, row.stand_code);
  const related = Array.isArray(row.books) ? row.books.filter(Boolean).join(", ") : row.book_title;
  return {
    id: text(row.id, `profile-${kind}-${index}`),
    weekday: date.weekday,
    date: date.date,
    time: timeRange(row.start_time, row.end_time),
    booth: row.stand_code
      ? `Estande ${row.stand_code}`
      : text(row.location_text, "Local a confirmar"),
    publisher: exhibitor?.name || text(row.location_text, "Expositor a confirmar"),
    kind,
    related: text(related),
  };
};

const profileBook = (
  row: any,
  author: PassportAuthor,
  profile: PassportProfile,
  exhibitors: Exhibitor[],
): Book => {
  const sale = (profile.sale_locations || []).find((item: any) => item.book_id === row.id);
  const exhibitor = resolveExhibitor(exhibitors, sale?.exhibitor_id, sale?.stand_code);
  return {
    id: text(row.id, `${author.id}-${normalize(row.title || "livro")}`),
    title: text(row.title, "Livro sem título"),
    author: profile.passport_display_name?.trim() || author.name,
    authorId: author.id,
    cover: text(row.cover_url || row.coverUrl, passportAsset("logo-ls-watermark.png")),
    genre: text(row.genre, "Livro"),
    publisher: text(row.publisher, exhibitor?.name || "Editora não informada"),
    synopsis: text(row.synopsis || row.notes, `Livro de ${author.name}.`),
    booth: text(sale?.stand_code, exhibitor?.standCode || ""),
    price: text(row.price),
    autographAvailable: Boolean(row.autograph_available ?? row.autographAvailable),
    onSale: sale?.available_for_sale !== false && Boolean(sale),
  };
};

export function buildPassportCatalog({
  authors,
  profiles,
  books,
  events,
  exhibitors,
  photoUrl,
}: {
  authors: PassportAuthor[];
  profiles: PassportProfile[];
  books: PublishedBook[];
  events: PublishedEvent[];
  exhibitors: Exhibitor[];
  photoUrl: (path?: string) => string;
}): PassportCatalog {
  const publishedAuthors = authors.filter((author) => author.active && author.published);
  const outputBooks = new Map<string, Book>();

  const outputAuthors: Author[] = publishedAuthors.map((author) => {
    const profile = profiles.find((item) => item.author_id === author.id);
    const displayName = profile?.passport_display_name?.trim() || author.name;
    const matchingBooks = books.filter(
      (book) =>
        normalize(book.authorName) === normalize(author.name) ||
        normalize(book.authorName) === normalize(displayName),
    );

    matchingBooks.forEach((book) => {
      const sale = (profile?.sale_locations || []).find((item: any) => item.book_id === book.id);
      const exhibitor = resolveExhibitor(exhibitors, sale?.exhibitor_id, sale?.stand_code || book.standCode);
      outputBooks.set(book.id, {
        id: book.id,
        title: book.title,
        author: displayName,
        authorId: author.id,
        cover: book.coverUrl || passportAsset("logo-ls-watermark.png"),
        genre: book.genre || "Livro",
        publisher: book.publisher || exhibitor?.name || "Editora não informada",
        synopsis: book.synopsis || `Livro de ${displayName}.`,
        booth: sale?.stand_code || book.standCode || exhibitor?.standCode,
        autographAvailable: book.autographAvailable,
        onSale: sale?.available_for_sale !== false && Boolean(sale || book.standCode),
      });
    });

    (profile?.books || []).forEach((row: any) => {
      const mapped = profileBook(row, author, profile!, exhibitors);
      if (!outputBooks.has(mapped.id)) outputBooks.set(mapped.id, mapped);
    });

    const authoredBooks = [...outputBooks.values()]
      .filter((book) => book.authorId === author.id)
      .slice(0, 3);
    const relatedEvents = events
      .filter(
        (event) =>
          event.active &&
          (event.authorSourceId === author.id ||
            event.speakers?.some((speaker) => normalize(speaker) === normalize(author.name))),
      )
      .map((event) => scheduleFromEvent(event, exhibitors));

    const profileSchedule = [
      ...(profile?.presences || []).map((row: any, index: number) =>
        scheduleFromProfile(row, "presenca", exhibitors, index),
      ),
      ...(profile?.autograph_sessions || []).map((row: any, index: number) =>
        scheduleFromProfile(row, "autografos", exhibitors, index),
      ),
    ];
    const schedule = new Map<string, ScheduleEntry>();
    [...relatedEvents, ...profileSchedule].forEach((entry) => schedule.set(scheduleIdentity(entry), entry));
    const cityValue = profile?.passport_city?.trim() || "";
    const [city = "Cidade não informada", state = ""] = cityValue.split("/").map((part) => part.trim());

    return {
      id: author.id,
      name: displayName,
      age: Number(profile?.passport_age) || 0,
      city,
      state,
      photo: photoUrl(profile?.photo_path) || passportAsset("logo-ls-watermark.png"),
      bio: profile?.bio || author.bio || "Perfil em atualização.",
      message: profile?.message || author.message || "Nos vemos na Bienal!",
      code: "",
      books: authoredBooks.map((book) => book.id),
      schedule: [...schedule.values()].sort((a, b) =>
        `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
      ),
      updates: [],
    };
  });

  const outputBooths: Booth[] = exhibitors
    .filter((exhibitor) => exhibitor.active && exhibitor.standCode)
    .map((exhibitor) => ({
      id: exhibitor.standCode,
      label: `Estande ${exhibitor.standCode}`,
      exhibitor: exhibitor.name,
    }));

  // A vitrine e o modal de compras também usam o catálogo público completo.
  // Livros aprovados pela comunidade podem não pertencer a uma autora já
  // publicada no Passaporte, mas ainda precisam ficar disponíveis à leitora.
  books.forEach((book) => {
    if (outputBooks.has(book.id)) return;
    const matchedAuthor = outputAuthors.find(
      (author) => normalize(author.name) === normalize(book.authorName),
    );
    const exhibitor = resolveExhibitor(
      exhibitors,
      book.exhibitorIds[0],
      book.standCode,
    );
    outputBooks.set(book.id, {
      id: book.id,
      title: book.title,
      author: book.authorName,
      ...(matchedAuthor ? { authorId: matchedAuthor.id } : {}),
      cover: book.coverUrl || passportAsset("logo-ls-watermark.png"),
      genre: book.genre || "Livro",
      publisher: book.publisher || exhibitor?.name || "Editora não informada",
      synopsis: book.synopsis || `Livro de ${book.authorName}.`,
      booth: book.standCode || exhibitor?.standCode,
      autographAvailable: book.autographAvailable,
      onSale: Boolean(book.standCode || exhibitor),
    });
  });

  return {
    authors: outputAuthors,
    books: [...outputBooks.values()],
    booths: outputBooths,
  };
}
