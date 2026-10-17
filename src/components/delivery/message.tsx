import type { ReactNode } from "react";
import { PlateMessage } from "@/components/brand/plate-message";

/** Full-screen state for the driver pages (recorded, expired, not valid): one flat card with a heading and a line. */
export function Message({ tone, title, children }: { tone: "success" | "warning"; title: string; children: ReactNode }) {
  return (
    <PlateMessage
      headingLevel={1}
      tab={tone === "success" ? "Done" : undefined}
      title={title}
      fit="full"
    >
      <p>{children}</p>
    </PlateMessage>
  );
}
