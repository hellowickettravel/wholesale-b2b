"use client";

import { useRouter } from "next/navigation";
import { ProofForm } from "@/components/delivery/proof-form";
import { submitDriverProof } from "./actions";

export function DriverForm({ token }: { token: string }) {
  const router = useRouter();
  return <ProofForm action={(fd) => submitDriverProof(token, fd)} onDone={() => router.replace(`/d/${token}/done`)} />;
}
