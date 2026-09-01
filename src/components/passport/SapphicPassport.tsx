import { useCallback, useMemo, type CSSProperties } from "react";
import { usePassportStore } from "../../stores/usePassportStore";
import { useContentStore } from "../../stores/useContentStore";
import { useExhibitorStore } from "../../stores/useExhibitorStore";
import { useUserStore } from "../../stores/useUserStore";
import { supabase } from "../../lib/supabase";
import { passportAsset } from "../../lib/passport-assets";
import { buildPassportCatalog } from "../../data/passportAdapter";
import {
  LOCAL_PASSPORT_READER_AUTHORS,
  LOCAL_PASSPORT_READER_BOOKS,
} from "../../data/localPassportReaderDemo";
import { hydratePassportCatalog } from "../../data/passport";
import {
  PassportProvider,
  type PassportIntegration,
} from "../../lib/passport-store";
import { Passport } from "./Passport";
import "@fontsource/karla/400.css";
import "@fontsource/karla/500.css";
import "@fontsource/karla/600.css";
import "@fontsource/karla/700.css";
import "@fontsource/nunito-sans/400.css";
import "@fontsource/nunito-sans/600.css";
import "@fontsource/nunito-sans/700.css";
import "@fontsource/parisienne/400.css";
import "@fontsource/tangerine/400.css";
import "@fontsource/tangerine/700.css";
import "./passport.css";

const safeCode = (value: string) => {
  const compact = value.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return (compact || "LEITORA").padEnd(10, "0").slice(0, 10);
};

export function SapphicPassport() {
  const user = useUserStore((state) => state.user);
  const authors = usePassportStore((state) => state.authors);
  const profiles = usePassportStore((state) => state.profiles);
  const stamps = usePassportStore((state) => state.stamps);
  const redeemPassportCode = usePassportStore((state) => state.redeemPassportCode);
  const books = useContentStore((state) => state.books);
  const events = useContentStore((state) => state.events);
  const exhibitors = useExhibitorStore((state) => state.exhibitors);
  const userId = user?.id || "local-passport-reader";
  const localDemo =
    (import.meta.env.DEV || import.meta.env.VITE_PASSPORT_TEST === "1") &&
    new URLSearchParams(window.location.search).get("passaporteTeste") === "1";
  const sourceAuthors = localDemo ? (LOCAL_PASSPORT_READER_AUTHORS as any) : authors;
  const sourceBooks = localDemo ? (LOCAL_PASSPORT_READER_BOOKS as any) : books;
  const sourceProfiles = localDemo
    ? LOCAL_PASSPORT_READER_AUTHORS.map((author) => ({
        author_id: author.id,
        bio: author.bio,
        message: "Nos vemos entre os livros da Bienal!",
        passport_city: "São Paulo / SP",
        books: [],
        presences: [],
        autograph_sessions: [],
        sale_locations: sourceBooks
          .filter((book: any) => book.authorName === author.name)
          .map((book: any) => ({
            book_id: book.id,
            stand_code: book.standCode,
            available_for_sale: true,
          })),
      }))
    : profiles;

  const catalog = useMemo(
    () =>
      buildPassportCatalog({
        authors: sourceAuthors,
        profiles: sourceProfiles,
        books: sourceBooks,
        events,
        exhibitors,
        photoUrl: (path) => {
          if (!path) return "";
          if (/^(https?:|data:|blob:)/i.test(path)) return path;
          return supabase.storage.from("passport-photos").getPublicUrl(path).data.publicUrl;
        },
      }),
    [sourceAuthors, sourceProfiles, sourceBooks, events, exhibitors],
  );

  hydratePassportCatalog(catalog);
  const catalogVersion = useMemo(
    () =>
      [
        ...catalog.authors.map((author) => `${author.id}:${author.books.length}:${author.schedule.length}`),
        ...catalog.books.map((book) => book.id),
        ...catalog.booths.map((booth) => booth.id),
      ].join("|"),
    [catalog],
  );

  const redeem = useCallback<PassportIntegration["redeem"]>(
    async (authorId, code, source) => {
      if (!user) {
        return { ok: false, message: "Entre na sua conta para resgatar este carimbo." };
      }
      const result = await redeemPassportCode(user.id, code, source, authorId);
      return {
        ok: result.ok,
        duplicate: result.ok && stamps.some((stamp) => stamp.authorId === authorId),
        message: result.message,
      };
    },
    [redeemPassportCode, stamps, user],
  );

  const integration = useMemo<PassportIntegration>(() => {
    const identifier = safeCode(userId);
    return {
      userId,
      profile: {
        fullName: "",
        birthDate: "",
        nationality: "",
        birthplace: "",
        issuedAt: new Date().toLocaleDateString("pt-BR"),
        passportCode: `PLS-2026-${identifier.slice(0, 6)}`,
        serialNumber: `PL${identifier.slice(0, 8)}`,
        photo: user?.avatar,
      },
      stamps: stamps.map((stamp) => ({
        authorId: stamp.authorId,
        unlockedAt: new Date(stamp.redeemedAtLocal).toLocaleString("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        }),
        status: "unlocked" as const,
        sync: stamp.status,
      })),
      redeem,
    };
  }, [redeem, stamps, user, userId]);

  return (
    <div
      className="sapphic-passport-v2"
      style={{
        "--passport-back-cover-image": `url("${passportAsset("contracapa-textura.png")}")`,
      } as CSSProperties}
    >
      <PassportProvider integration={integration}>
        <Passport catalogVersion={catalogVersion} />
      </PassportProvider>
    </div>
  );
}

export default SapphicPassport;
