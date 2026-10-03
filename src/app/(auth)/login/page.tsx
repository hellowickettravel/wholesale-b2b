import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { AuthShell } from "@/components/shell/auth-shell";
import { destinationFor, getViewer } from "@/server/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const NOTICES: Record<string, { tone: "info" | "success" | "warning"; text: string }> = {
  "signed-out": { tone: "success", text: "You have signed out." },
  "link-expired": {
    tone: "warning",
    text: "That link has expired or has already been used. Sign in, or ask for a new link below.",
  },
  "password-updated": { tone: "success", text: "Your password has been changed. Sign in with your new password." },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const notice = typeof params.notice === "string" ? NOTICES[params.notice] : undefined;

  const viewer = await getViewer();
  if (viewer) redirect(destinationFor(viewer, next));

  return (
    <AuthShell
      title="Sign in"
      description="Restaurants, suppliers and staff all sign in here."
      footer={
        <>
          New to us?{" "}
          <Link href="/register" className="font-semibold text-primary underline-offset-4 hover:underline">
            Open a trade account
          </Link>
        </>
      }
    >
      {notice ? (
        <Alert tone={notice.tone} className="mb-6">
          {notice.text}
        </Alert>
      ) : null}
      <LoginForm next={next} />
    </AuthShell>
  );
}
