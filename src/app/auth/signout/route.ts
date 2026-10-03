import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * POST only, so a link or image on another site cannot sign people out. The client writes its
 * cookie deletions straight onto the 303 response.
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login?notice=signed-out", request.url), { status: 303 });
  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [k, v] of Object.entries(headers ?? {})) response.headers.set(k, v);
      },
    },
  });
  await supabase.auth.signOut();
  return response;
}
