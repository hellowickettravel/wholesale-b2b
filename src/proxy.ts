import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canonicalRedirect } from "@/lib/canonical-host";

/**
 * Runs before every page request:
 *   0. in production, sends visitors of the *.vercel.app alias to the real domain (src/lib/canonical-host.ts),
 *   1. refreshes the Supabase session cookie (the only place it can be written for RSC pages),
 *   2. sends signed-out visitors of signed-in areas to /login?next=…
 * This is an optimistic check only. Real authorisation (role, approval) happens in
 * src/server/auth.ts on every page and action, close to the data.
 */
const SIGNED_IN_AREAS = ["/admin", "/supplier", "/shop", "/basket", "/orders", "/invoices", "/account"];

export async function proxy(request: NextRequest) {
  const canonical = canonicalRedirect({
    host: request.headers.get("host"),
    pathAndQuery: `${request.nextUrl.pathname}${request.nextUrl.search}`,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    vercelEnv: process.env.VERCEL_ENV,
  });
  if (canonical) return NextResponse.redirect(canonical, 308);

  let response = NextResponse.next({ request });
  const pending: { name: string; value: string; options: Record<string, unknown> }[] = [];
  let cacheHeaders: Record<string, string> = {};

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const c of cookiesToSet) {
            response.cookies.set(c.name, c.value, c.options);
            pending.push(c);
          }
          cacheHeaders = { ...cacheHeaders, ...headers };
          for (const [k, v] of Object.entries(headers)) response.headers.set(k, v);
        },
      },
    },
  );

  // Validates the JWT (signature check, or a call to Auth for symmetric keys) and refreshes it.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const path = request.nextUrl.pathname;
  const protectedArea = SIGNED_IN_AREAS.some((p) => path === p || path.startsWith(`${p}/`));
  if (!signedIn && protectedArea) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${path}${request.nextUrl.search}`);
    const redirect = NextResponse.redirect(url);
    for (const c of pending) redirect.cookies.set(c.name, c.value, c.options);
    for (const [k, v] of Object.entries(cacheHeaders)) redirect.headers.set(k, v);
    return redirect;
  }
  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, image optimisation and files with an extension.
    "/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
