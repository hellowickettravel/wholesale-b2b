"use client";
import { useState, useTransition, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/validation/auth";

/** A destructive button that asks first and shows the server's answer. */
export function ConfirmButton({ action, confirm, children, icon }: { action: () => Promise<FormState>; confirm: string; children: ReactNode; icon?: ReactNode }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<FormState>({});
  return (
    <div className="space-y-2">
      <Button
        variant="danger"
        size="sm"
        loading={pending}
        icon={icon}
        onClick={() => {
          if (window.confirm(confirm)) start(async () => setState((await action()) ?? {}));
        }}
      >
        {children}
      </Button>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
    </div>
  );
}
