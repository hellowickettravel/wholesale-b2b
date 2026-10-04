"use server";

import { clientIp, hit } from "@/server/rate-limit";
import { findDriverJob, submitProof, type ProofResult } from "@/server/delivery";

/** The driver's submission. The token is the only credential; it must be open (D9). */
export async function submitDriverProof(token: string, formData: FormData): Promise<ProofResult> {
  if (!(await hit("driverSubmitPerIp", await clientIp())) || !(await hit("driverSubmitPerToken", token))) {
    return { ok: false, error: "Too many attempts. Wait a few minutes and try again." };
  }
  const job = await findDriverJob(token);
  if (!job || job.state !== "open") {
    return { ok: false, gone: true, error: "This link can no longer be used. Ask the supplier for a new one." };
  }
  return submitProof(formData, { supplierOrderId: job.supplierOrderId, proofId: job.proofId, kind: "driver", actorId: null });
}
