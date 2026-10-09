/**
 * The production site lives on its own domain (NEXT_PUBLIC_SITE_URL, e.g. https://wholesalestreet.co.uk).
 * Vercel also serves the same production deployment on its *.vercel.app alias; anyone who arrives there
 * (an old bookmark or email link) is sent to the same path on the real domain, so they never end up
 * signed in on the wrong address. Pure, unit-tested; used by src/proxy.ts.
 *
 * Returns the URL to redirect to, or null to carry on. Only in Vercel production, only from a
 * *.vercel.app host, and only when the configured site URL is itself not a vercel.app address
 * (so nothing happens until the owner sets the custom domain). Preview deployments are never touched.
 */
export function canonicalRedirect(input: { host: string | null; pathAndQuery: string; siteUrl: string | undefined; vercelEnv: string | undefined }): string | null {
  const { host, pathAndQuery, siteUrl, vercelEnv } = input;
  if (vercelEnv !== "production" || !siteUrl || !host) return null;
  let site: URL;
  try {
    site = new URL(siteUrl);
  } catch {
    return null;
  }
  const hostname = host.split(":")[0].toLowerCase();
  if (!hostname.endsWith(".vercel.app")) return null;
  if (site.hostname.endsWith(".vercel.app") || site.hostname === hostname) return null;
  return new URL(pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`, site.origin).toString();
}
