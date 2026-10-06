/**
 * Photo slots: every place a real photograph can go, named once.
 *
 * To add a photo, drop a file called `<slot id>.webp` (or .avif, .jpg, .jpeg, .png) into
 * public/images/stock/ and fill in `credit` below. No component changes: <Photo slot="..."> checks the
 * folder when the page renders and uses the file if it is there. Without a file a slot shows
 * its fallback (a shelf-colour ground), so the page is designed either way. See docs/PHOTOS.md.
 */

export type PhotoLicence = "owner-supplied" | "unsplash" | "pexels" | "commissioned" | "cc0" | "other";

export interface PhotoCredit {
  readonly author: string;
  /** Page the photo was taken from. Empty for the owner's own photos. */
  readonly sourceUrl?: string;
  readonly licence: PhotoLicence;
  readonly licenceUrl?: string;
  /** ISO date the file was downloaded: the licence is as of this day. */
  readonly retrieved?: string;
  /** "cropped to 4:5", "colour matched" */
  readonly modifications?: string;
}

export interface PhotoSlot {
  /** File name without extension, and the id used in code. Never rename once a file exists. */
  readonly id: string;
  /** What the picture shows, as a description (never "image of"). Used when the photo carries meaning. */
  readonly alt: string;
  /** True when a heading beside it already says it: the photo is then hidden from screen readers. */
  readonly decorative?: boolean;
  /** Aspect ratio [width, height] the slot is designed for when it is not sized by its parent. */
  readonly ratio: readonly [number, number];
  /** Focal point 0..1: the part that must survive any crop. Becomes object-position. */
  readonly focal: { readonly x: number; readonly y: number };
  /** Category slug whose shelf colour the fallback uses. */
  readonly ground?: string;
  /** Minimum width in pixels of the file you supply (for the shot list and the check in docs). */
  readonly minWidth: number;
  /** A photo already in the repo that fills the slot until a file is dropped in. */
  readonly bundled?: {
    readonly src: string;
    /** Percentages of the box to overscan and clip, to cut white slivers baked into the file's edges. */
    readonly trim?: { readonly top?: number; readonly right?: number; readonly bottom?: number };
    readonly credit: PhotoCredit;
  };
  /** Credit for the file in public/images/stock/. Fill in when the file arrives. */
  readonly credit?: PhotoCredit;
}

const OWNER: PhotoCredit = { author: "Supplied by the business owner", licence: "owner-supplied" };

const slot = <T extends PhotoSlot>(s: T) => s;

export const PHOTO_SLOTS = {
  "home-hero": slot({
    id: "home-hero",
    alt: "Bowls of turmeric, chilli, lentils and cardamom laid out on a market table",
    ratio: [16, 9],
    focal: { x: 0.45, y: 0.5 },
    minWidth: 2400,
    bundled: { src: "/images/home/spice-bowls.webp", trim: { top: 1.5, right: 1.6, bottom: 0.6 }, credit: OWNER },
  }),
  "home-abundance": slot({
    id: "home-abundance",
    alt: "",
    decorative: true,
    ratio: [21, 9],
    focal: { x: 0.5, y: 0.5 },
    minWidth: 2400,
  }),
  "auth-side": slot({
    id: "auth-side",
    alt: "",
    decorative: true,
    ratio: [3, 4],
    focal: { x: 0.7, y: 0.4 },
    minWidth: 1600,
    bundled: { src: "/images/home/spice-bowls.webp", trim: { top: 1.5, right: 1.6, bottom: 0.6 }, credit: OWNER },
  }),
  "category-rice": slot({ id: "category-rice", alt: "", decorative: true, ratio: [4, 3], focal: { x: 0.5, y: 0.5 }, ground: "rice", minWidth: 1600 }),
  "category-pulses-nuts-and-groceries": slot({ id: "category-pulses-nuts-and-groceries", alt: "", decorative: true, ratio: [4, 3], focal: { x: 0.5, y: 0.5 }, ground: "pulses-nuts-and-groceries", minWidth: 1600 }),
  "category-whole-spices": slot({ id: "category-whole-spices", alt: "", decorative: true, ratio: [4, 3], focal: { x: 0.5, y: 0.5 }, ground: "whole-spices", minWidth: 1600 }),
  "category-powders-and-ground-masala": slot({
    id: "category-powders-and-ground-masala",
    alt: "",
    decorative: true,
    ratio: [4, 3],
    focal: { x: 0.5, y: 0.5 },
    ground: "powders-and-ground-masala",
    minWidth: 1600,
    bundled: { src: "/images/categories/powders-and-ground-masala.webp", credit: OWNER },
  }),
  "category-flours-atta-and-rava": slot({ id: "category-flours-atta-and-rava", alt: "", decorative: true, ratio: [4, 3], focal: { x: 0.5, y: 0.5 }, ground: "flours-atta-and-rava", minWidth: 1600 }),
  "category-tea-powders-and-milk-mix": slot({ id: "category-tea-powders-and-milk-mix", alt: "", decorative: true, ratio: [4, 3], focal: { x: 0.5, y: 0.5 }, ground: "tea-powders-and-milk-mix", minWidth: 1600 }),
  "category-sauces": slot({ id: "category-sauces", alt: "", decorative: true, ratio: [4, 3], focal: { x: 0.5, y: 0.5 }, ground: "sauces", minWidth: 1600 }),
  "category-food-colours": slot({ id: "category-food-colours", alt: "", decorative: true, ratio: [4, 3], focal: { x: 0.5, y: 0.5 }, ground: "food-colours", minWidth: 1600 }),
  "category-restaurant-groceries": slot({ id: "category-restaurant-groceries", alt: "", decorative: true, ratio: [4, 3], focal: { x: 0.5, y: 0.5 }, ground: "restaurant-groceries", minWidth: 1600 }),
  "category-drinks": slot({ id: "category-drinks", alt: "", decorative: true, ratio: [4, 3], focal: { x: 0.5, y: 0.5 }, ground: "drinks", minWidth: 1600 }),
  "category-restaurant-packing-and-cleaning": slot({ id: "category-restaurant-packing-and-cleaning", alt: "", decorative: true, ratio: [4, 3], focal: { x: 0.5, y: 0.5 }, ground: "restaurant-packing-and-cleaning", minWidth: 1600 }),
} as const satisfies Record<string, PhotoSlot>;

export type PhotoSlotId = keyof typeof PHOTO_SLOTS;

/** Extensions looked for in public/images/stock/, best first. */
export const PHOTO_EXTENSIONS = ["avif", "webp", "jpg", "jpeg", "png"] as const;

/** The slot for a category's shelf photo, if the manifest has one. */
export function categoryPhotoSlot(categorySlug: string): PhotoSlotId | null {
  const id = `category-${categorySlug}`;
  return id in PHOTO_SLOTS ? (id as PhotoSlotId) : null;
}

export function getSlot(id: PhotoSlotId): PhotoSlot {
  return PHOTO_SLOTS[id];
}
