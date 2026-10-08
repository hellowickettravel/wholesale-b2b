/**
 * Reading admin list filters from the URL. Pure and forgiving: anything malformed becomes "not set".
 */
export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/** Free-text search, trimmed and capped. */
export function textParam(sp: SearchParamsRecord, key = "q"): string {
  return one(sp[key]).replace(/\s+/g, " ").trim().slice(0, 100);
}

/** A yyyy-mm-dd date that exists on the calendar, else "". */
export function dateParam(sp: SearchParamsRecord, key: string): string {
  const v = one(sp[key]);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return "";
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v ? "" : v;
}

/** One of the allowed values, else the first (the default). */
export function choiceParam<T extends string>(sp: SearchParamsRecord, key: string, allowed: readonly T[]): T {
  const v = one(sp[key]);
  return (allowed as readonly string[]).includes(v) ? (v as T) : allowed[0];
}

export function pageParam(sp: SearchParamsRecord): number {
  return Math.max(1, Math.min(1000, Number.parseInt(one(sp.page), 10) || 1));
}

/** Build `${base}?…`, dropping empty values and page 1. */
export function listHref(base: string, params: Record<string, string | number | undefined | null>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (k === "page" && Number(v) <= 1) continue;
    u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `${base}?${s}` : base;
}

/** Day bounds (UTC, as the orders list does) for gte/lte on timestamptz columns. */
export function dayRange(from: string, to: string): { gte?: string; lte?: string } {
  return { gte: from ? `${from}T00:00:00Z` : undefined, lte: to ? `${to}T23:59:59.999Z` : undefined };
}
