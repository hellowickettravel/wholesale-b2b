"use client";

import { useState, useTransition } from "react";
import { Send, Truck } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { setStatus } from "./actions";

export function StatusButtons({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (s: "sent" | "out_for_delivery") =>
    start(async () => {
      setError(null);
      const r = await setStatus(id, s);
      if (r.error) setError(r.error);
    });
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === "placed" ? (
          <Button onClick={() => run("sent")} loading={pending} icon={<Send className="size-4" aria-hidden="true" />}>Accept order</Button>
        ) : null}
        {status === "placed" || status === "sent" ? (
          <Button variant={status === "placed" ? "secondary" : "primary"} onClick={() => run("out_for_delivery")} loading={pending} icon={<Truck className="size-4" aria-hidden="true" />}>
            Mark out for delivery
          </Button>
        ) : null}
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  );
}
