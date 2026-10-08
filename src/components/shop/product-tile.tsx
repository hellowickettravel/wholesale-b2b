"use client";

import { ProductPlate } from "@/components/catalogue/product-plate";
import { useSizeSelection } from "./size-selection";

/** The big picture on the shop product page; its size label follows the size chosen beside it. */
export function ProductTile({
  name,
  categorySlug,
  categoryName,
  imageUrl,
  sizes,
  className,
}: {
  name: string;
  categorySlug: string;
  categoryName: string;
  imageUrl: string | null;
  sizes: { id: string; label: string }[];
  className?: string;
}) {
  const selection = useSizeSelection();
  const only = sizes.length === 1 ? sizes[0] : undefined;
  const chosen = sizes.find((s) => s.id === selection?.sizeId) ?? only ?? sizes[0];
  return <ProductPlate src={imageUrl} name={name} categoryName={categoryName} categorySlug={categorySlug} sizeLabel={chosen?.label} className={className} />;
}
