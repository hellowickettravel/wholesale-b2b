import { notFound } from "next/navigation";

/** Design-system reference. Hidden on the production deployment. */
export default function StyleguideLayout({ children }: LayoutProps<"/styleguide">) {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <>{children}</>;
}
