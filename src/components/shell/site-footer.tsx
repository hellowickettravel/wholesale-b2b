import Link from "next/link";
import { brand } from "@/config/brand";
import { Logo } from "@/components/brand/logo";

const link = "inline-flex min-h-8 items-center text-on-dark-muted underline-offset-4 transition-colors hover:text-on-dark hover:underline";

/** Clove footer. The legal line shows the trading name until the real legal name is filled in. */
export function SiteFooter() {
  const owner = brand.legalName.startsWith("[") ? brand.name : brand.legalName;
  return (
    <footer data-surface="dark" className="on-dark mt-auto bg-dark text-on-dark-muted">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-12 sm:px-6 sm:py-14 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div className="space-y-4">
          <Logo inverted />
          <p className="max-w-xs text-base text-on-dark-muted">{brand.tagline}</p>
        </div>
        <div>
          <h2 className="text-xl text-on-dark">Ordering</h2>
          <ul className="mt-3 space-y-1">
            <li><Link className={link} href="/catalogue">Browse catalogue</Link></li>
            <li><Link className={link} href="/register">Open a trade account</Link></li>
            <li><Link className={link} href="/login">Sign in</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-xl text-on-dark">Trade terms</h2>
          <ul className="mt-3 space-y-1 text-base">
            <li className="py-1">Restaurants and caterers only</li>
            <li className="py-1">Prices shown to approved accounts</li>
            <li className="py-1">Pay by bank transfer</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-dashed border-hessian/50">
        <div className="mx-auto max-w-[1200px] px-4 py-5 text-sm text-on-dark-muted sm:px-6 lg:px-8">
          &copy; {new Date().getFullYear()} {owner}. All prices exclude VAT unless stated.
        </div>
      </div>
    </footer>
  );
}
