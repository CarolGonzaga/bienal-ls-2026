import { useEffect, useRef, useState } from "react";
import { authors, books, booths } from "@/data/passport";
import { usePassport } from "@/lib/passport-store";
import { InkButton } from "./ui";
import { ArrowLeft, BookPlus, ShoppingBag, X } from "lucide-react";

const fieldClass =
  "mt-1 w-full rounded-[5px] border border-dashed border-[var(--rose-antique)] bg-transparent px-2.5 py-2 font-normal normal-case tracking-normal outline-none focus:border-[var(--violet-deep)]";

export function AddBookModal({
  open,
  onClose,
  preset,
}: {
  open: boolean;
  onClose: () => void;
  preset?: string | null;
}) {
  const { setStatus, userBooks } = usePassport();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [authorChoice, setAuthorChoice] = useState("");
  const [customAuthor, setCustomAuthor] = useState("");
  const [boothChoice, setBoothChoice] = useState("");
  const [publisher, setPublisher] = useState("");
  const [price, setPrice] = useState("");
  const [customCover, setCustomCover] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])",
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    window.setTimeout(
      () => dialogRef.current?.querySelector<HTMLElement>("input, button")?.focus(),
      0,
    );
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !preset) return;
    const entry = userBooks.find((item) => item.bookId === preset);
    if (!entry) return;
    setEditingId(preset);
    const catalogBook = books.find((item) => item.id === preset);
    if (catalogBook) {
      setSelected(preset);
      return;
    }
    setCustomMode(true);
    setCustomTitle(entry.title ?? "");
    setCustomCover(entry.cover ?? "");
    setAuthorChoice(entry.authorId ?? (entry.author ? "new" : ""));
    setCustomAuthor(entry.author ?? "");
    setBoothChoice(entry.booth ?? "");
    setPublisher(entry.publisher ?? "");
    setPrice(entry.price ?? "");
  }, [open, preset, userBooks]);

  if (!open) return null;

  const results = books.filter((book) =>
    `${book.title} ${book.author}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const book = books.find((item) => item.id === selected);
  const selectedBooth = booths.find((item) => item.id === boothChoice);
  const selectedAuthor = authors.find((item) => item.id === authorChoice);

  const finish = () => {
    setSelected(null);
    setCustomMode(false);
    setQuery("");
    setCustomTitle("");
    setAuthorChoice("");
    setCustomAuthor("");
    setBoothChoice("");
    setPublisher("");
    setPrice("");
    setCustomCover("");
    setEditingId(null);
    onClose();
  };

  const addCatalogBook = () => {
    if (!selected || !book) return;
    setStatus(selected, "want_to_buy_bienal", {
      source: book.authorId ? "author" : "catalog",
    });
    finish();
  };

  const addCustomBook = () => {
    if (!customTitle.trim()) return;
    setStatus(editingId ?? `custom-${Date.now()}`, "want_to_buy_bienal", {
      source: "user",
      title: customTitle.trim(),
      author: selectedAuthor?.name || customAuthor.trim() || "Autoria não informada",
      publisher: publisher.trim() || selectedBooth?.exhibitor || "Não informada",
      ...(selectedAuthor ? { authorId: selectedAuthor.id } : {}),
      ...(selectedBooth ? { booth: selectedBooth.id } : {}),
      ...(price.trim() ? { price: price.trim() } : {}),
      ...(customCover ? { cover: customCover } : {}),
    });
    finish();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[oklch(0.25_0.05_20_/_0.6)] p-3 sm:items-center"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-book-title"
        className="paper-surface animate-scale-in max-h-[86vh] w-full max-w-lg overflow-y-auto rounded-[14px] p-[clamp(1rem,3vw,1.6rem)] shadow-[var(--shadow-page)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="label-caps opacity-70">Novo registro</p>
            <h3 id="add-book-title" className="page-title">
              {editingId ? "Editar livro" : "Adicionar livro"}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-[var(--ink-soft)] transition hover:text-[var(--violet-deep)]"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>

        {customMode ? (
          <form
            className="mt-4 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              addCustomBook();
            }}
          >
            <p className="font-display text-lg font-bold text-[var(--violet-deep)]">Novo livro</p>
            <label className="label-caps">
              Título do livro *
              <input
                required
                value={customTitle}
                onChange={(event) => setCustomTitle(event.target.value)}
                className={fieldClass}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-[5rem_1fr] sm:items-end">
              <div className="dashed-frame flex aspect-[2/3] items-center justify-center overflow-hidden bg-[oklch(0.92_0.02_60)]">
                {customCover ? (
                  <img src={customCover} alt="Prévia da capa" className="size-full object-cover" />
                ) : (
                  <BookPlus aria-hidden className="size-6 text-[var(--ink-soft)]" />
                )}
              </div>
              <label className="label-caps">
                Foto da capa (opcional)
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === "string") setCustomCover(reader.result);
                    };
                    reader.readAsDataURL(file);
                  }}
                  className={`${fieldClass} text-[0.68rem] file:mr-2 file:rounded file:border-0 file:bg-[var(--violet-deep)] file:px-2 file:py-1 file:text-white`}
                />
              </label>
            </div>
            <label className="label-caps">
              Autora (opcional)
              <select
                value={authorChoice}
                onChange={(event) => setAuthorChoice(event.target.value)}
                className={fieldClass}
              >
                <option value="">Não informar</option>
                {authors.map((author) => (
                  <option key={author.id} value={author.id}>
                    {author.name}
                  </option>
                ))}
                <option value="new">Cadastrar outra autora</option>
              </select>
            </label>
            {authorChoice === "new" && (
              <label className="label-caps">
                Nome da autora
                <input
                  value={customAuthor}
                  onChange={(event) => setCustomAuthor(event.target.value)}
                  className={fieldClass}
                />
              </label>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="label-caps">
                Estande (opcional)
                <select
                  value={boothChoice}
                  onChange={(event) => {
                    const value = event.target.value;
                    setBoothChoice(value);
                    const booth = booths.find((item) => item.id === value);
                    if (booth) setPublisher(booth.exhibitor);
                  }}
                  className={fieldClass}
                >
                  <option value="">Não informar</option>
                  {booths.map((booth) => (
                    <option key={booth.id} value={booth.id}>
                      {booth.label} — {booth.exhibitor}
                    </option>
                  ))}
                </select>
              </label>
              <label className="label-caps">
                Preço (opcional)
                <input
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="R$ 00,00"
                  className={fieldClass}
                />
              </label>
            </div>
            <label className="label-caps">
              Editora ou expositor
              <input
                value={publisher}
                onChange={(event) => setPublisher(event.target.value)}
                placeholder="Preenchido pelo estande ou manualmente"
                className={fieldClass}
              />
            </label>
            <InkButton type="submit">
              <ShoppingBag aria-hidden className="size-4" /> Adicionar à lista da Bienal
            </InkButton>
            <button
              type="button"
              onClick={() => setCustomMode(false)}
              className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]"
            >
              <ArrowLeft aria-hidden className="mr-1 inline size-3" /> Voltar à estante
            </button>
          </form>
        ) : !book ? (
          <>
            <label htmlFor="book-search" className="sr-only">
              Pesquisar livro ou autora
            </label>
            <input
              id="book-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar livro ou autora…"
              className="mt-4 w-full rounded-[6px] border border-dashed border-[var(--rose-antique)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--violet-deep)]"
            />
            <ul className="mt-3 space-y-2">
              {results.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setSelected(item.id)}
                    className="dashed-frame flex w-full items-center gap-3 p-2 text-left transition hover:bg-[oklch(0.9_0.03_320_/_0.3)]"
                  >
                    <img
                      src={item.cover}
                      alt=""
                      loading="lazy"
                      className="h-16 w-11 rounded-[3px] object-cover shadow"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-display text-base font-bold text-[var(--ink)]">
                        {item.title}
                      </span>
                      <span className="block truncate text-xs text-[var(--ink-soft)]">
                        {item.author} · {item.genre}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={() => {
                setCustomTitle(query);
                setCustomMode(true);
              }}
              className="dashed-frame mt-3 flex w-full items-center justify-center gap-2 p-3 text-sm font-bold text-[var(--violet-deep)] transition hover:bg-[oklch(0.9_0.03_320_/_0.3)]"
            >
              <BookPlus aria-hidden className="size-4" /> Cadastrar novo livro
            </button>
          </>
        ) : (
          <div className="mt-4">
            <div className="dashed-frame flex items-center gap-3 p-3">
              <img
                src={book.cover}
                alt=""
                loading="lazy"
                className="h-24 w-16 rounded-[3px] object-cover shadow"
              />
              <div className="min-w-0">
                <p className="font-display text-lg font-bold text-[var(--ink)]">{book.title}</p>
                <p className="text-xs text-[var(--ink-soft)]">{book.author}</p>
              </div>
            </div>
            <div className="mt-3 grid gap-2">
              <InkButton variant="ghost" onClick={addCatalogBook}>
                <ShoppingBag aria-hidden className="size-4" /> Quero comprar na Bienal
              </InkButton>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="mt-4 text-xs uppercase tracking-[0.2em] text-[var(--ink-soft)] hover:text-[var(--violet-deep)]"
            >
              <ArrowLeft aria-hidden className="mr-1 inline size-3" /> escolher outro livro
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
