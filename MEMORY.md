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
