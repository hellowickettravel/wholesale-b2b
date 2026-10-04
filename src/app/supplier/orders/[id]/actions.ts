"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { LinkResult } from "@/components/delivery/driver-link";
import { siteUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth";
import { createDriverLink, submitProof, type ProofResult } from "@/server/delivery";
import { hit } from "@/server/rate-limit";

/**
 * The supplier's own order, read with the supplier's client (supplier_order_list is filtered to
 * my_supplier_id()). Null for anything else, so every action below is limited to own orders
 * before the service role is used.
 */
async function ownOpenOrder(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("supplier_order_list").select("id, status").eq("id", id).maybeSingle();
  return data;
}

export type StatusResult = { error?: string };

export async function setStatus(id: string, status: "sent" | "out_for_delivery"): Promise<StatusResult> {
  const viewer = await requireRole("supplier");
  const so = await ownOpenOrder(id);
  if (!so) return { error: "Order not found." };
  if (status !== "sent" && status !== "out_for_delivery") return { error: "Not allowed." };
  const { error } = await createAdminClient().rpc("set_supplier_order_status", { p_supplier_order: id, p_status: status, p_actor: viewer.userId });
  if (error) return { error: error.code === "P0001" ? "This order has already moved on. Reload the page." : "Could not update the order. Try again." };
  revalidatePath(`/supplier/orders/${id}`);
  revalidatePath("/supplier");
  return {};
}

export async function newDriverLink(id: string): Promise<LinkResult> {
  const viewer = await requireRole("supplier");
  const so = await ownOpenOrder(id);
  if (!so) return { error: "Order not found." };
  if (so.status === "delivered" || so.status === "cancelled") return { error: "This order is closed." };
  if (!(await hit("driverLinkPerUser", viewer.userId))) return { error: "Too many links in a short time. Wait a few minutes." };
  try {
    const { token, expiresAt } = await createDriverLink(id, viewer.userId);
    revalidatePath(`/supplier/orders/${id}`);
    return { url: `${siteUrl()}/d/${token}`, expiresAt };
  } catch (e) {
    console.error((e as Error).message);
    return { error: "Could not create the link. Try again." };
  }
}

export async function uploadOwnProof(id: string, formData: FormData): Promise<ProofResult> {
  const viewer = await requireRole("supplier");
  const so = await ownOpenOrder(id);
  if (!so) return { ok: false, error: "Order not found." };
  const r = await submitProof(formData, { supplierOrderId: id, proofId: null, kind: "supplier", actorId: viewer.userId });
  if (r.ok) {
    revalidatePath(`/supplier/orders/${id}`);
    revalidatePath("/supplier");
  }
  return r;
}

export async function markAllRead(): Promise<void> {
  const viewer = await requireRole("supplier");
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", viewer.userId).is("read_at", null);
  revalidatePath("/supplier");
}
