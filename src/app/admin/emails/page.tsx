import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyNote } from "@/components/admin/empty-note";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { formatTimestamp } from "@/domain/dates";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";
import { fromAddress, mailerConfigured } from "@/server/mailer";
import { EmailTools } from "./email-tools";

export const metadata: Metadata = { title: "Emails" };

const TONE = { queued: "warning", sent: "success", failed: "danger", skipped: "neutral" } as const;
const NAME: Record<string, string> = {
  order_confirmation: "Order confirmation",
  supplier_order_new: "New order to supplier",
  supplier_order_changed: "Order changed (supplier)",
  supplier_order_cancelled: "Order cancelled (supplier)",
  order_delivered: "Delivered",
  order_changed: "Order changed",
  order_cancelled: "Order cancelled",
  payment_reminder: "Payment reminder",
  account_approved: "Account approved",
  account_rejected: "Account rejected",
  admin_new_registration: "New registration (team)",
};

export default async function EmailsPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const [{ data: rows }, queued, failed] = await Promise.all([
    supabase.from("email_log").select("id, created_at, to_email, template, subject, status, error").order("created_at", { ascending: false }).limit(100),
    supabase.from("email_log").select("id", { count: "exact", head: true }).eq("status", "queued"),
    supabase.from("email_log").select("id", { count: "exact", head: true }).eq("status", "failed"),
  ]);
  const configured = mailerConfigured();
  return (
    <>
      <PageHeader title="Emails" description="Order confirmations, supplier orders, approvals and reminders that the system sends, and what happened to each." />
      {configured ? (
        <Alert tone="success" title="Email is on" className="mb-4">Emails go out as {fromAddress()}. Waiting emails are sent after the action that created them, and you can send them yourself below.</Alert>
      ) : (
        <Alert tone="warning" title="Email is not set up yet" className="mb-4">
          Nothing is being sent: emails wait in the list below and will go out once the settings are added. In Vercel add <code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code> and <code>EMAIL_FROM</code>, then redeploy.
        </Alert>
      )}
      <Card className="mb-6">
        <CardHeader title="Tools" description="A test email goes only to your own address." />
        <CardBody><EmailTools queued={queued.count ?? 0} failed={failed.count ?? 0} /></CardBody>
      </Card>
      <Card>
        {!rows?.length ? (
          <EmptyNote title="No emails yet">They appear here when someone orders, an account is approved, or you send a reminder.</EmptyNote>
        ) : (
          <Table>
            <THead><tr><TH>When</TH><TH>To</TH><TH>What</TH><TH>Status</TH></tr></THead>
            <tbody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD className="whitespace-nowrap text-ink-muted">{formatTimestamp(r.created_at)}</TD>
                  <TD className="break-all">{r.to_email}</TD>
                  <TD>
                    <span className="font-medium text-ink">{NAME[r.template] ?? r.template}</span>
                    <span className="block text-[13px] text-ink-muted">{r.subject}</span>
                  </TD>
                  <TD>
                    <Badge tone={TONE[r.status]}>{r.status === "queued" ? "Waiting" : r.status === "sent" ? "Sent" : r.status === "failed" ? "Failed" : "Skipped"}</Badge>
                    {r.error ? <span className="mt-1 block max-w-[28ch] text-[13px] text-danger">{r.error}</span> : null}
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
