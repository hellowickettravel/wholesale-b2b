import type { ReactNode } from "react";
import { PlateMessage } from "@/components/brand/plate-message";

/**
 * Full-screen state for the driver pages (recorded, expired, not valid): one enamel plate on a shelf
 * ground. Green ground (cardamom) for done, jute for anything that needs the driver to do something.
 */
export function Message({ tone, title, children }: { tone: "success" | "warning"; title: string; children: ReactNode }) {
  return (
    <PlateMessage
      headingLevel={1}
      ground={tone === "success" ? "tea-powders-and-milk-mix" : "default"}
      tab={tone === "success" ? "Done" : undefined}
      title={title}
      fit="full"
      className="rounded-[var(--radius-xl)]"
    >
      <p>{children}</p>
    </PlateMessage>
  );
}
