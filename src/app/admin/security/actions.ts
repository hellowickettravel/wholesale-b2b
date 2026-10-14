"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation/auth";
import { requireRole } from "@/server/auth";
import { hit } from "@/server/rate-limit";

const code = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app");

export interface EnrolState extends FormState {
  factorId?: string;
  qr?: string;
  secret?: string;
}

/** Starts setting up the authenticator app: returns the QR code and the typed-in secret. Nothing is switched on yet. */
export async function startEnrolment(): Promise<EnrolState> {
  const viewer = await requireRole("admin");
  if (!(await hit("twoStepPerUser", viewer.userId))) return { error: "Too many attempts. Wait 15 minutes and try again." };
  const supabase = await createClient();
  // Clear half-finished attempts so they do not pile up.
  const { data: existing } = await supabase.auth.mfa.listFactors();
  for (const f of existing?.all ?? []) if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}`, issuer: "Wholesale Street" });
  if (error || !data) {
    console.error("mfa enroll", error?.code, error?.message);
    return { error: "Two-step sign-in could not be started. Check that it is switched on in Supabase (Authentication, Multi-Factor), then try again." };
  }
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

/** Finishes set-up: the first correct code turns two-step sign-in on and marks this session as verified. */
export async function confirmEnrolment(factorId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await requireRole("admin");
  const parsed = code.safeParse(fd.get("code"));
  if (!parsed.success) return { fieldErrors: { code: [parsed.error.issues[0].message] } };
  if (!(await hit("twoStepPerUser", viewer.userId))) return { error: "Too many attempts. Wait 15 minutes and try again." };
  const supabase = await createClient();
  const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
  if (cErr || !challenge) return { error: "Could not start the check. Start again." };
  const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: parsed.data });
  if (error) return { fieldErrors: { code: ["That code is not right. Codes change every 30 seconds."] } };
  revalidatePath("/admin/security");
  return { notice: "Two-step sign-in is on. From now on, signing in asks for a code from your app." };
}

/** Switches two-step sign-in off. Needs a fresh correct code, so a stolen session cannot do it. */
export async function disableTwoStep(_prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await requireRole("admin");
  const parsed = code.safeParse(fd.get("code"));
  if (!parsed.success) return { fieldErrors: { code: [parsed.error.issues[0].message] } };
  if (!(await hit("twoStepPerUser", viewer.userId))) return { error: "Too many attempts. Wait 15 minutes and try again." };
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp?.[0];
  if (!factor) return { notice: "Two-step sign-in is already off." };
  const { data: challenge } = await supabase.auth.mfa.challenge({ factorId: factor.id });
  if (!challenge) return { error: "Could not start the check. Please try again." };
  const { error } = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.id, code: parsed.data });
  if (error) return { fieldErrors: { code: ["That code is not right. Codes change every 30 seconds."] } };
  const { error: uErr } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
  if (uErr) return { error: "Could not switch it off. Please try again." };
  revalidatePath("/admin/security");
  return { notice: "Two-step sign-in is off." };
}
