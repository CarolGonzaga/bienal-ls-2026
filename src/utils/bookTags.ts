export const normalizeBookTag = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");

export const dedupeBookTags = (genre: unknown, tags: unknown): string[] => {
  const genreKey = normalizeBookTag(genre);
  const seen = new Set<string>();
  return (Array.isArray(tags) ? tags : [])
    .map((tag) => String(tag ?? "").trim())
    .filter((tag) => {
      const key = normalizeBookTag(tag);
      if (!key || key === genreKey || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};
