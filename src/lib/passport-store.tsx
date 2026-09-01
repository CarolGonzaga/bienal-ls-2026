import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getPersonalOfflineData, putPersonalOfflineData } from "./offlineDb";

export type BookStatus = "want_to_buy_bienal";

export type UserBook = {
  bookId: string;
  status: BookStatus;
  bought?: boolean;
  source?: "author" | "catalog" | "user";
  title?: string;
  author?: string;
  authorId?: string;
  publisher?: string;
  booth?: string;
  price?: string;
  genre?: string;
  cover?: string;
};

export type UserProfile = {
  fullName: string;
  birthDate: string;
  nationality: string;
  birthplace: string;
  issuedAt: string;
  passportCode: string;
  serialNumber: string;
  photo?: string;
};

export type Stamp = {
  authorId: string;
  unlockedAt: string;
  status: "unlocked";
  sync: "confirmed" | "pending_sync";
};

export type RedeemFeedback = {
  ok: boolean;
  duplicate?: boolean;
  message?: string;
};

export type PassportIntegration = {
  userId: string;
  profile: UserProfile;
  stamps: Stamp[];
  redeem: (
    authorId: string,
    code: string,
    source: "manual" | "qr",
  ) => Promise<RedeemFeedback>;
};

type PassportState = {
  profile: UserProfile;
  userBooks: UserBook[];
  stamps: Stamp[];
  pageId: string | null;
  opened: boolean;
};

type PersistedPassport = Pick<PassportState, "profile" | "userBooks">;

type Ctx = PassportState & {
  hydrated: boolean;
  updateProfile: (patch: Partial<UserProfile>) => void;
  setStatus: (bookId: string, status: BookStatus, extra?: Partial<UserBook>) => void;
  updateBook: (bookId: string, patch: Partial<UserBook>) => void;
  removeBook: (bookId: string) => void;
  addStamp: (
    authorId: string,
    code: string,
    source?: "manual" | "qr",
  ) => Promise<RedeemFeedback>;
  hasStamp: (authorId: string) => boolean;
  setPageId: (id: string) => void;
  setOpened: (value: boolean) => void;
};

const STORAGE_TYPE = "sapphicPassportV2";
const PassportContext = createContext<Ctx | null>(null);

export function PassportProvider({
  integration,
  children,
}: {
  integration: PassportIntegration;
  children: ReactNode;
}) {
  const [state, setState] = useState<PassportState>({
    profile: integration.profile,
    userBooks: [],
    stamps: integration.stamps,
    pageId: null,
    opened: false,
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    setHydrated(false);
    void getPersonalOfflineData<PersistedPassport>(integration.userId, STORAGE_TYPE)
      .then((saved) => {
        if (!active) return;
        setState((current) => ({
          ...current,
          profile: { ...integration.profile, ...(saved?.profile ?? {}) },
          userBooks: saved?.userBooks ?? [],
          stamps: integration.stamps,
          pageId: null,
          opened: false,
        }));
      })
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, [integration.userId]);

  useEffect(() => {
    setState((current) => ({ ...current, stamps: integration.stamps }));
  }, [integration.stamps]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      void putPersonalOfflineData(integration.userId, STORAGE_TYPE, {
        profile: state.profile,
        userBooks: state.userBooks,
      } satisfies PersistedPassport);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [hydrated, integration.userId, state.profile, state.userBooks]);

  const setStatus = useCallback(
    (bookId: string, status: BookStatus, extra?: Partial<UserBook>) => {
      setState((current) => {
        const previous = current.userBooks.find((book) => book.bookId === bookId);
        return {
          ...current,
          userBooks: [
            ...current.userBooks.filter((book) => book.bookId !== bookId),
            { ...previous, bookId, status, ...extra },
          ],
        };
      });
    },
    [],
  );

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setState((current) => ({
      ...current,
      profile: { ...current.profile, ...patch },
    }));
  }, []);

  const updateBook = useCallback((bookId: string, patch: Partial<UserBook>) => {
    setState((current) => ({
      ...current,
      userBooks: current.userBooks.map((book) =>
        book.bookId === bookId ? { ...book, ...patch } : book,
      ),
    }));
  }, []);

  const removeBook = useCallback((bookId: string) => {
    setState((current) => ({
      ...current,
      userBooks: current.userBooks.filter((book) => book.bookId !== bookId),
    }));
  }, []);

  const addStamp = useCallback<Ctx["addStamp"]>(
    async (authorId, code, source = "manual") => {
      if (state.stamps.some((stamp) => stamp.authorId === authorId)) {
        return { ok: true, duplicate: true, message: "Este carimbo já foi resgatado." };
      }
      return integration.redeem(authorId, code, source);
    },
    [integration, state.stamps],
  );

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      hydrated,
      updateProfile,
      setStatus,
      updateBook,
      removeBook,
      addStamp,
      hasStamp: (authorId) => state.stamps.some((stamp) => stamp.authorId === authorId),
      setPageId: (pageId) => setState((current) => ({ ...current, pageId })),
      setOpened: (opened) => setState((current) => ({ ...current, opened })),
    }),
    [
      state,
      hydrated,
      updateProfile,
      setStatus,
      updateBook,
      removeBook,
      addStamp,
    ],
  );

  return <PassportContext.Provider value={value}>{children}</PassportContext.Provider>;
}

export function usePassport() {
  const context = useContext(PassportContext);
  if (!context) throw new Error("usePassport must be used inside PassportProvider");
  return context;
}
