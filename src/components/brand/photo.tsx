import "server-only";
import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import { PHOTO_EXTENSIONS, PHOTO_SLOTS, type PhotoSlot, type PhotoSlotId } from "@/config/photos";
import { cn } from "@/lib/cn";

const STOCK_DIR = path.join(process.cwd(), "public", "images", "stock");
const cache = new Map<string, string | null>();

/** URL of the file dropped into public/images/stock/ for this slot, or null. Checked on every render in dev. */
function stockFile(id: string): string | null {
  const hit = cache.get(id);
  if (hit !== undefined) return hit;
  let found: string | null = null;
  for (const ext of PHOTO_EXTENSIONS) {
    if (fs.existsSync(path.join(STOCK_DIR, `${id}.${ext}`))) {
      found = `/images/stock/${id}.${ext}`;
      break;
    }
  }
  if (process.env.NODE_ENV === "production") cache.set(id, found);
  return found;
}

/** True when a real photograph (dropped-in file or bundled one) fills this slot. */
export function hasPhoto(id: PhotoSlotId): boolean {
  const def: PhotoSlot = PHOTO_SLOTS[id];
  return Boolean(stockFile(id) ?? def.bundled);
}

/** True only when a file was dropped into public/images/stock/ (not the bundled stand-in). */
export function hasStockPhoto(id: PhotoSlotId): boolean {
  return stockFile(id) !== null;
}

/**
 * A photograph by slot name (see src/config/photos.ts and docs/PHOTOS.md).
 * File present: rendered with next/image, cropped around the slot's focal point.
 * File absent: the slot's bundled photo if it has one, else a shelf-colour ground, or nothing
 * with fallback="none" (for bands that should only exist once there is a photo).
 *
 * The wrapper is sized by the caller (className) unless box="ratio", which gives it the slot's
 * aspect ratio. Never holds text: put text on a plate beside it.
 */
export function Photo({
  slot,
  className,
  box = "parent",
  priority,
  sizes = "100vw",
  fallback = "ground",
  focal,
}: {
  slot: PhotoSlotId;
  className?: string;
  /** "parent": fill the box the caller sizes. "ratio": use the slot's aspect ratio. */
  box?: "parent" | "ratio";
  priority?: boolean;
  sizes?: string;
  fallback?: "ground" | "none";
  /** Override the manifest focal point, e.g. a tighter crop on a narrow panel. */
  focal?: { x: number; y: number };
}) {
  const def: PhotoSlot = PHOTO_SLOTS[slot];
  const file = stockFile(def.id);
  const src = file ?? def.bundled?.src ?? null;
  const trim = file ? undefined : def.bundled?.trim;
  const f = focal ?? def.focal;
  const decorative = Boolean(def.decorative);
  // The frame must be a positioned box; add `relative` unless the caller already positions it (absolute, sticky...).
  const position = /(^|\s)(absolute|fixed|sticky|relative)(\s|$)/.test(className ?? "") ? undefined : "relative";
  const frame = cn(position, "overflow-hidden bg-sunken", className);
  const style = box === "ratio" ? { aspectRatio: `${def.ratio[0]} / ${def.ratio[1]}` } : undefined;

  if (!src) {
    if (fallback === "none") return null;
    return (
      <div
        data-ground={def.ground ?? "default"}
        className={cn(position, "weave overflow-hidden", className)}
        style={style}
        {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": def.alt })}
      />
    );
  }

  return (
    <div className={frame} style={style}>
      <div
        className="absolute left-0"
        style={{ top: `-${trim?.top ?? 0}%`, height: `${100 + (trim?.top ?? 0) + (trim?.bottom ?? 0)}%`, width: `${100 + (trim?.right ?? 0)}%` }}
      >
        <Image
          src={src}
          alt={decorative ? "" : def.alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          style={{ objectPosition: `${f.x * 100}% ${f.y * 100}%` }}
        />
      </div>
    </div>
  );
}
