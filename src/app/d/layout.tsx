import type { Metadata } from "next";
import { DriverShell } from "@/components/shell/driver-shell";

// The token is in the URL: never index it, never send it on as a referrer.
export const metadata: Metadata = {
  title: "Proof of delivery",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function DriverLayout({ children }: LayoutProps<"/d">) {
  return <DriverShell>{children}</DriverShell>;
}
