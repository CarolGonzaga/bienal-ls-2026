import { createContext, useContext, type ReactNode } from "react";
import { passportAsset } from "@/lib/passport-assets";

/* ---------- navegação interna do passaporte ---------- */

type Nav = {
  goTo: (pageId: string) => void;
  openAddBook: (preset?: string) => void;
};

export const NavContext = createContext<Nav>({ goTo: () => {}, openAddBook: () => {} });
export const useNav = () => useContext(NavContext);

/* ---------- moldura de página ---------- */

export function PageFrame({
  title,
  eyebrow,
  children,
  footer,
  headerAdornment,
  institutional,
  watermark = true,
}: {
  title?: ReactNode;
  eyebrow?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  headerAdornment?: ReactNode;
  institutional?: boolean;
  watermark?: boolean;
}) {
  return (
    <div className="passport-page-frame relative flex h-full flex-col gap-[clamp(0.6rem,1.4vh,1.1rem)] overflow-x-hidden overflow-y-auto p-[clamp(0.9rem,2.4vw,1.9rem)]">
      {watermark && <Watermark />}
      {institutional && <GuillocheLines />}
      {(title || eyebrow || headerAdornment) && (
        <header className={`relative shrink-0 ${headerAdornment ? "pr-14" : ""}`}>
          {eyebrow && <p className="label-caps opacity-70">{eyebrow}</p>}
          {title && <h2 className="page-title mt-1">{title}</h2>}
          {headerAdornment && (
            <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-[56%]">
              {headerAdornment}
            </div>
          )}
          <div className="hairline mt-2" />
        </header>
      )}
      <div className="relative flex-1">{children}</div>
      {footer && <div className="relative shrink-0">{footer}</div>}
    </div>
  );
}

/* ---------- marca d'água discreta ---------- */

export function Watermark() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.05]"
    >
      <svg viewBox="0 0 200 200" className="h-2/3 w-2/3 text-[var(--violet-deep)]">
        <path
          d="M100 168s-52-30-52-72a26 26 0 0 1 52-10 26 26 0 0 1 52 10c0 42-52 72-52 72Z"
          fill="currentColor"
          opacity="0.5"
        />
        <path
          d="M56 120h88M100 120v40M86 152h28"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          opacity="0.6"
        />
      </svg>
    </div>
  );
}

function GuillocheLines() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.16]"
    >
      <svg viewBox="0 0 400 500" preserveAspectRatio="none" className="h-full w-full">
        {Array.from({ length: 26 }).map((_, i) => (
          <path
            key={i}
            d={`M0 ${i * 20} C 100 ${i * 20 + 22}, 300 ${i * 20 - 22}, 400 ${i * 20}`}
            fill="none"
            stroke="var(--rose-antique)"
            strokeWidth="0.6"
          />
        ))}
      </svg>
    </div>
  );
}

/* ---------- skyline / carimbos decorativos ---------- */

export function Skyline({ className = "" }: { className?: string }) {
  return (
    <img
      aria-hidden
      src={passportAsset("saopaulo.png")}
      alt=""
      className={`w-full opacity-25 object-contain pointer-events-none select-none ${className}`}
    />
  );
}

export function RoundStamp({
  variant = 1,
  className = "",
}: {
  top?: string;
  bottom?: string;
  variant?: 1 | 2 | 3;
  className?: string;
}) {
  const src = passportAsset(variant === 3 || variant === 2 ? "selo2.png" : "ondas.png");
  return (
    <img
      aria-hidden
      src={src}
      alt=""
      className={`stamp-mark h-[clamp(46px,6.5vw,80px)] w-[clamp(46px,6.5vw,80px)] -rotate-6 object-contain pointer-events-none select-none ${className}`}
    />
  );
}

export function RectStamp({ className = "" }: { className?: string }) {
  return (
    <img
      aria-hidden
      src={passportAsset("selo1.png")}
      alt=""
      className={`stamp-mark h-[clamp(40px,5.5vw,68px)] w-auto -rotate-6 object-contain pointer-events-none select-none ${className}`}
    />
  );
}

/* ---------- código de barras determinístico ---------- */

export function Barcode({ value }: { value: string }) {
  const bars: number[] = [];
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    bars.push(((c >> 0) & 3) + 1, ((c >> 2) & 3) + 1, ((c >> 4) & 3) + 1, ((c >> 6) & 3) + 1);
  }
  return (
    <div className="inline-flex flex-col items-center gap-1">
      <div className="flex h-[clamp(38px,6vh,58px)] items-end gap-[2px]">
        {bars.map((w, i) => (
          <span
            key={i}
            className="block h-full bg-[var(--ink)]"
            style={{ width: `${w}px`, opacity: i % 2 ? 0.9 : 1 }}
          />
        ))}
      </div>
      <span className="font-body text-[0.62rem] tracking-[0.35em] text-[var(--ink-soft)]">
        {value}
      </span>
    </div>
  );
}

/* ---------- botões no idioma do passaporte ---------- */

export function InkButton({
  children,
  onClick,
  variant = "solid",
  type = "button",
  className = "",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "solid" | "ghost";
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[6px] px-4 py-2 text-[0.72rem] font-bold uppercase tracking-[0.14em] transition-all duration-200";
  const styles =
    variant === "solid"
      ? "bg-[var(--violet-deep)] text-[var(--paper)] hover:brightness-110 hover:-translate-y-[2px]"
      : "border border-dashed border-[var(--rose-antique)] text-[var(--violet-deep)] hover:bg-[oklch(0.9_0.03_320_/_0.35)]";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles} disabled:translate-y-0 disabled:opacity-55 ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="label-caps opacity-70">{label}</p>
      <div className="mt-0.5 border-b border-dotted border-[oklch(0.72_0.06_30_/_0.6)] pb-1 text-[clamp(0.82rem,1.5vw,0.98rem)] text-[var(--ink)]">
        {children}
      </div>
    </div>
  );
}
