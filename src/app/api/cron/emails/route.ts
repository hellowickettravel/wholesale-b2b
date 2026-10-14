import { timingSafeEqual } from "node:crypto";
import { sendQueuedEmails } from "@/server/email-queue";

/**
 * Safety net: sends anything still waiting in the outbox (an email that failed once, or one queued while SMTP was
 * not yet set up). Vercel Cron calls it daily with `Authorization: Bearer $CRON_SECRET`; without CRON_SECRET the
 * route refuses everyone.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  const ok = Boolean(secret) && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return new Response("Forbidden", { status: 403 });
  const summary = await sendQueuedEmails(100);
  return Response.json(summary, { headers: { "Cache-Control": "no-store" } });
}
