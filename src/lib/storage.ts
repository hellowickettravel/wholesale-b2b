import { supabaseUrl } from "@/lib/env";

/** Public bucket for product and category photos (admin-write, public-read; see 0002_rls). */
export const PRODUCT_IMAGES_BUCKET = "product-images";

/** Public URL for an object in the product-images bucket, or null when there is no photo. */
export function publicImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  // Photos shipped with the site (e.g. the supplier catalogue crops) are stored as /images/… paths.
  if (path.startsWith("/images/")) return path;
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl()}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${encoded}`;
}

/** Category photos shipped with the site (owner-supplied, see DECISIONS D25). */
const BUNDLED_CATEGORY_PHOTOS = new Set(["whole-spices", "powders-and-ground-masala", "pulses-nuts-and-groceries"]);

/** The admin's uploaded category photo, else a bundled one for launch categories, else null. */
export function categoryImageUrl(slug: string, path: string | null | undefined): string | null {
  return publicImageUrl(path) ?? (BUNDLED_CATEGORY_PHOTOS.has(slug) ? `/images/categories/${slug}.webp` : null);
}
