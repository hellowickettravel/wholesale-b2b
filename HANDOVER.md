# HANDOVER: start here

Last updated: **3 Oct 2026**, end of Phase 1. The project is moving to a different Claude Code account.
A fresh session should read, in order: this file, then `docs/BRIEF.md` (the owner's full original brief,
verbatim), `PLAN.md`, `DECISIONS.md`, `MEMORY.md` and `CLAUDE.md`.

## Who and what
- **Owner:** Touseef (hellotouseefzahid@gmail.com). The owner only runs SQL in Supabase, sets Vercel env vars
  and supplies secrets/client content. Everything else is done by the agent without asking permission for
  normal engineering decisions. Decide, record it in `DECISIONS.md`, carry on.
- **Client:** Nagaraju Vardanam (UK). B2B wholesale grocery ordering portal for restaurants. He is a middleman:
  orders split by supplier, the supplier delivers, he collects payment by bank transfer and pays suppliers.
- **Repo:** `hellowickettravel/wholesale-b2b`. Default branch `main`.
- **Working style the owner expects (from the brief §7):** plan in phases, commit small, open a draft PR per
  phase, verify everything (tsc, lint, build, unit + security + E2E tests, screenshots at 390px and 1280px),
  never claim something works without running it, and give a short status at the end of each phase:
  what works (verified how), assumptions, what the owner must do next, and the next phase.

## Status

| Phase | State |
|---|---|
| 1. Foundation, design system, pure domain logic | **Done.** Merged to `main` (PR #1). |
| 2. Auth, roles, RLS | **Next.** Not started. |
| 3–10 | Not started (see `PLAN.md` §2). |

### Done in Phase 1 (all verified: `npm run verify` green, 96 unit tests)
- Next.js 16.3 + React 19 + Tailwind v4 + TS strict. Security headers, `experimental.authInterrupts`.
- Brand config `src/config/brand.ts` + tokens `src/app/tokens.css` (placeholder brand **"Order Desk"**).
- UI kit `src/components/ui/*`, shells `src/components/shell/*` (public, shop, admin, supplier, driver),
  `ProductImage` placeholder, `Logo`.
- Pages: landing `/`, 404, 403 (`forbidden.tsx`), `error.tsx`, `global-error.tsx`, `/styleguide` (+ shell previews,
  hidden when `VERCEL_ENV=production`).
- Pure domain library `src/domain/*`: money (pence, bp, rounding), pricing resolution, totals (VAT, delivery
  charge, apportioned delivery VAT, profit, supplier owed), split by supplier, status roll-up, payment status,
  London dates and delivery days.
- Import parser `src/lib/import/parse-name.ts` (name → product + size, conservative grouping).
- Screenshots reviewed at both widths; no horizontal overflow.

### Next: Phase 2 (auth, roles, RLS). Concrete to-do
1. `supabase/migrations/0001_schema.sql`: all tables from `PLAN.md` §4 (pence integers, bp rates, enums,
   indexes, `updated_at` triggers, gapless counters for order and invoice numbers).
2. `0002_rls.sql`: deny by default; helper `public.current_role()` / `is_admin()` (security definer, reads
   `profiles`); customer own-rows policies; supplier own supplier_orders + a no-price items view; revoke cost
   columns from non-admins; storage buckets `product-images` (public) and `delivery-proofs` (private).
3. `0003_functions.sql`: `hit_rate_limit()`, `handle_new_user` trigger creating a `profiles` row with role
   `customer` (never from metadata), `create_order_tx(jsonb)` (service role only), audit-log trigger.
4. `supabase/seed.sql`: settings row, one admin and one supplier for local dev.
5. Supabase clients: `src/lib/supabase/{server,client,admin}.ts` (admin = service role, `import "server-only"`),
   `src/proxy.ts` for session refresh, `src/server/auth.ts` with `requireRole()`.
6. Pages: `/login` (one login, routes by role), `/register` → `/register/pending`, `/forgot-password`,
   `/reset-password`, `/auth/callback`, `/auth/invite`.
7. **SQL security tests** (`tests/security/*.test.ts`, `vitest.security.config.mts`, uses `pg` + `TEST_DATABASE_URL`):
   as anon / customer A / customer B / unapproved / supplier / admin, try to read costs, prices and other
   customers' rows and to write prices, payments and roles, and show that each attempt fails.
8. Update `PLAN.md`, this file and `MEMORY.md`; open a PR; report status.

## Environment setup in a fresh cloud container (important)
```bash
npm install
# Docker daemon is usually not running:
nohup dockerd > /tmp/dockerd.log 2>&1 &
npm run db:start      # local Supabase; uses Docker Hub because public.ecr.aws is blocked by the proxy
npm run verify
```
- Playwright: use the preinstalled Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
  (`executablePath`). Do not run `playwright install`. Use `waitUntil: "load"`, not `networkidle`.
- Do not `pkill -f "next start"`: it kills your own shell. Kill by PID.
- Local Supabase prints its keys on start. These are well-known local demo keys; put them in `.env.local`
  (git-ignored). The local database is **not** persisted between containers; migrations recreate it.
- Possibly available connectors: Supabase MCP and Vercel MCP tools appeared in this session. Use them for the
  hosted project and deploy once the owner has created those projects. Confirm the target project with the owner first.

## Waiting on the owner (nothing blocks Phase 2)
1. `/brand/`: logo (SVG + PNG for PDF), business name, colours. Until then the brand stays "Order Desk".
2. `/data/source/`: `SHRIVI_ITEMS.pdf`, `Drinks_List.pdf`, `Shrivi_Limited_Packaging_Catalogue_.pdf`
   (the packaging one is image-only and must be read visually, because `tesseract` is not installed).
3. Before deploy: hosted Supabase project (URL, anon key, service-role key), Resend API key + verified domain,
   Vercel project.
4. Client content (placeholders until supplied): legal name, address, VAT number, bank details, terms text,
   real prices, which categories each customer gets.
5. Accountant to confirm delivery-charge VAT treatment (DECISIONS D5).

## Owner-facing decisions already made (see DECISIONS.md for detail)
Integer pence and half-up rounding; VAT rounded per line; price precedence override → category margin →
customer default → global; unpriced variants cannot be ordered; delivery VAT apportioned by default;
profit ex VAT; driver link 72 h with one submission and supplier regenerates to resubmit; Postgres-backed
rate limiting; Resend for email; react-pdf for invoices; gapless invoice numbers `INV-000001`; payment
reference `ORDER-<n>` with orders starting at 1001.
