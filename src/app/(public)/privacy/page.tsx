import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/config/brand";
import { LegalPage } from "@/components/shell/legal-page";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `How ${brand.name} uses personal information.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      current="/privacy"
      title="Privacy policy"
      intro={`This explains what personal information ${brand.name} collects, why, who sees it and your rights. We keep it short on purpose. Our customers are businesses, so most of what we hold is business contact detail.`}
      sections={[
        {
          id: "controller",
          heading: "Who is responsible",
          body: (
            <p>{brand.legalName} (company number {brand.companyNumber}), trading as {brand.name}, is the controller of the information described here. Contact us at <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a>.</p>
          ),
        },
        {
          id: "collect",
          heading: "What we collect",
          body: (
            <ul>
              <li><strong>Account details:</strong> business name, contact name, email address, phone number, delivery address, and a password (which we never see in readable form).</li>
              <li><strong>Orders and invoices:</strong> what you ordered, prices, delivery dates, payments recorded, and notes you add.</li>
              <li><strong>Proof of delivery:</strong> a photograph, and a signature with the name of the person who signed, taken when goods are delivered.</li>
              <li><strong>Messages:</strong> what you send us by email or WhatsApp.</li>
              <li><strong>Technical data:</strong> basic logs such as your IP address and browser when you use the site, kept for security and to fix faults.</li>
            </ul>
          ),
        },
        {
          id: "why",
          heading: "Why we use it, and our legal basis",
          body: (
            <ul>
              <li>To set up and run your trade account, take and deliver your orders and invoice you: <strong>performing our contract</strong> with you.</li>
              <li>To keep accounting records and meet tax rules: <strong>legal obligation</strong>.</li>
              <li>To keep the site safe, prevent fraud and misuse, and improve our service: <strong>legitimate interests</strong>.</li>
              <li>To email you about your orders and account. We do not send marketing email.</li>
            </ul>
          ),
        },
        {
          id: "share",
          heading: "Who we share it with",
          body: (
            <>
              <p>We do not sell personal information. We share only what is needed:</p>
              <ul>
                <li><strong>Our suppliers and their drivers</strong> see your business name, delivery address, contact name and phone number, and the goods in your order, so they can deliver it. They do not see your prices or other customers.</li>
                <li><strong>Service providers</strong> who run the site for us: our database and sign-in provider (Supabase), our web host (Vercel) and our email provider. They process data only on our instructions.</li>
                <li><strong>Our accountants, advisers and authorities</strong>, where the law requires or we need professional advice.</li>
              </ul>
            </>
          ),
        },
        {
          id: "abroad",
          heading: "Where it is stored",
          body: (
            <p>Our providers may process information outside the UK. Where they do, we rely on safeguards the UK GDPR accepts, such as the UK&rsquo;s approved standard contract clauses. Ask us if you want details.</p>
          ),
        },
        {
          id: "keep",
          heading: "How long we keep it",
          body: (
            <p>Orders, invoices and payment records are kept for six years after the end of the tax year they relate to, as the law requires. Account details are kept while your account is open and for a reasonable period afterwards. Proof-of-delivery photographs and signatures are kept with the order they belong to. We delete or anonymise other information when we no longer need it.</p>
          ),
        },
        {
          id: "rights",
          heading: "Your rights",
          body: (
            <>
              <p>You can ask us to see the information we hold about you, correct it, delete it where we have no reason to keep it, restrict or object to how we use it, or give it to you in a portable form. Email us and we will reply within one month. We may need to confirm who you are first.</p>
              <p>If you are unhappy with how we handle your information, please tell us first. You can also complain to the Information Commissioner&rsquo;s Office at <a href="https://ico.org.uk/make-a-complaint/" rel="noopener noreferrer" target="_blank">ico.org.uk</a> or on 0303 123 1113.</p>
            </>
          ),
        },
        {
          id: "security",
          heading: "How we protect it",
          body: (
            <p>Each customer can see only their own account and orders. Costs and other customers&rsquo; prices are never shown to customers or suppliers. Connections are encrypted, passwords are stored hashed, and access to administration is restricted to our team. No system is perfectly secure; if there is a breach that puts your rights at risk, we will tell you and the ICO as the law requires.</p>
          ),
        },
        {
          id: "more",
          heading: "Cookies and changes",
          body: (
            <p>See our <Link href="/cookies">Cookie notice</Link>. If we change this policy we will update the date at the top of this page.</p>
          ),
        },
      ]}
    />
  );
}
