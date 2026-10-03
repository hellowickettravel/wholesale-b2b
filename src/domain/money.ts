/**
 * Money helpers. All money is integer pence; all rates are integer basis points
 * (1% = 100 bp). See DECISIONS.md D3 for the rounding rule.
 */

export type Pence = number;
export type BasisPoints = number;

export const BP_SCALE = 10_000;

function assertInt(n: number, label: string): void {
  if (!Number.isSafeInteger(n)) {
    throw new RangeError(`${label} must be a safe integer, got ${n}`);
  }
}

/**
 * Integer division rounding half away from zero.
 * roundDiv(5, 2) = 3, roundDiv(-5, 2) = -3, roundDiv(4, 3) = 1.
 */
export function roundDiv(numerator: number, denominator: number): number {
  assertInt(numerator, "numerator");
  assertInt(denominator, "denominator");
  if (denominator === 0) throw new RangeError("division by zero");
  const sign = Math.sign(numerator) * Math.sign(denominator);
  const n = Math.abs(numerator);
  const d = Math.abs(denominator);
  const q = Math.floor(n / d);
  const r = n - q * d;
  const rounded = r * 2 >= d ? q + 1 : q;
  return sign * rounded || 0;
}

/** amount × bp / 10000, rounded half up to the penny. */
export function applyBp(amount: Pence, bp: BasisPoints): Pence {
  assertInt(amount, "amount");
  assertInt(bp, "bp");
  return roundDiv(amount * bp, BP_SCALE);
}

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

/** 123456 -> "£1,234.56" */
export function formatPence(pence: Pence): string {
  assertInt(pence, "pence");
  return gbp.format(pence / 100);
}

/** 2000 -> "20%", 1750 -> "17.5%" */
export function formatBp(bp: BasisPoints): string {
  assertInt(bp, "bp");
  const whole = bp / 100;
  return `${Number.isInteger(whole) ? whole : whole.toFixed(2).replace(/0+$/, "")}%`;
}

/**
 * Parse a user-typed pounds amount ("12", "12.5", "£1,234.56") to pence,
 * using string arithmetic only. Returns null if invalid or more than 2 decimals.
 */
export function parsePounds(input: string): Pence | null {
  const cleaned = input.trim().replace(/^£/, "").replace(/,/g, "");
  const m = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!m) return null;
  const [, neg, whole, frac = ""] = m;
  const pence = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  if (!Number.isSafeInteger(pence)) return null;
  return neg ? -pence : pence;
}

/** Parse a percentage ("15", "17.5", "-2.25%") to basis points. Max 2 decimals. */
export function parsePercent(input: string): BasisPoints | null {
  const cleaned = input.trim().replace(/%$/, "").trim();
  const m = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!m) return null;
  const [, neg, whole, frac = ""] = m;
  const bp = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  if (!Number.isSafeInteger(bp)) return null;
  return neg ? -bp : bp;
}

/** Pence to a plain decimal string for inputs: 1250 -> "12.50". */
export function penceToInput(pence: Pence): string {
  assertInt(pence, "pence");
  const sign = pence < 0 ? "-" : "";
  const abs = Math.abs(pence);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Basis points to a plain decimal string for inputs: 1750 -> "17.5". */
export function bpToInput(bp: BasisPoints): string {
  assertInt(bp, "bp");
  const sign = bp < 0 ? "-" : "";
  const abs = Math.abs(bp);
  const frac = String(abs % 100).padStart(2, "0").replace(/0+$/, "");
  return `${sign}${Math.floor(abs / 100)}${frac ? `.${frac}` : ""}`;
}
