# Wholesale ordering portal

B2B grocery ordering for restaurants: per-customer catalogues and prices, orders split by supplier,
driver proof of delivery, manual bank-transfer payment ledger, PDF invoices.

Stack: Next.js 16 (App Router) · React 19 · Tailwind v4 · Supabase (Postgres, Auth, Storage, RLS) · Vercel.

## Getting started

```bash
npm install
npm run db:start                 # local Supabase (Docker); prints keys
cp .env.example .env.local       # fill in keys from the previous step
npm run dev
```

## Checks
```bash
npm run db:reset        # migrations + local seed (do this BEFORE building: see MEMORY.md)
npm run verify          # typecheck, lint, unit tests, build
npm run test:security   # RLS/API attacks as anon, customers, supplier, admin (local stack)
npm run test:e2e        # Playwright: journeys, invoices, accessibility (axe), payload leak scans
npx tsx --env-file=.env.local scripts/import-catalogue.mts <file.csv> --supplier NAME --source LABEL [--apply]
npx tsx scripts/screens.mts         # screenshots at 390/1280 into test-results/screens
```

## Docs
- `HANDOVER.md`: current status, deploy checklist, what the owner must do
- `docs/CLIENT-GUIDE.md`: how the business runs day to day (approve, price, orders, payments)
- `PLAN.md`: phases, route map, data model, test plan
- `DECISIONS.md`: decisions and reasons (money, VAT, pricing, security)
- `CLAUDE.md` / `MEMORY.md`: working notes for engineers and agents
- `/styleguide`: design system (not available on production)

## Re-skinning
Edit `src/config/brand.ts`, `src/app/tokens.css`, and put logo files in `public/brand/`.
