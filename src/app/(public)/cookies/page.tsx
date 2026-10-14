import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/config/brand";
import { LegalPage } from "@/components/shell/legal-page";

export const metadata: Metadata = {
  title: "Cookie notice",
  description: `How ${brand.name} uses cookies.`,
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <LegalPage
      current="/cookies"
      title="Cookie notice"
      intro={`${brand.name} uses only the cookies it needs to work. We do not use advertising, tracking or analytics cookies, so there is nothing to switch off.`}
      sections={[
        {
          id: "what",
          heading: "What cookies are",
          body: <p>Cookies are small text files a website stores in your browser. Some are essential for a site to work; others track what you do. We use only the essential kind.</p>,
        },
        {
          id: "use",
          heading: "The cookies we use",
          body: (
            <ul>
              <li><strong>Sign-in session</strong> (names start with <code>sb-</code>): keeps you signed in as you move between pages and remembers who you are while your session lasts. Without it, the ordering area cannot work. Set when you sign in; removed when you sign out or the session ends.</li>
              <li><strong>Security</strong>: our host may set short-lived values that protect the site from abuse.</li>
            </ul>
          ),
        },
        {
          id: "consent",
          heading: "Consent",
          body: <p>UK law does not require your consent for cookies that are strictly necessary to provide the service you asked for, so we do not show a cookie banner. If we ever add any other kind of cookie, we will ask first and update this page.</p>,
        },
        {
          id: "control",
          heading: "Controlling cookies",
          body: <p>You can delete or block cookies in your browser settings. If you block the sign-in cookie you will not be able to sign in. For more about how we handle personal information, see our <Link href="/privacy">Privacy policy</Link>.</p>,
        },
      ]}
    />
  );
}
