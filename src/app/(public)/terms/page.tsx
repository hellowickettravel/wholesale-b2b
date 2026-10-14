import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/config/brand";
import { LegalPage } from "@/components/shell/legal-page";

export const metadata: Metadata = {
  title: "Terms of trade",
  description: `The terms on which ${brand.name} supplies goods to trade customers.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      current="/terms"
      title="Terms of trade"
      intro={`These terms apply to every order placed through ${brand.name}. They are written in plain English. By opening a trade account or placing an order you agree to them.`}
      sections={[
        {
          id: "who",
          heading: "Who we are and who can buy",
          body: (
            <>
              <p>{brand.name} is a trading name of {brand.legalName}, a company registered in England and Wales (company number {brand.companyNumber}). In these terms, &ldquo;we&rdquo; and &ldquo;us&rdquo; mean that company.</p>
              <p>We sell to businesses only: restaurants, takeaways, caterers and similar trade customers. We do not sell to consumers. When you open an account you confirm that you are buying for the purposes of a business.</p>
            </>
          ),
        },
        {
          id: "accounts",
          heading: "Your trade account",
          body: (
            <>
              <p>Every account is reviewed by us before it can see prices or order. We may approve, refuse or suspend an account at our discretion, for example if details are wrong or an invoice is overdue.</p>
              <p>Give us accurate details and keep your password private. You are responsible for orders placed from your account. Tell us at once if you think someone else has access.</p>
            </>
          ),
        },
        {
          id: "prices",
          heading: "Prices and VAT",
          body: (
            <>
              <p>Prices are agreed for each customer and are shown only after your account is approved. They are in pounds sterling. Whether a price includes VAT is stated next to it; where it does not, VAT is added at the rate that applies to the goods and shown on your basket and invoice.</p>
              <p>We may change prices at any time. The price you see when you place an order is the price you pay for that order. We will correct an obvious pricing error and tell you before we supply, so you can cancel.</p>
            </>
          ),
        },
        {
          id: "orders",
          heading: "Orders",
          body: (
            <>
              <p>When you place an order we send you a confirmation. That is when a contract starts between you and us. Our suppliers may deliver different parts of one order separately, so an order can arrive in more than one delivery. You are not charged extra for this.</p>
              <p>If an item is unavailable we will contact you, and you may accept a substitute or cancel that item. Please place orders in good time: we will do our best to meet the delivery date you choose but cannot guarantee it.</p>
            </>
          ),
        },
        {
          id: "delivery",
          heading: "Delivery and proof of delivery",
          body: (
            <>
              <p>We deliver to the address on your order. Delivery charges, if any, are shown in your basket before you order. Someone must be there to receive the goods and check them.</p>
              <p>Each delivery is recorded with a photograph and, where possible, a signature or a signed delivery note. Risk in the goods passes to you when they are delivered. Ownership passes to you when we have been paid in full.</p>
            </>
          ),
        },
        {
          id: "payment",
          heading: "Payment",
          body: (
            <>
              <p>The payment terms for each order (for example on delivery, within 7 days, or on an agreed date) are shown when you order and on your invoice. Pay by the method shown on your invoice and quote the reference.</p>
              <p>If a payment is late we may suspend your account and stop further deliveries until it is paid. You must also pay any reasonable costs we incur recovering an overdue amount, and interest as allowed by the Late Payment of Commercial Debts (Interest) Act 1998.</p>
            </>
          ),
        },
        {
          id: "problems",
          heading: "Shortages, damage and complaints",
          body: (
            <>
              <p>Please check every delivery when it arrives. If something is missing, damaged or not what you ordered, tell us as soon as you can, ideally on the day, by WhatsApp or email with a photograph. We will put it right by replacing the goods or crediting you, as we judge fair.</p>
              <p>Food that has been opened, used, or stored badly after delivery cannot be returned. Nothing in these terms limits your legal rights that cannot be limited by law.</p>
            </>
          ),
        },
        {
          id: "cancel",
          heading: "Changing or cancelling an order",
          body: (
            <p>Message us as early as possible. We can change or cancel an order that has not yet been sent to the supplier. Once goods are on their way we may not be able to stop them, and we may charge for goods that have been supplied to your order.</p>
          ),
        },
        {
          id: "liability",
          heading: "Our responsibility",
          body: (
            <>
              <p>We take care to supply goods that are safe, as described and within their dates. We are responsible for losses that were a foreseeable result of us breaking these terms. We are not responsible for loss of profit or business, or for delays caused by events outside our control.</p>
              <p>Nothing in these terms limits liability for death or personal injury caused by negligence, for fraud, or for anything else the law does not allow us to limit.</p>
            </>
          ),
        },
        {
          id: "data",
          heading: "Your information",
          body: (
            <p>How we use personal information is explained in our <Link href="/privacy">Privacy policy</Link>, and how the site uses cookies in our <Link href="/cookies">Cookie notice</Link>.</p>
          ),
        },
        {
          id: "general",
          heading: "General",
          body: (
            <>
              <p>We may update these terms. The version in force when you place an order applies to that order. If a part of these terms is found unenforceable, the rest still applies.</p>
              <p>These terms, and any dispute about them, are governed by the law of England and Wales, and the courts of England and Wales have jurisdiction.</p>
              <p>Contact us at <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a> or on WhatsApp {brand.contact.phoneDisplay}.</p>
            </>
          ),
        },
      ]}
    />
  );
}
