import Link from "next/link";
import { Mail } from "lucide-react";
import { brand, whatsappHref } from "@/config/brand";
import { Logo } from "@/components/brand/logo";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";

const link = "inline-flex min-h-8 items-center text-on-dark-muted underline-offset-4 transition-colors hover:text-on-dark hover:underline";

/** Navy footer: the brand, where to go, how to reach us, and the company line. */
export function SiteFooter() {
  return (
    <footer data-surface="dark" className="on-dark mt-auto bg-primary-strong text-on-dark-muted">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-12 sm:px-6 sm:py-14 md:grid-cols-[1.5fr_1fr_1fr_1.2fr] lg:px-8">
        <div className="space-y-4">
          <Logo inverted />
          <p className="max-w-xs text-sm leading-relaxed">{brand.tagline} Trade prices on rice, dal, spices, flours, sauces, drinks and packaging for UK restaurants.</p>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-on-dark">Ordering</h2>
          <ul className="mt-3 space-y-1 text-sm">
            <li><Link className={link} href="/catalogue">Browse the catalogue</Link></li>
            <li><Link className={link} href="/register">Open a trade account</Link></li>
            <li><Link className={link} href="/login">Sign in</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-on-dark">Trading</h2>
          <ul className="mt-3 space-y-1 text-sm">
            <li className="py-1">Trade customers only</li>
            <li className="py-1">Prices for approved accounts</li>
            <li className="py-1">Delivered to your kitchen</li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-on-dark">Talk to us</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a className={`${link} gap-2`} href={whatsappHref()} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="size-4 text-[#25D366]" /> {brand.contact.phoneDisplay}
              </a>
            </li>
            <li>
              <a className={`${link} gap-2`} href={`mailto:${brand.contact.email}`}>
                <Mail className="size-4" aria-hidden="true" /> {brand.contact.email}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-4 py-5 text-xs leading-relaxed sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>&copy; {new Date().getFullYear()} {brand.legalName}. {brand.tradingAs.replace(`, company number ${brand.companyNumber}.`, ".")}</p>
          <p className="shrink-0">Company no. {brand.companyNumber}</p>
        </div>
      </div>
    </footer>
  );
}
