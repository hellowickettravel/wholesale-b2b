import "server-only";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import path from "node:path";
import { brand } from "@/config/brand";
import { formatDate } from "@/domain/dates";
import { formatBp, formatPence } from "@/domain/money";
import { invoiceRef, orderRef, PAYMENT_TERMS_LABEL } from "@/domain/status";
import type { InvoiceDocument } from "./invoices";

/**
 * The invoice as a PDF (DECISIONS D12): built-in Helvetica (covers £ and ×), brand colours from
 * src/config/brand.ts, the logo when brand.logo is set (PNG/JPG; react-pdf cannot draw SVG files).
 */

const c = brand.colors;
const s = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 64, paddingHorizontal: 40, fontSize: 9.5, fontFamily: "Helvetica", color: c.ink, lineHeight: 1.35 },
  row: { flexDirection: "row" },
  between: { flexDirection: "row", justifyContent: "space-between" },
  wordmark: { fontSize: 20, fontFamily: "Helvetica-Bold", color: c.primary },
  wordmarkTail: { color: c.mark },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", textAlign: "right" },
  muted: { color: c.muted },
  bold: { fontFamily: "Helvetica-Bold" },
  label: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: c.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 },
  box: { flex: 1, padding: 10, borderWidth: 1, borderColor: c.line, borderRadius: 4 },
  th: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: c.muted, textTransform: "uppercase", paddingVertical: 5 },
  tr: { flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: c.line, paddingVertical: 5 },
  cItem: { flex: 1, paddingRight: 6 },
  cQty: { width: 34, textAlign: "right" },
  cPrice: { width: 62, textAlign: "right" },
  cVat: { width: 40, textAlign: "right" },
  cNet: { width: 68, textAlign: "right" },
  totals: { width: 230, marginLeft: "auto", marginTop: 10 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  grand: { flexDirection: "row", justifyContent: "space-between", paddingTop: 6, marginTop: 4, borderTopWidth: 1.5, borderTopColor: c.ink },
  pay: { marginTop: 18, padding: 12, backgroundColor: c.surface, borderRadius: 4, borderLeftWidth: 3, borderLeftColor: c.primary },
  footer: { position: "absolute", bottom: 28, left: 40, right: 40, fontSize: 7.5, lineHeight: 1, color: c.muted, textAlign: "center" },
  void: { position: "absolute", top: 300, left: 90, fontSize: 110, fontFamily: "Helvetica-Bold", color: "#C0392B", opacity: 0.16, transform: "rotate(-30deg)" },
});

function InvoicePdf({ d }: { d: InvoiceDocument }) {
  const t = d.summary.totals;
  const balance = d.voidedAt ? 0 : Math.max(0, t.totalPence - d.paidPence);
  const logo = brand.logo ? path.join(process.cwd(), "public", brand.logo.pdfSrc.replace(/^\//, "")) : null;
  return (
    <Document title={invoiceRef(d.number)} author={d.seller.legalName} subject={`Invoice for ${orderRef(d.orderNumber)}`} creator={brand.name} producer={brand.name}>
      <Page size="A4" style={s.page}>
        {d.voidedAt ? <Text style={s.void} fixed>VOID</Text> : null}
        <View style={s.between}>
          <View>
            {logo ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not an HTML img
              <Image src={logo} style={{ height: 36, marginBottom: 6 }} />
            ) : (
              <Text style={s.wordmark}>
                {brand.wordmark.lead}
                <Text style={s.wordmarkTail}>{brand.wordmark.tail}</Text>
              </Text>
            )}
            <Text style={[s.bold, { marginTop: 10 }]}>{d.seller.legalName}</Text>
            <Text style={s.muted}>{d.seller.address}</Text>
            <Text style={s.muted}>VAT number: {d.seller.vatNumber}</Text>
          </View>
          <View>
            <Text style={s.title}>{d.voidedAt ? "VOID INVOICE" : "INVOICE"}</Text>
            <View style={{ marginTop: 8, width: 200 }}>
              {[
                ["Invoice number", invoiceRef(d.number)],
                ["Invoice date", formatDate(d.issuedAt)],
                ["Order", orderRef(d.orderNumber)],
                ["Delivery date", formatDate(`${d.deliveryDate}T12:00:00Z`)],
                ...(d.voidedAt ? [["Voided", formatDate(d.voidedAt)]] : []),
              ].map(([k, v]) => (
                <View key={k} style={s.between}>
                  <Text style={s.muted}>{k}</Text>
                  <Text style={s.bold}>{v}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={[s.row, { marginTop: 22, gap: 12 }]}>
          <View style={s.box}>
            <Text style={s.label}>Bill to</Text>
            <Text style={s.bold}>{d.billTo.name}</Text>
            {d.billTo.contact ? <Text>{d.billTo.contact}</Text> : null}
            {d.billTo.address ? <Text style={s.muted}>{d.billTo.address}</Text> : null}
            {d.billTo.email ? <Text style={s.muted}>{d.billTo.email}</Text> : null}
          </View>
          <View style={s.box}>
            <Text style={s.label}>Deliver to</Text>
            <Text>{d.deliverTo}</Text>
          </View>
        </View>

        <View style={{ marginTop: 22 }}>
          <View style={[s.row, { borderBottomWidth: 1.5, borderBottomColor: c.ink }]}>
            <Text style={[s.th, s.cItem]}>Item</Text>
            <Text style={[s.th, s.cQty]}>Qty</Text>
            <Text style={[s.th, s.cPrice]}>Unit price</Text>
            <Text style={[s.th, s.cVat]}>VAT</Text>
            <Text style={[s.th, s.cNet]}>Amount</Text>
          </View>
          {d.lines.map((l, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <View style={s.cItem}>
                <Text>{l.productName}</Text>
                <Text style={s.muted}>{l.sizeLabel}</Text>
              </View>
              <Text style={s.cQty}>{l.qty}</Text>
              <Text style={s.cPrice}>{formatPence(l.unitPricePence)}</Text>
              <Text style={s.cVat}>{formatBp(l.vatRateBp)}</Text>
              <Text style={s.cNet}>{formatPence(l.lineNetPence)}</Text>
            </View>
          ))}
          {t.deliveryNetPence > 0 ? (
            <View style={s.tr} wrap={false}>
              <Text style={s.cItem}>Delivery</Text>
              <Text style={s.cQty}>1</Text>
              <Text style={s.cPrice}>{formatPence(t.deliveryNetPence)}</Text>
              <Text style={s.cVat}>*</Text>
              <Text style={s.cNet}>{formatPence(t.deliveryNetPence)}</Text>
            </View>
          ) : null}
        </View>

        <View style={s.totals} wrap={false}>
          <View style={s.totalRow}><Text style={s.muted}>Goods (ex VAT)</Text><Text>{formatPence(t.goodsNetPence)}</Text></View>
          <View style={s.totalRow}><Text style={s.muted}>Delivery (ex VAT)</Text><Text>{t.deliveryNetPence ? formatPence(t.deliveryNetPence) : "Free"}</Text></View>
          {d.summary.goodsByRate.map((r) => (
            <View key={r.rateBp} style={s.totalRow}>
              <Text style={s.muted}>VAT {formatBp(r.rateBp)} on {formatPence(r.netPence)}</Text>
              <Text>{formatPence(r.vatPence)}</Text>
            </View>
          ))}
          {t.deliveryNetPence > 0 ? (
            <View style={s.totalRow}><Text style={s.muted}>* VAT on delivery</Text><Text>{formatPence(t.deliveryVatPence)}</Text></View>
          ) : null}
          <View style={s.totalRow}><Text style={s.muted}>Total VAT</Text><Text>{formatPence(t.vatPence)}</Text></View>
          <View style={s.grand}><Text style={[s.bold, { fontSize: 12 }]}>Total due</Text><Text style={[s.bold, { fontSize: 12 }]}>{formatPence(t.totalPence)}</Text></View>
          {d.paidPence ? (
            <>
              <View style={s.totalRow}><Text style={s.muted}>Paid</Text><Text>{formatPence(d.paidPence)}</Text></View>
              <View style={s.totalRow}><Text style={s.bold}>Balance</Text><Text style={s.bold}>{formatPence(balance)}</Text></View>
            </>
          ) : null}
        </View>

        {d.voidedAt ? (
          <View style={s.pay} wrap={false}>
            <Text style={s.bold}>This invoice was voided on {formatDate(d.voidedAt)}. Nothing is payable on it.</Text>
          </View>
        ) : (
          <View style={s.pay} wrap={false}>
            <Text style={s.label}>Pay by bank transfer</Text>
            <View style={[s.row, { gap: 24 }]}>
              <View>
                <Text>Bank: <Text style={s.bold}>{d.seller.bankName}</Text></Text>
                <Text>Account name: <Text style={s.bold}>{d.seller.accountName}</Text></Text>
                <Text>Sort code: <Text style={s.bold}>{d.seller.sortCode}</Text></Text>
                <Text>Account number: <Text style={s.bold}>{d.seller.accountNumber}</Text></Text>
                {d.seller.iban ? <Text>IBAN: <Text style={s.bold}>{d.seller.iban}</Text></Text> : null}
              </View>
              <View>
                <Text>Reference: <Text style={s.bold}>{orderRef(d.orderNumber)}</Text></Text>
                <Text>Terms: {PAYMENT_TERMS_LABEL[d.paymentTerms]}</Text>
                {d.payBy ? <Text>Please pay by: <Text style={s.bold}>{formatDate(`${d.payBy}T12:00:00Z`)}</Text></Text> : null}
                {balance && d.paidPence ? <Text>Still to pay: <Text style={s.bold}>{formatPence(balance)}</Text></Text> : null}
              </View>
            </View>
          </View>
        )}

        {/* No render() page counter: with the page's lineHeight it is not drawn at all (react-pdf 4.9). */}
        <Text style={s.footer} fixed>
          {[d.seller.footer, invoiceRef(d.number)].filter(Boolean).join("  ·  ")}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(d: InvoiceDocument): Promise<Buffer> {
  return renderToBuffer(<InvoicePdf d={d} />);
}
