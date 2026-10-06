# HANDOVER: start here

Last updated: **6 Oct 2026**, Phases 1–10 done and live on production; **Phase 11 (design refresh) done on the branch, not yet merged** (PR #2 merged to `main` on the owner's go-ahead, Vercel production deployment completed). Email sending deferred (D40). A fresh session should read, in order: this file, then
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
| 4. Customer approval and per-customer pricing | **Done** on the same branch and PR. No schema change. **Real catalogue loaded on hosted.** |
| 5. Shop, basket, checkout, order creation and split | **Done** on the same branch and PR. Migration 0007 applied to hosted. |
| 6. Supplier portal and driver proof | **Done** on the same branch and PR. Migration 0008 applied to hosted. |
| 7. Admin orders, payments, chasing, suppliers | **Done** on the same branch and PR. Migration 0009 applied to hosted. |
| 8. Invoices (PDF) and email (Resend) | **Invoices done** on the same branch and PR. **Email sending deferred by the owner** (D40): messages are queued in `email_log`. |
| 9. Polish and hardening | **Done** on the same branch and PR. No schema change. |
| 11. Design refresh (owner request 6 Oct) | **Done on branch `claude/sleepy-cori-mq31fu`, not merged, not pushed** (GitHub write access returned 403 after a worker restart; reconnect GitHub and push, then open a PR). Verified: `npm run verify` (169 unit), 424 security, 57 E2E incl. axe on 33 screens and leak scans; screenshots at 390 and 1280 reviewed; no overflow. See D43–D45. No schema change. |
| 10. Deploy | **Done.** PR #2 merged to `main` (69e8b62); Vercel production deployment reported success. The live site itself was not opened by the agent (network limits): owner smoke test below. |

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

### Real catalogue (done at the start of Phase 4)
The client's three lists are in `data/source/` and converted to `data/import/*.csv`
(`scripts/convert-sources.mts`; notes for the owner in `data/import/CONVERSION-NOTES.md`).
**Hosted now has 837 products / 1,225 sizes / 327 photos**, supplier Shrivi Limited, every size
"needs price"; the catalogue fingerprint equals the local import (MEMORY.md, D30). Category photos:
the owner's images (D31). Never import `tests/fixtures/catalogue-sample.csv` into hosted.

### Done in Phase 4 (verified locally: `npm run verify` green, 134 unit, 325 security, 36 E2E twice)
- `/admin/approvals` (pending registrations, oldest first) → `/admin/customers/[id]`: approve with
  chosen categories and optional default margin, reject with reason, put on hold, reactivate (D28);
  edit details; logins list + invite another login; private notes.
- `/admin/customers` (status tabs with counts, search) and `/admin/customers/new` (approved at once,
  optional login invitation; the invite code is shared with `/admin/users` via `src/server/invite.ts`).
- `/admin/customers/[id]/pricing` (the key screen, D29): categories on/off + margin per category,
  default margin, per-product Always/Never show, fixed price per size, live preview with the reason
  for every price, "what they see" count, copy from another restaurant, one save bar.
- `/admin/settings`: global margin, inc-VAT display, minimum order, delivery charge, delivery VAT
  mode, delivery days, business and bank details (placeholders flagged).
- Domain: `src/domain/visibility.ts` (D27); `src/server/pricing.ts` loads one customer's rules.
- Fixed on the way: React resets a form after an action and controlled `<select>`s fell back to
  their first option, so a second save of product sizes cleared supplier and VAT (now caught by E2E).
- Tests: `tests/unit/visibility.test.ts`; Phase 4 block in `tests/security/rls.test.ts` (every
  non-admin is refused granting itself categories/rules/margins/prices/notes/emails, changing any
  account status or the global margin); `tests/e2e/customers.spec.ts` (approve → restaurant sees
  only the chosen categories; reject/hold/reactivate with reasons shown to the restaurant; pricing
  preview → save → reload → copy to a new customer; settings; non-admins get 403).

### Done in Phase 5 (verified locally: `npm run verify` green, 142 unit, 352 security, 40 E2E twice)
- Migration `0007_shop`: `basket_items` (one basket per restaurant, shared by its logins, any device;
  RLS: own approved restaurant only, quantities 1–9,999), `orders.checkout_key` (unique per restaurant:
  a double click or retry places one order), `create_order_tx` v2 (returns the existing order for a
  repeated key, refuses inactive suppliers, notifies every active login of each supplier in-portal and
  queues `supplier_order_new` + `order_confirmation` emails in `email_log`). Applied to hosted;
  schema fingerprint identical to local (12/12); security advisor shows nothing new.
- `src/server/shop.ts` (DECISIONS D32): the restaurant's catalogue, priced server-side with the
  service-role client after `requireRole("customer")`; every exported shape carries only the resolved
  price. `/shop` (search, category chips, pagination, size dropdown with prices, quantity, Add);
  `/shop/p/[slug]` (price, size dropdown, a "your prices" table ex/inc VAT, more in the category).
  Hidden products are 404s. A size with no cost and no fixed price shows "Price on request" and
  cannot be added (on hosted that is every item until costs are entered: owner checklist H).
- `/basket` (D33): live totals with the same `src/domain` code as the server, free-delivery progress,
  VAT per rate, delivery date (next 14 delivery days from settings, from tomorrow), payment promise
  (on delivery / within 7 days / on a date), note. Lines that can no longer be ordered are flagged and
  block checkout. `placeOrder` re-reads the basket, re-prices it, re-checks the date and promise,
  rebuilds totals and split with `buildOrder`, and refuses if the total differs from what the page
  showed ("your basket or prices changed").
- `/orders/[id]/confirmed` (bank details, reference `ORDER-n`, amount, pay-by date), `/orders`
  (history), `/orders/[id]` (one block per delivery, status, totals, payment status, invoice number,
  bank details while unpaid). All read through the `customer_*` views with the user's own client.
- Domain: `PaymentTerms` now uses the DB enum values; `buildOrder` (`src/domain/order.ts`);
  `orderRef`, `invoiceRef`, `fromIsoWeekdays` (settings store ISO weekdays 1–7).
- Tests: `tests/unit/order.test.ts`; Phase 5 block in `tests/security/rls.test.ts` (basket RLS for
  every role, quantity bounds, `create_order_tx` not callable by API roles, idempotency, inactive
  supplier, notifications go to the right supplier's logins); `tests/e2e/shop.spec.ts` (order across
  two suppliers with live delivery charge and VAT, split + snapshot checked in the DB, notifications,
  basket emptied, later price change does not alter the order; a price change before checkout is
  refused then accepted at the new total; restaurant B cannot see A's items, a row slipped into the
  basket through the API blocks checkout; HTML **and RSC payloads** of every shop page scanned for
  cost/margin/supplier fields and restaurant B's prices).
- Screenshots of the 10 new screens at 390 and 1280 reviewed; no horizontal overflow.

### Done in Phase 6 (verified locally: `npm run verify` green, 145 unit, 372 security, 42 E2E twice)
- Migration `0008_delivery` (all server-only functions):
  - `rollup_order_status`: the order status follows its deliveries, same rules as `src/domain/status.ts`.
  - `set_supplier_order_status`: the supplier can only move forward (placed → accepted → out for delivery).
  - `create_driver_link`: stores only the SHA-256 of the link and revokes any unused link.
  - `record_delivery_proof`: in one transaction, a link works once and not after it expires or is
    replaced. It marks the delivery delivered, rolls up the order, notifies the restaurant's logins
    and queues an `order_delivered` email.
  - Views `customer_delivery_proofs` and `supplier_delivery_proofs`: file paths only, never the token hash.
  - Applied to hosted; schema fingerprint identical (12/12). The advisor lists the two new views
    under the same accepted "security definer view" item as the earlier filtered views (D15).
- Supplier screens:
  - `/supplier`: tabs To deliver / Delivered / All, plus unread updates with "Mark all read".
  - `/supplier/orders/[id]`: items and quantities (no prices), restaurant contact and note, Accept /
    Mark out for delivery, and the driver link. The link is shown once, with copy, WhatsApp and text
    message buttons; making a new one warns that the old one stops working. "Upload the proof
    yourself" is there too, and the proof shows once delivered.
- Driver, `/d/[token]` (no login, mobile first):
  - Shows the job (restaurant, address, tap-to-call, date, note, lines).
  - Steps: photo (required; shrunk on the phone), signed note (photo or PDF), signature on screen,
    and the name of the signer.
  - Clear states for used, expired, replaced and invalid links; `/d/[token]/done` afterwards.
  - Rate limited per IP and per token; `noindex` and `no-referrer`.
- Proof files (D35): checked by their bytes (`src/lib/proof-files.ts`) and stored in the private
  `delivery-proofs` bucket. They are shown to the restaurant (on `/orders/[id]`, per delivery) and
  the supplier through 15-minute signed URLs.
- Tests:
  - `tests/unit/proof-files.test.ts`.
  - Phase 6 blocks in both security files: delivery functions are not callable by any API role;
    link states; forward-only status; proof visibility per restaurant and supplier; the private
    bucket via SQL and the Storage API (download, list, sign, upload, overwrite). Mutation-checked:
    loosening the proof view and two grants turned 7 tests red.
  - `tests/e2e/delivery.spec.ts`:
    - The full path: supplier accepts, sends a link, the driver submits on a phone, the restaurant
      sees the photo and signature, and the order is part delivered.
    - Supplier B uploads a photo and a PDF and the order becomes delivered.
    - Forged, replaced and expired links; a text file named .jpg is refused; suppliers get 404 on
      other suppliers' orders and restaurants 403.
- Screenshots of 9 new screens at 390 and 1280 reviewed; no horizontal overflow.

### Done in Phase 7 (verified locally: `npm run verify` green, 165 unit, 424 security, 48 E2E twice)
- Migration `0009_admin_orders` (server-only functions, DECISIONS D36–D38):
  - `order_items.removed_at` (a line taken off is kept but hidden from restaurant and supplier views),
    `orders.cancel_reason` (shown to the restaurant).
  - `admin_edit_order`: quantities, take a line off, move a line to another supplier with its cost,
    delivery charge. Re-splits, cancels an emptied supplier part (revokes its links), updates the
    order and invoice totals, notifies the suppliers involved and the restaurant (portal + queued
    email). Refuses a stale page and anything after the first delivery.
  - `admin_cancel_order`: cancels every part, revokes links, voids the invoice, tells everyone.
  - `record_delivery_proof` v2: the admin can add a better proof to a delivered part.
  - Views `admin_order_summary` and `admin_supplier_order_summary` (admin only, sums of payments).
  - Applied to hosted in 5 parts (each revoking its functions straight away); fingerprint identical
    (12/12); the advisor shows only the items already accepted (D15).
- Domain `src/domain/ledger.ts`: `rebuildOrder`, `orderProfit`, `owedToSupplier`, `supplierPayState`,
  `chaseFlags`, `nextChaseAfterReminder`. Wording for the timeline and audit log:
  `src/lib/audit-format.ts`. Reads: `src/server/admin-orders.ts`.
- Screens:
  - `/admin`: owed to you (and overdue), owed to suppliers for delivered orders (and what comes once
    the rest arrive), chase today, approvals, latest orders, this month's sales and profit.
  - `/admin/orders`: status tabs with counts, payment, supplier, dates and search; total, payment
    and profit per order.
  - `/admin/orders/[id]`:
    - Header and actions: totals, paid, still owed or to refund, and profit with margin. Mark completed
      (warns if unpaid) and Cancel order (reason required).
    - One card per supplier: lines with price and cost, owed to the supplier, paid tick, record a
      supplier payment, the proof, the driver link, and upload or replace the proof.
    - "Change the order" editor with a live preview, plus the lines taken off.
    - Restaurant payments and refunds, the reminder, chasing (promised date, next chase, notes).
    - A timeline built from the audit log.
  - `/admin/payments`: Chase today, Overdue, All owed to you, To pay suppliers.
  - `/admin/suppliers`, `/new`, `/[id]`: details, switch on/off, logins (invite, switch off), and
    "To pay": tick the orders one transfer paid.
  - `/admin/audit`: filter by what changed and dates, before → after per field.
  - The sidebar shows a "chase today" count; admin confirmations appear as toasts.
- Restaurant side: a cancelled order shows the reason and no bank details; a delivery emptied by a
  change is hidden.
- Tests:
  - `tests/unit/ledger.test.ts`.
  - Phase 7 blocks in both security files: no API role (admin included) can call the functions; the
    ledger views are admin-only; edit, re-split, invoice, notifications, stale/locked/empty refusals;
    cancel; admin proof redo; restaurants never see notes or chase dates. Mutation-checked: loosening
    a grant, a view grant and the removed-line filter turned 7 tests red.
  - `tests/e2e/admin-orders.spec.ts` (6 journeys): change, take off, pay, chase, remind, pay the
    supplier, complete, cancel, suppliers, and 403s for restaurants and suppliers.
- Screenshots of 11 new admin screens at 390 and 1280 reviewed; no horizontal overflow.

### Done in Phase 8 without email (verified: 169 unit, 424 security, 57 E2E three runs in a row)
- Invoice PDF `/api/invoices/[id]/pdf` (D39): restaurant only its own (404 for any other id),
  admin any, supplier 404, signed out 401. Shows the VAT for each rate, the delivery line, totals from
  the invoice snapshot, paid and balance, bank details and the `ORDER-n` reference. A voided
  invoice says VOID.
- `/invoices` (restaurant, with paid state and PDF) and `/admin/invoices` (search by number or
  restaurant); PDF links on the order pages. Unknown admin paths are now 404 (every screen exists).
- **Email: deferred (D40).** Every email is queued in `email_log` at the moment it happens; turning
  sending on later needs a sender job and the Resend key. Auth emails come from Supabase (checklist D).

### Done in Phase 9 (hardening)
- Accessibility (D41): an automated WCAG A/AA check (axe) runs in E2E over 33 screens at 390 and
  1280 px and passes after the contrast fixes.
- Payload leaks: `tests/e2e/leaks.spec.ts` scans the HTML and the hidden RSC data stream behind the
  restaurant, supplier and driver pages. No costs, margins, admin notes, chase fields, token hashes,
  other suppliers or other restaurants appear; positive checks prove each page was read. The shop and
  catalogue scans from earlier phases still run, and so does the service-key bundle check
  (`tests/security/api.test.ts`).
- Full journey (`tests/e2e/journey.spec.ts`): register, confirm email, approve, order across two
  suppliers, split, driver proof from a phone, supplier's own proof, payment in full, both suppliers
  paid, completed, and the invoice PDF showing a zero balance.
- Performance advisor reviewed (D42); the E2E suite passes three times back to back.

### Phase 10: deploy (done 4 Oct; owner smoke test outstanding)
Production is the `main` branch on Vercel (`https://wholesale-b2b-uy4a.vercel.app`). The database is
already up to date: migrations 0001–0009 are applied and the fingerprint matches. PR #2 was
merged into `main` on 4 Oct (merge commit 69e8b62) and Vercel reported the production deployment
complete. Later work starts a fresh branch from `main`.

Environment variables (Vercel → wholesale-b2b → Settings → Environment Variables):

| Name | Value | Environments | Kind | Status |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://qtztjbnaofonazruovty.supabase.co` | Production, Preview, Development | public | set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon key | Production, Preview, Development | public | set |
| `NEXT_PUBLIC_SITE_URL` | `https://wholesale-b2b-uy4a.vercel.app` (later the custom domain) | Production | public | set |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role | Production (set), Preview (missing) | **server only, Sensitive** | checklist A |
| `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFY_EMAIL` | Resend account | Production | server only | deferred (D40) |

After merging, smoke test (the agent's container cannot reach the live site, so this is the owner's):
1. `/` and `/catalogue` load with photos and no prices.
2. Sign in as the first admin (checklist E) → `/admin` dashboard.
3. Put a cost on one size (`/admin/products`) and approve or create a test restaurant.
4. As that restaurant: see the price, place an order, open the invoice PDF.
5. As admin: the order appears with its supplier part; record a payment.

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

**L. Smoke test the live site** (PR #2 is merged and deployed): follow the five steps under "Phase 10"
above after doing A, E and I.

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
**Done 6 Oct 2026 for the owner's admin login:** `admin@groceryb2b.com` was created on hosted (confirmed, email provider, role admin, active, no customer link) with the password the owner chose in chat (not stored anywhere in the repo; the owner should change it after first sign-in, Supabase → Authentication → Users, or the reset-password flow). The same creation method was verified on the local stack (password grant works, a wrong password is refused, the login page lands on `/admin`). The live sign-in itself could not be tested from the sandbox (egress blocked).

**F. Decide**: keep Vercel Authentication on `*.vercel.app` (only Vercel team members can open the site) until
launch, or switch it off now for client review (Vercel → Settings → Deployment Protection). And whether to move
Supabase to London before data exists (DECISIONS D21).

**H. Review the catalogue import** (`data/import/CONVERSION-NOTES.md`): confirm the Drinks_List items are
supplied by Shrivi; check the flagged sizes ("8cc", "120 oz", two "Qty ???" items, the Coca Cola 1.75L line);
which Shrivi address deliveries come from (two different addresses in the PDFs). Then enter costs: every size is
"needs price" (`/admin/products?status=needs-price`, or send a price list and it can be imported).
**Until a size has a cost (or a fixed price for that restaurant), restaurants see "Price on request" and
cannot order it**, so the shop cannot take a real order on hosted until some costs are in.

**I. Settings** (`/admin/settings`, after the first admin exists): legal name, address, VAT number, bank details
and invoice footer are placeholders. Delivery days, minimum order (£150) and delivery charge (£12) are defaults.
The bank details are shown to restaurants on every order confirmation, so fill them in before the first real order.

**K. Supplier logins** (`/admin/users`, after the first admin exists): invite one login per supplier (for
Shrivi: their email). They get new orders in the portal and make driver links there. Driver links only
work on a site drivers can open: production (`NEXT_PUBLIC_SITE_URL`), not a Vercel-protected preview.

**J. Optional clean-up**: the hosted database has the `http` extension (used once to load the catalogue; execute
revoked from public/anon/authenticated). To remove it, run `drop extension http;` in the SQL editor.

**G. Photos** (owner allowed stock photos, 4 Oct; the owner asked again on 6 Oct for real grocery product photos; see `docs/PHOTOS.md` for the shot list and where files go): to let the agent fetch licence-safe stock photos,
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
   (Source lists received 4 Oct and imported: see "Real catalogue" above.)
2. `/data/source/`: `SHRIVI_ITEMS.pdf`, `Drinks_List.pdf`, `Shrivi_Limited_Packaging_Catalogue_.pdf`
   (the packaging one is image-only and must be read visually, because `tesseract` is not installed).
   **This is now the only thing between the hosted site and a real catalogue** (the import is built).
   Product photos: see owner checklist G.
3. Resend API key + verified sender domain, when email sending is wanted (deferred, D40).
4. Client content (placeholders until supplied): legal name, address, VAT number, bank details, terms text,
   real prices, which categories each customer gets.
5. Accountant to confirm delivery-charge VAT treatment (DECISIONS D5).

## Owner-facing decisions already made (see DECISIONS.md for detail)
Integer pence and half-up rounding; VAT rounded per line; price precedence override → category margin →
customer default → global; unpriced variants cannot be ordered; delivery VAT apportioned by default;
profit ex VAT; driver link 72 h with one submission and supplier regenerates to resubmit; Postgres-backed
rate limiting; Resend for email; react-pdf for invoices; gapless invoice numbers `INV-000001`; payment
reference `ORDER-<n>` with orders starting at 1001.
