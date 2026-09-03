import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getPersonalOfflineData, putPersonalOfflineData } from "./offlineDb";
import { isSupabaseConfigured, supabase } from "./supabase";

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
  cloudSync?: boolean;
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

type PersistedPassport = Pick<PassportState, "profile" | "userBooks"> & {
  updatedAt?: string;
};

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
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PassportContext = createContext<Ctx | null>(null);
const isReaderAddedBook = (book: UserBook) => book.source === "user" || book.bookId.startsWith("custom-");

const timestamp = (value?: string) => {
  const parsed = value ? Date.parse(value) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
};

const saveCloudCopy = async (userId: string, payload: PersistedPassport) => {
  if (!navigator.onLine) return;
  const updatedAt = payload.updatedAt || new Date().toISOString();
  const { error } = await supabase.from("passport_reader_states").upsert(
    {
      user_id: userId,
      profile: payload.profile,
      user_books: payload.userBooks,
      client_updated_at: updatedAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) console.error("[Supabase] sincronizar passaporte da leitora:", error);
};

export function PassportProvider({
  integration,
  children,
  persistence = true,
}: {
  integration: PassportIntegration;
  children: ReactNode;
  persistence?: boolean;
}) {
  const [state, setState] = useState<PassportState>({
    profile: integration.profile,
    userBooks: [],
    stamps: integration.stamps,
    pageId: null,
    opened: false,
  });
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);
  const editVersionRef = useRef(0);
  const skipNextPersistRef = useRef(true);
  const cloudEnabled = Boolean(
    persistence && integration.cloudSync && isSupabaseConfigured && UUID_PATTERN.test(integration.userId),
  );

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let active = true;
    if (!persistence) {
      skipNextPersistRef.current = true;
      setState({
        profile: integration.profile,
        userBooks: [],
        stamps: integration.stamps,
        pageId: null,
        opened: true,
      });
      setHydrated(true);
      return () => {
        active = false;
      };
    }
    const hydrationEditVersion = editVersionRef.current;
    setHydrated(false);
    void getPersonalOfflineData<PersistedPassport>(integration.userId, STORAGE_TYPE)
      .then(async (saved) => {
        if (!active) return;
        skipNextPersistRef.current = true;
        setState((current) => ({
          ...current,
          profile: { ...integration.profile, ...(saved?.profile ?? {}) },
          userBooks: saved?.userBooks ?? [],
          stamps: integration.stamps,
          pageId: null,
          opened: false,
        }));
        setHydrated(true);

        if (!cloudEnabled || !navigator.onLine) return;
        const { data, error } = await supabase
          .from("passport_reader_states")
          .select("profile,user_books,client_updated_at,updated_at")
          .eq("user_id", integration.userId)
          .maybeSingle();
        if (!active) return;
        if (error) {
          console.error("[Supabase] carregar cópia do passaporte da leitora:", error);
          return;
        }

        const remote = data
          ? {
              profile: data.profile && typeof data.profile === "object" ? data.profile as UserProfile : integration.profile,
              userBooks: Array.isArray(data.user_books) ? data.user_books as UserBook[] : [],
              updatedAt: data.client_updated_at || data.updated_at,
            }
          : null;
        const remoteIsNewer = remote && (!saved || timestamp(remote.updatedAt) > timestamp(saved.updatedAt));

        if (remoteIsNewer && editVersionRef.current === hydrationEditVersion) {
          const remoteState: PersistedPassport = {
            profile: { ...integration.profile, ...remote.profile },
            userBooks: remote.userBooks,
            updatedAt: remote.updatedAt,
          };
          skipNextPersistRef.current = true;
          setState((current) => ({
            ...current,
            profile: remoteState.profile,
            userBooks: remoteState.userBooks,
          }));
          await putPersonalOfflineData(integration.userId, STORAGE_TYPE, remoteState);
        } else if (saved && (!remote || timestamp(saved.updatedAt) >= timestamp(remote.updatedAt))) {
          await saveCloudCopy(integration.userId, saved);
        }
      })
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, [cloudEnabled, integration.userId, persistence]);

  useEffect(() => {
    setState((current) => ({ ...current, stamps: integration.stamps }));
  }, [integration.stamps]);

  useEffect(() => {
    if (!hydrated || !persistence) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    const payload: PersistedPassport = {
      profile: state.profile,
      userBooks: state.userBooks,
      updatedAt: new Date().toISOString(),
    };
    const localTimer = window.setTimeout(() => {
      void putPersonalOfflineData(integration.userId, STORAGE_TYPE, payload);
    }, 120);
    const cloudTimer = window.setTimeout(() => {
      if (cloudEnabled) void saveCloudCopy(integration.userId, payload);
    }, 850);
    return () => {
      window.clearTimeout(localTimer);
      window.clearTimeout(cloudTimer);
    };
  }, [cloudEnabled, hydrated, integration.userId, persistence, state.profile, state.userBooks]);

  useEffect(() => {
    if (!cloudEnabled || !persistence) return;
    const syncAfterReconnect = () => {
      const current = stateRef.current;
      const payload: PersistedPassport = {
        profile: current.profile,
        userBooks: current.userBooks,
        updatedAt: new Date().toISOString(),
      };
      void putPersonalOfflineData(integration.userId, STORAGE_TYPE, payload);
      void saveCloudCopy(integration.userId, payload);
    };
    window.addEventListener("online", syncAfterReconnect);
    return () => window.removeEventListener("online", syncAfterReconnect);
  }, [cloudEnabled, integration.userId, persistence]);

  const setStatus = useCallback(
    (bookId: string, status: BookStatus, extra?: Partial<UserBook>) => {
      editVersionRef.current += 1;
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
    editVersionRef.current += 1;
    setState((current) => ({
      ...current,
      profile: { ...current.profile, ...patch },
    }));
  }, []);

  const updateBook = useCallback((bookId: string, patch: Partial<UserBook>) => {
    editVersionRef.current += 1;
    setState((current) => ({
      ...current,
      userBooks: current.userBooks.map((book) => {
        if (book.bookId !== bookId) return book;
        if (isReaderAddedBook(book)) return { ...book, ...patch };
        const permittedPatch: Partial<UserBook> = "bought" in patch ? { bought: patch.bought } : {};
        return { ...book, ...permittedPatch };
      }),
    }));
  }, []);

  const removeBook = useCallback((bookId: string) => {
    editVersionRef.current += 1;
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
