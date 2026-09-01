import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePassport } from "@/lib/passport-store";
import { AddBookModal } from "./AddBookModal";
import { buildPages, type PageDef } from "./pages";
import { NavContext } from "./ui";
import coverDesktop from "@/assets/cover-desktop.webp";
import coverMobile from "@/assets/cover-mobile.webp";
import {
  ChevronLeft,
  ChevronRight,
  PenLine,
  ShoppingBag,
  Stamp,
  type LucideIcon,
} from "lucide-react";

const TABS: { id: string; label: string; target: string; icon: LucideIcon }[] = [
  { id: "bienal", label: "Bienal", target: "bienal-0", icon: ShoppingBag },
  { id: "autoras", label: "Autoras", target: "autoras-intro", icon: PenLine },
  { id: "carimbos", label: "Carimbos", target: "carimbos", icon: Stamp },
];

const COVER_MOTION_MS = 1450;
const PAGE_FADE_MS = 300;

export function Passport({ catalogVersion }: { catalogVersion: string }) {
  const { userBooks, stamps, pageId, setPageId, opened, setOpened, hydrated } = usePassport();
  const isMobile = useIsMobile();
  const pages = useMemo(
    () => buildPages(userBooks, stamps),
    [userBooks, stamps, catalogVersion],
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPreset, setModalPreset] = useState<string | null>(null);
  const [openingAnim, setOpeningAnim] = useState(false);
  const [openingPages, setOpeningPages] = useState(false);
  const [skipPageEnter, setSkipPageEnter] = useState(false);
  const [pageDirection, setPageDirection] = useState<"next" | "prev">("next");

  const current = Math.max(
    0,
    pages.findIndex((p) => p.id === pageId),
  );

  const goToIndex = useCallback(
    (i: number) => {
      const clamped = Math.min(Math.max(i, 0), pages.length - 1);
      const page = pages[clamped];
      if (page) {
        setPageDirection(clamped < current ? "prev" : "next");
        setSkipPageEnter(false);
        setPageId(page.id);
      }
    },
    [current, pages, setPageId],
  );

  const goTo = useCallback(
    (id: string) => {
      const targetIndex = pages.findIndex((p) => p.id === id);
      const page = pages[targetIndex];
      if (page) {
        setPageDirection(targetIndex < current ? "prev" : "next");
        setSkipPageEnter(false);
        setPageId(page.id);
      }
    },
    [current, pages, setPageId],
  );

  const step = isMobile ? 1 : 2;
  const next = useCallback(() => goToIndex(current + step), [current, step, goToIndex]);
  const prev = useCallback(() => goToIndex(current - step), [current, step, goToIndex]);

  useEffect(() => {
    if (!opened || modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (
        e.defaultPrevented ||
        ["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)
      )
        return;
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opened, modalOpen, next, prev]);

  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t) touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current;
    const t = e.changedTouches[0];
    touch.current = null;
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.45) {
      if (dx < 0) next();
      else prev();
    }
  };

  const open = () => {
    if (openingAnim) return;
    setOpeningAnim(true);
    const first = pages[0];
    if (first) setPageId(first.id);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOpened(true);
      setOpeningAnim(false);
      setOpeningPages(false);
      return;
    }

    window.setTimeout(() => {
      setOpeningPages(true);
      window.setTimeout(() => {
        setSkipPageEnter(true);
        setOpened(true);
        setOpeningAnim(false);
        setOpeningPages(false);
      }, PAGE_FADE_MS);
    }, COVER_MOTION_MS);
  };

  const nav = useMemo(
    () => ({
      goTo,
      openAddBook: (preset?: string) => {
        setModalPreset(preset ?? null);
        setModalOpen(true);
      },
    }),
    [goTo],
  );

  if (!hydrated) {
    return <div className="h-full bg-[var(--background)]" aria-hidden="true" />;
  }

  if (!opened) {
    return (
      <NavContext.Provider value={nav}>
        <Cover
          onOpen={open}
          opening={openingAnim}
          showPages={openingPages}
          mobile={isMobile}
          pages={pages}
        />
      </NavContext.Provider>
    );
  }

  const leftIndex = isMobile ? current : current - (current % 2);
  const rightIndex = leftIndex + 1;
  const visible = isMobile ? [current] : [leftIndex, rightIndex].filter((i) => i < pages.length);

  return (
    <NavContext.Provider value={nav}>
      <div
        className="passport-shell flex h-full flex-col items-center justify-start gap-2 overflow-hidden px-2 py-[clamp(0.3rem,1.5vh,1rem)] md:justify-center"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.3rem)" }}
      >
        <div className="passport-mobile-navigation w-full shrink-0 md:hidden">
          <div className="grid grid-cols-[2.65rem_minmax(0,1fr)_2.65rem] items-center gap-2">
            <button
              onClick={prev}
              disabled={current === 0}
              aria-label="Página anterior"
              className="grid size-[2.65rem] place-items-center rounded-full border border-[oklch(0.9_0.04_50_/_0.55)] bg-[oklch(0.35_0.08_10_/_0.32)] text-[var(--paper)] shadow-sm transition active:scale-95 disabled:opacity-25"
            >
              <ChevronLeft aria-hidden className="size-5" />
            </button>
            <div className="min-w-0 text-center text-[var(--paper)]">
              <p aria-live="polite" className="text-[0.64rem] font-bold uppercase tracking-[0.18em]">
                Página {String(current + 1).padStart(2, "0")} de {pages.length}
              </p>
              <p className="mt-0.5 text-[0.52rem] uppercase tracking-[0.12em] opacity-65">
                Deslize para mudar de página
              </p>
            </div>
            <button
              onClick={next}
              disabled={current >= pages.length - 1}
              aria-label="Próxima página"
              className="grid size-[2.65rem] place-items-center rounded-full border border-[oklch(0.9_0.04_50_/_0.55)] bg-[oklch(0.35_0.08_10_/_0.32)] text-[var(--paper)] shadow-sm transition active:scale-95 disabled:opacity-25"
            >
              <ChevronRight aria-hidden className="size-5" />
            </button>
          </div>

          <nav aria-label="Seções do passaporte" className="mt-1.5 grid grid-cols-3 gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => goTo(t.target)}
                aria-current={pages[current]?.section === t.id ? "page" : undefined}
                className={`flex min-h-8 items-center justify-center gap-1 rounded-full border px-1.5 py-1 text-[0.52rem] font-bold uppercase tracking-[0.08em] transition active:scale-[0.98] ${
                  pages[current]?.section === t.id
                    ? "border-transparent bg-[var(--paper)] text-[var(--violet-deep)]"
                    : "border-[oklch(0.9_0.04_50_/_0.42)] bg-[oklch(0.35_0.08_10_/_0.2)] text-[oklch(0.97_0.015_60_/_0.88)]"
                }`}
              >
                <t.icon aria-hidden className="size-3" />
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="passport-book-wrap relative w-full max-w-[min(1120px,97vw)] [perspective:1800px]">
          <button
            onClick={prev}
            disabled={leftIndex === 0}
            aria-label="Página anterior"
            className="absolute left-[-0.25rem] top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-[oklch(0.85_0.05_30_/_0.5)] bg-[oklch(0.96_0.02_70_/_0.85)] px-3 py-2 text-[var(--rose-burnt)] transition enabled:hover:-translate-x-1 enabled:hover:-translate-y-1/2 disabled:opacity-30 md:block lg:left-[-2.6rem]"
          >
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          <button
            onClick={next}
            disabled={rightIndex >= pages.length - 1}
            aria-label="Próxima página"
            className="absolute right-[-0.25rem] top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-[oklch(0.85_0.05_30_/_0.5)] bg-[oklch(0.96_0.02_70_/_0.85)] px-3 py-2 text-[var(--rose-burnt)] transition enabled:hover:translate-x-1 enabled:hover:-translate-y-1/2 disabled:opacity-30 md:block lg:right-[-2.6rem]"
          >
            <ChevronRight aria-hidden className="size-4" />
          </button>

          <div
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            className="passport-spread passport-spread-open relative grid gap-0 overflow-hidden rounded-[14px] md:grid-cols-2"
          >
            {visible.map((i, k) => {
              const page = pages[i];
              return (
                <section
                  key={page ? page.id : `empty-${k}`}
                  aria-label={`Página ${i + 1} de ${pages.length}`}
                  className={`${page?.id.endsWith("-carimbo") ? "paper-surface-pink" : "paper-surface"} passport-book-page relative flex h-full min-h-0 flex-col ${
                    skipPageEnter ? "" : "page-enter"
                  } mobile-page-enter-${pageDirection}`}
                  style={{
                    boxShadow:
                      page?.id === "contracapa"
                        ? "none"
                        : k === 0 && visible.length > 1
                          ? "inset -18px 0 26px -22px oklch(0.35 0.06 20 / 0.7)"
                          : visible.length > 1
                            ? "inset 18px 0 26px -22px oklch(0.35 0.06 20 / 0.7)"
                            : undefined,
                  }}
                >
                  <div
                    className="passport-page-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
                    style={{ touchAction: "pan-y" }}
                  >
                    {page?.render()}
                  </div>
                  {page && page.id !== "contracapa" && (
                    <footer className="flex items-center justify-between px-[clamp(0.9rem,2.4vw,1.9rem)] pb-2 text-[0.55rem] uppercase tracking-[0.26em] text-[var(--ink-soft)]">
                      <span>Passaporte Sáfico</span>
                      <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    </footer>
                  )}
                </section>
              );
            })}
            {/* lombada */}
            <div
              aria-hidden
              className="passport-book-gutter pointer-events-none absolute inset-y-0 left-1/2 hidden w-[34px] -translate-x-1/2 md:block"
            />
          </div>

          {/* abas laterais */}
          <nav
            aria-label="Seções do passaporte"
            className="absolute right-[-0.4rem] top-6 hidden translate-x-full flex-col gap-1.5 lg:flex"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => goTo(t.target)}
                aria-current={pages[current]?.section === t.id ? "page" : undefined}
                className={`rounded-r-[6px] border border-l-0 border-[oklch(0.8_0.05_30_/_0.6)] px-2 py-2 text-[0.58rem] font-bold uppercase tracking-[0.12em] transition hover:translate-x-1 ${
                  pages[current]?.section === t.id
                    ? "bg-[var(--paper)] text-[var(--violet-deep)]"
                    : "bg-[oklch(0.9_0.03_50_/_0.75)] text-[var(--ink-soft)]"
                }`}
              >
                <t.icon aria-hidden className="mr-1 inline size-3" />
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* controles inferiores */}
        <div className="hidden w-full max-w-[min(1120px,97vw)] items-center justify-between gap-2 md:flex">
          <button
            onClick={prev}
            disabled={current === 0}
            aria-label="Página anterior"
            className="hidden rounded-full border border-[oklch(0.9_0.04_50_/_0.5)] px-3 py-1.5 text-[0.75rem] text-[var(--paper)] transition active:scale-95 disabled:opacity-30"
          >
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          <p
            aria-live="polite"
            className="flex-1 text-center text-[0.58rem] uppercase tracking-[0.22em] text-[oklch(0.95_0.02_60_/_0.75)]"
          >
            página {String(current + 1).padStart(2, "0")} de {pages.length}
          </p>
          <button
            onClick={next}
            disabled={current >= pages.length - 1}
            aria-label="Próxima página"
            className="hidden rounded-full border border-[oklch(0.9_0.04_50_/_0.5)] px-3 py-1.5 text-[0.75rem] text-[var(--paper)] transition active:scale-95 disabled:opacity-30"
          >
            <ChevronRight aria-hidden className="size-4" />
          </button>
        </div>

        {/* abas mobile */}
        <nav
          aria-label="Seções do passaporte"
          className="hidden w-full max-w-[min(1120px,97vw)] snap-x gap-1.5 overflow-x-auto pb-0.5 md:flex lg:hidden"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => goTo(t.target)}
              aria-current={pages[current]?.section === t.id ? "page" : undefined}
              className={`snap-start whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.56rem] font-bold uppercase tracking-[0.1em] transition ${
                pages[current]?.section === t.id
                  ? "border-transparent bg-[var(--paper)] text-[var(--violet-deep)]"
                  : "border-[oklch(0.9_0.04_50_/_0.4)] text-[oklch(0.95_0.02_60_/_0.8)]"
              }`}
            >
              <t.icon aria-hidden className="mr-1 inline size-3" />
              {t.label}
            </button>
          ))}
        </nav>

        {pages[current]?.section === "bienal" && (
          <button
            onClick={() => {
              setModalPreset(null);
              setModalOpen(true);
            }}
            className="fixed bottom-[calc(env(safe-area-inset-bottom)+3.2rem)] right-4 z-30 hidden rounded-full bg-[var(--violet-deep)] px-4 py-3 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--paper)] shadow-lg transition hover:-translate-y-[2px] md:block lg:hidden"
          >
            + Adicionar livro
          </button>
        )}

        <AddBookModal
          key={`${modalOpen}-${modalPreset ?? "novo"}`}
          open={modalOpen}
          preset={modalPreset}
          onClose={() => {
            setModalOpen(false);
            setModalPreset(null);
          }}
        />
      </div>
    </NavContext.Provider>
  );
}

/* ---------------- capa ---------------- */

function Cover({
  onOpen,
  opening,
  showPages,
  mobile,
  pages,
}: {
  onOpen: () => void;
  opening: boolean;
  showPages: boolean;
  mobile: boolean;
  pages: PageDef[];
}) {
  const previewPages = mobile ? pages.slice(0, 1) : pages.slice(0, 2);

  return (
    <div
      className="passport-cover-shell flex h-full flex-col items-center justify-center gap-2 overflow-hidden px-2 py-[clamp(0.3rem,1.5vh,1rem)]"
      style={{ perspective: "1800px" }}
    >
      <div className="passport-cover-stage relative w-full max-w-[min(1120px,97vw)] [perspective:1800px]">
        <div
          aria-hidden="true"
          className={`passport-spread relative grid gap-0 overflow-hidden rounded-[14px] md:grid-cols-2 ${
            showPages ? "passport-spread-open passport-spread-open-reveal" : ""
          }`}
          inert
        >
          {opening && !showPages && (
            <>
              <div className="paper-surface passport-opening-third-sheet absolute inset-y-[3px] left-[3px] right-[-3px] rounded-[12px] md:left-[calc(50%+3px)]" />
              <div className="paper-surface passport-opening-right-page absolute inset-y-0 left-0 right-0 z-10 rounded-r-[12px] md:left-1/2" />
              <div className="passport-opening-first-page absolute inset-y-0 left-0 z-20 w-full md:left-1/2 md:w-1/2">
                <div className="paper-surface passport-cover-face passport-cover-front absolute inset-0 rounded-[10px]" />
                <div className="paper-surface passport-cover-face passport-paper-back absolute inset-0 rounded-[10px]" />
              </div>
            </>
          )}

          {showPages &&
            previewPages.map((page, index) => (
              <section
                key={page.id}
                className="paper-surface passport-book-page passport-opening-page relative flex h-full min-h-0 flex-col"
                style={{
                  boxShadow:
                    index === 0 && previewPages.length > 1
                      ? "inset -18px 0 26px -22px oklch(0.35 0.06 20 / 0.7)"
                      : previewPages.length > 1
                        ? "inset 18px 0 26px -22px oklch(0.35 0.06 20 / 0.7)"
                        : undefined,
                }}
              >
                <div className="passport-opening-content min-h-0 flex-1 overflow-hidden">
                  {page.render()}
                </div>
                <footer className="passport-opening-content flex items-center justify-between px-[clamp(0.9rem,2.4vw,1.9rem)] pb-2 text-[0.55rem] uppercase tracking-[0.26em] text-[var(--ink-soft)]">
                  <span>Passaporte Sáfico</span>
                  <span className="tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                </footer>
              </section>
            ))}

          {showPages && previewPages.length > 1 && (
            <div
              aria-hidden="true"
              className="passport-book-gutter pointer-events-none absolute inset-y-0 left-1/2 w-[34px] -translate-x-1/2"
            />
          )}
        </div>

        <div
          className={`passport-front-cover absolute inset-y-0 left-0 z-30 w-full origin-left md:left-1/2 md:w-1/2 ${
            opening ? "passport-front-cover-opening" : ""
          }`}
        >
          <div className="passport-cover-face passport-cover-front absolute inset-0">
            <img
              src={mobile ? coverMobile : coverDesktop}
              alt="Capa do Passaporte Sáfico — Mapa Sáfico da Bienal do Livro de São Paulo 2026"
              className="size-full rounded-[10px] object-fill shadow-[0_40px_70px_-30px_oklch(0.2_0.04_20/0.85)]"
            />
            <div
              aria-hidden
              className="passport-front-cover-shade pointer-events-none absolute inset-0 rounded-[10px] bg-[linear-gradient(90deg,oklch(0.2_0.03_20_/_0.65),transparent_45%,oklch(1_0_0_/_0.15))] opacity-0"
            />
          </div>
          <div
            aria-hidden
            className="passport-cover-face passport-cover-back absolute inset-0 rounded-[10px]"
          />
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-6 left-4 right-4 h-8 rounded-[50%] blur-xl md:left-[calc(50%+1rem)]"
          style={{ background: "oklch(0.2 0.04 20 / 0.55)" }}
        />

        <button
          onClick={onOpen}
          disabled={opening}
          aria-label="Abrir o passaporte"
          className="group absolute right-[-1rem] top-1/2 z-40 -translate-y-1/2 rounded-full border border-[oklch(0.9_0.05_50_/_0.6)] bg-[oklch(0.94_0.04_40_/_0.9)] px-4 py-3 text-[var(--rose-burnt)] shadow-lg transition-all duration-200 enabled:hover:translate-x-1 enabled:hover:-translate-y-1/2 enabled:hover:shadow-[0_0_22px_oklch(0.85_0.08_40_/_0.8)] disabled:cursor-wait disabled:opacity-0 sm:right-[-1.6rem]"
        >
          <ChevronRight aria-hidden className="size-5" />
        </button>
      </div>

      <div aria-hidden className="h-[1.9rem] shrink-0" />
    </div>
  );
}
