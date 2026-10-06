import type { Metadata, Viewport } from "next";
import { Mukta, Young_Serif } from "next/font/google";
import { brand } from "@/config/brand";
import "./globals.css";

const body = Mukta({ variable: "--font-body", subsets: ["latin"], display: "swap", weight: ["400", "600", "700"] });
const display = Young_Serif({ variable: "--font-display", subsets: ["latin"], display: "swap", weight: "400" });

export const metadata: Metadata = {
  title: { default: `${brand.name} · Trade ordering for restaurants`, template: `%s · ${brand.name}` },
  description: brand.description,
  applicationName: brand.name,
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
