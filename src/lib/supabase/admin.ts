import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { supabaseUrl } from "@/lib/env";
import { serviceRoleKey } from "@/server/env";

/**
 * SERVICE-ROLE client: bypasses RLS. Server-only. Use only after an explicit authorisation
 * check (requireRole) and only for what the user's own client cannot do: pricing that needs
 * costs, order creation, rate limiting, auth admin (invites).
 */
export function createAdminClient() {
  return createClient<Database>(supabaseUrl(), serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
