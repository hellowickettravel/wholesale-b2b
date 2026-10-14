"use server";
import { revalidatePath } from "next/cache";
import { brand } from "@/config/brand";
import type { FormState } from "@/lib/validation/auth";
import { requireRole } from "@/server/auth";
import { requeueFailedEmails, sendQueuedEmails } from "@/server/email-queue";
import { renderTest } from "@/server/email-render";
import { mailerConfigured, sendMail } from "@/server/mailer";

function setUp(): FormState | null {
  return mailerConfigured() ? null : { error: "Email is not set up yet. Add the SMTP settings in Vercel (see the box on this page), then redeploy." };
}

export async function sendQueuedNow(): Promise<FormState> {
  await requireRole("admin");
  const blocked = setUp();
  if (blocked) return blocked;
  const r = await sendQueuedEmails(100);
  revalidatePath("/admin/emails");
  if (r.failed) return { error: `${r.sent} sent, ${r.failed} failed. See the error in the list below.` };
  return { notice: r.sent ? `${r.sent} ${r.sent === 1 ? "email" : "emails"} sent.${r.waiting ? ` ${r.waiting} still waiting.` : ""}` : "Nothing was waiting to be sent." };
}

export async function retryFailed(): Promise<FormState> {
  await requireRole("admin");
  const blocked = setUp();
  if (blocked) return blocked;
  const n = await requeueFailedEmails();
  const r = await sendQueuedEmails(100);
  revalidatePath("/admin/emails");
  if (r.failed) return { error: `${r.sent} sent, ${r.failed} failed again. See the error in the list below.` };
  return { notice: n ? `${r.sent} of ${n} sent.` : "No failed emails to retry." };
}

/** Sends a test message to the signed-in admin's own address (never to anyone else). */
export async function sendTestEmail(): Promise<FormState> {
  const viewer = await requireRole("admin");
  const blocked = setUp();
  if (blocked) return blocked;
  const res = await sendMail({ to: viewer.email, subject: `Test email from ${brand.name}`, ...renderTest() });
  return res.error ? { error: `The test email failed: ${res.error}` } : { notice: `Test email sent to ${viewer.email}. Check the inbox (and spam).` };
}
