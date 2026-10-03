/**
 * Calendar helpers. Business dates are plain ISO "YYYY-MM-DD" strings interpreted in
 * Europe/London, so they never shift with server timezone (Vercel runs in UTC).
 */
export const BUSINESS_TZ = "Europe/London";

/** 0 = Sunday … 6 = Saturday (JS convention). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const DEFAULT_DELIVERY_DAYS: Weekday[] = [1, 2, 3, 4, 5, 6];

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(s: string): boolean {
  const m = ISO.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

/** Today's date in London as YYYY-MM-DD. */
export function todayInLondon(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function toUtc(iso: string): Date {
  if (!isIsoDate(iso)) throw new RangeError(`invalid ISO date ${iso}`);
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = toUtc(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

export function weekdayOf(iso: string): Weekday {
  return toUtc(iso).getUTCDay() as Weekday;
}

export function compareIso(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86_400_000);
}

/**
 * Next `count` deliverable dates, starting the day after `today` (no same-day delivery),
 * on allowed weekdays.
 */
export function deliveryDateOptions(
  today: string,
  deliveryDays: Weekday[],
  count = 14,
  leadDays = 1,
): string[] {
  if (deliveryDays.length === 0) return [];
  const out: string[] = [];
  let d = addDays(today, leadDays);
  for (let guard = 0; out.length < count && guard < 366; guard++, d = addDays(d, 1)) {
    if (deliveryDays.includes(weekdayOf(d))) out.push(d);
  }
  return out;
}

export function isDeliverable(date: string, today: string, deliveryDays: Weekday[], leadDays = 1): boolean {
  return (
    isIsoDate(date) &&
    compareIso(date, addDays(today, leadDays)) >= 0 &&
    compareIso(date, addDays(today, 90)) <= 0 &&
    deliveryDays.includes(weekdayOf(date))
  );
}

/** "6 Oct" (adds year if not the current London year). */
export function formatShortDate(iso: string, today: string = todayInLondon()): string {
  const d = toUtc(iso);
  const sameYear = iso.slice(0, 4) === today.slice(0, 4);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "UTC",
  }).format(d);
}

/** "Tue 6 Oct" */
export function formatDayDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(toUtc(iso));
}

/** Timestamp (ISO with time) → "6 Oct, 14:05" in London. */
export function formatTimestamp(ts: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: BUSINESS_TZ,
  }).format(typeof ts === "string" ? new Date(ts) : ts);
}

export type PaymentTerms = "on_delivery" | "7_days" | "date";

/** The date the customer promised to pay, from their checkout choice. */
export function promisedPayDate(terms: PaymentTerms, deliveryDate: string, chosen?: string): string {
  switch (terms) {
    case "on_delivery":
      return deliveryDate;
    case "7_days":
      return addDays(deliveryDate, 7);
    case "date":
      if (!chosen || !isIsoDate(chosen)) throw new RangeError("a pay date is required");
      return chosen;
  }
}
