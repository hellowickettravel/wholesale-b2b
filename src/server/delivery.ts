import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { checkProofFile, PROOF_MAX_TOTAL, type ProofFileKind } from "@/lib/proof-files";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Driver links and proof of delivery (DECISIONS D9, D35). Server-only: uses the service role
 * for the private bucket and for token lookups (the token hash is never selectable by any
 * API role). Callers authorise first: a valid driver token, or requireRole + ownership.
 */

export const BUCKET = "delivery-proofs";
export const LINK_HOURS = 72;
const SIGNED_URL_SECONDS = 15 * 60;

/** 256-bit random token, URL-safe (43 characters). Shown once; only its SHA-256 is stored. */
export function newDriverToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): Buffer {
  return createHash("sha256").update(token, "utf8").digest();
}

export function isTokenShape(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

export type LinkState = "open" | "used" | "expired" | "revoked" | "closed";

export interface DriverJob {
  proofId: string;
  supplierOrderId: string;
  state: LinkState;
  expiresAt: string | null;
  submittedAt: string | null;
  orderNumber: number;
  deliveryDate: string;
  supplierName: string;
  customerName: string;
  contactName: string | null;
  phone: string | null;
  address: string;
  note: string | null;
  lines: { productName: string; sizeLabel: string; qty: number }[];
}

/** Finds the job a driver token belongs to. Null for a token that never existed. */
export async function findDriverJob(token: string): Promise<DriverJob | null> {
  if (!isTokenShape(token)) return null;
  const admin = createAdminClient();
  const { data: proof, error } = await admin
    .from("delivery_proofs")
    .select("id, supplier_order_id, expires_at, revoked_at, submitted_at")
    .eq("token_hash", `\\x${hashToken(token).toString("hex")}`)
    .maybeSingle();
  if (error) throw new Error(`driver link: ${error.message}`);
  if (!proof) return null;

  const { data: so, error: e2 } = await admin
    .from("supplier_orders")
    .select("id, status, suppliers(name, active), orders!inner(number, delivery_date, delivery_address, note, customers(business_name, contact_name, phone))")
    .eq("id", proof.supplier_order_id)
    .single();
  if (e2) throw new Error(`driver job: ${e2.message}`);
  const { data: lines } = await admin
    .from("order_items")
    .select("product_name, size_label, qty")
    .eq("supplier_order_id", proof.supplier_order_id)
    .order("sort");

  type SO = {
    status: string;
    suppliers: { name: string; active: boolean } | null;
    orders: { number: number; delivery_date: string; delivery_address: string; note: string | null; customers: { business_name: string; contact_name: string | null; phone: string | null } | null };
  };
  const s = so as unknown as SO;
  const state: LinkState = proof.submitted_at
    ? "used"
    : proof.revoked_at
      ? "revoked"
      : !proof.expires_at || new Date(proof.expires_at).getTime() <= Date.now()
        ? "expired"
        : s.status === "delivered" || s.status === "cancelled" || !s.suppliers?.active
          ? "closed"
          : "open";

  return {
    proofId: proof.id,
    supplierOrderId: proof.supplier_order_id,
    state,
    expiresAt: proof.expires_at,
    submittedAt: proof.submitted_at,
    orderNumber: Number(s.orders.number),
    deliveryDate: s.orders.delivery_date,
    supplierName: s.suppliers?.name ?? "",
    customerName: s.orders.customers?.business_name ?? "",
    contactName: s.orders.customers?.contact_name ?? null,
    phone: s.orders.customers?.phone ?? null,
    address: s.orders.delivery_address,
    note: s.orders.note,
    lines: (lines ?? []).map((l) => ({ productName: l.product_name, sizeLabel: l.size_label, qty: l.qty })),
  };
}

/** Creates a driver link (revoking any unused one) and returns the token to show once. */
export async function createDriverLink(supplierOrderId: string, actorId: string): Promise<{ token: string; expiresAt: string }> {
  const token = newDriverToken();
  const expiresAt = new Date(Date.now() + LINK_HOURS * 3600_000).toISOString();
  const { error } = await createAdminClient().rpc("create_driver_link", {
    p_supplier_order: supplierOrderId,
    p_token_hash: `\\x${hashToken(token).toString("hex")}`,
    p_expires_at: expiresAt,
    p_actor: actorId,
  });
  if (error) throw new Error(`create driver link: ${error.message}`);
  return { token, expiresAt };
}

export type ProofResult = { ok: true } | { ok: false; error: string; gone?: boolean };

/**
 * Checks, stores and records a proof. Files are checked by their bytes, stored in the private
 * bucket under the supplier order, then record_delivery_proof marks the delivery done in one
 * transaction. If that fails (for example the link was used a moment ago) the files are removed.
 */
export async function submitProof(
  formData: FormData,
  target: { supplierOrderId: string; proofId: string | null; kind: "driver" | "supplier" | "admin"; actorId: string | null },
): Promise<ProofResult> {
  const files: Partial<Record<ProofFileKind, { bytes: Uint8Array; ext: string; contentType: string }>> = {};
  let total = 0;
  for (const kind of ["photo", "document", "signature"] as const) {
    const f = formData.get(kind);
    if (!f || typeof f === "string" || f.size === 0) continue;
    total += f.size;
    if (total > PROOF_MAX_TOTAL) return { ok: false, error: "The files are too large together. Retake the photo, or use a smaller PDF." };
    const bytes = new Uint8Array(await f.arrayBuffer());
    const checked = checkProofFile(kind, bytes);
    if ("error" in checked) return { ok: false, error: checked.error };
    files[kind] = { bytes, ...checked };
  }
  if (!files.photo) return { ok: false, error: "Take a photo of the delivery." };
  if (!files.document && !files.signature) return { ok: false, error: "Add the signed delivery note, or ask the customer to sign on screen." };
  const signedBy = String(formData.get("signed_by_name") ?? "").trim().slice(0, 200);

  const admin = createAdminClient();
  const folder = `${target.supplierOrderId}/${Date.now()}-${randomBytes(6).toString("hex")}`;
  const paths: Partial<Record<ProofFileKind, string>> = {};
  for (const [kind, f] of Object.entries(files) as [ProofFileKind, NonNullable<(typeof files)[ProofFileKind]>][]) {
    const path = `${folder}/${kind}.${f.ext}`;
    const { error } = await admin.storage.from(BUCKET).upload(path, f.bytes, { contentType: f.contentType, upsert: false });
    if (error) {
      await removeFiles(Object.values(paths));
      console.error("proof upload failed:", error.message);
      return { ok: false, error: "Upload failed. Check your signal and try again." };
    }
    paths[kind] = path;
  }

  const { error } = await admin.rpc("record_delivery_proof", {
    p: {
      proof_id: target.proofId,
      supplier_order_id: target.supplierOrderId,
      submitted_by_kind: target.kind,
      actor: target.actorId,
      photo_path: paths.photo,
      document_path: paths.document ?? null,
      signature_path: paths.signature ?? null,
      signed_by_name: signedBy || null,
    },
  });
  if (error) {
    await removeFiles(Object.values(paths));
    if (error.code === "P0002") return { ok: false, gone: true, error: "This delivery has already been recorded, or the link is no longer valid." };
    console.error("record_delivery_proof failed:", error.message);
    return { ok: false, error: "Could not save the proof. Try again." };
  }
  return { ok: true };
}

async function removeFiles(paths: (string | undefined)[]) {
  const list = paths.filter((p): p is string => Boolean(p));
  if (list.length === 0) return;
  const { error } = await createAdminClient().storage.from(BUCKET).remove(list);
  if (error) console.error("proof cleanup failed:", error.message);
}

export interface ProofRow {
  id: string;
  supplier_order_id: string | null;
  submitted_at: string | null;
  submitted_by_kind: "driver" | "supplier" | "admin" | null;
  photo_path: string | null;
  document_path: string | null;
  signature_path: string | null;
  signed_by_name: string | null;
}

export interface ProofView {
  id: string;
  supplierOrderId: string;
  submittedAt: string;
  submittedBy: "driver" | "supplier" | "admin";
  signedByName: string | null;
  photoUrl: string | null;
  documentUrl: string | null;
  documentIsPdf: boolean;
  signatureUrl: string | null;
}

/**
 * Short-lived signed URLs for proofs the caller has ALREADY been allowed to read (rows from
 * customer_delivery_proofs / supplier_delivery_proofs with the user's own client, or admin).
 */
export async function signProofs(rows: ProofRow[]): Promise<ProofView[]> {
  const submitted = rows.filter((r) => r.submitted_at && r.supplier_order_id);
  const paths = submitted.flatMap((r) => [r.photo_path, r.document_path, r.signature_path]).filter((p): p is string => Boolean(p));
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
    if (error) console.error("sign proofs:", error.message);
    for (const d of data ?? []) if (d.path && d.signedUrl) urls.set(d.path, d.signedUrl);
  }
  const url = (p: string | null) => (p ? (urls.get(p) ?? null) : null);
  return submitted.map((r) => ({
    id: r.id,
    supplierOrderId: r.supplier_order_id!,
    submittedAt: r.submitted_at!,
    submittedBy: r.submitted_by_kind ?? "driver",
    signedByName: r.signed_by_name,
    photoUrl: url(r.photo_path),
    documentUrl: url(r.document_path),
    documentIsPdf: Boolean(r.document_path?.endsWith(".pdf")),
    signatureUrl: url(r.signature_path),
  }));
}

/** The driver link still waiting to be used, if any (not used, not revoked, not expired). */
export function activeLink<T extends { submitted_at: string | null; revoked_at: string | null; expires_at: string | null }>(rows: T[]): T | null {
  const now = Date.now();
  return rows.find((p) => !p.submitted_at && !p.revoked_at && p.expires_at && new Date(p.expires_at).getTime() > now) ?? null;
}
