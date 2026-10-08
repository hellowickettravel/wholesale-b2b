/**
 * Single source of brand identity. To re-skin for another client:
 *   1. edit this file,
 *   2. edit colour/font tokens in src/app/tokens.css,
 *   3. drop logo files into /public/brand/ and set `logo` below.
 * Nothing else in the codebase should hard-code the business name or colours.
 *
 * Wholesale Street (owner's instruction, 8 Oct 2026). Logo: src/components/brand/logo.tsx (SVG).
 */
export const brand = {
  /** Short trading name shown in headers, emails, titles. */
  name: "Wholesale Street",
  /** Wordmark split for the two-tone text logo. */
  wordmark: { lead: "Wholesale", tail: "Street" },
  /** The registered company that trades under this name (footer, invoices). */
  legalName: "Home High Street Limited",
  companyNumber: "17102079",
  /** "Wholesale Street is a trading name of …" line for the footer and invoices. */
  tradingAs: "Wholesale Street is a trading name of Home High Street Limited, registered in England and Wales, company number 17102079.",
  domain: "wholesalestreet.co.uk",
  siteUrl: "https://wholesalestreet.co.uk",
  tagline: "Restaurant wholesale, made simple.",
  description:
    "Wholesale Street is the trade ordering portal for UK restaurants and caterers: rice, dal, spices, flours, sauces, drinks and packaging at your own account prices, delivered to your kitchen.",
  /** Image logo for header/PDF. null = the built-in SVG mark + text wordmark. PDF needs PNG/JPG. */
  logo: null as null | { src: string; pdfSrc: string; width: number; height: number; alt: string },
  /** Hex values used where CSS variables cannot reach (PDF invoices, emails). Keep in sync with tokens.css. */
  colors: {
    primary: "#0B2A5B",
    primaryInk: "#FFFFFF",
    accent: "#D81F26",
    mark: "#D81F26",
    ink: "#0F1B2D",
    muted: "#46546A",
    surface: "#F4F6FA",
    line: "#E1E6EE",
  },
  contact: {
    email: "info@wholesalestreet.co.uk",
    /** E.164 without the plus, for wa.me links. */
    whatsapp: "447417564704",
    phoneDisplay: "+44 7417 564704",
  },
  email: {
    fromName: "Wholesale Street",
    from: "Wholesale Street <info@wholesalestreet.co.uk>",
  },
  locale: "en-GB",
  currency: "GBP",
} as const;

export type Brand = typeof brand;

/** wa.me link to the business WhatsApp, optionally with a pre-filled message. */
export function whatsappHref(text?: string): string {
  return `https://wa.me/${brand.contact.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
