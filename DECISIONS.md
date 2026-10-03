# DECISIONS

Newest last. Each entry says what we decided, why, and what would change it.

## D1. Stack: Next.js 16 App Router + Supabase + Vercel (as briefed)
Next 16.3 (`proxy.ts` not `middleware.ts`, async `params`/`searchParams`/`cookies()`,
`revalidateTag(tag, profile)`), React 19, Tailwind v4, TypeScript strict, zod v4.

## D2. Brand placeholder
`/brand/` was empty at kickoff. Working name **"Order Desk"** with a text wordmark. Everything brand
lives in `src/config/brand.ts` (name, legal name, tagline, logo paths, email from-name) and
`src/app/tokens.css` (colour, radius, font tokens). Swap those two plus `/public/brand/*` to re-skin.

## D3. Money and rounding
- All money is **integer pence** (`number` in TS, safe to ±£90 trillion; `bigint`/`integer` in SQL).
  No floats are ever stored; percentage maths happens in integer basis points.
- Rates are **basis points**: 20% VAT = `2000`, 17.5% margin = `1750`.
- **Rounding rule:** round half up (away from zero) to the nearest penny, applied at the smallest
  priced unit:
  - unit sell price = `round(cost × (10000 + margin_bp) / 10000)`
  - line net = unit price × qty (exact, no rounding needed)
  - line VAT = `round(line net × vat_bp / 10000)` (HMRC permits line-level rounding to the nearest 1p)
  - order VAT = sum of line VATs + delivery VAT
- Implemented with integer arithmetic only (`roundDiv`), never `Math.round(x * 1.2)`.

## D4. Price resolution
Highest priority first: (1) fixed price override for customer+variant; (2) customer's margin for
the product's category; (3) customer's default margin; (4) global default margin (settings).
A variant with **no cost and no override** has no price: shown as "Price on request", cannot be
added to basket. Negative margins are allowed (loss leaders) but flagged in admin UI; resulting
price floors at 0.

## D5. Delivery charge VAT
UK practice: a separately charged delivery on a mixed supply follows the VAT of the goods.
Default mode **`apportioned`**: delivery VAT is split pro-rata across the VAT rates of the basket by
net value. A setting allows `fixed` (single rate, default 20%) if the client's accountant prefers.
**Client's accountant should confirm.** Delivery charge applies when goods subtotal (ex VAT) is
below the minimum (default £150), and is £0 at or above it.

## D6. Profit formula
Profit per order (ex VAT) = goods net sell + delivery charge net − Σ(unit cost × qty).
VAT is excluded on both sides (it is passed through to HMRC). Supplier delivery costs, if any,
are recorded as supplier payments and are not modelled separately in v1.
Owed to supplier (gross) = Σ(cost × qty) + VAT on cost at each line's rate.

## D7. Where prices are computed
Pricing logic lives in exactly one place: `src/domain/pricing.ts` (pure). Customer-facing prices are
computed **server-side** from cost + rules, then only the resulting price is sent to the browser.
Base tables holding cost/margins/overrides have RLS that only admins can read; customers never
query them with their own key. The service-role client is used only inside `server-only` modules.

## D8. Local Supabase for development and tests
Docker is available in the build container, so a local Supabase stack (CLI) runs migrations, RLS
tests and Playwright E2E for real. Hosted project gets the same migration files.

## D9. Driver link policy
256-bit random token (base64url), only SHA-256 hash stored, expires after 72h, scoped to one
supplier order. **One submission per link.** To resubmit, the supplier (or admin) generates a new
link, which revokes any unused previous link; previous proof is kept for audit and the newest
submission is shown. Rate-limited per token and per IP. Files: photo (JPEG/PNG/WebP/HEIC, ≤10 MB),
document (JPEG/PNG/PDF, ≤10 MB), signature (PNG from canvas, ≤1 MB); type checked by magic bytes.

## D10. Rate limiting
Postgres-backed fixed-window counter (`rate_limits` table + `hit_rate_limit()` function) so it works
across Vercel instances with no extra service. Applied to register, login-adjacent actions,
password reset and driver endpoints.

## D11. Email: Resend
Simple HTTP API, works well on Vercel, good deliverability. Needs `RESEND_API_KEY` + verified
sender domain. If the key is missing, emails are written to `email_log` with status `skipped`
(dev) — order flow never fails because of email.

## D12. PDFs: @react-pdf/renderer, server-side route handler
Pure JS, no headless browser on Vercel. Logo must be PNG/JPG (react-pdf does not render SVG files).

## D13. Invoice numbering
Gapless sequential numbers via a counter row updated inside the order-creation transaction
(`INV-000001`). Payment reference is `ORDER-<order number>` (orders start at 1001).

## D14. Rejected alternatives
- Card payments / Stripe: out of scope v1; `customer_payments.method` is an enum ready for `card`.
- Edge runtime: Next 16 `proxy` is Node only; fine.
