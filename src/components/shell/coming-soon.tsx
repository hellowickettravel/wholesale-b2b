import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

/** Honest placeholder for restaurant screens scheduled for later build phases. */
export function ComingSoon({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <EmptyState icon={icon} title="Coming soon">
          {children}
        </EmptyState>
      </Card>
    </>
  );
}
