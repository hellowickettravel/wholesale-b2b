import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/shell/auth-shell";
import { getViewer, homeFor } from "@/server/auth";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Open a trade account" };

export default async function RegisterPage() {
  const viewer = await getViewer();
  if (viewer) redirect(homeFor(viewer));
  return (
    <AuthShell
      wide
      title="Open a trade account"
      description="For restaurants and food businesses. Tell us where you are and we'll set up your price list."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
