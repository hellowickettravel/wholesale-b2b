/**
 * Audit crawler: signs in (optional), then walks every same-origin link it can find (breadth first, at most
 * MAX_PER_PATTERN pages per URL shape, so /admin/orders/<id> is sampled, not exhausted) and records, per page:
 * HTTP status, console errors, failed or 4xx/5xx requests, broken images, horizontal overflow, placeholder text,
 * and a screenshot. Read-only: it only navigates (GET), it never submits a form.
 *
 *   BASE=https://www.wholesalestreet.co.uk OUT=/tmp/crawl WIDTH=1280 \
 *   EMAIL=... PASSWORD=... START=/admin npx tsx scripts/audit-crawl.mts
 *
 * Credentials come from the environment only and are never written anywhere.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, type Page } from "@playwright/test";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/$/, "");
const OUT = process.env.OUT ?? "test-results/crawl";
const WIDTH = Number(process.env.WIDTH ?? 1280);
const START = (process.env.START ?? "/").split(",");
const MAX_PAGES = Number(process.env.MAX_PAGES ?? 120);
const MAX_PER_PATTERN = Number(process.env.MAX_PER_PATTERN ?? 2);
const SKIP = new RegExp(process.env.SKIP ?? "^/(auth/signout|api/)|\\.csv$|/pdf$");
const executablePath = process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const PLACEHOLDER = /\[[A-Za-z0-9][^\]\n]{0,40}\]|Order Desk|lorem|undefined|NaN|\[object|TODO|Enamel|coming soon/i;

mkdirSync(OUT, { recursive: true });

const shape = (p: string) =>
  p
    .split("?")[0]
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, ":id")
    .replace(/\/\d+(?=\/|$)/g, "/:n")
    .replace(/(\/(?:catalogue|shop\/p|d))\/[^/]+$/, "$1/:slug");

type Rec = {
  path: string; from: string; status: number; finalUrl: string; title: string; h1: string;
  consoleErrors: string[]; badRequests: string[]; brokenImages: string[]; overflowPx: number;
  placeholders: string[]; buttons: number; links: number; ms: number;
};

async function main() {
  const browser = await chromium.launch({ executablePath });
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();

  if (process.env.EMAIL && process.env.PASSWORD) {
    await page.goto(`${BASE}/login`, { waitUntil: "load" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.getByLabel("Email").fill(process.env.EMAIL);
    await page.locator('input[name="password"]').fill(process.env.PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 }).catch(() => {});
    console.log("signed in →", new URL(page.url()).pathname);
  }

  const queue: { path: string; from: string }[] = START.map((p) => ({ path: p, from: "(start)" }));
  const seen = new Set<string>();
  const perShape = new Map<string, number>();
  const recs: Rec[] = [];
  const edges: { from: string; to: string; status: number }[] = [];

  while (queue.length && recs.length < MAX_PAGES) {
    const { path, from } = queue.shift()!;
    if (seen.has(path) || SKIP.test(path)) continue;
    const s = shape(path);
    if ((perShape.get(s) ?? 0) >= MAX_PER_PATTERN) continue;
    seen.add(path);
    perShape.set(s, (perShape.get(s) ?? 0) + 1);

    const consoleErrors: string[] = [];
    const badRequests: string[] = [];
    const onConsole = (m: { type(): string; text(): string }) => {
      if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200));
    };
    const onFail = (r: { url(): string; failure(): { errorText: string } | null }) => {
      const e = r.failure()?.errorText ?? "";
      if (!/ABORTED/i.test(e)) badRequests.push(`FAIL ${e} ${r.url().slice(0, 140)}`);
    };
    const onResp = (r: { status(): number; url(): string }) => {
      if (r.status() >= 400) badRequests.push(`${r.status()} ${r.url().slice(0, 140)}`);
    };
    page.on("console", onConsole);
    page.on("requestfailed", onFail);
    page.on("response", onResp);

    const t0 = Date.now();
    let status = 0;
    try {
      const resp = await page.goto(BASE + path, { waitUntil: "load", timeout: 45_000 });
      status = resp?.status() ?? 0;
      await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
    } catch (e) {
      consoleErrors.push(`NAV ${(e as Error).message.slice(0, 120)}`);
    }
    const ms = Date.now() - t0;
    page.off("console", onConsole);
    page.off("requestfailed", onFail);
    page.off("response", onResp);

    const info = await page.evaluate(() => {
      const doc = document.documentElement;
      const imgs = Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0 && i.currentSrc);
      const text = document.body?.innerText ?? "";
      const hrefs = Array.from(document.querySelectorAll("a[href]"))
        .map((a) => a.getAttribute("href") ?? "")
        .filter((h) => h.startsWith("/") && !h.startsWith("//"));
      return {
        title: document.title,
        h1: document.querySelector("h1")?.textContent?.trim().slice(0, 80) ?? "",
        overflow: Math.max(0, doc.scrollWidth - doc.clientWidth),
        broken: imgs.map((i) => i.currentSrc.slice(0, 120)),
        text,
        hrefs,
        buttons: document.querySelectorAll("button, [role=button], input[type=submit]").length,
        links: hrefs.length,
      };
    });

    const placeholders = Array.from(new Set(info.text.match(new RegExp(PLACEHOLDER, "gi")) ?? [])).slice(0, 8);
    const finalPath = new URL(page.url()).pathname + new URL(page.url()).search;
    recs.push({
      path, from, status, finalUrl: finalPath, title: info.title, h1: info.h1, consoleErrors, badRequests,
      brokenImages: info.broken, overflowPx: info.overflow, placeholders, buttons: info.buttons, links: info.links, ms,
    });

    const file = `${OUT}/${path.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "home"}-${WIDTH}.png`;
    await page.screenshot({ path: file, fullPage: true }).catch(() => {});

    for (const h of Array.from(new Set(info.hrefs))) {
      const clean = h.split("#")[0];
      if (!clean || clean.startsWith("/_next") || SKIP.test(clean)) continue;
      edges.push({ from: path, to: clean, status: -1 });
      if (!seen.has(clean)) queue.push({ path: clean, from: path });
    }
    process.stdout.write(`${status} ${path} ${ms}ms${info.overflow ? " OVERFLOW" + info.overflow : ""}${badRequests.length ? " BADREQ" + badRequests.length : ""}\n`);
  }

  writeFileSync(`${OUT}/report-${WIDTH}.json`, JSON.stringify({ base: BASE, width: WIDTH, recs, unvisited: queue.length }, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
