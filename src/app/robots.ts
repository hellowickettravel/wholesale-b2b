import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

/** Public pages may be indexed; the signed-in areas, the API and driver links never. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/supplier", "/shop", "/basket", "/orders", "/invoices", "/account", "/api", "/d/", "/auth"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
