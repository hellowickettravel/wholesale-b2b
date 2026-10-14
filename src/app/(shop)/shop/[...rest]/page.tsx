import { notFound } from "next/navigation";

/** Any unknown URL under this area shows the area's own not-found page (with its menu), and a real 404 status. */
export default function UnknownPage() {
  notFound();
}
