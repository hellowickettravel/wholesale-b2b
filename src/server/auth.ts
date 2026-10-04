import "server-only";
import { cache } from "react";
import { forbidden, redirect } from "next/navigation";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type Role = Database["public"]["Enums"]["user_role"];
export type CustomerStatus = Database["public"]["Enums"]["customer_status"];

export interface Viewer {
  userId: string;
  email: string;
  fullName: string | null;
  role: Role;
  active: boolean;
  customer: { id: string; businessName: string; status: CustomerStatus } | null;
  supplier: { id: string; name: string } | null;
}

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Loads the viewer for `userId` with the user's own RLS-bound client, so it can only ever read
 * the caller's own rows. The role comes from public.profiles, never from JWT metadata.
 */
export async function loadViewer(supabase: ServerClient, userId: string): Promise<Viewer | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, email, full_name, active, customer_id, supplier_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;

  let customer: Viewer["customer"] = null;
  if (profile.role === "customer" && profile.customer_id && profile.active) {
    const { data } = await supabase
      .from("customers")
      .select("id, business_name, status")
      .eq("id", profile.customer_id)
      .maybeSingle();
    if (data) customer = { id: data.id, businessName: data.business_name, status: data.status };
  }

  let supplier: Viewer["supplier"] = null;
  if (profile.role === "supplier" && profile.active) {
    const { data } = await supabase.from("my_supplier").select("id, name").maybeSingle();
    if (data?.id && data.name) supplier = { id: data.id, name: data.name };
  }

  return {
    userId,
    email: profile.email ?? "",
    fullName: profile.full_name,
    role: profile.role,
    active: profile.active,
    customer,
    supplier,
  };
}

/** The signed-in user for this request (JWT verified by getClaims), or null. Cached per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  return userId ? loadViewer(supabase, userId) : null;
});

/** Where a user lands after signing in. */
export function homeFor(viewer: Viewer): string {
  if (!viewer.active) return "/account-disabled";
  switch (viewer.role) {
    case "admin":
      return "/admin";
    case "supplier":
      return viewer.supplier ? "/supplier" : "/account-disabled";
    case "customer":
      return viewer.customer?.status === "approved" ? "/shop" : "/register/pending";
  }
}

const AREAS: Record<Role, string[]> = {
  admin: ["/admin"],
  supplier: ["/supplier"],
  customer: ["/shop", "/basket", "/orders", "/invoices", "/account"],
};

/**
 * Validates a user-supplied ?next= path: same-origin relative path only, and only inside the
 * viewer's own area. Anything else falls back to the role's home. Prevents open redirects.
 */
export function destinationFor(viewer: Viewer, next: string | null | undefined): string {
  const home = homeFor(viewer);
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return home;
  if (home === "/register/pending" || home === "/account-disabled") return home;
  const path = next.split(/[?#]/)[0];
  const allowed = AREAS[viewer.role].some((a) => path === a || path.startsWith(`${a}/`));
  return allowed ? next : home;
}

/**
 * Gate for every protected page, layout and server action. Not signed in -> /login;
 * wrong role -> 403; customer not approved -> pending page.
 */
export async function requireRole(role: Role): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.active) redirect("/account-disabled");
  if (viewer.role !== role) forbidden();
  if (role === "customer" && viewer.customer?.status !== "approved") redirect("/register/pending");
  if (role === "supplier" && !viewer.supplier) redirect("/account-disabled");
  return viewer;
}
