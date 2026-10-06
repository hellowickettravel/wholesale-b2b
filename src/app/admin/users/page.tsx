import type { Metadata } from "next";
import { Badge, type Tone } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { formatTimestamp } from "@/domain/dates";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = { title: "Users" };

const ROLE_TONE: Record<string, Tone> = { admin: "info", supplier: "accent", customer: "primary" };
const ROLE_LABEL: Record<string, string> = { admin: "Admin", supplier: "Supplier", customer: "Restaurant" };

export default async function UsersPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const [{ data: profiles }, { data: suppliers }, authUsers] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, role, active, created_at, customers(business_name, status), suppliers(name)")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("suppliers").select("id, name").eq("active", true).order("name"),
    createAdminClient().auth.admin.listUsers({ perPage: 1000 }),
  ]);
  const lastSignIn = new Map((authUsers.data?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]));

  return (
    <>
      <PageHeader title="Users" description="Everyone who can sign in, and invitations for new restaurants, suppliers and admins." />
      <div className="space-y-6">
        <Card>
          <CardHeader title="Invite someone" description="They get an email with a link to set their own password." />
          <CardBody>
            <InviteForm suppliers={suppliers ?? []} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="All users" description={`${profiles?.length ?? 0} accounts`} />
          <Table>
            <THead>
              <tr>
                <TH>Name</TH>
                <TH>Role</TH>
                <TH className="hidden md:table-cell">Business</TH>
                <TH className="hidden md:table-cell">Last sign-in</TH>
              </tr>
            </THead>
            <tbody>
              {(profiles ?? []).map((p) => {
                const seen = lastSignIn.get(p.id);
                const business = p.customers ? p.customers.business_name : p.suppliers ? p.suppliers.name : null;
                const pendingStatus = p.customers && p.customers.status !== "approved" ? p.customers.status : null;
                return (
                  <TR key={p.id}>
                    <TD className="min-w-0">
                      <div className="font-medium">{p.full_name || "—"}</div>
                      <div className="break-all text-[13px] text-ink-muted">{p.email}</div>
                      <div className="mt-1 text-[13px] text-ink-muted md:hidden">
                        {business ?? "No business"}, {seen ? `Last in ${formatTimestamp(seen)}` : "Invited, not signed in yet"}
                      </div>
                    </TD>
                    <TD>
                      <div className="flex flex-col items-start gap-1">
                        <Badge tone={p.active ? ROLE_TONE[p.role] : "neutral"}>{ROLE_LABEL[p.role]}{p.active ? "" : " (off)"}</Badge>
                        {pendingStatus ? <Badge tone="warning">{pendingStatus}</Badge> : null}
                      </div>
                    </TD>
                    <TD className="hidden text-ink-muted md:table-cell">{business ?? "—"}</TD>
                    <TD className="hidden whitespace-nowrap text-ink-muted md:table-cell">{seen ? formatTimestamp(seen) : <Badge tone="neutral">Invited</Badge>}</TD>
                  </TR>
                );
              })}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
