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

## D15. Access model: admin-only base tables + filtered projection views (Phase 2)
Postgres column grants cannot tell a customer from an admin (both use the `authenticated` role), so
column-level revokes cannot hide costs from customers while letting admins read them. Instead:
- Every table has RLS; `anon`/`authenticated` get no privileges unless granted explicitly
  (default privileges are revoked too, so new tables are private until a migration grants them).
- Tables holding costs, sell prices, margins, overrides, payments or admin notes are **admin-only**.
- Customers and suppliers read those facts only through **views with explicit column lists** that
  filter rows themselves (`customer_orders`, `customer_order_items` with no cost/supplier,
  `supplier_order_list` / `supplier_order_lines` with no price at all, `catalogue_variants` with no
  cost/supplier, `shop_settings` for approved customers only). The views run as their owner, so the
  Supabase linter reports them as "security definer views"; this is intended and the SQL/API tests
  prove each one filters correctly.
- Admin-private customer facts (default margin, internal notes) live in `customer_private`.
- Guard triggers stop non-admins changing protected columns on rows they may otherwise update
  (`profiles.role/customer_id/supplier_id/active/email`, `customers.status/...`).
- Helper functions `app_role()`, `is_admin()`, `my_customer_id()`, `my_approved_customer_id()`,
  `my_supplier_id()` are SECURITY DEFINER and executable by anon/authenticated because RLS needs
  them; they only ever describe the caller. (`current_role()` was not used: CURRENT_ROLE is a
  reserved SQL function.)
- Unapproved, rejected and suspended customers see nothing priced: every customer view and the
  invoices policy gate on `my_approved_customer_id()`.

## D16. Account provisioning
- `handle_new_user` trigger always creates the profile with role `customer`; metadata can never set
  a role or link a customer/supplier. Self-registration metadata (business details) creates a
  **pending** customer.
- Admin-created accounts: admin's own (RLS-bound, audited) client creates the customer or supplier
  record and links the profile; the service-role client is used only to send the Auth invite.
- First admin on a fresh project: create the user in Supabase Auth, then run
  `select public.promote_to_admin('email');` in the SQL editor (not callable through the API).

## D17. Auth emails use token_hash links to /auth/confirm
Server-side `verifyOtp` works for every email type (signup, invite, recovery, email change) and does
not depend on the browser that requested it. Templates in `supabase/templates/*.html`; hosted
project must use the same (HANDOVER owner checklist). `/auth/callback` (PKCE code exchange) remains
as a fallback for stock templates. Email confirmation is required for self-registration.

## D18. Sessions and authorisation in Next
`src/proxy.ts` refreshes the session and redirects signed-out visitors of signed-in areas
(optimistic only). Every protected layout, page and action calls `requireRole()` from
`src/server/auth.ts`, which reads the role from `profiles` per request. `?next=` is honoured only
for same-origin paths inside the viewer's own area (no open redirects). Sign-out is POST-only.

## D19. Rate limits (values)
Login 50/15 min per IP and 10/15 min per account; register 5/h per IP; reset 20/h per IP and
5/h per account; set-password 10/h per user; invites 60/h per admin. Keys are SHA-256 hashed.
`hit_rate_limit` keeps one row per key (window resets in place) so the table needs no pruning.
If the limiter itself is unavailable it fails open and logs, so an outage cannot lock everyone out.

## D20. No destructive statements in migrations
The Supabase connector stalls on DROP and on DELETE (it waits for an interactive confirmation),
and re-runs are safer without them anyway. Migrations use `create or replace` (functions, views,
triggers) and `public.ensure_policy()` (create policy if missing, otherwise ALTER POLICY in place).
A change that genuinely needs DROP is given to the owner to run in the SQL editor.

## D21. Hosted project
Supabase `qtztjbnaofonazruovty` (region ap-south-1, Mumbai) and Vercel project `wholesale-b2b`
(team Wicket Travel Portal, Git-connected; main = production). Migrations 0001–0004 applied via
the connector; a schema fingerprint (columns, constraints, indexes, policies, function bodies,
views, triggers, grants, RLS flags, buckets) matched the local stack exactly. The seed is local only.
**Region note:** customers are in the UK; a London (eu-west-2) Supabase project would cut latency.
The hosted database is empty, so moving now costs minutes; later it costs a migration.
