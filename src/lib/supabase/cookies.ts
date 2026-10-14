/**
 * Session cookie hardening. The browser never talks to Supabase directly (there is no browser client), so the session
 * cookies can be HttpOnly: page scripts cannot read them. SameSite=Lax blocks cross-site form posts; Secure whenever
 * the site is served over https. Used by the server client and by proxy.ts.
 */
export function hardenCookie<T extends Record<string, unknown>>(options: T | undefined): T & { httpOnly: true; sameSite: "lax"; secure: boolean; path: string } {
  const https = (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://") || process.env.VERCEL_ENV === "production";
  return { ...(options as T), httpOnly: true, sameSite: "lax", secure: https, path: "/" };
}
