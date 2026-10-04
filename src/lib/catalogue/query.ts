/**
 * Parsing of public catalogue URL parameters (?category=&q=&page=). Pure, unit-tested.
 * Anything malformed falls back to a safe default instead of erroring.
 */

export const CATALOGUE_PAGE_SIZE = 24;
const MAX_WORDS = 6;
const MAX_WORD_LENGTH = 40;

export interface CatalogueQuery {
  category: string | null;
  q: string;
  words: string[];
  page: number;
}

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export function parseCatalogueQuery(params: Record<string, string | string[] | undefined>): CatalogueQuery {
  const rawCategory = first(params.category).trim().toLowerCase();
  const category = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(rawCategory) && rawCategory.length <= 80 ? rawCategory : null;
  const q = first(params.q).replace(/\s+/g, " ").trim().slice(0, 100);
  const words = searchWords(q);
  const n = Number.parseInt(first(params.page), 10);
  const page = Number.isFinite(n) && n >= 1 && n <= 1000 ? n : 1;
  return { category, q, words, page };
}

/** Split a search into words; each must appear in the product name (any order). */
export function searchWords(q: string): string[] {
  const seen = new Set<string>();
  for (const w of q.toLowerCase().split(/[^\p{L}\p{N}.&'-]+/u)) {
    const word = w.replace(/^[.&'-]+|[.&'-]+$/g, "").slice(0, MAX_WORD_LENGTH);
    if (word) seen.add(word);
    if (seen.size >= MAX_WORDS) break;
  }
  return [...seen];
}

/** Escape LIKE wildcards so user input matches literally inside %…%. */
export function likePattern(word: string): string {
  return `%${word.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/** Build a catalogue URL (public /catalogue or the restaurant's /shop), dropping empty params and page 1. */
export function catalogueHref(q: { category?: string | null; q?: string; page?: number }, base: "/catalogue" | "/shop" = "/catalogue"): string {
  const sp = new URLSearchParams();
  if (q.category) sp.set("category", q.category);
  if (q.q) sp.set("q", q.q);
  if (q.page && q.page > 1) sp.set("page", String(q.page));
  const s = sp.toString();
  return s ? `${base}?${s}` : base;
}

/** "1 kg", "5 kg", "20 kg" -> "1 kg – 20 kg"; one size -> that size; none -> null. */
export function sizeRange(sizes: string[]): string | null {
  if (sizes.length === 0) return null;
  if (sizes.length === 1) return sizes[0];
  return `${sizes[0]} – ${sizes[sizes.length - 1]}`;
}

/** In-memory version of the catalogue search: every word must appear in the name. */
export function matchesWords(name: string, words: string[]): boolean {
  const n = name.toLowerCase();
  return words.every((w) => n.includes(w));
}
