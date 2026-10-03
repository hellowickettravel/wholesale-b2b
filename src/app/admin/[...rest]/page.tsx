import type { Metadata } from "next";
import { Construction } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { requireRole } from "@/server/auth";

export const metadata: Metadata = { title: "Coming soon" };

/** Admin screens that are scheduled for later phases (see PLAN.md). Still admin-only. */
export default async function NotBuiltYet() {
  await requireRole("admin");
  return (
    <Card>
      <EmptyState icon={<Construction />} title="This screen is on its way" action={<LinkButton href="/admin" variant="secondary">Back to dashboard</LinkButton>}>
        It is scheduled for a later build phase. Sign-in, roles and user invites are live now.
      </EmptyState>
    </Card>
  );
}
