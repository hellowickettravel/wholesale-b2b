import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/** Limits per action (DECISIONS.md D10). window in seconds. */
export const LIMITS = {
  loginPerIp: { limit: 50, window: 15 * 60 },
  loginPerAccount: { limit: 10, window: 15 * 60 },
  registerPerIp: { limit: 5, window: 60 * 60 },
  resetPerIp: { limit: 20, window: 60 * 60 },
  resetPerAccount: { limit: 5, window: 60 * 60 },
  passwordSetPerUser: { limit: 10, window: 60 * 60 },
  invitePerAdmin: { limit: 60, window: 60 * 60 },
} as const;

/** Client IP as seen by Vercel / the local server. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "unknown";
}

/**
 * Counts one hit and returns true if still within the limit. Identifiers (IPs, emails) are
 * hashed so no personal data is stored in rate_limits. Fails open (allows) if the database
 * call itself errors, so an outage of the limiter cannot lock everyone out; it is logged.
 */
export async function hit(bucket: keyof typeof LIMITS, identifier: string): Promise<boolean> {
  const { limit, window } = LIMITS[bucket];
  const key = `${bucket}:${createHash("sha256").update(identifier.toLowerCase()).digest("hex").slice(0, 48)}`;
  const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: window,
  });
  if (error) {
    console.error("rate limiter unavailable", error.message);
    return true;
  }
  return data === true;
}
