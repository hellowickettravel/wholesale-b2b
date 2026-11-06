import { timingSafeEqual } from "node:crypto";
import { requeueRecentFailures, sendQueuedEmails } from "@/server/email-queue";

/**
 * Safety net: retries emails that failed in the last three days, then sends anything still waiting in the outbox
 * (including emails queued while SMTP was not yet set up). Vercel Cron calls it daily with `Authorization: Bearer $CRON_SECRET`; without CRON_SECRET the
 * route refuses everyone.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  const ok = Boolean(secret) && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return new Response("Forbidden", { status: 403 });
  const retried = await requeueRecentFailures(3);
  const summary = await sendQueuedEmails(100);
  return Response.json({ ...summary, retried }, { headers: { "Cache-Control": "no-store" } });
}
