import type { NextRequest } from "next/server";
import { invoiceFileName } from "@/domain/invoice";
import { getViewer } from "@/server/auth";
import { getInvoiceDocument } from "@/server/invoices";
import { renderInvoicePdf } from "@/server/invoice-pdf";

/**
 * Invoice PDF. A restaurant gets only its own invoices, an admin gets any; everyone else gets
 * 401/404 (a 404 rather than 403 for another restaurant's id, so ids reveal nothing). Data is
 * read with the viewer's own client (src/server/invoices.ts). ?download=1 saves instead of opening.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/invoices/[id]/pdf">) {
  const viewer = await getViewer();
  if (!viewer) return new Response("Sign in to download invoices.", { status: 401 });
  const { id } = await ctx.params;
  const doc = await getInvoiceDocument(id, viewer);
  if (!doc) return new Response("Invoice not found.", { status: 404 });
  const pdf = await renderInvoicePdf(doc);
  const name = invoiceFileName(doc.number);
  const disposition = request.nextUrl.searchParams.get("download") ? "attachment" : "inline";
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
