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
      <PageHeader eyebrow="System" title="Users" description="Everyone who can sign in, and invitations for new restaurants, suppliers and admins." />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader title="All users" description={`${profiles?.length ?? 0} accounts`} />
          <Table>
            <THead>
              <tr>
                <TH>Name</TH>
                <TH>Role</TH>
                <TH>Business</TH>
                <TH>Last sign-in</TH>
              </tr>
            </THead>
            <tbody>
              {(profiles ?? []).map((p) => {
                const seen = lastSignIn.get(p.id);
                return (
                  <TR key={p.id}>
                    <TD>
                      <div className="font-medium">{p.full_name || "—"}</div>
                      <div className="text-[13px] text-ink-muted">{p.email}</div>
                    </TD>
                    <TD>
                      <Badge tone={p.active ? ROLE_TONE[p.role] : "neutral"}>{ROLE_LABEL[p.role]}{p.active ? "" : " (off)"}</Badge>
                    </TD>
                    <TD className="text-ink-muted">
                      {p.customers ? (
                        <>
                          {p.customers.business_name}
                          {p.customers.status !== "approved" ? <Badge tone="warning" className="ml-2">{p.customers.status}</Badge> : null}
                        </>
                      ) : p.suppliers ? p.suppliers.name : "—"}
                    </TD>
                    <TD className="whitespace-nowrap text-ink-muted">{seen ? formatTimestamp(seen) : <Badge tone="neutral">Invited</Badge>}</TD>
                  </TR>
                );
              })}
            </tbody>
          </Table>
        </Card>
        <Card>
          <CardHeader title="Invite someone" description="They get an email to set their own password." />
          <CardBody>
            <InviteForm suppliers={suppliers ?? []} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
