You are the sole engineer, designer and QA for a new client project. You own it end to end: planning, building, verifying, testing, fixing and deploying. I (Touseef) am the project owner. I will only do three things for you: run SQL you give me in the Supabase SQL editor, set environment variables in Vercel, and supply any secrets or client content you cannot get yourself. Everything else is yours. Do not ask me for permission to make normal engineering decisions. Decide, write the decision down, and keep going.

Read this whole brief before you write any code. It is long on purpose; nothing in it is filler.

---

## 1. What we are building

A **B2B wholesale grocery ordering portal for restaurants**, for a UK client, Nagaraju Vardanam. The business identity (name, logo, colours) is the client's own and is supplied in the repo folder `/brand/` (see section 5). Do not invent a brand and do not borrow one from any other website.

The client is a middleman. He does not hold stock. Restaurants order groceries (rice, dal, spices, tea, sauces, drinks, packaging) from him. Each order is split by supplier and sent to the wholesale supplier who actually holds the goods. The supplier delivers straight to the restaurant and attaches proof of delivery. The client then collects money from the restaurant and pays the supplier. The portal is his order desk, price book, and payment ledger.

It is a **trial launch**: a new business, a small number of restaurants at first, and speed to a working v1 matters. Quality still matters, because real orders and real money will flow through it.

Business context for you:
- Currency GBP (£). UK English. Timezone Europe/London. Dates like "6 Oct".
- Suppliers are real UK wholesalers: Shrivi Limited (Barking, Essex), plus Foodlords, Nitya Foods and Sujash (up to about four suppliers at launch). Do not hard-code them. Suppliers are data.
- Payments are **manual bank transfer for now**. The client sends bank details; the portal only records what has been paid. No card payments, no Stripe, in v1. Keep the design open so a gateway could be added later.
- The client expects other people to ask him for similar sites after seeing this one. Build it cleanly and generically enough to be re-skinned.

## 2. The three roles, plus one link-only actor

1. **Restaurant (customer)**: signs up or is created by admin, is approved, then sees *their own* catalogue and *their own* prices and orders.
2. **Admin (the client)**: controls everything: products, categories, suppliers, customers, per-customer pricing, orders, payments, invoices, settings.
3. **Supplier (1 to about 4)**: logs in and sees only orders (and items) assigned to them. Never sees customer prices or margins.
4. **Driver (no account)**: opens a unique link sent by the supplier and uploads delivery proof from a phone.

One login page serves everyone. After login, route each user to the right area by role.

## 3. Requirements, exactly as the client stated and confirmed

Treat every line as a requirement.

**Catalogue and visibility**
- Before login, the public can browse categories and products (with photos) so the client can market by sending links in WhatsApp groups. **Prices are never visible to the public.** They see "Register to see price".
- Prices appear only after login **and** after the admin has approved the account.
- Products have category, photo, and a **pack-size dropdown** (for example 100 g, 1 kg, 5 KG, 20 KGS, 330ML x 24). The price depends on the selected size. Some products have only one size.

**Accounts**
- Restaurants can **self-register**; admin **approves** (or rejects). Admin must also be able to **create a restaurant account from the admin panel**. Both paths must exist.
- On approval, admin assigns the customer a category set and a margin (see pricing). Customer gets an email.

**Per-customer pricing and per-customer catalogue (the core feature, and the riskiest)**
- Some restaurants bargain, so prices and profit differ per customer. Admin sets the **supplier cost** per product/size, then sets a **margin % or fixed price per customer**.
- Admin can build a **custom set of categories (and optionally individual products) per restaurant**. That restaurant sees only its set, so it keeps reordering from it.
- Price resolution order, highest priority first: (1) explicit fixed price override for that customer+variant, (2) that customer's margin for the product's category, (3) that customer's default margin, (4) a global default margin. Cost is never exposed to customers or suppliers.
- **Snapshot** unit price, cost, VAT rate and supplier onto each order line at order time. Later price changes must never alter old orders or invoices.
- Admin screen: pick customer, see/edit category set, see every product with cost, margin %, resulting price and profit, edit inline, set a default margin, and copy pricing from another customer. Margin edits update price live.

**Basket, checkout, delivery, VAT**
- Restaurant adds items, sets quantities, picks a delivery date, adds an order note, and chooses when they will pay (pay on delivery / within 7 days / pick a date).
- **VAT must be shown.** Prices are shown ex VAT and VAT is added per line using a per-product VAT rate (food often 0%, drinks and packaging 20%; admin edits the rate; do not assume, make it data).
- **Minimum order:** if the subtotal is below the minimum (default £150, editable), a **delivery charge** (default £12, editable) is added. At or above the minimum, delivery is free. Show this clearly in the basket, live as quantities change.
- Delivery days (default Mon to Sat) are a setting.

**Order flow**
- On order placement the system **auto-splits the order by supplier** into supplier orders and notifies each supplier (in-portal, plus email).
- **Admin can adjust**: change quantities, swap a line to a different supplier, after speaking with the restaurant. Re-notify the supplier on change. Lock edits once delivered.
- Suggested statuses: placed, sent to supplier(s), out for delivery (optional), delivered, completed, cancelled. Track status per supplier order and roll up to the order.

**Supplier side**
- Supplier logs in, sees only their orders (item, size, quantity, delivery address, delivery date; no sell prices).
- Supplier can **generate a unique link for their driver**. The driver page (mobile first, **no login**) lets the driver attach a **delivery photo** and a **signed document** (photo or PDF), and capture a **customer signature** on a canvas, then submit. Submission marks that supplier order delivered. Supplier can also upload the proof themselves.
- The link is an unguessable token, expires, is rate limited, and stops accepting uploads after submission (or allows one controlled resubmit; your call, document it). Uploaded files go in **private storage**; customer and admin view them through short-lived signed URLs. Validate type and size server-side.

**Payments ledger (manual)**
- Admin must see for every order: has the restaurant paid (unpaid / part paid / paid), how much, **the date the restaurant promised to pay**, **the next chase date**, and free-text notes.
- Admin records customer payments (amount, date, reference, method) and **supplier payments** ("I paid the supplier for this order"), with a paid-to-supplier flag per supplier order. Profit per order = customer total minus supplier cost (ex VAT handled sensibly; document your formula).
- A "chase today / overdue" view and dashboard widget driven by chase dates. Optional nicety: one-click reminder email.

**Invoices**
- An invoice is generated automatically for every order: sequential invoice number, VAT breakdown, delivery line, bank-transfer details and payment reference (for example ORDER-1051). PDF download. Restaurants see their **full history of orders and invoices**; admin sees all.

**Products and data import**
- The client gave source lists in `/data/source/` (add them to the repo if I have not): 
  - `SHRIVI_ITEMS.pdf`: about 645 products, 11 categories (Rice, Tea Powders/Milk Mix, Restaurant Packing/Cleaning, Sauces, Drinks, Restaurant Groceries, Food Colours, Whole Spices, Pulses/Nuts/Groceries, Powders/Masala Grounded, Flours/Atta/Rava). Names and pack sizes only, **no prices**. Pack size is embedded in the name (for example "BASANT BASMATI RICE 20 KGS"), so you must parse names into product plus size, and group same-product sizes into one product with several variants where it is clearly safe.
  - `Drinks_List.pdf`: 21 drinks with pack size (330ML x 24, 1.5L x 6, and so on).
  - `Shrivi_Limited_Packaging_Catalogue_.pdf`: packaging catalogue; it is image-only (no text layer), so OCR it or read it visually.
- Build a repeatable **import** (script and an admin CSV import screen), idempotent, that loads these into categories, products, variants and the Shrivi supplier, with cost left empty and flagged "needs price" for the admin to fill in. Never invent prices.
- The client also pointed at foodlords.com, nityafoods.in/lentils-pulses, sujash.co.uk and shrivi.co.uk/products as sources for extra items and photos: "as many as possible; if you do not get some, we will have a call". Do best-effort retrieval, **respect robots.txt and each site's terms, do not hammer them**, and keep a list of items with no photo for me. If photo reuse looks questionable, use clean placeholders and tell me rather than guessing. Host photos in our own storage.

**Explicitly out of scope for v1** (design so they could be added, do not build): online card payments, live chat or messaging, WhatsApp automation, native mobile apps, multi-currency, loyalty or discounts engine.

## 4. Screens: build all 29 (and more if you find real gaps)

A rough clickable HTML mockup exists at `/design-reference/mockup.html`. Treat it as a **light reference only**, for the list of screens and the general flow. The owner does not like its look, so **do not copy its visual style, layout or components**. Design everything yourself from scratch. All names and numbers in it are samples.

PUBLIC (no login), 6: Home/landing; Catalogue with prices locked; Product page with price locked; Register; Awaiting-approval confirmation; Login.
RESTAURANT, 8: My catalogue (home); Product page with price and size dropdown; Basket and checkout (live VAT, delivery-charge logic); Order confirmed (bank-transfer details); Order history; Order detail with delivery proof; Invoices; My account.
ADMIN, 12: Dashboard (owed to you, owed to suppliers, chase today, pending approvals, latest orders); Registration approvals; Customers (and add customer); Customer pricing and category (key screen); Products and categories (with import); All orders; Order detail (auto-split, adjust, profit, mark paid both ways, timeline, delivery proof); Payments and chasing; Suppliers and paying them; Invoices; Settings (minimum order, delivery charge, VAT display, delivery days, bank details); plus supplier and user management.
SUPPLIER and DRIVER, 4: Supplier orders list; Supplier order detail with driver-link generation; Driver mobile page (photo, document, signature, submit); Driver submitted confirmation.

Also deliver the unglamorous essentials the mockup skips: loading, empty and error states, 404 and 403 pages, form validation, forgot-password / reset-password, email-verification or invite flow for admin-created accounts, and responsive behaviour. Restaurants and drivers will use phones, so mobile quality matters (especially the shop, basket and driver pages). Admin is desktop first but must not break on a tablet.

## 5. Design direction

Keep this simple: **the design is entirely yours.** Use your own creativity and your design and UI/UX skills (load and follow them properly) for layout, typography, colours, components and style. Do not imitate the reference mockup.

One fixed point: **use the client's own identity.** The business name, logo and any brand colours or fonts he specified are in `/brand/` (logo files, plus a short `brand.md` with the name and colours if he gave them). Use exactly what is there. Put the name, logo and colours in one central config and design-token file so the whole site can be re-skinned in minutes for a future client. If `/brand/` is empty or incomplete, do not guess: use a neutral working name and a text wordmark kept behind that single config, tell me once, and carry on. No other website's logo, name or colours are to be used or imitated.

Make it work well on phones (shop, basket, driver page) and be accessible. Build a small reusable design system first, then reuse it everywhere.

## 6. Technical direction

You may deviate if you have a strong reason; write the reason in `DECISIONS.md`.

- **Stack:** Next.js (App Router, TypeScript, latest stable), React, Tailwind, Supabase (Postgres, Auth, Storage, Row Level Security, optionally Realtime), deployed on **Vercel**. This matches my existing Wicket Travel portals repo, so it is a stack I run and can support. Note that recent Next.js versions have breaking changes (for example `params` is a Promise, `middleware` became `proxy`): read the docs shipped in `node_modules/next/dist/docs/` before writing framework code rather than relying on memory.
- **Server-first:** use server components and server actions or route handlers for mutations. Validate every input on the server (zod or equivalent). Do not trust the client.
- **Security is the main engineering risk in this project. Treat these as hard requirements and prove them with tests:**
  - Public and unapproved users can never obtain a price, cost, margin or customer data, not through pages, not through API responses, not through RSC payloads, not through Supabase queries. Prices and costs live behind RLS and server-side projections.
  - Restaurant A can never see restaurant B's prices, orders, invoices, addresses or files.
  - Suppliers see only their own supplier orders and never sell prices or margins.
  - Only admins can change prices, approve accounts, record payments, or edit orders. Roles come from a trusted server-side source, never from user-editable metadata.
  - Driver tokens are long, random, hashed at rest, expiring and scoped to one supplier order. Uploaded files are validated and private. Service-role keys are server-only and never reach the browser bundle.
  - Rate limiting on registration, login-adjacent routes, and the driver endpoints. Basic audit log for price, payment and order edits (who, what, when).
- **Data model (a starting point, refine it):** profiles(role), customers (business, address, status pending/approved/rejected, default margin), suppliers, categories, products, product_variants (size label, supplier, cost, VAT rate, sku, active, photo), customer_category_access (and optional product allow/deny), customer_pricing (category margins and fixed overrides), orders, order_items (snapshotted price, cost, VAT, supplier), supplier_orders, delivery_proofs (token hash, expiry, photo, document, signature, submitted_at), customer_payments, supplier_payments, invoices (sequential numbering), settings, audit_log, notifications/email_log.
- **Pricing engine, order splitting, VAT, delivery-charge and invoice-total logic must be pure, well-typed, unit-tested functions** in one place, used by both UI previews and server-side order creation. The server recomputes everything; it never trusts client-sent totals.
- **Money:** store as integer pence (or numeric with strict rounding rules). Define and document rounding. No floating-point money anywhere.
- **Email:** transactional email for approval, new order to supplier, order changes, order confirmation and invoice, password reset. Use a provider you judge best on Vercel (Resend or SMTP via nodemailer, as in my other project); tell me which keys you need.
- **PDFs:** generate invoices server-side with a sound library; they must render the client's logo from `/brand/`, VAT lines and bank details correctly.
- **Performance and reliability:** index what you query, paginate lists, keep the 600+ item catalogue fast, use sensible caching for the public catalogue (which has no prices), and handle failures from email/storage gracefully.

## 7. How you must work

**Plan first, then execute in phases, all of it yourself.**
1. Read this brief, glance at the reference mockup, inspect the source PDFs, and read the repo state. Then create `PLAN.md` (phases, route map, data model, risks, test plan) and `DECISIONS.md`, and keep both current. Create `CLAUDE.md` (and a `MEMORY.md` like my other project's) recording non-obvious facts and traps so a fresh session can pick the project up cold.
2. Keep a live task list. Suggested phases (reorder if you see better): foundation and design system; auth, roles, RLS; catalogue, import and public pages; customer approval and per-customer pricing; shop, basket, checkout, order creation and split; supplier portal and driver proof flow; admin orders, payments, chasing, suppliers; invoices and email; polish, accessibility, performance, hardening; deploy.
3. Commit small and often on a branch per phase with clear messages, and open PRs if a GitHub remote is available. Never commit secrets. Provide `.env.example`.

**Verification is part of the job, not a final step.** For every phase, before you call it done:
- `tsc`, lint and a production build must pass.
- Unit tests for the pricing engine, VAT, delivery charge, order split and rounding.
- **Security tests that attempt the forbidden things** (anonymous price access, cross-customer reads, supplier reading prices, non-admin writes, expired or reused driver tokens, oversized or disallowed uploads) and show they fail.
- End-to-end tests (Playwright) of the real journeys: register, admin approves, restaurant logs in, orders, order splits to two suppliers, supplier generates a driver link, driver submits proof, admin marks payments, invoice downloads.
- Look at the UI yourself: screenshot key screens at mobile and desktop widths and fix what is ugly or broken. Do not report a screen finished without having seen it.
- Never claim something works without having run it. If you could not verify something, say so plainly.

**Database changes:** write numbered, re-runnable SQL migrations (`supabase/migrations/NNNN_name.sql`) with RLS policies, indexes and seed data. Whenever I need to run SQL, give me: the exact file path, what it does, what to expect, and how to confirm it worked. Batch SQL sensibly so I am not running something every ten minutes. If the Supabase CLI or service credentials are available to you, say so and use them; otherwise I run the SQL for you.

**Environment and deployment:** keep a running list of every environment variable (name, purpose, where to obtain it, which Vercel environments: Production / Preview / Development, server-only or public). When it is time, give me one clean checklist to enter into Vercel. Flag anything that must be set before first deploy. After deployment, smoke-test the live site yourself.

**When to interrupt me:** only for (a) secrets, SQL to run, Vercel/DNS/domain settings; (b) client-owned content you cannot invent, such as real bank details, business address, legal name, VAT number, terms text, real prices, and which items are in which customer's catalogue; (c) a genuine fork where the wrong guess is expensive and cannot be undone. Otherwise decide, record the assumption in `DECISIONS.md`, and continue. Use obvious, clearly labelled placeholders for client content and list them for me at the end of each phase.

**Reporting:** at the end of each phase, give me a short status: what works (verified how), what you assumed, what I must do next (SQL, env, content), and the next phase. No long narration in between.

## 8. Definition of done for v1

- All 29 screens exist, are responsive, accessible and consistent, and the flows in section 3 work end to end on the deployed Vercel site.
- The public site shows products with no prices anywhere; registration, approval and admin-created accounts work.
- Per-customer pricing and per-customer category sets work and are tested; order lines snapshot price, cost and VAT.
- Orders split by supplier, suppliers see only their share, drivers can submit photo, document and signature via the link, and the proof shows up for the customer and admin.
- Admin can track paid/unpaid, promised date, chase date, supplier payments and profit; invoices download as PDF; customers see order and invoice history.
- The Shrivi, drinks and packaging lists are imported as products (prices pending), and I have a list of items still missing price or photo.
- Tests, type-check, lint and build are green; security tests prove the isolation rules; nothing sensitive is exposed to the browser.
- `README.md`, `CLAUDE.md`, `MEMORY.md`, `PLAN.md`, `DECISIONS.md` and `.env.example` are current, and I have a short handover note explaining how the client runs day-to-day (approve a customer, set a price, handle an order, record a payment).

Start now: look at the reference mockup and source files, write `PLAN.md`, show me the plan in a short summary with your assumptions and the very first things you need from me (Supabase project, env vars), then begin Phase 1.
