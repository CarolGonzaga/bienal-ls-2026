export type Book = {
  id: string;
  title: string;
  author: string;
  cover: string;
  genre: string;
  publisher: string;
  synopsis: string;
  booth?: string;
  price?: string;
  authorId?: string;
  autographAvailable?: boolean;
  onSale?: boolean;
};

export type ScheduleEntry = {
  id: string;
  weekday: string;
  date: string;
  time: string;
  booth: string;
  publisher: string;
  kind: "presenca" | "autografos";
  related?: string;
};

export type Author = {
  id: string;
  name: string;
  age: number;
  city: string;
  state: string;
  photo: string;
  bio: string;
  message: string;
  code: string;
  books: string[];
  schedule: ScheduleEntry[];
  updates: { date: string; text: string }[];
};

export type Booth = {
  id: string;
  label: string;
  exhibitor: string;
};

export type PassportCatalog = {
  authors: Author[];
  books: Book[];
  booths: Booth[];
};

/**
 * The Bienal app owns the real catalogue. These stable arrays are hydrated
 * in place by its adapter, allowing the new visual passport to keep the exact
 * page composition of the standalone project.
 */
export const authors: Author[] = [];
export const books: Book[] = [];
export const booths: Booth[] = [];

export function hydratePassportCatalog(catalog: PassportCatalog) {
  authors.splice(0, authors.length, ...catalog.authors);
  books.splice(0, books.length, ...catalog.books);
  booths.splice(0, booths.length, ...catalog.booths);
}

export const bookById = (id: string) => books.find((book) => book.id === id);
export const authorById = (id: string) => authors.find((author) => author.id === id);
