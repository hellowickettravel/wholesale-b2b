import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SetPasswordForm } from "@/components/auth/set-password-form";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";
import { SecurityPanel } from "./security-panel";

export const metadata: Metadata = { title: "Security" };

export default async function SecurityPage({ searchParams }: PageProps<"/admin/security">) {
  const viewer = await requireRole("admin");
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.listFactors();
  const enabled = Boolean(data?.totp?.length);
  const { notice } = await searchParams;
  return (
    <>
      <PageHeader title="Security" description={`Signed in as ${viewer.email}. Keep the admin account safe: this area can see costs, margins and every customer.`} />
      {notice === "password" ? <Alert tone="success" className="mb-4">Your new password is saved.</Alert> : null}
      <div className="grid max-w-3xl gap-6">
        <Card>
          <CardHeader title="Two-step sign-in" description="Recommended for every admin." />
          <CardBody><SecurityPanel enabled={enabled} /></CardBody>
        </Card>
        <Card>
          <CardHeader title="Change your password" description="Use a long password you do not use anywhere else." />
          <CardBody className="max-w-sm"><SetPasswordForm submitLabel="Save new password" from="admin" autoFocus={false} /></CardBody>
        </Card>
      </div>
    </>
  );
}
