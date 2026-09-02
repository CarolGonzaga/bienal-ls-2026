import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ImagePlus,
  List,
  MapPin,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { LOCAL_AUTHOR_EXHIBITORS } from "../../data/localAuthorScenarios";
import { optimizePassportPhoto } from "../../utils/optimizeImage";

const EVENT_START = "2026-09-04";
const EVENT_END = "2026-09-13";
const PASSPORT_BOOK_LIMIT = 3;
const BOOK_SYNOPSIS_MAX_LENGTH = 2000;
const newPresence = () => ({
  presence_date: "",
  start_time: "",
  end_time: "",
  exhibitor_id: "",
  stand_code: "",
  notes: "",
  guaranteed: true,
});
const newBook = () => ({
  title: "",
  publisher: "",
  cover_url: "",
  synopsis: "",
  genre: "",
  tags: "",
  featured: false,
  autograph_available: false,
  available_for_sale: false,
  exhibitor_id: "",
  stand_code: "",
});
const newAutograph = () => ({
  event_date: "",
  start_time: "",
  end_time: "",
  exhibitor_id: "",
  stand_code: "",
  books: "",
  notes: "",
});
const labels = { presence: "Presença na Bienal", book: "Livro", autograph: "Sessão de autógrafos" };
const statuses = {
  draft: "Rascunho",
  pending: "Em revisão",
  approved: "Aprovada",
  rejected: "Precisa de ajuste",
};
const emptyExisting = { presences: [], books: [], events: [] };

const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
const placeKey = (row) => normalize(row.exhibitor_id || row.stand_code || row.location_text);
const presenceKey = (row) =>
  [
    "presence",
    row.presence_date || row.date,
    String(row.start_time || "").slice(0, 5),
    placeKey(row),
  ].join("|");
const autographKey = (row) =>
  [
    "autograph",
    row.event_date || row.date,
    String(row.start_time || "").slice(0, 5),
    placeKey(row),
  ].join("|");
const bookKey = (row) => normalize(row.title);
const formatDate = (value) =>
  value ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR") : "Data a confirmar";

const Input = ({ label, value, onChange, type = "text", required = false, ...props }) => (
  <label className="block text-xs font-bold">
    {label}
    {required ? " *" : ""}
    <input
      type={type}
      required={required}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="auth-input mt-1 w-full rounded-xl border p-3 text-sm"
      {...props}
    />
  </label>
);

const SelectStand = ({ exhibitors, item, setItem }) => (
  <label className="block text-xs font-bold">
    Estande de venda
    <select
      value={item.exhibitor_id}
      onChange={(event) => {
        const stand = exhibitors.find((option) => option.id === event.target.value);
        setItem({ ...item, exhibitor_id: event.target.value, stand_code: stand?.stand_code || "" });
      }}
      className="auth-input mt-1 w-full rounded-xl border p-3 text-sm"
    >
      <option value="">Selecione…</option>
      {exhibitors.map((option) => (
        <option key={option.id} value={option.id}>
          {option.stand_code} — {option.name}
        </option>
      ))}
    </select>
  </label>
);

function ExistingContentModal({ existing, exhibitors, onClose, onEdit }) {
  const exhibitorName = (row) =>
    exhibitors.find((item) => item.id === row.exhibitor_id)?.name ||
    row.stand_code ||
    row.location_text ||
    "Local a confirmar";
  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-center bg-[#260d21]/75 p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Conteúdo já cadastrado"
    >
      <section className="auth-card relative max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-3xl border p-5 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar conteúdo cadastrado"
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-full border bg-white/90 text-[#8a3a63]"
        >
          <X size={18} />
        </button>
        <h2 className="pr-12 text-xl font-black">Conteúdo já vinculado ao seu perfil</h2>
        <p className="mt-1 text-xs opacity-70">
          Estes registros já estão no banco. Você pode corrigir as informações; toda alteração será
          revisada antes de aparecer no site.
        </p>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <section>
            <h3 className="flex items-center gap-2 text-sm font-black">
              <MapPin size={16} />
              Presenças ({existing.presences.length})
            </h3>
            <div className="mt-2 grid gap-2">
              {existing.presences.map((item) => (
                <article key={item.id} className="rounded-xl border p-3 text-xs">
                  <strong>
                    {formatDate(item.presence_date)} · {String(item.start_time || "").slice(0, 5)}
                  </strong>
                  <p className="mt-1 opacity-70">{exhibitorName(item)}</p>
                  <button
                    type="button"
                    onClick={() => onEdit("presence", item)}
                    className="mt-2 flex items-center gap-1 font-black text-[#a93773]"
                  >
                    <Pencil size={13} />
                    Editar
                  </button>
                </article>
              ))}
              {!existing.presences.length && (
                <p className="text-xs opacity-55">Nenhuma presença vinculada.</p>
              )}
            </div>
          </section>
          <section>
            <h3 className="flex items-center gap-2 text-sm font-black">
              <CalendarDays size={16} />
              Autógrafos ({existing.events.length})
            </h3>
            <div className="mt-2 grid gap-2">
              {existing.events.map((item) => (
                <article key={item.id} className="rounded-xl border p-3 text-xs">
                  <strong>
                    {formatDate(item.event_date)} · {String(item.start_time || "").slice(0, 5)}
                  </strong>
                  <p className="mt-1 opacity-70">{exhibitorName(item)}</p>
                  {item.books?.length > 0 && <p className="mt-1">{item.books.join(", ")}</p>}
                  <button
                    type="button"
                    onClick={() => onEdit("autograph", item)}
                    className="mt-2 flex items-center gap-1 font-black text-[#a93773]"
                  >
                    <Pencil size={13} />
                    Editar
                  </button>
                </article>
              ))}
              {!existing.events.length && (
                <p className="text-xs opacity-55">Nenhuma sessão vinculada.</p>
              )}
            </div>
          </section>
          <section>
            <h3 className="flex items-center gap-2 text-sm font-black">
              <BookOpen size={16} />
              Livros ({existing.books.length})
            </h3>
            <div className="mt-2 grid gap-2">
              {existing.books.map((item) => (
                <article key={item.id} className="flex gap-2 rounded-xl border p-3 text-xs">
                  {item.cover_url && (
                    <img src={item.cover_url} alt="" className="h-16 w-11 rounded object-cover" />
                  )}
                  <div className="min-w-0">
                    <strong>{item.title}</strong>
                    <p className="mt-1 opacity-70">{item.publisher || "Editora não informada"}</p>
                    <button
                      type="button"
                      onClick={() => onEdit("book", item)}
                      className="mt-2 flex items-center gap-1 font-black text-[#a93773]"
                    >
                      <Pencil size={13} />
                      Editar
                    </button>
                  </div>
                </article>
              ))}
              {!existing.books.length && (
                <p className="text-xs opacity-55">Nenhum livro vinculado.</p>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

export default function AuthorContentRequests({
  authorId,
  notice,
  agendaOnly = false,
  localScenario = null,
  passportRequestStatus = "",
  passportRequestUpdatedAt = "",
}) {
  const [exhibitors, setExhibitors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [existing, setExisting] = useState(emptyExisting);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [kind, setKind] = useState("presence");
  const [presence, setPresence] = useState(newPresence());
  const [bookItems, setBookItems] = useState([newBook()]);
  const [autograph, setAutograph] = useState(newAutograph());
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState(-1);
  const activeKind = agendaOnly && kind === "book" ? "presence" : kind;
  const pendingBooks = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.request_type === "book" && ["draft", "pending"].includes(request.status),
      ),
    [requests],
  );
  const pendingBookCount = pendingBooks.length;
  const projectedFeaturedCount = useMemo(() => {
    const featured = new Set(existing.books.filter((book) => book.featured).map((book) => book.id));
    [...pendingBooks].reverse().forEach((request) => {
      const payload = request.payload || {};
      if (payload.operation === "update" && payload.target_id) {
        if (payload.featured) featured.add(payload.target_id);
        else featured.delete(payload.target_id);
      } else if (payload.featured) featured.add(`request:${request.id}`);
    });
    return featured.size;
  }, [existing.books, pendingBooks]);
  const featuredSlots = Math.max(0, PASSPORT_BOOK_LIMIT - projectedFeaturedCount);

  const load = async () => {
    if (localScenario) {
      setExhibitors(LOCAL_AUTHOR_EXHIBITORS);
      setRequests(localScenario.existingRequests || []);
      setExisting(emptyExisting);
      return;
    }
    const [stands, history, presences, authorBooks, eventAuthors, availability] = await Promise.all(
      [
        supabase
          .from("exhibitors")
          .select("id,name,stand_code")
          .eq("active", true)
          .is("deleted_at", null)
          .order("stand_code"),
        supabase
          .from("author_change_requests")
          .select("id,request_type,payload,status,created_at")
          .eq("author_id", authorId)
          .in("request_type", ["presence", "book", "autograph"])
          .order("created_at", { ascending: false }),
        supabase
          .from("author_presences")
          .select(
            "id,presence_date,start_time,end_time,exhibitor_id,stand_code,notes,guaranteed,status",
          )
          .eq("author_id", authorId)
          .is("deleted_at", null)
          .order("presence_date")
          .order("start_time"),
        supabase
          .from("author_books")
          .select("book_id,featured,display_order")
          .eq("author_id", authorId)
          .is("deleted_at", null),
        supabase.from("event_authors").select("event_id").eq("author_id", authorId),
        supabase
          .from("book_stand_availability")
          .select("book_id,exhibitor_id,stand_code,available_for_sale")
          .eq("author_id", authorId)
          .is("deleted_at", null),
      ],
    );
    const bookIds = (authorBooks.data || []).map((item) => item.book_id);
    const eventIds = (eventAuthors.data || []).map((item) => item.event_id);
    const [bookRows, eventRows] = await Promise.all([
      bookIds.length
        ? supabase
            .from("books")
            .select("id,title,publisher,cover_url,genre,notes,tags,autograph_available")
            .in("id", bookIds)
            .is("deleted_at", null)
            .order("title")
        : Promise.resolve({ data: [], error: null }),
      eventIds.length
        ? supabase
            .from("events")
            .select(
              "id,event_type,event_date,start_time,end_time,exhibitor_id,stand_code,location_text,books,notes",
            )
            .in("id", eventIds)
            .eq("event_type", "autograph")
            .is("deleted_at", null)
            .order("event_date")
            .order("start_time")
        : Promise.resolve({ data: [], error: null }),
    ]);
    const error =
      stands.error ||
      history.error ||
      presences.error ||
      authorBooks.error ||
      eventAuthors.error ||
      availability.error ||
      bookRows.error ||
      eventRows.error;
    if (error) notice(`Não foi possível carregar todo o conteúdo já cadastrado: ${error.message}`);
    setExhibitors(stands.data || []);
    setRequests(history.data || []);
    const linksByBook = new Map((authorBooks.data || []).map((item) => [item.book_id, item]));
    const saleByBook = new Map((availability.data || []).map((item) => [item.book_id, item]));
    const hydratedBooks = (bookRows.data || []).map((book) => ({
      ...book,
      ...linksByBook.get(book.id),
      ...saleByBook.get(book.id),
    }));
    setExisting({
      presences: presences.data || [],
      books: hydratedBooks,
      events: eventRows.data || [],
    });
  };

  useEffect(() => {
    void load();
  }, [authorId, localScenario]);

  const knownKeys = useMemo(() => {
    const activeRequests = requests.filter((request) => request.status !== "rejected");
    return {
      presence: new Set([
        ...existing.presences.map(presenceKey),
        ...activeRequests
          .filter((request) => request.request_type === "presence")
          .map((request) => presenceKey(request.payload || {})),
      ]),
      autograph: new Set([
        ...existing.events.map(autographKey),
        ...activeRequests
          .filter((request) => request.request_type === "autograph")
          .map((request) => autographKey(request.payload || {})),
      ]),
      book: new Set([
        ...existing.books.map(bookKey),
        ...activeRequests
          .filter((request) => request.request_type === "book")
          .map((request) => bookKey(request.payload || {})),
      ]),
    };
  }, [existing, requests]);

  const editExisting = (editKind, item) => {
    setEditing({ kind: editKind, id: item.id });
    setKind(editKind);
    if (editKind === "presence") {
      setPresence({
        presence_date: item.presence_date || "",
        start_time: String(item.start_time || "").slice(0, 5),
        end_time: String(item.end_time || "").slice(0, 5),
        exhibitor_id: item.exhibitor_id || "",
        stand_code: item.stand_code || "",
        notes: item.notes || "",
        guaranteed: item.guaranteed !== false,
      });
    } else if (editKind === "autograph") {
      setAutograph({
        event_date: item.event_date || "",
        start_time: String(item.start_time || "").slice(0, 5),
        end_time: String(item.end_time || "").slice(0, 5),
        exhibitor_id: item.exhibitor_id || "",
        stand_code: item.stand_code || "",
        books: Array.isArray(item.books) ? item.books.join(", ") : "",
        notes: item.notes || "",
      });
    } else {
      setBookItems([
        {
          ...newBook(),
          title: item.title || "",
          publisher: item.publisher || "",
          cover_url: item.cover_url || "",
          synopsis: item.notes || "",
          genre: item.genre || "",
          tags: Array.isArray(item.tags) ? item.tags.join(", ") : "",
          featured: Boolean(item.featured),
          autograph_available: Boolean(item.autograph_available),
          available_for_sale: Boolean(item.available_for_sale),
          exhibitor_id: item.exhibitor_id || "",
          stand_code: item.stand_code || "",
        },
      ]);
    }
    setCatalogOpen(false);
  };

  const cancelEditing = () => {
    setEditing(null);
    setPresence(newPresence());
    setAutograph(newAutograph());
    setBookItems([newBook()]);
  };

  const submitOne = async (requestType, payload) => {
    if (localScenario) {
      setRequests((current) => [
        {
          id: `local-${Date.now()}-${Math.random()}`,
          request_type: requestType,
          payload,
          status: "pending",
        },
        ...current,
      ]);
      return null;
    }
    return supabase.rpc("submit_author_content_request", {
      p_request_type: requestType,
      p_payload: payload,
    });
  };

  const uploadBookCover = async (file, index) => {
    if (!file) return;
    setUploadingIndex(index);
    try {
      const optimized = await optimizePassportPhoto(file);
      if (localScenario) {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(optimized.blob);
        });
        setBookItems((items) =>
          items.map((item, itemIndex) =>
            itemIndex === index ? { ...item, cover_url: dataUrl } : item,
          ),
        );
      } else {
        const path = `${authorId}/books/${crypto.randomUUID()}.webp`;
        const { error } = await supabase.storage
          .from("passport-book-covers")
          .upload(path, optimized.blob, {
            upsert: false,
            contentType: optimized.mime,
            cacheControl: "31536000",
          });
        if (error) throw error;
        const publicUrl = supabase.storage.from("passport-book-covers").getPublicUrl(path)
          .data.publicUrl;
        setBookItems((items) =>
          items.map((item, itemIndex) =>
            itemIndex === index ? { ...item, cover_url: publicUrl } : item,
          ),
        );
      }
    } catch (error) {
      notice(error instanceof Error ? error.message : "Não foi possível enviar a capa.");
    } finally {
      setUploadingIndex(-1);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const editMetadata = editing ? { operation: "update", target_id: editing.id } : {};
    const payloads =
      activeKind === "presence"
        ? [{ ...presence, ...editMetadata }]
        : activeKind === "autograph"
          ? [
              {
                ...autograph,
                books: autograph.books
                  .split(",")
                  .map((value) => value.trim())
                  .filter(Boolean),
                ...editMetadata,
              },
            ]
          : bookItems
              .filter((book) => book.title.trim())
              .map((book) => ({
                ...book,
                notes: book.synopsis,
                tags: [book.genre, ...book.tags.split(",")]
                  .map((value) => value.trim())
                  .filter(Boolean),
                ...editMetadata,
              }));
    if (activeKind === "book") {
      const currentBookIsFeatured = Boolean(
        editing && existing.books.find((book) => book.id === editing.id)?.featured,
      );
      const requestedFeaturedSlots =
        payloads.filter((payload) => payload.featured).length -
        (currentBookIsFeatured && payloads[0]?.featured ? 1 : 0);
      if (requestedFeaturedSlots > featuredSlots)
        return notice(
          `Você pode destacar no máximo ${PASSPORT_BOOK_LIMIT} livros no Passaporte. Desmarque outro destaque antes de adicionar um novo.`,
        );
    }
    if (!payloads.length) return notice("Adicione pelo menos um livro com título.");
    const duplicate =
      !editing &&
      payloads.find((payload) =>
        knownKeys[activeKind].has(
          activeKind === "presence"
            ? presenceKey(payload)
            : activeKind === "autograph"
              ? autographKey(payload)
              : bookKey(payload),
        ),
      );
    if (duplicate)
      return notice(
        activeKind === "book"
          ? `O livro “${duplicate.title}” já está cadastrado ou em revisão.`
          : "Este evento já está cadastrado ou aguardando revisão. Consulte “Ver conteúdo cadastrado”.",
      );
    setSaving(true);
    const results = await Promise.all(payloads.map((payload) => submitOne(activeKind, payload)));
    const error = results.find((result) => result?.error)?.error;
    setSaving(false);
    if (error) return notice(error.message);
    notice(
      localScenario
        ? "Simulação: informações enviadas para revisão local."
        : editing
          ? "Alteração enviada para aprovação."
          : `${payloads.length} registro(s) enviado(s) para aprovação.`,
    );
    if (activeKind === "presence") setPresence(newPresence());
    if (activeKind === "autograph") setAutograph(newAutograph());
    if (activeKind === "book") setBookItems([newBook()]);
    setEditing(null);
    void load();
  };

  const options = agendaOnly
    ? [
        ["presence", "Presença", MapPin],
        ["autograph", "Autógrafo", CalendarDays],
      ]
    : [
        ["presence", "Presença", MapPin],
        ["book", "Livros", BookOpen],
        ["autograph", "Autógrafo", CalendarDays],
      ];
  const history = [
    ...(passportRequestStatus
      ? [
          {
            id: "passport-profile",
            request_type: "profile",
            status: passportRequestStatus,
            created_at: passportRequestUpdatedAt,
          },
        ]
      : []),
    ...requests,
  ];

  return (
    <section className="auth-card mt-5 rounded-3xl border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">
            {agendaOnly ? "Minha agenda na Bienal" : "Presença, livros e agenda"}
          </h2>
          <p className="mt-1 text-xs opacity-70">
            Tudo é enviado para revisão antes de aparecer no Mapa e no Passaporte.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCatalogOpen(true)}
          className="auth-input flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black"
        >
          <List size={16} />
          Ver conteúdo cadastrado
        </button>
      </div>
      {editing && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#d43276]/25 bg-[#fff0f6] p-3 text-xs text-[#7b3a60]">
          <strong>
            Editando {labels[editing.kind]?.toLowerCase()}. A alteração será enviada para revisão.
          </strong>
          <button type="button" onClick={cancelEditing} className="font-black underline">
            Cancelar
          </button>
        </div>
      )}
      <div className={`mt-4 grid gap-2 ${agendaOnly ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        {options.map(([id, label, Icon]) => (
          <button
            type="button"
            key={id}
            onClick={() => {
              if (editing && editing.kind !== id) cancelEditing();
              setKind(id);
            }}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-black ${activeKind === id ? "bg-[#d43276] text-white" : "auth-input"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
      <form className="mt-4 grid gap-3" onSubmit={submit}>
        {activeKind === "presence" && (
          <>
            <Input
              label="Data"
              type="date"
              required
              min={EVENT_START}
              max={EVENT_END}
              value={presence.presence_date}
              onChange={(value) => setPresence({ ...presence, presence_date: value })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Horário inicial"
                type="time"
                required
                value={presence.start_time}
                onChange={(value) => setPresence({ ...presence, start_time: value })}
              />
              <Input
                label="Horário final"
                type="time"
                value={presence.end_time}
                onChange={(value) => setPresence({ ...presence, end_time: value })}
              />
            </div>
            <SelectStand exhibitors={exhibitors} item={presence} setItem={setPresence} />
            <label className="text-xs font-bold">
              Observação
              <textarea
                value={presence.notes}
                onChange={(event) => setPresence({ ...presence, notes: event.target.value })}
                className="auth-input mt-1 h-20 w-full rounded-xl border p-3 text-sm"
              />
            </label>
            <label className="flex gap-2 text-xs font-bold">
              <input
                type="checkbox"
                checked={presence.guaranteed}
                onChange={(event) => setPresence({ ...presence, guaranteed: event.target.checked })}
              />
              Este horário está garantido.
            </label>
          </>
        )}
        {activeKind === "book" && (
          <>
            <p className="text-xs font-bold text-[#8a3a63]">
              {existing.books.length} cadastrado(s) · {pendingBookCount} em revisão ·{" "}
              {featuredSlots} de {PASSPORT_BOOK_LIMIT} destaque(s) disponível(is)
            </p>
            {bookItems.map((book, index) => (
              <fieldset key={index} className="grid gap-3 rounded-2xl border border-[#edcddd] p-4">
                <legend className="px-1 text-sm font-black">
                  {editing ? "Editar livro" : `Livro ${index + 1}`}
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Título"
                    required
                    value={book.title}
                    onChange={(value) =>
                      setBookItems((items) =>
                        items.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, title: value } : item,
                        ),
                      )
                    }
                  />
                  <Input
                    label="Editora"
                    value={book.publisher}
                    onChange={(value) =>
                      setBookItems((items) =>
                        items.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, publisher: value } : item,
                        ),
                      )
                    }
                  />
                </div>
                <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Input
                    label="Imagem da capa (URL opcional)"
                    type="url"
                    value={
                      String(book.cover_url || "").startsWith("data:") ? "" : book.cover_url || ""
                    }
                    onChange={(value) =>
                      setBookItems((items) =>
                        items.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, cover_url: value } : item,
                        ),
                      )
                    }
                    placeholder="https://…"
                  />
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#d43276]/35 px-3 py-3 text-xs font-black text-[#a93773]">
                    <ImagePlus size={16} />
                    {uploadingIndex === index ? "Enviando…" : "Enviar imagem"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploadingIndex >= 0}
                      className="sr-only"
                      onChange={(event) => {
                        void uploadBookCover(event.target.files?.[0], index);
                        event.target.value = "";
                      }}
                    />
                  </label>
                </div>
                {book.cover_url && (
                  <img
                    src={book.cover_url}
                    alt={`Prévia da capa de ${book.title || `livro ${index + 1}`}`}
                    className="h-36 w-24 rounded-md object-cover shadow"
                  />
                )}
                <Input
                  label="Gênero"
                  value={book.genre}
                  onChange={(value) =>
                    setBookItems((items) =>
                      items.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, genre: value } : item,
                      ),
                    )
                  }
                  placeholder="Ex.: romance sáfico"
                />
                <Input
                  label="Tags separadas por vírgula"
                  value={book.tags}
                  onChange={(value) =>
                    setBookItems((items) =>
                      items.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, tags: value } : item,
                      ),
                    )
                  }
                />
                <label className="text-xs font-bold">
                  Sinopse{" "}
                  <span className="font-normal opacity-55">
                    ({book.synopsis.length}/{BOOK_SYNOPSIS_MAX_LENGTH})
                  </span>
                  <textarea
                    maxLength={BOOK_SYNOPSIS_MAX_LENGTH}
                    value={book.synopsis}
                    onChange={(event) =>
                      setBookItems((items) =>
                        items.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, synopsis: event.target.value } : item,
                        ),
                      )
                    }
                    className="auth-input mt-1 h-24 w-full rounded-xl border p-3 text-sm"
                  />
                </label>
                <div className="flex flex-wrap gap-4 text-xs font-bold">
                  <label className="flex gap-2">
                    <input
                      type="checkbox"
                      checked={book.autograph_available}
                      onChange={(event) =>
                        setBookItems((items) =>
                          items.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, autograph_available: event.target.checked }
                              : item,
                          ),
                        )
                      }
                    />
                    Disponível para autógrafo
                  </label>
                  <label className="flex gap-2">
                    <input
                      type="checkbox"
                      checked={book.available_for_sale}
                      onChange={(event) =>
                        setBookItems((items) =>
                          items.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, available_for_sale: event.target.checked }
                              : item,
                          ),
                        )
                      }
                    />
                    À venda na Bienal
                  </label>
                </div>
                {book.available_for_sale && (
                  <SelectStand
                    exhibitors={exhibitors}
                    item={book}
                    setItem={(next) =>
                      setBookItems((items) =>
                        items.map((item, itemIndex) => (itemIndex === index ? next : item)),
                      )
                    }
                  />
                )}
                <label className="flex gap-2 text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={book.featured}
                    disabled={
                      !book.featured &&
                      !(editing && existing.books.find((item) => item.id === editing.id)?.featured) &&
                      bookItems.filter((item) => item.featured).length >= featuredSlots
                    }
                    onChange={(event) =>
                      setBookItems((items) =>
                        items.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, featured: event.target.checked } : item,
                        ),
                      )
                    }
                  />
                  Destacar no Passaporte
                </label>
                {bookItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setBookItems((items) => items.filter((_, itemIndex) => itemIndex !== index))
                    }
                    className="flex w-fit items-center gap-1 text-xs font-bold text-rose-600"
                  >
                    <Trash2 size={14} />
                    Remover livro
                  </button>
                )}
              </fieldset>
            ))}
            {!editing && (
              <button
                type="button"
                onClick={() => setBookItems((items) => [...items, newBook()])}
                className="flex w-fit items-center gap-1 text-sm font-black text-[#a93773]"
              >
                <Plus size={16} />
                Adicionar outro livro
              </button>
            )}
          </>
        )}
        {activeKind === "autograph" && (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                label="Data"
                type="date"
                required
                min={EVENT_START}
                max={EVENT_END}
                value={autograph.event_date}
                onChange={(value) => setAutograph({ ...autograph, event_date: value })}
              />
              <Input
                label="Horário inicial"
                type="time"
                required
                value={autograph.start_time}
                onChange={(value) => setAutograph({ ...autograph, start_time: value })}
              />
              <Input
                label="Horário final"
                type="time"
                value={autograph.end_time}
                onChange={(value) => setAutograph({ ...autograph, end_time: value })}
              />
            </div>
            <SelectStand exhibitors={exhibitors} item={autograph} setItem={setAutograph} />
            <Input
              label="Livros (separados por vírgula)"
              value={autograph.books}
              onChange={(value) => setAutograph({ ...autograph, books: value })}
            />
            <label className="text-xs font-bold">
              Observações
              <textarea
                value={autograph.notes}
                onChange={(event) => setAutograph({ ...autograph, notes: event.target.value })}
                className="auth-input mt-1 h-20 w-full rounded-xl border p-3 text-sm"
              />
            </label>
          </>
        )}
        <button
          disabled={saving || uploadingIndex >= 0}
          className="route-primary-button mt-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {saving ? "Enviando…" : editing ? "Enviar alteração para revisão" : "Enviar para revisão"}
        </button>
      </form>
      <div className="mt-5 border-t pt-4">
        <h3 className="text-xs font-black uppercase tracking-wide">Solicitações enviadas</h3>
        {history.slice(0, 6).map((request) => (
          <div
            key={request.id}
            className="mt-2 flex items-center justify-between rounded-xl bg-black/5 p-3 text-xs"
          >
            <strong>
              {request.request_type === "profile"
                ? "Perfil do Passaporte"
                : labels[request.request_type] || "Informação enviada"}
            </strong>
            <span>{statuses[request.status] || request.status}</span>
          </div>
        ))}
        {!history.length && (
          <p className="mt-2 text-xs opacity-60">Nenhuma solicitação enviada ainda.</p>
        )}
      </div>
      {catalogOpen && (
        <ExistingContentModal
          existing={existing}
          exhibitors={exhibitors}
          onClose={() => setCatalogOpen(false)}
          onEdit={editExisting}
        />
      )}
    </section>
  );
}
