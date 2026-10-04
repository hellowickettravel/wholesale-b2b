import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Check, Clock, Mail } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { AuthShell } from "@/components/shell/auth-shell";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/cn";
import { getViewer, homeFor } from "@/server/auth";

export const metadata: Metadata = { title: "Account under review" };

type StepState = "done" | "current" | "todo";

function Steps({ steps }: { steps: { label: string; detail: string; state: StepState }[] }) {
  return (
    <ol className="space-y-0">
      {steps.map((s, i) => (
        <li key={s.label} className="relative flex gap-4 pb-6 last:pb-0">
          {i < steps.length - 1 ? (
            <span aria-hidden="true" className={cn("absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5", s.state === "done" ? "bg-primary" : "bg-line")} />
          ) : null}
          <span
            className={cn(
              "relative grid size-8 shrink-0 place-items-center rounded-full border-2",
              s.state === "done" && "border-primary bg-primary text-primary-ink",
              s.state === "current" && "border-accent bg-accent-soft text-accent-ink",
              s.state === "todo" && "border-line-strong bg-raised text-ink-subtle",
            )}
          >
            {s.state === "done" ? <Check className="size-4" aria-hidden="true" /> : s.state === "current" ? <Clock className="size-4" aria-hidden="true" /> : <span className="text-xs font-bold">{i + 1}</span>}
          </span>
          <div className="pt-1">
            <p className="font-semibold text-ink">
              {s.label}
              <span className="sr-only"> ({s.state === "done" ? "done" : s.state === "current" ? "in progress" : "to do"})</span>
            </p>
            <p className="mt-0.5 text-sm text-ink-muted">{s.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default async function PendingPage() {
  const viewer = await getViewer();

  // Not signed in: they have just registered and must confirm their email.
  if (!viewer) {
    return (
      <AuthShell title="Check your inbox" description="One more step before we can review your account.">
        <div className="mb-8 rounded-[var(--radius-lg)] border border-line bg-raised p-5">
          <Mail className="size-6 text-primary" aria-hidden="true" />
          <p className="mt-3 text-[15px] leading-relaxed text-ink">
            If that email address can be used for a new account, we have sent it a confirmation link. Open it on this device to confirm your email.
          </p>
          <p className="mt-3 text-sm text-ink-muted">Nothing there after a few minutes? Check your spam folder, or sign in and we will send a fresh link.</p>
        </div>
        <Steps
          steps={[
            { label: "Account details sent", detail: "Thanks for registering.", state: "done" },
            { label: "Confirm your email", detail: "Click the link we emailed you.", state: "current" },
            { label: "We review your account", detail: "Usually the same working day.", state: "todo" },
          ]}
        />
        <div className="mt-8">
          <LinkButton href="/login" variant="secondary" block size="lg">Go to sign in</LinkButton>
        </div>
      </AuthShell>
    );
  }

  if (viewer.role !== "customer" || viewer.customer?.status === "approved" || !viewer.active) {
    redirect(homeFor(viewer));
  }

  const footer = <SignOutButton className="text-ink-muted hover:text-ink" />;

  if (!viewer.customer) {
    return (
      <AuthShell title="Your registration is incomplete" footer={footer}>
        <Alert tone="warning">We could not find the business details for this account. Please contact us and we will finish setting it up.</Alert>
      </AuthShell>
    );
  }

  if (viewer.customer.status === "rejected" || viewer.customer.status === "suspended") {
    const supabase = await createClient();
    const { data } = await supabase.from("customers").select("status_reason").eq("id", viewer.customer.id).maybeSingle();
    const rejected = viewer.customer.status === "rejected";
    return (
      <AuthShell title={rejected ? "We couldn't approve this account" : "This account is on hold"} footer={footer}>
        <Alert tone="warning" title={viewer.customer.businessName}>
          {data?.status_reason || (rejected ? "Please contact us if you think this is a mistake." : "Please contact us to reopen your account.")}
        </Alert>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Thanks, we're reviewing your account"
      description={<>We check every trade account before showing prices. You will get an email as soon as <strong className="text-ink">{viewer.customer.businessName}</strong> is approved.</>}
      footer={footer}
    >
      <Steps
        steps={[
          { label: "Account details sent", detail: "Thanks for registering.", state: "done" },
          { label: "Email confirmed", detail: viewer.email, state: "done" },
          { label: "We review your account", detail: "Usually the same working day. We may call to agree your prices.", state: "current" },
        ]}
      />
      <div className="mt-8">
        <LinkButton href="/catalogue" variant="secondary" block size="lg">Browse the catalogue meanwhile</LinkButton>
      </div>
    </AuthShell>
  );
}
