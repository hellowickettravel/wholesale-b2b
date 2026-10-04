# HANDOVER: start here

Last updated: **4 Oct 2026**, end of Phase 3. A fresh session should read, in order: this file, then
`docs/BRIEF.md` (the owner's full original brief, verbatim), `PLAN.md`, `DECISIONS.md`, `MEMORY.md`
and `CLAUDE.md`.

## Who and what
- **Owner:** Touseef (hellotouseefzahid@gmail.com). The owner only runs SQL in Supabase, sets Vercel env vars
  and supplies secrets/client content. Everything else is done by the agent without asking permission for
  normal engineering decisions. Decide, record it in `DECISIONS.md`, carry on.
- **Client:** Nagaraju Vardanam (UK). B2B wholesale grocery ordering portal for restaurants. He is a middleman:
  orders split by supplier, the supplier delivers, he collects payment by bank transfer and pays suppliers.
- **Repo:** `hellowickettravel/wholesale-b2b`. Default branch `main`.
- **Hosted:** Supabase project `qtztjbnaofonazruovty` (Supabase connector available) and Vercel project
  `wholesale-b2b` in team "Wicket Travel Portal" (Vercel connector available; Git-connected, `main` = production,
  `https://wholesale-b2b-uy4a.vercel.app`). Do not touch the team's other Vercel projects.
- **Working style the owner expects (from the brief §7):** plan in phases, commit small, open a draft PR per
  phase, verify everything (tsc, lint, build, unit + security + E2E tests, screenshots at 390px and 1280px),
  never claim something works without running it, and give a short status at the end of each phase:
  what works (verified how), assumptions, what the owner must do next, and the next phase.

## Status

| Phase | State |
|---|---|
| 1. Foundation, design system, pure domain logic | **Done.** Merged to `main` (PR #1). |
| 2. Auth, roles, RLS | **Done** on branch `claude/sleepy-cori-mq31fu` (draft PR #2). Migrations applied to hosted Supabase. |
| 3. Catalogue, import, public pages | **Done** on the same branch and PR (the session is pinned to one branch). Migrations 0005–0006 applied to hosted. |
| 4. Customer approval and per-customer pricing | **Next.** |
| 5–10 | Not started (see `PLAN.md` §2). |

### Done in Phase 2 (verified locally: `npm run verify` green, 96 unit, 257 security, 24 E2E)
- Migrations `0001_schema` (all tables, pence/bp, enums, indexes, counters, settings row), `0002_rls`
  (deny-by-default, admin-only priced tables, filtered views, guard triggers, storage buckets),
  `0003_functions` (rate limiter, new-user trigger, `create_order_tx`, audit trigger, `promote_to_admin`),
  `0004_fk_indexes`. Re-runnable; no DROP/DELETE (DECISIONS D20). `supabase/seed.sql` = local dev data only.
- Supabase clients (`src/lib/supabase/{server,client,admin}.ts`), `src/proxy.ts`, `src/server/auth.ts`
  (`getViewer`, `requireRole`, `destinationFor`), `src/server/rate-limit.ts`, generated `src/lib/database.types.ts`
  (`npm run db:types`).
- Screens: `/login` (one login, routes by role, safe `?next`), `/register` → `/register/pending` (states:
  check inbox / under review / rejected / on hold), `/forgot-password`, `/reset-password`, `/auth/invite`,
  `/account-disabled`, `/auth/confirm` (token_hash), `/auth/callback` (PKCE), POST `/auth/signout`.
  Admin: dashboard (live counts), `/admin/users` (list + invite restaurant/supplier/admin), placeholder for
  later admin screens. Supplier: orders list from the price-free view. Shop: home (category set), account,
  placeholders for basket/orders/invoices.
- Tests: `tests/security/rls.test.ts` (SQL as anon/A/B/pending/suppliers/admin; mutation-checked),
  `tests/security/api.test.ts` (same attacks through PostgREST/GoTrue + service-key bundle check),
  `tests/e2e/auth.spec.ts` (role routing, 403s, register→confirm→approve→shop, reset, invites, rate limit).
- Screenshots of 21 screens at 390 and 1280 reviewed (`npx tsx scripts/screens.mts`); no horizontal overflow.
- **Hosted:** migrations 0001–0004 applied to Supabase; fingerprint identical to local. Probes run inside the hosted
  DB as `anon` and as a signed-in user with no profile: every priced/private table and privileged function denied or
  0 rows. Vercel preview for this branch built **READY** with the public env vars.
  **Not verified:** the deployed site itself. The agent's container cannot reach `*.vercel.app` or
  `*.supabase.co` (egress policy), and the Vercel connector cannot pass Vercel Authentication on this team.
  Owner smoke test after the checklist below: open `/login`, sign in as the first admin → `/admin`; invite a test
  restaurant from `/admin/users` → email → set password → `/shop`.

### Done in Phase 3 (verified locally: `npm run verify` green, 118 unit, 285 security, 32 E2E twice)
- Migrations `0005_catalogue` (11 launch categories with fixed ids, `categories.default_vat_rate_bp`,
  import keys, public sees products only in active categories, audit on categories/products) and
  `0006_admin_product_list` (admin-only view with needs-price counts). Both applied to hosted; schema
  fingerprint identical to local (12/12). Supabase security advisor: nothing new.
- Public: home categories from the DB; `/catalogue` (search, category filter, pagination 24/page,
  chips on phone, sidebar on desktop); `/catalogue/[slug]` (sizes, "Register to see price", related,
  Open Graph tags for WhatsApp links). Cached via a cookie-less anon client (DECISIONS D24).
- Admin: `/admin/categories` (+ `/[id]`: details, default VAT, photo, delete-if-empty);
  `/admin/products` (filters All / Needs price / No photo / Hidden, search, category, 50/page);
  `/admin/products/new`; `/admin/products/[id]` (sizes with supplier, cost, VAT, SKU, on-sale;
  details; photo); `/admin/products/import` (CSV upload → preview → import → idempotent);
  `/admin/products/missing.csv` (the owner's list of items missing a price or photo).
- Import: `src/lib/import/{csv,plan,apply}.ts` + `scripts/import-catalogue.mts` (DECISIONS D22).
  Format in `data/import/README.md`; template at `/import-template.csv`.
- Tests: `tests/unit/catalogue.test.ts`, catalogue blocks in both security files (mutation-checked:
  loosening the products policy and granting the admin view to anon turns 6 tests red),
  `tests/e2e/catalogue.spec.ts` (browse/search/paginate, HTML **and RSC payload** scanned for prices,
  admin create → price → photo → publish → hide, CSV import twice, missing list admin-only).
- Screenshots of 37 screens at 390 and 1280 reviewed (`npx tsx scripts/screens.mts`); no horizontal overflow.

**The hosted catalogue has the 11 categories and no products yet**: the client's PDFs have not
arrived. Once they are in `/data/source/`, convert each to a CSV (`pdftotext -layout`, then tidy) and
import via `/admin/products/import` or the CLI. Never import `tests/fixtures/catalogue-sample.csv` there.

### Next: Phase 4 (customer approval and per-customer pricing). Concrete to-do
1. `/admin/approvals`: pending registrations → approve (choose category set) / reject with reason;
   `status_reason`; notification row (email in Phase 8, logged to `email_log` meanwhile).
2. `/admin/customers` list + `/new` (admin-created customer, optional invite) + `/[id]` (details, status,
   suspend, notes in `customer_private`).
3. `/admin/customers/[id]/pricing` (key screen): category access set, product allow/deny,
   default margin, per-category margins, fixed overrides per size, copy pricing from another customer,
   live preview of resolved prices using `src/domain/pricing.ts` server-side; sizes without cost shown
   as not orderable.
4. A server-only resolver `src/server/pricing.ts` (service role after `requireRole`) that returns
   only resolved prices for one customer; unit + security tests that another customer's prices and
   any cost never cross over. Settings: global margin (`/admin/settings` minimal).

## Owner checklist (what Touseef must do)
**A. Vercel → Project wholesale-b2b → Settings → Environment Variables** (already set by the agent:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` for all environments, `NEXT_PUBLIC_SITE_URL` for Production)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` added by the owner (4 Oct) for **Production only**, as a plain encrypted
  variable. To finish: tick **Preview** too (preview deployments of this branch need it for invites,
  the users list and rate limiting) and re-create it as **Sensitive** (Vercel flags the current one as
  "readable secret"). Server-only: never prefix with `NEXT_PUBLIC_`. Redeploy after changing it.

**B. Supabase Dashboard → Authentication → URL Configuration** (✅ owner reports done 4 Oct)
- Site URL: `https://wholesale-b2b-uy4a.vercel.app` (later: the custom domain).
- Redirect URLs: add `https://wholesale-b2b-uy4a.vercel.app/**` and `https://*-wicket-travel-portal.vercel.app/**`.

**C. Supabase Dashboard → Authentication → Email Templates**: paste the HTML from the repo files
(subject in brackets): Confirm signup ← `supabase/templates/confirmation.html` ("Confirm your email to finish
registering"); Invite user ← `invite.html` ("Your trade account is ready: set your password"); Reset password
← `recovery.html` ("Reset your password"); Change email ← `email_change.html` ("Confirm your new email address").
Without this, invite links cannot sign people in.

**D. Supabase Dashboard → Authentication → Sign In / Providers → Email**: keep "Confirm email" ON; set minimum
password length 8. **Authentication → SMTP**: Supabase's built-in mailer only sends a few emails an hour to team
addresses; connect Resend SMTP (host `smtp.resend.com`, port 465, user `resend`, password = Resend API key) once
the Resend account and domain exist.

**E. First admin**: Supabase → Authentication → Users → Add user (the client's email, auto-confirm), then in the
SQL editor: `select public.promote_to_admin('client@email');` → expect one row "promote_to_admin" with no error.
Confirm with: `select email, role from public.profiles;`

**F. Decide**: keep Vercel Authentication on `*.vercel.app` (only Vercel team members can open the site) until
launch, or switch it off now for client review (Vercel → Settings → Deployment Protection). And whether to move
Supabase to London before data exists (DECISIONS D21).

**G. Photos** (owner allowed stock photos, 4 Oct): to let the agent fetch licence-safe stock photos,
add `images.unsplash.com`, `unsplash.com`, `images.pexels.com`, `www.pexels.com`, `upload.wikimedia.org`
to the cloud environment's **Network access → Custom → Allowed domains** (keep the package-manager
defaults). Or send photo files you own or have licensed. Until then products and categories show
illustrated placeholders, and the admin can upload photos on each product and category page.

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
- Supabase and Vercel connectors are connected (see "Hosted" above). Supabase connector cannot run SQL that
  contains DROP or DELETE (MEMORY.md). Docker Hub may 429: use `mirror.gcr.io` (MEMORY.md).
- Schema parity check hosted vs local: run the fingerprint query in `scripts/schema-fingerprint.sql` on both
  (psql locally, `execute_sql` on hosted) and compare.

## Waiting on the owner (content; nothing blocks Phase 3)
1. `/brand/`: logo (SVG + PNG for PDF), business name, colours. Until then the brand stays "Order Desk".
2. `/data/source/`: `SHRIVI_ITEMS.pdf`, `Drinks_List.pdf`, `Shrivi_Limited_Packaging_Catalogue_.pdf`
   (the packaging one is image-only and must be read visually, because `tesseract` is not installed).
   **This is now the only thing between the hosted site and a real catalogue** (the import is built).
   Product photos: see owner checklist G.
3. Resend API key + verified sender domain (Phase 8), plus the owner checklist above.
4. Client content (placeholders until supplied): legal name, address, VAT number, bank details, terms text,
   real prices, which categories each customer gets.
5. Accountant to confirm delivery-charge VAT treatment (DECISIONS D5).

## Owner-facing decisions already made (see DECISIONS.md for detail)
Integer pence and half-up rounding; VAT rounded per line; price precedence override → category margin →
customer default → global; unpriced variants cannot be ordered; delivery VAT apportioned by default;
profit ex VAT; driver link 72 h with one submission and supplier regenerates to resubmit; Postgres-backed
rate limiting; Resend for email; react-pdf for invoices; gapless invoice numbers `INV-000001`; payment
reference `ORDER-<n>` with orders starting at 1001.
