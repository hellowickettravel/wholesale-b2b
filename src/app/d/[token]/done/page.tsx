import { redirect } from "next/navigation";
import { formatTimestamp } from "@/domain/dates";
import { findDriverJob } from "@/server/delivery";
import { Message } from "@/components/delivery/message";

export const dynamic = "force-dynamic";

export default async function DriverDone({ params }: PageProps<"/d/[token]/done">) {
  const { token } = await params;
  const job = await findDriverJob(token);
  if (!job || job.state !== "used") redirect(`/d/${token}`);
  return (
    <Message tone="success" title="Delivery recorded">
      Thank you. The proof for {job.customerName} was sent {job.submittedAt ? formatTimestamp(job.submittedAt) : "just now"}. You can close this page.
    </Message>
  );
}
