"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { reorder } from "@/app/(shop)/basket/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/** Puts this order's lines back in the basket and opens it; names any line that cannot be ordered now. */
export function OrderAgain({ orderId }: { orderId: string }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ tone: "danger" | "warning"; text: string } | null>(null);
  const router = useRouter();
  return (
    <div className="space-y-2">
      <Button
        variant="secondary"
        block
        loading={pending}
        icon={<RotateCcw className="size-4" aria-hidden="true" />}
        onClick={() =>
          start(async () => {
            const res = await reorder(orderId);
            if (!res.ok) return setMessage({ tone: "danger", text: res.error });
            if (res.added === 0) return setMessage({ tone: "warning", text: "None of these sizes can be ordered at the moment." });
            if (res.skipped.length) {
              setMessage({ tone: "warning", text: `Added to your basket. Not available now: ${res.skipped.join(", ")}.` });
              return;
            }
            router.push("/basket");
          })
        }
      >
        Order again
      </Button>
      {message ? (
        <Alert tone={message.tone}>
          {message.text}{" "}
          {message.tone === "warning" && !message.text.startsWith("None") ? (
            <a href="/basket" className="font-semibold underline">Go to basket</a>
          ) : null}
        </Alert>
      ) : null}
    </div>
  );
}
