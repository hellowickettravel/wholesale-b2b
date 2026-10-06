/**
 * Single source of brand identity. To re-skin for another client:
 *   1. edit this file,
 *   2. edit colour/font tokens in src/app/tokens.css,
 *   3. drop logo files into /public/brand/ and set `logo` below.
 * Nothing else in the codebase should hard-code the business name or colours.
 *
 * PLACEHOLDER: /brand/ was empty at kickoff, so this is a neutral working identity.
 */
export const brand = {
  /** Short trading name shown in headers, emails, titles. */
  name: "Order Desk",
  /** Wordmark split for the two-tone text logo when no image logo is supplied. */
  wordmark: { lead: "Order", tail: "Desk" },
  /** Legal entity for invoices. CLIENT CONTENT: replace. */
  legalName: "[Client legal name Ltd]",
  tagline: "Wholesale groceries for restaurants, delivered by trusted UK suppliers.",
  description:
    "Trade ordering for restaurants: rice, dal, spices, tea, sauces, drinks and packaging at your own agreed prices.",
  /** Image logo for header/PDF. null = text wordmark. PDF needs PNG/JPG. */
  logo: null as null | { src: string; pdfSrc: string; width: number; height: number; alt: string },
  /** Hex values used where CSS variables cannot reach (PDF invoices, emails). Keep in sync with tokens.css. */
  colors: {
    primary: "#2F4A2B",
    primaryInk: "#FFFBF1",
    accent: "#E3A413",
    /** Chilli: the wordmark tail on light paper (turmeric on white fails contrast). */
    mark: "#A82A1C",
    ink: "#2A1C14",
    muted: "#5E4938",
    surface: "#F6EEDD",
    line: "#E1D3B5",
  },
  email: {
    fromName: "Order Desk",
  },
  locale: "en-GB",
  currency: "GBP",
} as const;

export type Brand = typeof brand;
