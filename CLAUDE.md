@AGENTS.md

# Project: B2B wholesale grocery ordering portal

Read `PLAN.md` (phases, routes, data model), `DECISIONS.md` (why), `MEMORY.md` (traps) before changing anything.

## Commands
- `npm run verify` — typecheck + lint + unit tests + production build. Must be green before every push.
- `npm test` — Vitest unit tests (`tests/unit`). Pure domain logic only.
- `npm run db:start` — local Supabase via Docker (uses Docker Hub mirror; see MEMORY.md). `npm run db:reset` re-applies migrations + seed.
- `npm run typecheck` runs `next typegen` first (needed for global `PageProps`/`LayoutProps` types).

## Architecture rules (non-negotiable)
- **Money is integer pence, rates are integer basis points.** Never float maths on money. Use `src/domain/money.ts`.
- **All pricing/VAT/delivery/totals/split logic lives in `src/domain/`** (pure, no I/O, unit-tested). UI previews and server order creation both call it; the server always recomputes.
- **Costs, margins and overrides never reach a non-admin browser.** Customer prices are resolved server-side and only the result is sent. Service-role Supabase client only in `server-only` modules.
- **Roles come from `profiles.role` in the database**, never from user metadata or client input.
- Order lines **snapshot** price, cost, VAT rate and supplier. Never read live prices for an existing order.
- Brand name/colours only from `src/config/brand.ts` and `src/app/tokens.css`.
- UI: reuse `src/components/ui/*`; shells in `src/components/shell/*`. Mobile first for shop, basket and driver pages.

## Next.js 16 specifics
- `proxy.ts` (not `middleware.ts`), Node runtime only.
- `params`, `searchParams`, `cookies()`, `headers()` are async.
- `error.tsx` receives `{ error, retry }` (not `reset`).
- `revalidateTag(tag, profile)` needs two args; `updateTag` for read-your-writes in actions.
- `forbidden()` enabled via `experimental.authInterrupts`.
