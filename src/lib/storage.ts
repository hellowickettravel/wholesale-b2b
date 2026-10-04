import { supabaseUrl } from "@/lib/env";

/** Public bucket for product and category photos (admin-write, public-read; see 0002_rls). */
export const PRODUCT_IMAGES_BUCKET = "product-images";

/** Public URL for an object in the product-images bucket, or null when there is no photo. */
export function publicImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl()}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${encoded}`;
}
