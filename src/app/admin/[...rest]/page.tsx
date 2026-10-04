import { notFound } from "next/navigation";
import { requireRole } from "@/server/auth";

/** Unknown admin paths: admin-only like every admin route (403 for others), then a 404. */
export default async function UnknownAdminPage() {
  await requireRole("admin");
  notFound();
}
