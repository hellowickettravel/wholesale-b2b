import Link from "next/link";
import { brand } from "@/config/brand";
import { Logo } from "@/components/brand/logo";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-ink text-white/80">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[1.5fr_1fr_1fr] sm:px-6">
        <div className="space-y-3">
          <Logo inverted />
          <p className="max-w-xs text-sm text-white/65">{brand.tagline}</p>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-white/50">Ordering</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/catalogue">Browse catalogue</Link></li>
            <li><Link className="hover:text-white" href="/register">Open a trade account</Link></li>
            <li><Link className="hover:text-white" href="/login">Sign in</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-white/50">Trade terms</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/65">
            <li>Restaurants and caterers only</li>
            <li>Prices shown to approved accounts</li>
            <li>Pay by bank transfer</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-5 text-xs text-white/70 sm:px-6">
          © {new Date().getFullYear()} {brand.legalName}. All prices exclude VAT unless stated.
        </div>
      </div>
    </footer>
  );
}
