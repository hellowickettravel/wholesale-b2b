import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatTimestamp } from "@/domain/dates";
import { bpToInput } from "@/domain/money";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";
import { changeStatus, inviteCustomerLogin, saveAdminNotes, updateCustomer } from "../actions";
import { CustomerForm } from "../customer-form";
import { CustomerHeader } from "./customer-header";
import { InviteLoginForm, NotesForm } from "./small-forms";
import { StatusPanel } from "./status-panel";

export const metadata: Metadata = { title: "Customer" };

const NOTICES: Record<string, string> = {
  created: "Restaurant added and approved with every category. Set their prices on the Catalogue & prices tab.",
  invited: "Restaurant added and an invitation sent. Set their prices on the Catalogue & prices tab.",
};

export default async function CustomerPage({ params, searchParams }: PageProps<"/admin/customers/[id]">) {
  await requireRole("admin");
  const [{ id }, { notice }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: c }, { data: priv }, { data: logins }, { data: categories }, { data: settings }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle(),
    supabase.from("customer_private").select("admin_notes, default_margin_bp").eq("customer_id", id).maybeSingle(),
    supabase.from("profiles").select("id, email, full_name, active, created_at").eq("customer_id", id).order("created_at"),
    supabase.from("categories").select("id, name").eq("active", true).order("sort"),
    supabase.from("settings").select("global_margin_bp").single(),
  ]);
  if (!c) notFound();
  const noticeText = typeof notice === "string" ? NOTICES[notice] : undefined;

  return (
    <>
      <CustomerHeader id={c.id} name={c.business_name} status={c.status} active="details" />
      {noticeText ? <Alert tone="success" className="mb-4">{noticeText}</Alert> : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-w-0 self-start">
          <CardHeader title="Details" description={`Registered ${formatTimestamp(c.created_at)}${c.approved_at ? ` · approved ${formatTimestamp(c.approved_at)}` : ""}`} />
          <CardBody>
            <CustomerForm
              action={updateCustomer.bind(null, c.id)}
              submitLabel="Save details"
              initial={{
                business_name: c.business_name,
                contact_name: c.contact_name ?? "",
                email: c.email ?? "",
                phone: c.phone ?? "",
                address_line1: c.address_line1 ?? "",
                address_line2: c.address_line2 ?? "",
                city: c.city ?? "",
                postcode: c.postcode ?? "",
                delivery_notes: c.delivery_notes ?? "",
              }}
            />
          </CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Account status" />
            <CardBody>
              <StatusPanel
                key={c.status}
                status={c.status}
                reason={c.status_reason}
                action={changeStatus.bind(null, c.id)}
                categories={categories ?? []}
                globalMargin={bpToInput(settings?.global_margin_bp ?? 0)}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Logins" description="People who sign in for this restaurant." />
            <CardBody className="space-y-4">
              {logins?.length ? (
                <ul className="divide-y divide-line rounded-[var(--radius-md)] border border-line">
                  {logins.map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                      <span className="min-w-0">
                        <span className="block font-medium text-ink">{l.full_name || "—"}</span>
                        <span className="block break-all text-ink-muted">{l.email}</span>
                      </span>
                      {l.active ? null : <Badge tone="neutral">Off</Badge>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-muted">No one can sign in for this restaurant yet.</p>
              )}
              <details className="group">
                <summary className="cursor-pointer text-sm font-semibold text-primary">Invite someone to sign in</summary>
                <div className="pt-3">
                  <InviteLoginForm action={inviteCustomerLogin.bind(null, c.id)} email={logins?.length ? "" : (c.email ?? "")} name={logins?.length ? "" : (c.contact_name ?? "")} />
                </div>
              </details>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Notes" />
            <CardBody>
              <NotesForm action={saveAdminNotes.bind(null, c.id)} initial={priv?.admin_notes ?? ""} />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
