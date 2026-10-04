# MEMORY — non-obvious facts and traps

- **Local Supabase in the cloud container:** AWS ECR (public.ecr.aws) image downloads are blocked by the
  egress proxy. Use Docker Hub: `SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io` (baked into `npm run db:start`).
  The Docker daemon may need starting first: `nohup dockerd >/tmp/dockerd.log 2>&1 &`.
- **Playwright browsers:** the preinstalled Chromium is at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`,
  which may not match the installed `@playwright/test` version. Pass `executablePath` (env `PW_CHROMIUM`). Never run `playwright install`.
- `waitUntil: "networkidle"` hangs on Next pages (prefetch); use `load`.
- `pkill -f "next start"` / `pkill -f "supabase start"` kills the calling shell too (pattern matches the shell's own command line). Kill by PID.
- `vitest.config.mts` (not .ts): package is CommonJS, Vite warns on ESM in .ts config.
- `.env*` is git-ignored except `.env.example`.
- Source PDFs, `/brand/` and the mockup were **not** supplied at kickoff (3 Oct 2026). Brand is the placeholder "Order Desk".
- Parser rule: sizes are taken from the **last** size expression in a name; grouping only on exact normalised
  base name within the same category. Unparseable rows become a single "Each" variant and are reported.
- Delivery VAT defaults to `apportioned` across the basket's VAT bands (DECISIONS D5): accountant to confirm.

## Phase 2 additions
- **Docker Hub 429s:** if `npm run db:start` fails pulling an image with 429, pull it from Google's
  mirror and retag: `docker pull mirror.gcr.io/library/kong:2.8.1 && docker tag mirror.gcr.io/library/kong:2.8.1 kong:2.8.1`
  (same for `postgrest/postgrest:<tag>`).
- **Supabase MCP connector:** any SQL containing DROP or DELETE (even inside a function body or an
  `execute format('drop …')` string) hangs until the 60 s timeout and does nothing (it waits for a
  confirmation that never arrives). Write migrations without them (DECISIONS D20). Large chunks are
  fine; apply in pieces of a few KB and verify with the fingerprint query in HANDOVER.md.
- **New tables are private by default** (0002 revokes default privileges). Every new table/view/
  function needs explicit GRANTs and RLS in its migration, plus security tests.
- Hosted and local default privileges differ (hosted grants EXECUTE to PUBLIC); always revoke
  `from public` explicitly on new functions.
- `customer_*` and `supplier_*` views run as owner and MUST filter by the helper functions.
- Role helper is `public.app_role()` (not `current_role()`: reserved word).
- Local auth: email confirmations ON, emails land in Mailpit at http://127.0.0.1:54324 (E2E reads
  its API). Seed accounts (password `Password123!`): admin@, supplier.a@, supplier.b@,
  restaurant.a@, restaurant.b@, pending@ (all `@example.com`).
- Auth config changes in `supabase/config.toml` need `npx supabase stop && npm run db:start`.
- **Rate limits bite in tests:** >50 sign-ins from 127.0.0.1 in 15 min trips `loginPerIp`.
  E2E global setup and `scripts/screens.mts` truncate `rate_limits` first.
- Restart the prod server with `scripts/serve.sh` (kills by PID; `lsof`/`ss` are not installed).
- Playwright: Next renders an empty `role="alert"` route announcer; scope alerts to `main`.
  Labels of required fields include a visual `*`, so locate password inputs by `name`.
- Domain `PaymentTerms` uses `7_days`/`date` but the DB enum is `within_7_days`/`on_date`:
  reconcile in Phase 5.
- `promote_to_admin(email)` is the only way to create the first admin on a fresh project.

## Phase 3 additions
- Launch categories are created by migration 0005 with fixed ids `ca7e0000-0000-4000-a000-0000000000NN`
  (01 Rice … 10 Drinks, 11 Packing & Cleaning). The seed references them; it no longer inserts categories.
- `tests/fixtures/catalogue-sample.csv` is **sample data for local dev/tests only** (made-up generic
  lines, no prices). E2E global setup imports it (idempotent). Never import it into the hosted project.
- Import CLI: `npx tsx --env-file=.env.local scripts/import-catalogue.mts <file.csv> --supplier NAME --source LABEL [--apply]`
  (dry run without `--apply`). Same code as `/admin/products/import`.
- PostgREST caps responses at 1000 rows: page with `.range()` (see `pageAll` in `src/lib/import/apply.ts`).
- `pg` returns bigint columns (e.g. `cost_pence`) as strings in tests: cast `::int` in SQL.
- `next/image` refuses local IPs in Next 16; `next.config.ts` sets `dangerouslyAllowLocalIP` only
  when the Supabase URL is 127.0.0.1/localhost.
- Admin forms use Tailwind container queries (`@container`, `@lg:`) because the same form sits in
  wide and narrow cards.
- Storage: non-admin DELETE on `storage.objects` is refused outright (42501), not filtered to 0 rows.
- `scripts/screens.mts` also writes `<name>-390-fold.png` (first screen only): long phone pages are
  unreadable when a full-page capture is scaled down.
- Container egress blocks the client's source sites and stock-photo hosts (unsplash, pexels,
  wikimedia). `pdftotext` is installed for the PDFs when they arrive.
