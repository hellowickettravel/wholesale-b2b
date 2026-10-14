import type { MetadataRoute } from "next";
import { LAUNCH_CATEGORIES } from "@/config/launch-categories";
import { siteUrl } from "@/lib/env";
import { slugify } from "@/lib/import/parse-name";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const pages = ["/", "/catalogue", "/register", "/login", "/terms", "/privacy", "/cookies"];
  return [
    ...pages.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "/" ? 1 : 0.6 })),
    ...LAUNCH_CATEGORIES.map((c) => ({ url: `${base}/catalogue?category=${slugify(c)}`, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
