import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { brand } from "@/config/brand";
import { siteUrl } from "@/lib/env";
import "./globals.css";

const body = Inter({ variable: "--font-body", subsets: ["latin"], display: "swap" });
const display = Plus_Jakarta_Sans({ variable: "--font-display", subsets: ["latin"], display: "swap", weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${brand.name} · Restaurant wholesale, made simple`, template: `%s · ${brand.name}` },
  description: brand.description,
  applicationName: brand.name,
  openGraph: { siteName: brand.name, locale: "en_GB", type: "website" },
};

export const viewport: Viewport = {
  themeColor: brand.colors.primary,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${body.variable} ${display.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-on-dark">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
