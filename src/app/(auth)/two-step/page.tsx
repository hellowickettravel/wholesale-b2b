import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/shell/auth-shell";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/server/auth";
import { TwoStepForm } from "./two-step-form";

export const metadata: Metadata = { title: "Two-step sign-in" };

export default async function TwoStepPage({ searchParams }: PageProps<"/two-step">) {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin" || !viewer.active) redirect("/login");
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!data || data.nextLevel !== "aal2" || data.currentLevel === "aal2") redirect("/admin");
  const next = (await searchParams).next;
  return (
    <AuthShell title="Two-step sign-in" description="Enter the code from your authenticator app to open the admin area." footer={<SignOutButton className="text-ink-muted hover:text-ink" />}>
      <TwoStepForm next={typeof next === "string" ? next : undefined} />
    </AuthShell>
  );
}
