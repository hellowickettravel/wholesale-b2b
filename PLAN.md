# PLAN — B2B wholesale grocery ordering portal

Owner: Touseef · Client: Nagaraju Vardanam (UK) · Status: **Phases 1–10 done; live on production since 4 Oct 2026 (PR #2 merged). Email sending deferred by the owner (D40). Migrations 0001–0009 live on hosted Supabase, real catalogue loaded.** See `HANDOVER.md`.

This is the living plan. Decisions and their reasons live in `DECISIONS.md`; traps and
non-obvious facts live in `CLAUDE.md` / `MEMORY.md`.

---

## 1. Inputs received (and missing)

| Input | Status | Effect |
|---|---|---|
| `/brand/` (name, logo, colours) | **Missing** | Neutral working name "Order Desk" + text wordmark, all behind `src/config/brand.ts` and `src/app/tokens.css`. Re-skin = edit those two files + drop logo into `/public/brand/`. |
| `/data/source/SHRIVI_ITEMS.pdf`, `Drinks_List.pdf`, `Shrivi_Limited_Packaging_Catalogue_.pdf` | **Received 4 Oct, imported** | Name/size parser and importer built and unit-tested against representative names; real import runs as soon as the PDFs land. |
| `/design-reference/mockup.html` | **Missing** | Not needed: screen list is in the brief. Designing from scratch anyway. |
| Supabase project, Vercel project | Not yet | Developing against a **local Supabase stack** (Supabase CLI + Docker) so migrations, RLS and E2E tests run for real. |

## 2. Phases

Each phase ends with: `tsc` + lint + production build green, unit + security tests green,
screenshots of the new screens at 390px and 1280px reviewed, commit, push, PR, status report.

1. **Foundation and design system** — Next 16 app, brand config + design tokens, UI primitives
   (button, input, select, field, badge, card, table, dialog, toast, empty/error/loading states),
   app shells (public, shop, admin, supplier, driver), 404/403/error pages, style-guide page,
   **pure domain library** (money, pricing, VAT, delivery charge, order split, totals, name parser)
   with unit tests. Supabase local stack running.
2. **Auth, roles, RLS** — migrations 0001–0003 (schema, RLS, functions), profiles with role from
   a trusted table, `proxy.ts` session refresh, role routing after one shared login, forgot/reset
   password, invite flow for admin-created accounts, rate limiting table. **SQL security tests**
   run as `anon` / customer A / customer B / supplier / admin roles.
3. **Catalogue, import, public pages** — categories/products/variants, image storage, import
   script + admin CSV import, public home / catalogue / product (no prices anywhere, cached),
   search + pagination for 600+ items.
4. **Customer approval and per-customer pricing** — register → pending → approve/reject (email),
   admin-create customer, category sets, product allow/deny, margins, fixed overrides, copy
   pricing, live preview. The key admin screen.
5. **Shop, basket, checkout, order creation and split** — customer catalogue with resolved prices,
   size dropdown, basket (live VAT + delivery-charge logic), delivery date (delivery days),
   payment promise, server-side recompute, atomic order + supplier orders + snapshot + invoice.
6. **Supplier portal and driver proof** — supplier order list/detail (no sell prices), driver
   link (hashed token, expiry, rate limit, single submission), mobile driver page (photo,
   document, signature canvas), private storage + signed URLs.
7. **Admin orders, payments, chasing, suppliers** — dashboard, all orders, order detail
   (adjust qty, swap supplier, re-notify, lock after delivery, timeline, profit), customer and
   supplier payments, chase-today/overdue, reminder email, supplier and user management, audit log.
8. **Invoices and email** — PDF invoices (react-pdf), invoice list for customer and admin, all
   transactional emails via Resend with `email_log`; graceful failure.
9. **Polish and hardening** — a11y pass (axe), performance (indexes, pagination, caching), RSC
   payload leak tests, bundle check for service key, full Playwright journey.
10. **Deploy** — Vercel env checklist, hosted Supabase migrations, smoke test live site, handover.

## 3. Route map

`(public)` — no login
- `/` home · `/catalogue` (+ `?category=&q=&page=`) · `/catalogue/[slug]` product
- `/register` · `/register/pending` · `/login` · `/forgot-password` · `/reset-password`
- `/auth/confirm` (token_hash verify for every auth email) · `/auth/callback` (PKCE fallback)
- `/auth/invite` (set password for admin-created users) · `/account-disabled` · POST `/auth/signout`

`(shop)` — role customer
- `/shop` my catalogue (home) · `/shop/p/[slug]` product with price + size select
- `/basket` basket and checkout · `/orders` history · `/orders/[id]` detail + delivery proof
- `/orders/[id]/confirmed` confirmation with bank details · `/invoices` · `/account`
- unapproved customers are sent to `/register/pending`

`/admin` — role admin
- `/admin` dashboard · `/admin/approvals` · `/admin/customers` (+ `/new`, `/[id]`)
- `/admin/customers/[id]/pricing` **key screen** · `/admin/products` (+ `/[id]`, `/import`)
- `/admin/categories` (+ `/[id]`) · `/admin/products/missing.csv` · `/admin/orders` · `/admin/orders/[id]` · `/admin/payments`
- `/admin/suppliers` (+ `/[id]`) · `/admin/invoices` · `/admin/settings` · `/admin/users` · `/admin/audit`

`/supplier` — role supplier
- `/supplier` orders list · `/supplier/orders/[id]` detail + driver link + self upload

`/d/[token]` — driver, no account (mobile first) · `/d/[token]/done` confirmation

Route handlers: `/api/invoices/[id]/pdf`. Everything else is server actions, including the driver's
proof upload (bound to the token) and short-lived signed URLs made at render time (DECISIONS D35).

## 4. Data model (Postgres, all money in integer pence, rates in basis points)

- `profiles(id → auth.users, role[customer|admin|supplier], full_name, email, customer_id?, supplier_id?, active)` — role only writable by admin/service (guard trigger).
- `customer_private(customer_id, default_margin_bp, admin_notes)` — admin only (split out of `customers`, DECISIONS D15).
- `customers(id, business_name, contact_name, email, phone, address_line1/2, city, postcode, status[pending|approved|rejected|suspended], default_margin_bp?, notes, approved_at, approved_by)`
- `suppliers(id, name, email, phone, address, active, notes)`
- `categories(id, name, slug, sort, active, image_path, default_vat_rate_bp)`
- `products(id, category_id, name, slug, description, image_path, active, needs_price (derived), source, source_ref = import key "<category id>::<name key>" unique)`
- `product_variants(id, product_id, size_label, size_sort, supplier_id, cost_pence?, vat_rate_bp, sku, active, image_path, source_ref = source line)`
- `customer_category_access(customer_id, category_id)` · `customer_product_rules(customer_id, product_id, mode[allow|deny])`
- `customer_category_margins(customer_id, category_id, margin_bp)` · `customer_price_overrides(customer_id, variant_id, price_pence)`
- `orders(id, number seq, customer_id, status, delivery_date, note, payment_terms[on_delivery|7_days|date], promised_pay_date, next_chase_date, payment_notes, subtotal/vat/delivery/total pence, delivery_vat_pence, cost_total_pence, placed_by, locked_at)`
- `order_items(id, order_id, supplier_order_id, variant_id, product_name, size_label, qty, unit_price_pence, unit_cost_pence, vat_rate_bp, line_net/vat pence, supplier_id)` — **snapshot**
- `supplier_orders(id, order_id, supplier_id, status, notified_at, delivered_at, paid_to_supplier, paid_at)`
- `delivery_proofs(id, supplier_order_id, token_hash, expires_at, created_by, submitted_at, photo_path, document_path, signature_path, submitted_by_kind[driver|supplier|admin], revoked_at)`
- `customer_payments(id, order_id, amount_pence, paid_on, method, reference, note, recorded_by)`
- `supplier_payments(id, supplier_order_id, amount_pence, paid_on, method, reference, note, recorded_by)`
- `invoices(id, order_id unique, number unique gapless, issued_at, totals snapshot, voided_at)`
- `settings(singleton: min_order_pence, delivery_charge_pence, delivery_vat_mode, delivery_days[], global_margin_bp, bank_name, account_name, sort_code, account_number, iban, business_legal_name, business_address, vat_number, invoice_footer, price_display)`
- `audit_log(id, actor, action, entity, entity_id, before jsonb, after jsonb, at)` · `email_log` · `notifications(user_id, kind, payload, read_at)` · `rate_limits(key, window_start, count)`

RLS: deny by default. Priced base tables are admin-only; customers read own data via `customer_orders`, `customer_order_items` (no cost/supplier), `customer_deliveries`, `customer_payment_history`, `shop_settings` and `invoices`; suppliers via `my_supplier`, `supplier_order_list`, `supplier_order_lines` (no price); public via `categories`, `products`, `catalogue_variants`. See DECISIONS D15. **Costs, margins and overrides are never selectable by non-admins.** Customer prices are computed server-side by the pure pricing engine and projected.

## 5. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Price/cost leak to public, other customers, suppliers | Deny-by-default RLS, column-level revokes, server-only DAL with explicit projections, `server-only` imports, SQL role tests + RSC payload tests + bundle grep for service key. |
| Wrong totals / rounding | One pure `domain` module, integer pence, documented rounding, exhaustive unit tests, server recomputes. |
| Old orders change when prices change | Snapshot columns on `order_items` + invoice totals snapshot; no FKs used for price reads after placement. |
| Import mis-groups sizes | Conservative parser (group only on exact base-name match after size strip), report of ambiguous rows, admin can merge/split. |
| Driver link abuse | 256-bit token, SHA-256 at rest, 72h expiry, single submission, DB-backed rate limit, server-side MIME sniff + size cap, private bucket. |
| Email/storage outages | Email failures logged to `email_log`, never block order placement; retries from admin. |
| Missing client content | Clearly labelled placeholders, listed at end of each phase. |

## 6. Test plan

- **Unit (Vitest)**: money/rounding, price resolution precedence, VAT per line, delivery charge threshold, delivery VAT apportionment, order split, totals, profit, name/size parser.
- **SQL security (Vitest + pg against local Supabase)**: as anon / customer A / customer B / unapproved / supplier / admin: attempt reads of costs, prices, other customers' rows, writes to prices/payments/roles; driver token expired/reused.
- **E2E (Playwright, local Supabase)**: register → approve → login → order across two suppliers → split visible → supplier driver link → driver uploads photo/doc/signature → admin records both payments → invoice PDF downloads. Plus RSC payload and API response scans for price strings as anon.
- **Visual**: screenshots at 390 × 844 and 1280 × 800 for every screen, reviewed each phase.
