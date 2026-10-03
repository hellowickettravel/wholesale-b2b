import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";
import { requireRole } from "@/server/auth";

export const metadata: Metadata = { title: "Invoices" };

export default async function InvoicesPage() {
  await requireRole("customer");
  return <ComingSoon title="Invoices" icon={<FileText />}>Every invoice will be listed here with a PDF download.</ComingSoon>;
}
