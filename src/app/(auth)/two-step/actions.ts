"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation/auth";
import { getViewer } from "@/server/auth";
import { hit } from "@/server/rate-limit";

const code = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app");

/** Passes the second step of sign-in: checks the 6-digit code, which upgrades this session (aal2). */
export async function verifyTwoStep(_prev: FormState, fd: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin" || !viewer.active) redirect("/login");
  const parsed = code.safeParse(fd.get("code"));
  if (!parsed.success) return { fieldErrors: { code: [parsed.error.issues[0].message] } };
  if (!(await hit("twoStepPerUser", viewer.userId))) return { error: "Too many attempts. Wait 15 minutes and try again." };

  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp?.[0];
  if (!factor) redirect("/admin");
  const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: factor.id });
  if (cErr || !challenge) return { error: "Could not start the check. Please try again." };
  const { error } = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.id, code: parsed.data });
  if (error) return { fieldErrors: { code: ["That code is not right. Codes change every 30 seconds."] } };

  const next = String(fd.get("next") ?? "");
  redirect(next.startsWith("/admin") && !next.startsWith("//") && !next.includes("\\") ? next : "/admin");
}
