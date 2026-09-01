import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  authors,
  bookById,
  booths,
  type Author,
  type Book,
  type ScheduleEntry,
} from "@/data/passport";
import { usePassport, type Stamp as StampEntry, type UserBook } from "@/lib/passport-store";
import { Field, InkButton, PageFrame, RoundStamp, Skyline, useNav, Watermark } from "./ui";
import { toPng } from "html-to-image";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  Heart,
  KeyRound,
  MapPin,
  Megaphone,
  Plus,
  Share2,
  ShoppingBag,
  Stamp,
  Pencil,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import parisienneFontDataUrl from "@fontsource/parisienne/files/parisienne-latin-400-normal.woff2?inline";
import { passportAsset } from "@/lib/passport-assets";

const collectionExportFontCss = `
  @font-face {
    font-family: "Parisienne";
    src: url("${parisienneFontDataUrl}") format("woff2");
    font-style: normal;
    font-weight: 400;
    font-display: swap;
  }
`;

export type PageDef = {
  id: string;
  section: "id" | "bienal" | "autoras" | "carimbos";
  render: () => ReactNode;
};

/* =======================  01 — IDENTIFICAÇÃO  ======================= */

function IdentityPage() {
  const { stamps, profile, updateProfile } = usePassport();
  const uploadPhoto = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") updateProfile({ photo: reader.result });
    };
    reader.readAsDataURL(file);
  };
  return (
    <PageFrame
      institutional
      eyebrow="República das Leitoras Sáficas"
      title="Identificação da leitora"
    >
      <div className="identity-passport-grid grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-[clamp(0.7rem,2vw,1.4rem)] sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)]">
        <div className="identity-passport-photo">
          <label className="dashed-frame group relative flex aspect-[3/4] cursor-pointer items-center justify-center overflow-hidden bg-[oklch(0.92_0.02_60)] text-center">
            {profile.photo ? (
              <img src={profile.photo} alt="Foto da leitora" className="size-full object-cover" />
            ) : (
              <span className="px-2 text-[0.6rem] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                adicionar foto 3x4
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 bg-[oklch(0.28_0.04_300_/_0.72)] px-1 py-1 text-[0.5rem] uppercase tracking-[0.12em] text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
              trocar foto
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => uploadPhoto(event.target.files?.[0])}
              className="sr-only"
            />
          </label>
          <p className="mt-2 text-center text-[0.55rem] uppercase tracking-[0.2em] text-[var(--ink-soft)]">
            assinatura
          </p>
          <p className="script-name-signature mt-2 text-center text-[1.1rem] leading-[0.85] text-balance break-words">
            {profile.fullName}
          </p>
        </div>

        <div className="grid content-start gap-[clamp(0.5rem,1.4vh,0.9rem)]">
          <ProfileField
            label="Nome completo"
            value={profile.fullName}
            onChange={(fullName) => updateProfile({ fullName })}
          />
          <div className="identity-field-pair grid grid-cols-2 gap-3">
            <ProfileField
              label="Data de nascimento"
              type="date"
              value={profile.birthDate}
              onChange={(birthDate) => updateProfile({ birthDate })}
            />
            <ProfileField
              label="Nacionalidade"
              value={profile.nationality}
              onChange={(nationality) => updateProfile({ nationality })}
            />
          </div>
          <div className="identity-field-pair grid grid-cols-2 gap-3">
            <ProfileField
              label="Naturalidade"
              value={profile.birthplace}
              onChange={(birthplace) => updateProfile({ birthplace })}
            />
            <Field label="Data de expedição">{profile.issuedAt}</Field>
          </div>
          <Field label="Autoridade">LENDO SÁFICOS</Field>
          <Field label="Código do passaporte">{profile.passportCode}</Field>
        </div>
      </div>

      <div className="identity-document-note mt-[clamp(1.8rem,4.5vh,2.8rem)] text-center">
        <p className="w-full text-[0.62rem] uppercase leading-relaxed tracking-[0.14em] text-[var(--ink-soft)]">
          Este documento acompanha a portadora durante a Bienal do Livro de São Paulo 2026.
        </p>
        <RoundStamp variant={2} className="absolute right-0 bottom-5" />
      </div>
      <p className="identity-stamp-count absolute inset-x-0 bottom-0 text-center text-[0.6rem] tracking-[0.3em] text-[var(--ink-soft)]">
        {stamps.length > 0
          ? `${stamps.length} carimbo(s) registrados`
          : "nenhum carimbo registrado"}
      </p>
    </PageFrame>
  );
}

function ProfileField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date";
}) {
  return (
    <label className="min-w-0">
      <span className="label-caps block opacity-70">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={type === "date" ? undefined : "Preencha aqui"}
        className="mt-0.5 block w-full min-w-0 border-b border-dotted border-[oklch(0.72_0.06_30_/_0.6)] bg-transparent pb-1 text-[clamp(0.82rem,1.5vw,0.98rem)] text-[var(--ink)] outline-none focus:border-[var(--violet-deep)]"
      />
    </label>
  );
}

/* =======================  02 — SUMÁRIO  ======================= */

function SummaryPage({ index }: { index: Record<string, number> }) {
  const { goTo } = useNav();
  const items: { n: string; label: string; id: string }[] = [
    { n: "01", label: "Comprar na Bienal", id: "bienal-0" },
    { n: "02", label: "Autoras para encontrar", id: "autoras-intro" },
    { n: "03", label: "Meus carimbos", id: "carimbos" },
    { n: "04", label: "Meus livros", id: "meus-livros" },
  ];

  const socials: { label: string; href: string; icon: ReactNode }[] = [
    {
      label: "Instagram",
      href: "https://www.instagram.com/olendosaficos/",
      icon: (
        <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069ZM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0Zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881Z" />
        </svg>
      ),
    },
    {
      label: "X / Twitter",
      href: "https://x.com/lendosaficos",
      icon: (
        <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      label: "TikTok",
      href: "https://www.tiktok.com/@olendosaficos",
      icon: (
        <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
        </svg>
      ),
    },
    {
      label: "WhatsApp",
      href: "https://www.whatsapp.com/channel/0029Vb6HNUhFHWptCJYOEF24",
      icon: (
        <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
        </svg>
      ),
    },
  ];

  return (
    <PageFrame institutional eyebrow="Passaporte Sáfico" title="Sumário">
      <div className="flex flex-col items-center gap-2">
        <p className="text-center text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[var(--violet-deep)]">
          Siga o Lendo Sáficos
        </p>
        <a
          href="https://www.lendosaficos.com.br/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visite o site Lendo Sáficos"
          className="grid aspect-square size-[clamp(9.4rem,23.4vh,10.7rem)] shrink-0 place-items-center rounded-2xl bg-white shadow-[0_5px_16px_-10px_rgb(108_18_50_/_0.45)]"
        >
          <QRCodeSVG
            value="https://www.lendosaficos.com.br/"
            size={135}
            bgColor="#ffffff"
            fgColor="var(--violet-deep)"
            level="M"
          />
        </a>
        <div className="flex gap-2">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              className="flex items-center justify-center rounded-full border border-dashed border-[var(--rose-antique)] p-2 text-[var(--violet-deep)] transition hover:bg-[var(--rose-antique)] hover:text-white"
            >
              {s.icon}
            </a>
          ))}
        </div>
      </div>

      <div className="hairline mt-[clamp(0.8rem,2vh,1.2rem)] mb-[clamp(1.15rem,3vh,1.65rem)]" />

      <p className="text-center text-[0.65rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
        Encontre rapidamente cada seção do seu passaporte
      </p>

      <ul className="mt-[clamp(0.4rem,1vh,0.7rem)] space-y-1.5">
        {items.map((it) => (
          <li key={it.id}>
            <button
              onClick={() => goTo(it.id)}
              className="group flex w-full items-baseline gap-2 text-left"
            >
              <span className="font-body text-[0.62rem] tracking-[0.2em] text-[var(--rose-burnt)]">
                {it.n}
              </span>
              <span className="font-display text-[0.8rem] font-bold uppercase tracking-[0.08em] text-[var(--ink)] transition group-hover:text-[var(--violet-deep)]">
                {it.label}
              </span>
              <span className="min-w-6 flex-1 translate-y-[-3px] border-b border-dotted border-[oklch(0.7_0.06_30_/_0.7)]" />
              <span className="font-body text-[0.68rem] tabular-nums text-[var(--ink-soft)]">
                {String(index[it.id] ?? 0).padStart(2, "0")}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="pointer-events-none absolute inset-x-[15%] bottom-0">
        <Skyline className="w-full" />
      </div>
    </PageFrame>
  );
}

/* =======================  LIVROS  ======================= */

function BuyCard({ entry, book }: { entry: UserBook; book: Book }) {
  const { updateBook } = usePassport();
  const { goTo } = useNav();
  const author = authors.find((a) => a.id === (entry.authorId ?? book.authorId));
  const source = entry.source ?? (book.authorId ? "author" : "catalog");
  const confirmedAtBienal = source === "author" && !!author?.schedule.length;
  const selectedBooth = entry.booth ?? book.booth ?? "";
  return (
    <article className="dashed-frame grid grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)] gap-3 p-[clamp(0.6rem,1.6vw,0.9rem)]">
      <img
        src={book.cover}
        alt={`Capa de ${book.title}`}
        loading="lazy"
        className="w-full rounded-[3px] object-cover shadow-[0_6px_14px_-6px_oklch(0.3_0.05_20/0.7)]"
      />
      <div className="min-w-0 space-y-1.5">
        <Field label="Título">{book.title}</Field>
        <Field label="Autora">{entry.author ?? book.author}</Field>
        <div className="grid grid-cols-3 gap-2">
          <label className="min-w-0">
            <span className="label-caps block opacity-70">Editora</span>
            <input
              value={entry.publisher ?? book.publisher}
              onChange={(event) => updateBook(entry.bookId, { publisher: event.target.value })}
              className="w-full border-b border-dotted border-[var(--rose-antique)] bg-transparent text-[0.78rem] outline-none"
            />
          </label>
          <label className="min-w-0">
            <span className="label-caps block opacity-70">Estande</span>
            <select
              value={selectedBooth}
              onChange={(event) => {
                const value = event.target.value;
                const booth = booths.find((item) => item.id === value);
                updateBook(entry.bookId, {
                  booth: value,
                  ...(entry.source === "user" && booth ? { publisher: booth.exhibitor } : {}),
                });
              }}
              className="w-full border-b border-dotted border-[var(--rose-antique)] bg-transparent text-[0.78rem] outline-none"
            >
              <option value="">—</option>
              {booths.map((booth) => (
                <option key={booth.id} value={booth.id}>
                  {booth.id}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0">
            <span className="label-caps block opacity-70">Preço</span>
            <input
              value={entry.price ?? book.price ?? ""}
              onChange={(event) => updateBook(entry.bookId, { price: event.target.value })}
              placeholder="R$ 00,00"
              className="w-full border-b border-dotted border-[var(--rose-antique)] bg-transparent text-[0.78rem] outline-none"
            />
          </label>
        </div>
        <label className="mt-1 flex cursor-pointer items-center gap-2 text-[0.8rem] text-[var(--ink)]">
          <input
            type="checkbox"
            checked={!!entry.bought}
            onChange={(e) => updateBook(entry.bookId, { bought: e.target.checked })}
            className="size-4 accent-[var(--violet-deep)]"
          />
          Comprei <Check aria-hidden className="size-4" />
        </label>
        {confirmedAtBienal && author && (
          <button
            onClick={() => goTo(`autora-${author.id}-perfil`)}
            className="text-left text-[0.75rem] italic text-[var(--seal)] underline decoration-dotted underline-offset-4"
          >
            Você pode encontrar esta autora na Bienal{" "}
            <Heart aria-hidden className="inline size-3" />
          </button>
        )}
      </div>
    </article>
  );
}

function BooksPage({
  title,
  eyebrow,
  entries,
  empty,
}: {
  title: string;
  eyebrow: string;
  entries: UserBook[];
  empty: string;
}) {
  const { openAddBook } = useNav();
  const { removeBook } = usePassport();
  return (
    <PageFrame
      eyebrow={eyebrow}
      title={title}
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => openAddBook()}
            className="hidden items-center gap-2 rounded-full border border-dashed border-[var(--rose-antique)] bg-[oklch(0.93_0.02_60)] px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[var(--violet-deep)] transition hover:-translate-y-[2px] lg:inline-flex"
          >
            + Adicionar livro
          </button>
          <button
            type="button"
            onClick={() => openAddBook()}
            aria-label="Adicionar livro"
            title="Adicionar livro"
            className="passport-mobile-add-book"
          >
            <Plus aria-hidden className="size-4" strokeWidth={1.8} />
          </button>
        </div>
      }
    >
      {entries.length === 0 ? (
        <div className="dashed-frame flex h-full min-h-40 items-center justify-center p-6 text-center font-script text-4xl text-[var(--ink-soft)]">
          {empty}
        </div>
      ) : (
        <div className="books-page-list grid h-full content-between gap-[clamp(1rem,2vh,1.35rem)]">
          {entries.map((e) => {
            const catalogBook = bookById(e.bookId);
            const book =
              catalogBook ??
              (e.title
                ? ({
                    id: e.bookId,
                    title: e.title,
                    author: e.author ?? "Autoria não informada",
                    cover: e.cover ?? passportAsset("selo1.png"),
                    genre: e.genre ?? "Livro",
                    publisher: e.publisher ?? "Não informada",
                    synopsis: "Livro adicionado pela leitora à lista de compras da Bienal.",
                    ...(e.booth ? { booth: e.booth } : {}),
                    ...(e.price ? { price: e.price } : {}),
                    ...(e.authorId ? { authorId: e.authorId } : {}),
                  } satisfies Book)
                : undefined);
            if (!book) return null;
            return (
              <div key={e.bookId} className="book-list-card relative">
                <BuyCard entry={e} book={book} />
                <button
                  type="button"
                  onClick={() => openAddBook(e.bookId)}
                  aria-label={`Editar ${book.title}`}
                  title="Editar livro"
                  className="absolute right-8 top-1.5 grid size-6 place-items-center rounded-full bg-[oklch(0.96_0.015_60_/_0.9)] text-[var(--ink-soft)] opacity-65 transition hover:text-[var(--violet-deep)] hover:opacity-100"
                >
                  <Pencil aria-hidden className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={() => removeBook(e.bookId)}
                  aria-label={`Remover ${book.title} da lista`}
                  title="Remover livro"
                  className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-[oklch(0.96_0.015_60_/_0.9)] text-[var(--ink-soft)] opacity-65 transition hover:text-[var(--seal)] hover:opacity-100"
                >
                  <Trash2 aria-hidden className="size-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </PageFrame>
  );
}

/* =======================  AUTORAS  ======================= */

function AuthorsIntroPage() {
  const steps: { icon: LucideIcon; text: string }[] = [
    { icon: Eye, text: "Encontre a autora" },
    { icon: Camera, text: "Escaneie o QR Code" },
    { icon: Stamp, text: "Resgate o carimbo" },
    { icon: BookOpen, text: "Guarde essa memória no passaporte" },
  ];
  return (
    <PageFrame eyebrow="Regras de uso" title="Como funciona o passaporte?">
      <ol className="space-y-1.5">
        {steps.map((s, i) => (
          <li key={s.text} className="flex items-center gap-3">
            <span className="shrink-0 font-stamp text-[0.65rem] tracking-[0.1em] text-[var(--rose-burnt)]">
              {i + 1}.
            </span>
            <div className="dashed-frame flex w-full items-center gap-2 px-3 py-1.5">
              <s.icon aria-hidden className="size-4 shrink-0 text-[var(--seal)]" />
              <span className="text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[var(--violet-deep)]">
                {s.text}
              </span>
            </div>
          </li>
        ))}
      </ol>

      <div className="hairline my-[clamp(0.8rem,1.8vh,1.2rem)]" />

      <p className="text-[clamp(0.8rem,1.4vw,0.9rem)] leading-relaxed text-[var(--ink)]">
        Encontre autoras participantes no estande, escaneie o QR Code ou digite o código para
        desbloquear o carimbo delas no seu passaporte.
      </p>
      <p className="mt-1.5 font-script text-[clamp(1.4rem,2.6vw,1.75rem)] text-[var(--seal)]">
        Cada carimbo é uma memória da Bienal.
      </p>

      <div className="pointer-events-none absolute inset-x-[22.5%] bottom-0">
        <Skyline />
      </div>
    </PageFrame>
  );
}

function AuthorsIndexPage({
  pageAuthors,
  pageNumber,
}: {
  pageAuthors: Author[];
  pageNumber: number;
}) {
  const { goTo } = useNav();
  const { hasStamp } = usePassport();
  const found = authors.filter((a) => hasStamp(a.id)).length;
  return (
    <PageFrame
      eyebrow="Passaporte Sáfico"
      title={`Autoras do passaporte${pageNumber ? ` · ${pageNumber + 1}` : ""}`}
      footer={
        <p className="text-right text-[0.65rem] uppercase tracking-[0.18em] text-[var(--ink-soft)]">
          {found} de {authors.length} autoras encontradas
        </p>
      }
    >
      <ul className="grid gap-[clamp(0.5rem,1.4vh,0.9rem)]">
        {pageAuthors.map((a) => {
          const stamped = hasStamp(a.id);
          return (
            <li
              key={a.id}
              className="dashed-frame grid grid-cols-[minmax(0,3.5rem)_minmax(0,1fr)] gap-3 p-2.5"
            >
              <img
                src={a.photo}
                alt={a.name}
                loading="lazy"
                className="aspect-square w-full rounded-full object-cover"
              />
              <div className="relative min-h-[6.2rem] min-w-0">
                <div className="flex h-full flex-col justify-center pr-[8.5rem]">
                  <p className="script-name min-w-0 truncate text-4xl">{a.name}</p>
                  <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                    {[a.city, a.state].filter(Boolean).join(" / ")}
                  </p>
                </div>
                <span
                  className={`absolute right-0 top-0 shrink-0 rounded-full px-2 py-1 text-[0.52rem] font-bold uppercase tracking-[0.1em] ${stamped ? "bg-[var(--brand-pink-soft)] text-[var(--violet-deep)]" : "bg-[var(--brand-lilac-soft)] text-[var(--ink-soft)]"}`}
                >
                  {stamped ? "Carimbo conquistado" : "Carimbo ainda não resgatado"}
                </span>
                <div className="absolute right-0 bottom-0">
                  <InkButton variant="ghost" onClick={() => goTo(`autora-${a.id}-perfil`)}>
                    Ver autora <ArrowRight aria-hidden className="size-4" />
                  </InkButton>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </PageFrame>
  );
}

function AuthorNav({ author }: { author: Author }) {
  const { goTo } = useNav();
  const i = authors.findIndex((a) => a.id === author.id);
  const prev = authors[i - 1];
  const next = authors[i + 1];
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[0.62rem] uppercase tracking-[0.16em]">
      <button
        disabled={!prev}
        onClick={() => prev && goTo(`autora-${prev.id}-perfil`)}
        className="text-[var(--ink-soft)] transition enabled:hover:text-[var(--violet-deep)] disabled:opacity-30"
      >
        <ArrowLeft aria-hidden className="size-3.5" /> Autora anterior
      </button>
      <button
        onClick={() => goTo("autoras-index")}
        className="text-[var(--violet-deep)] underline decoration-dotted underline-offset-4"
      >
        Voltar para autoras
      </button>
      <button
        disabled={!next}
        onClick={() => next && goTo(`autora-${next.id}-perfil`)}
        className="text-[var(--ink-soft)] transition enabled:hover:text-[var(--violet-deep)] disabled:opacity-30"
      >
        Próxima autora <ArrowRight aria-hidden className="size-3.5" />
      </button>
    </div>
  );
}

function AuthorProfilePage({ author, preview = false }: { author: Author; preview?: boolean }) {
  const { hasStamp } = usePassport();
  const longMessage = author.message.length > 100;
  return (
    <PageFrame footer={preview ? undefined : <AuthorNav author={author} />}>
      <div className="flex justify-start">
        <img
          src={passportAsset("selo1.png")}
          alt="Passaporte Sáfico — Bienal 2026"
          className="h-[clamp(3.4rem,7vw,4.8rem)] w-auto -rotate-6 object-contain opacity-55"
        />
      </div>

      <header className="mt-[clamp(0.35rem,1.2vh,0.8rem)] text-center">
        <h2 className="script-name text-[clamp(2.8rem,6.5vw,4.5rem)]">{author.name}</h2>
        <p className="mt-1 text-[0.72rem] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
          {[
            author.age > 0 ? `${author.age} anos` : "",
            [author.city, author.state].filter(Boolean).join(" / "),
            "Autora sáfica",
          ]
            .filter(Boolean)
            .join(" • ")}
        </p>
      </header>

      <div className="author-profile-grid mt-[clamp(0.8rem,2vh,1.25rem)]">
        <img
          src={author.photo}
          alt={author.name}
          loading="lazy"
          className="author-profile-photo w-full rounded-[10px] object-cover shadow-[0_12px_24px_-14px_oklch(0.3_0.05_20/0.8)]"
        />

        <section className="author-profile-about dashed-frame flex flex-col p-[clamp(0.85rem,2vw,1.15rem)]">
          <p className="label-caps flex items-center gap-2">
            <BookOpen aria-hidden className="size-4" /> Sobre a autora
          </p>
          <p className="mt-[clamp(0.8rem,2vh,1.2rem)] text-[clamp(0.86rem,1.6vw,1rem)] leading-[1.75]">
            {author.bio}
          </p>
        </section>

        <section
          className={`author-profile-message dashed-frame gap-3 p-[clamp(0.65rem,1.5vw,0.85rem)] ${longMessage ? "grid grid-cols-[minmax(0,1fr)_auto] items-end" : "relative pr-[5.2rem]"}`}
        >
          <div className="min-w-0">
            <p className="label-caps flex items-center gap-2">
              <Heart aria-hidden className="size-4" /> Mensagem para você
            </p>
            <p className="mt-1.5 font-script text-[clamp(1.55rem,3vw,2.1rem)] leading-snug text-[var(--violet-deep)]">
              {author.message}
            </p>
          </div>
          <img
            src={passportAsset("selo3.png")}
            alt=""
            aria-hidden="true"
            className={`w-[clamp(2.8rem,5.5vw,4rem)] shrink-0 -rotate-6 object-contain opacity-45 ${longMessage ? "self-end" : "absolute right-3 bottom-2"}`}
          />
        </section>

        <div className="author-profile-status flex items-start">
          {hasStamp(author.id) && (
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[var(--seal)]">
              <CheckCircle2 aria-hidden className="mr-1 inline size-3.5" /> Carimbo desta autora no
              seu passaporte
            </p>
          )}
        </div>
      </div>
    </PageFrame>
  );
}

function AuthorBooksPage({
  author,
  preview = false,
  catalogBooks,
}: {
  author: Author;
  preview?: boolean;
  catalogBooks?: Book[];
}) {
  const { setStatus, userBooks } = usePassport();
  const previewBookById = (id: string) => catalogBooks?.find((book) => book.id === id);
  return (
    <PageFrame
      eyebrow={author.name}
      title="Livros da autora"
      footer={preview ? undefined : <AuthorNav author={author} />}
    >
      <div className="grid gap-[clamp(0.45rem,1vh,0.7rem)]">
        {author.books.slice(0, 3).map((id) => {
          const book = previewBookById(id) ?? bookById(id);
          if (!book) return null;
          const inBienalList = userBooks.some(
            (entry) => entry.bookId === id && entry.status === "want_to_buy_bienal",
          );
          return (
            <article
              key={id}
              className="dashed-frame grid grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)] gap-3 p-2 sm:grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)_auto]"
            >
              <img
                src={book.cover}
                alt={`Capa de ${book.title}`}
                loading="lazy"
                className="w-full rounded-[4px] object-cover shadow-[0_10px_20px_-12px_oklch(0.3_0.05_20/0.9)]"
              />
              <div className="min-w-0">
                <h3 className="font-display text-[clamp(1rem,2vw,1.25rem)] font-bold leading-tight text-[var(--ink)]">
                  {book.title}
                </h3>
                <p className="mt-1 text-[clamp(0.76rem,1.4vw,0.86rem)] leading-snug">
                  {book.synopsis}
                </p>
                <p className="mt-1 text-[0.66rem] uppercase tracking-[0.12em] text-[var(--rose-burnt)]">
                  {book.genre} · {book.publisher}
                </p>
                <InkButton
                  variant="ghost"
                  className="mt-1 px-3 py-1.5"
                  disabled={inBienalList}
                  onClick={() => setStatus(book.id, "want_to_buy_bienal", { source: "author" })}
                >
                  {inBienalList ? (
                    <Check aria-hidden className="size-4" />
                  ) : (
                    <ShoppingBag aria-hidden className="size-4" />
                  )}
                  {inBienalList ? "Na lista da Bienal" : "Incluir na lista da Bienal"}
                </InkButton>
              </div>
              <div className="col-span-2 flex flex-wrap items-start gap-1.5 sm:col-span-1 sm:flex-col sm:items-end">
                {book.onSale && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-pink-soft)] px-2 py-1 text-[0.58rem] font-bold uppercase tracking-[0.08em] text-[var(--violet-deep)]">
                    <Check aria-hidden className="size-3" /> À venda na Bienal
                  </span>
                )}
                {book.autographAvailable && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-lilac-soft)] px-2 py-1 text-[0.58rem] font-bold uppercase tracking-[0.08em] text-[var(--violet-deep)]">
                    <Check aria-hidden className="size-3" /> Sessões de autógrafos
                  </span>
                )}
              </div>
            </article>
          );
        })}
        {!author.books.length && (
          <p className="dashed-frame p-6 text-center text-[0.82rem] text-[var(--ink-soft)]">
            Os livros cadastrados pela autora aparecerão nesta página.
          </p>
        )}
      </div>
    </PageFrame>
  );
}

function AuthorSchedulePage({
  author,
  entries,
  continuation = 0,
  showUpdates,
  preview = false,
}: {
  author: Author;
  entries: ScheduleEntry[];
  continuation?: number;
  showUpdates: boolean;
  preview?: boolean;
}) {
  return (
    <PageFrame
      watermark={false}
      eyebrow={author.name}
      title={
        <span className="inline-flex items-center gap-2">
          <MapPin aria-hidden className="size-5" /> Onde encontrar a autora
          {continuation ? ` · ${continuation + 1}` : ""}
        </span>
      }
      footer={preview ? undefined : <AuthorNav author={author} />}
    >
      <p className="text-[clamp(0.82rem,1.5vw,0.95rem)]">
        {author.name.split(" ")[0]} estará na Bienal do Livro de São Paulo entre os dias 4 e 13 de
        setembro de 2026.
      </p>

      <ul className="mt-[clamp(0.7rem,2vh,1.1rem)] divide-y divide-dotted divide-[oklch(0.72_0.06_30_/_0.6)] rounded-[10px] border border-dashed border-[var(--rose-antique)]">
        {entries.map((s) => (
          <li key={s.id} className="grid gap-1 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-body text-[0.95rem] font-bold text-[var(--ink)]">
                  <CalendarDays aria-hidden className="mr-1 inline size-4" /> {s.weekday}, {s.date}
                </span>
                <span
                  className={`rounded-[4px] px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.12em] ${
                    s.kind === "presenca"
                      ? "bg-[var(--brand-pink-soft)] text-[var(--violet-deep)]"
                      : "bg-[var(--seal)] text-white"
                  }`}
                >
                  {s.kind === "presenca" ? "Presença confirmada" : "Sessão de autógrafos"}
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1 text-[0.85rem] text-[var(--ink)]">
                <Clock3 aria-hidden className="size-4" /> {s.time}
              </p>
              {s.related && (
                <p className="flex items-center gap-1 text-[0.82rem] text-[var(--ink-soft)]">
                  <BookOpen aria-hidden className="size-4" /> Livro: {s.related}
                </p>
              )}
            </div>
            <div className="sm:text-right">
              <span className="inline-block rounded-[4px] border border-[var(--rose-antique)] bg-transparent px-2 py-0.5 font-display text-[0.95rem] font-bold text-[var(--violet-deep)]">
                {s.booth}
              </span>
              <p className="mt-1 flex items-center gap-1 text-[0.8rem] text-[var(--ink-soft)] sm:justify-end">
                <Building2 aria-hidden className="size-4" /> {s.publisher}
              </p>
            </div>
          </li>
        ))}
        {!entries.length && (
          <li className="p-6 text-center text-[0.82rem] text-[var(--ink-soft)]">
            A programação desta autora aparecerá aqui.
          </li>
        )}
      </ul>

      {showUpdates && (
        <section className="dashed-frame mt-[clamp(0.7rem,2vh,1.1rem)] p-3">
          <p className="label-caps flex items-center gap-2">
            <Megaphone aria-hidden className="size-4" /> Atualizações de última hora
          </p>
          <p className="mt-2 border-l-2 border-[var(--lilac)] pl-3 text-[0.84rem]">
            Fique de olho! Atualizações podem acontecer até o dia do evento.
          </p>
          {author.updates.map((u) => (
            <p key={u.date} className="mt-1.5 border-l-2 border-[var(--lilac)] pl-3 text-[0.84rem]">
              {u.date}: {u.text}
            </p>
          ))}
        </section>
      )}
    </PageFrame>
  );
}

/* =======================  CARIMBO  ======================= */

function AuthorStampPage({ author, preview = false }: { author: Author; preview?: boolean }) {
  const { addStamp, hasStamp, stamps } = usePassport();
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState<"idle" | "ok" | "dup" | "error">("idle");
  const [animating, setAnimating] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const already = hasStamp(author.id);
  const redeemedStamp = stamps.find((stamp) => stamp.authorId === author.id);

  const redeem = async (value: string, source: "manual" | "qr" = "manual") => {
    if (!value.trim()) {
      setFeedback("error");
      return;
    }
    const res = await addStamp(author.id, value.trim(), source);
    if (res.duplicate) {
      setFeedback("dup");
      return;
    }
    if (!res.ok) {
      setFeedback("error");
      return;
    }
    setFeedback("ok");
    setAnimating(true);
    window.setTimeout(() => setAnimating(false), 950);
  };

  return (
    <PageFrame
      watermark={false}
      eyebrow={author.name}
      title={
        <span className="inline-flex items-center gap-2">
          <Stamp aria-hidden className="size-5" /> Resgate seu carimbo
        </span>
      }
      footer={preview ? undefined : <AuthorNav author={author} />}
    >
      {already && feedback !== "ok" ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
          <StampSeal author={author} />
          <p className="font-script text-[clamp(1.8rem,4vw,2.8rem)] text-[var(--seal)]">
            Você já encontrou essa autora!
          </p>
          <p className="text-[0.78rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
            Resgatado em {redeemedStamp?.unlockedAt}
          </p>
        </div>
      ) : feedback === "ok" ? (
        <div
          className={`flex h-full flex-col items-center justify-center gap-4 text-center ${
            animating ? "animate-paper-shake" : ""
          }`}
        >
          <div className="animate-stamp">
            <StampSeal author={author} big />
          </div>
          <p className="font-display text-[clamp(1.1rem,2.4vw,1.5rem)] font-bold uppercase tracking-[0.16em] text-[var(--seal)]">
            Carimbo desbloqueado <CheckCircle2 aria-hidden className="inline size-5" />
          </p>
          <p className="text-[0.78rem] text-[var(--ink-soft)]">
            Sincronizado em{" "}
            {new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
          </p>
        </div>
      ) : (
        <>
          <p className="max-w-[46ch] text-[clamp(0.84rem,1.5vw,0.95rem)] leading-relaxed">
            Encontrou a autora na Bienal? Use o código ou escaneie o QR Code dela para desbloquear o
            carimbo.
          </p>

          <div className="pointer-events-none mt-2 flex justify-center opacity-20 grayscale">
            <StampSeal author={author} />
          </div>

          <div className="mt-[clamp(0.45rem,1.2vh,0.8rem)] grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => setScannerOpen(true)}
              className="dashed-frame flex flex-col items-center justify-center gap-2 p-6 transition hover:-translate-y-[3px] hover:bg-[oklch(0.9_0.03_320_/_0.3)]"
            >
              <Camera aria-hidden className="size-8 text-[var(--seal)]" />
              <span className="label-caps">Escanear QR Code</span>
              <span className="text-[0.65rem] text-[var(--ink-soft)]">
                abre a câmera do aparelho
              </span>
            </button>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void redeem(code);
              }}
              className="dashed-frame flex flex-col items-center justify-center gap-2 p-5"
            >
              <KeyRound aria-hidden className="size-8 text-[var(--copper)]" />
              <span className="label-caps">Digitar código</span>
              <input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setFeedback("idle");
                }}
                placeholder="AUTORA-XXXX-XXXX"
                className="w-full border-b border-dotted border-[var(--rose-antique)] bg-transparent text-center font-body text-[0.9rem] uppercase tracking-[0.14em] outline-none focus:border-[var(--violet-deep)]"
              />
              <InkButton type="submit">Resgatar carimbo</InkButton>
            </form>
          </div>

          {scannerOpen && (
            <QRCodeScanner
              onCode={(value) => {
                setCode(value);
                setScannerOpen(false);
                void redeem(value, "qr");
              }}
              onClose={() => setScannerOpen(false)}
            />
          )}

          {feedback === "error" && (
            <p className="mt-3 text-center text-[0.8rem] text-[var(--rose-burnt)]">
              Código inválido. Confira o código ou peça ajuda à autora no estande.
            </p>
          )}
          {feedback === "dup" && (
            <p className="mt-3 text-center font-script text-4xl text-[var(--seal)]">
              <Heart aria-hidden className="mr-1 inline size-5" /> Você já encontrou essa autora!
            </p>
          )}
        </>
      )}
    </PageFrame>
  );
}

type BarcodeResult = { rawValue: string };
type BarcodeDetectorInstance = { detect: (source: HTMLVideoElement) => Promise<BarcodeResult[]> };

function QRCodeScanner({
  onCode,
  onClose,
}: {
  onCode: (value: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer = 0;
    let active = true;

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("A câmera não está disponível neste navegador.");
        }
        const Detector = (
          window as unknown as {
            BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorInstance;
          }
        ).BarcodeDetector;
        if (!Detector) {
          throw new Error(
            "Este navegador não reconhece QR Codes pela câmera. Use o código da autora.",
          );
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        const video = videoRef.current;
        if (!video || !active) return;
        video.srcObject = stream;
        await video.play();
        const detector = new Detector({ formats: ["qr_code"] });
        timer = window.setInterval(async () => {
          if (!active || video.readyState < 2) return;
          try {
            const results = await detector.detect(video);
            const value = results[0]?.rawValue;
            if (value) onCode(value);
          } catch {
            // Alguns frames podem falhar enquanto a câmera ajusta o foco.
          }
        }, 350);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Não foi possível abrir a câmera.");
      }
    };

    void start();
    return () => {
      active = false;
      window.clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onCode]);

  return (
    <div
      className="dashed-frame mt-3 overflow-hidden bg-[oklch(0.25_0.03_300)] p-2 text-center text-white"
      role="region"
      aria-label="Leitor de QR Code"
    >
      {error ? (
        <p className="px-3 py-5 text-sm">{error}</p>
      ) : (
        <div className="relative mx-auto aspect-square max-h-64 overflow-hidden rounded-[8px]">
          <video ref={videoRef} muted playsInline className="size-full object-cover" />
          <div className="pointer-events-none absolute inset-[15%] rounded-[10px] border-2 border-[var(--rose-antique)] shadow-[0_0_0_999px_oklch(0.1_0.02_300_/_0.38)]" />
        </div>
      )}
      <button
        type="button"
        onClick={onClose}
        className="mt-2 px-3 py-1 text-xs uppercase tracking-[0.16em] underline underline-offset-4"
      >
        Fechar câmera
      </button>
    </div>
  );
}

function StampSeal({
  author,
  big,
  compact,
  story,
}: {
  author: Author;
  big?: boolean;
  compact?: boolean;
  story?: boolean;
}) {
  return (
    <div
      role="img"
      aria-label={`Presença confirmada de ${author.name} na Bienal do Livro SP 2026`}
      className={`relative grid place-items-center ${
        story
          ? "size-[250px]"
          : compact
            ? "size-[clamp(96px,15vw,132px)]"
            : big
              ? "size-[clamp(225px,39vw,315px)]"
              : "size-[clamp(210px,33vw,270px)]"
      } -rotate-6 drop-shadow-[0_2px_0_oklch(0.62_0.14_350_/_0.16)]`}
    >
      <img
        src={passportAsset("carimbo-presenca.png")}
        alt=""
        aria-hidden
        className="absolute inset-0 size-full object-contain"
      />
      <span
        className={`relative z-10 max-w-[58%] -translate-y-[20%] text-center font-signature leading-[0.9] text-[var(--violet-deep)] ${story ? "text-[2rem]" : compact ? "text-[clamp(0.72rem,1.5vw,1rem)]" : "text-[clamp(1.2rem,3vw,2rem)]"}`}
      >
        {author.name}
      </span>
    </div>
  );
}

function CollectionShareButton({
  getTarget,
  fileName,
  title,
}: {
  getTarget: () => HTMLDivElement | null;
  fileName: string;
  title: string;
}) {
  const [exporting, setExporting] = useState(false);

  const share = async () => {
    const target = getTarget();
    if (!target || exporting) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(target, {
        pixelRatio: 1,
        cacheBust: true,
        skipFonts: false,
        fontEmbedCSS: collectionExportFontCss,
        backgroundColor: "#fffaf6",
        filter: (node) =>
          !(node instanceof HTMLElement && node.dataset.collectionShareAction === "true"),
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${fileName}.png`, { type: "image/png" });
      const shareData = {
        title,
        text: "Minha coleção no Passaporte Sáfico",
        files: [file],
      };
      const isMobileShare =
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        (navigator.maxTouchPoints > 1 && window.innerWidth <= 1024);

      if (isMobileShare && navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = file.name;
        link.click();
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error("Não foi possível gerar a imagem da coleção.", error);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      disabled={exporting}
      data-collection-share-action="true"
      className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[var(--rose-antique)] px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[var(--violet-deep)] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
    >
      {exporting ? (
        <Download aria-hidden className="size-3.5 animate-pulse" />
      ) : (
        <Share2 aria-hidden className="size-3.5" />
      )}
      {exporting ? "Gerando" : "Compartilhar"}
    </button>
  );
}

function CollectionStoryShell({
  storyRef,
  title,
  pageNumber,
  totalPages,
  children,
}: {
  storyRef: RefObject<HTMLDivElement | null>;
  title: string;
  pageNumber: number;
  totalPages: number;
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-[-100] size-px overflow-hidden"
    >
      <div
        ref={storyRef}
        className="paper-surface relative flex h-[1920px] w-[1080px] flex-col overflow-hidden px-20 pt-24 pb-18 text-[var(--ink)]"
      >
        <Watermark />
        <header className="relative shrink-0 text-center">
          <img
            src={passportAsset("selo3.png")}
            alt=""
            className="absolute top-0 right-0 size-24 object-contain opacity-55"
          />
          <p className="font-body text-[26px] font-bold uppercase tracking-[0.28em] text-[var(--seal)]">
            Coleção{totalPages > 1 ? ` · ${pageNumber}/${totalPages}` : ""}
          </p>
          <h2 className="mt-5 whitespace-nowrap font-display text-[68px] font-bold uppercase tracking-[0.06em] text-[var(--violet-deep)]">
            {title}
          </h2>
          <div className="hairline mt-8" />
        </header>

        <main className="relative flex min-h-0 flex-1 items-start justify-center pt-16">
          {children}
        </main>

        <footer className="relative shrink-0 border-t border-dashed border-[var(--rose-antique)] pt-8 text-center font-display text-[30px] font-bold uppercase tracking-[0.16em] text-[var(--violet-deep)]">
          Mapa Sáfico Bienal SP 2026
        </footer>
      </div>
    </div>
  );
}

function StampsPage({
  pageStamps,
  totalStamps,
  pageNumber,
  totalPages,
}: {
  pageStamps: StampEntry[];
  totalStamps: number;
  pageNumber: number;
  totalPages: number;
}) {
  const { goTo } = useNav();
  const storyRef = useRef<HTMLDivElement>(null);
  return (
    <>
      <div className="h-full">
        <PageFrame
          eyebrow={`Coleção${totalPages > 1 ? ` · ${pageNumber}/${totalPages}` : ""}`}
          headerAdornment={
            <img
              src={passportAsset("selo3.png")}
              alt=""
              aria-hidden
              className="size-12 object-contain opacity-75"
            />
          }
          title={
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <Stamp aria-hidden className="size-5" /> Meus carimbos
            </span>
          }
          footer={
            <div className="flex items-center justify-between gap-2">
              <p className="text-[0.58rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                {totalStamps} de {authors.length} autoras encontradas
              </p>
              <CollectionShareButton
                getTarget={() => storyRef.current}
                fileName={`meus-carimbos-${pageNumber}`}
                title="Meus carimbos — Passaporte Sáfico"
              />
            </div>
          }
        >
          {totalStamps === 0 ? (
            <div className="dashed-frame flex h-full min-h-40 flex-col items-center justify-center gap-5 p-6 text-center">
              <p className="max-w-[18rem] font-display text-[1rem] font-semibold leading-[1.5] text-[var(--ink-soft)]">
                Seu passaporte ainda está sem carimbos.
              </p>
              <InkButton variant="ghost" onClick={() => goTo("autoras-index")}>
                Ver autoras <ArrowRight aria-hidden className="size-4" />
              </InkButton>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {pageStamps.map((s) => {
                const author = authors.find((a) => a.id === s.authorId);
                if (!author) return null;
                return (
                  <button
                    key={s.authorId}
                    onClick={() => goTo(`autora-${author.id}-perfil`)}
                    className="flex flex-col items-center gap-1"
                  >
                    <StampSeal author={author} compact />
                    <span className="text-[0.6rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                      {s.unlockedAt}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </PageFrame>
      </div>

      <CollectionStoryShell
        storyRef={storyRef}
        title="Meus carimbos"
        pageNumber={pageNumber}
        totalPages={totalPages}
      >
        {pageStamps.length === 0 ? (
          <p className="self-center font-display text-[38px] font-semibold text-[var(--ink-soft)]">
            Sua coleção ainda está esperando o primeiro carimbo.
          </p>
        ) : (
          <div className="flex w-full flex-wrap content-start justify-center gap-x-14 gap-y-20">
            {pageStamps.map((stamp) => {
              const author = authors.find((item) => item.id === stamp.authorId);
              if (!author) return null;
              return (
                <div key={stamp.authorId} className="flex w-[260px] flex-col items-center gap-4">
                  <StampSeal author={author} story />
                  <span className="font-body text-[22px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                    {stamp.unlockedAt}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CollectionStoryShell>
    </>
  );
}

function resolveCollectionBook(entry: UserBook): Book | undefined {
  const catalogBook = bookById(entry.bookId);
  if (catalogBook) return catalogBook;
  if (!entry.title) return undefined;
  return {
    id: entry.bookId,
    title: entry.title,
    author: entry.author ?? "Autoria não informada",
    cover: entry.cover ?? passportAsset("selo1.png"),
    genre: entry.genre ?? "Livro",
    publisher: entry.publisher ?? "Não informada",
    synopsis: "Livro comprado pela leitora na Bienal.",
    ...(entry.booth ? { booth: entry.booth } : {}),
    ...(entry.price ? { price: entry.price } : {}),
    ...(entry.authorId ? { authorId: entry.authorId } : {}),
  } satisfies Book;
}

function PurchasedBooksPage({
  entries,
  totalBooks,
  pageNumber,
  totalPages,
}: {
  entries: UserBook[];
  totalBooks: number;
  pageNumber: number;
  totalPages: number;
}) {
  const { goTo } = useNav();
  const storyRef = useRef<HTMLDivElement>(null);
  const resolvedBooks = entries.flatMap((entry) => {
    const book = resolveCollectionBook(entry);
    return book ? [{ entry, book }] : [];
  });

  return (
    <>
      <div className="h-full">
        <PageFrame
          eyebrow={`Coleção${totalPages > 1 ? ` · ${pageNumber}/${totalPages}` : ""}`}
          headerAdornment={
            <img
              src={passportAsset("selo3.png")}
              alt=""
              aria-hidden
              className="size-12 object-contain opacity-75"
            />
          }
          title={
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <BookOpen aria-hidden className="size-5" /> Meus livros
            </span>
          }
          footer={
            <div className="flex items-center justify-between gap-2">
              <p className="text-[0.58rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                {totalBooks} {totalBooks === 1 ? "livro comprado" : "livros comprados"}
              </p>
              <CollectionShareButton
                getTarget={() => storyRef.current}
                fileName={`meus-livros-${pageNumber}`}
                title="Meus livros — Passaporte Sáfico"
              />
            </div>
          }
        >
          {totalBooks === 0 ? (
            <div className="dashed-frame flex h-full min-h-40 flex-col items-center justify-center gap-5 p-6 text-center">
              <p className="max-w-[18rem] font-display text-[1rem] font-semibold leading-[1.5] text-[var(--ink-soft)]">
                Seus livros comprados aparecerão aqui.
              </p>
              <InkButton variant="ghost" onClick={() => goTo("bienal-0")}>
                Ver lista da Bienal <ArrowRight aria-hidden className="size-4" />
              </InkButton>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {resolvedBooks.map(({ entry, book }) => (
                <article
                  key={entry.bookId}
                  className="dashed-frame flex min-w-0 flex-col items-center p-2 text-center"
                >
                  <img
                    src={book.cover}
                    alt={`Capa de ${book.title}`}
                    className="aspect-[2/3] max-h-32 w-auto max-w-full rounded-[3px] object-cover shadow-[0_6px_14px_-6px_oklch(0.3_0.05_20/0.7)]"
                  />
                  <h3 className="mt-2 line-clamp-2 font-display text-[0.72rem] font-bold leading-tight text-[var(--ink)]">
                    {book.title}
                  </h3>
                  <p className="mt-1 max-w-full truncate text-[0.58rem] uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                    {entry.author ?? book.author}
                  </p>
                  <span className="mt-1 rounded-full bg-[var(--brand-pink-soft)] px-2 py-0.5 text-[0.5rem] font-bold uppercase tracking-[0.08em] text-[var(--violet-deep)]">
                    Comprei
                  </span>
                </article>
              ))}
            </div>
          )}
        </PageFrame>
      </div>

      <CollectionStoryShell
        storyRef={storyRef}
        title="Meus livros"
        pageNumber={pageNumber}
        totalPages={totalPages}
      >
        {resolvedBooks.length === 0 ? (
          <p className="self-center font-display text-[38px] font-semibold text-[var(--ink-soft)]">
            Seus livros comprados aparecerão aqui.
          </p>
        ) : (
          <div className="flex w-full flex-wrap content-start justify-center gap-x-14 gap-y-16">
            {resolvedBooks.map(({ entry, book }) => (
              <article
                key={entry.bookId}
                className="flex w-[260px] flex-col items-center text-center"
              >
                <img
                  src={book.cover}
                  alt=""
                  className="h-[360px] w-[240px] rounded-[8px] object-cover shadow-[0_20px_34px_-22px_rgb(79_23_48_/_0.7)]"
                />
                <h3 className="mt-6 line-clamp-2 font-display text-[30px] font-bold leading-tight text-[var(--ink)]">
                  {book.title}
                </h3>
                <p className="mt-3 max-w-full text-center font-body text-[21px] leading-snug uppercase tracking-[0.08em] text-[var(--ink-soft)]">
                  {entry.author ?? book.author}
                </p>
              </article>
            ))}
          </div>
        )}
      </CollectionStoryShell>
    </>
  );
}

function BackCoverPage() {
  return (
    <div
      className="passport-back-cover h-full"
      role="img"
      aria-label="Contracapa interna do Passaporte Sáfico"
    />
  );
}

/* =======================  MONTAGEM DAS PÁGINAS  ======================= */

function chunk<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function buildAuthorPreviewPages(author: Author, catalogBooks: Book[] = []): PageDef[] {
  const pages: PageDef[] = [
    {
      id: `autora-${author.id}-perfil`,
      section: "autoras",
      render: () => <AuthorProfilePage author={author} preview />,
    },
    {
      id: `autora-${author.id}-livros`,
      section: "autoras",
      render: () => (
        <AuthorBooksPage author={author} preview catalogBooks={catalogBooks} />
      ),
    },
  ];

  const schedulePages = chunk(author.schedule, 4);
  schedulePages.forEach((entries, scheduleIndex) => {
    pages.push({
      id: `autora-${author.id}-programacao${scheduleIndex ? `-${scheduleIndex}` : ""}`,
      section: "autoras",
      render: () => (
        <AuthorSchedulePage
          author={author}
          entries={entries}
          continuation={scheduleIndex}
          showUpdates={scheduleIndex === schedulePages.length - 1}
          preview
        />
      ),
    });
  });

  pages.push({
    id: `autora-${author.id}-carimbo`,
    section: "autoras",
    render: () => <AuthorStampPage author={author} preview />,
  });

  return pages;
}

export function buildPages(userBooks: UserBook[], stamps: StampEntry[]): PageDef[] {
  const buy = userBooks.filter((b) => b.status === "want_to_buy_bienal");
  const purchased = buy.filter((b) => b.bought);

  const pages: PageDef[] = [
    { id: "identidade", section: "id", render: () => <IdentityPage /> },
    { id: "sumario", section: "id", render: () => null }, // substituído abaixo
  ];

  chunk(buy, 2).forEach((group, i) =>
    pages.push({
      id: `bienal-${i}`,
      section: "bienal",
      render: () => (
        <BooksPage
          eyebrow={`Lista de compras${i ? ` (cont. ${i + 1})` : ""}`}
          title="Quero comprar na Bienal"
          entries={group}
          empty="nada na sacola ainda"
        />
      ),
    }),
  );

  pages.push({ id: "autoras-intro", section: "autoras", render: () => <AuthorsIntroPage /> });
  chunk(authors, 3).forEach((pageAuthors, pageNumber) => {
    pages.push({
      id: pageNumber ? `autoras-index-${pageNumber}` : "autoras-index",
      section: "autoras",
      render: () => <AuthorsIndexPage pageAuthors={pageAuthors} pageNumber={pageNumber} />,
    });
  });

  authors.forEach((a) => {
    pages.push({
      id: `autora-${a.id}-perfil`,
      section: "autoras",
      render: () => <AuthorProfilePage author={a} />,
    });
    pages.push({
      id: `autora-${a.id}-livros`,
      section: "autoras",
      render: () => <AuthorBooksPage author={a} />,
    });
    const schedulePages = chunk(a.schedule, 4);
    schedulePages.forEach((entries, scheduleIndex) => {
      pages.push({
        id: `autora-${a.id}-programacao${scheduleIndex ? `-${scheduleIndex}` : ""}`,
        section: "autoras",
        render: () => (
          <AuthorSchedulePage
            author={a}
            entries={entries}
            continuation={scheduleIndex}
            showUpdates={scheduleIndex === schedulePages.length - 1}
          />
        ),
      });
    });
    pages.push({
      id: `autora-${a.id}-carimbo`,
      section: "autoras",
      render: () => <AuthorStampPage author={a} />,
    });
  });

  const stampPages = chunk(stamps, 6);
  stampPages.forEach((pageStamps, pageIndex) => {
    pages.push({
      id: pageIndex ? `carimbos-${pageIndex}` : "carimbos",
      section: "carimbos",
      render: () => (
        <StampsPage
          pageStamps={pageStamps}
          totalStamps={stamps.length}
          pageNumber={pageIndex + 1}
          totalPages={stampPages.length}
        />
      ),
    });
  });

  const purchasedPages = chunk(purchased, 6);
  purchasedPages.forEach((entries, pageIndex) => {
    pages.push({
      id: pageIndex ? `meus-livros-${pageIndex}` : "meus-livros",
      section: "carimbos",
      render: () => (
        <PurchasedBooksPage
          entries={entries}
          totalBooks={purchased.length}
          pageNumber={pageIndex + 1}
          totalPages={purchasedPages.length}
        />
      ),
    });
  });
  if (pages.length % 2 === 1) {
    pages.push({
      id: "contracapa",
      section: "carimbos",
      render: () => <BackCoverPage />,
    });
  }

  const index: Record<string, number> = {};
  pages.forEach((p, i) => (index[p.id] = i + 1));
  pages[1] = { id: "sumario", section: "id", render: () => <SummaryPage index={index} /> };

  return pages;
}
