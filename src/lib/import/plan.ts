/**
 * Turns grouped import rows into an insert-only plan against what already exists. Pure, so
 * the preview the admin sees and the import that runs are computed by the same code.
 *
 * Idempotent by design (DECISIONS D22): a product is identified by "<category id>::<name key>",
 * a size by its source line or its size label. Anything that already exists is left exactly
 * as the admin last edited it; only missing categories, products and sizes are added. Costs
 * are never set by an import ("needs price").
 */
import { normaliseKey, slugify, type GroupingReport } from "./parse-name";

export interface ExistingCategory {
  id: string;
  name: string;
  slug: string;
  sort: number;
  default_vat_rate_bp: number;
}

export interface ExistingProduct {
  id: string;
  source_ref: string;
  variants: { size_label: string; source_ref: string | null }[];
}

export interface ImportState {
  categories: ExistingCategory[];
  /** Products that have an import key, by key. */
  products: Map<string, ExistingProduct>;
  productSlugs: Set<string>;
}

export interface PlannedCategory {
  id: string;
  name: string;
  slug: string;
  sort: number;
  default_vat_rate_bp: number;
}

export interface PlannedProduct {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  image_path: string | null;
  source: string;
  source_ref: string;
}

export interface PlannedVariant {
  product_id: string;
  size_label: string;
  size_sort: number;
  supplier_id: string | null;
  vat_rate_bp: number;
  sku: string | null;
  source_ref: string;
  cost_pence: null;
}

export interface PreviewProduct {
  name: string;
  category: string;
  isNew: boolean;
  sizes: { label: string; isNew: boolean }[];
}

export interface ImportPlan {
  categories: PlannedCategory[];
  products: PlannedProduct[];
  variants: PlannedVariant[];
  matchedProducts: number;
  matchedVariants: number;
  preview: PreviewProduct[];
}

export function productRef(categoryId: string, nameKey: string): string {
  return `${categoryId}::${nameKey}`;
}

/** base, base-2, base-3 … (max 80 chars) not already in `taken`; adds the result to `taken`. */
export function uniqueSlug(name: string, taken: Set<string>): string {
  const base = slugify(name) || "item";
  let slug = base;
  for (let n = 2; taken.has(slug); n++) {
    const suffix = `-${n}`;
    slug = `${base.slice(0, 80 - suffix.length).replace(/-+$/, "")}${suffix}`;
  }
  taken.add(slug);
  return slug;
}

const MAX_SIZE_SORT = 2_000_000_000;

export function planImport(
  grouped: GroupingReport,
  state: ImportState,
  opts: { source: string; supplierId: string | null; newId: () => string; previewLimit?: number },
): ImportPlan {
  const categories: PlannedCategory[] = [];
  const products: PlannedProduct[] = [];
  const variants: PlannedVariant[] = [];
  const preview: PreviewProduct[] = [];
  let matchedProducts = 0;
  let matchedVariants = 0;

  const byKey = new Map<string, ExistingCategory | PlannedCategory>();
  for (const c of state.categories) {
    byKey.set(normaliseKey(c.name), c);
    byKey.set(`slug:${c.slug}`, c);
  }
  const categorySlugs = new Set(state.categories.map((c) => c.slug));
  let nextSort = state.categories.reduce((m, c) => Math.max(m, c.sort), 0) + 1;
  const productSlugs = new Set(state.productSlugs);

  for (const g of grouped.products) {
    let category = byKey.get(g.categoryKey) ?? byKey.get(`slug:${slugify(g.category)}`);
    if (!category) {
      const created: PlannedCategory = {
        id: opts.newId(),
        name: g.category.slice(0, 120),
        slug: uniqueSlug(g.category, categorySlugs),
        sort: nextSort++,
        default_vat_rate_bp: 0,
      };
      categories.push(created);
      byKey.set(g.categoryKey, created);
      byKey.set(`slug:${created.slug}`, created);
      category = created;
    }

    const ref = productRef(category.id, g.nameKey);
    const existing = state.products.get(ref);
    let productId: string;
    const sizes: PreviewProduct["sizes"] = [];
    const knownLabels = new Set<string>();
    const knownRefs = new Set<string>();
    if (existing) {
      matchedProducts++;
      productId = existing.id;
      for (const v of existing.variants) {
        knownLabels.add(v.size_label.toLowerCase());
        if (v.source_ref) knownRefs.add(v.source_ref);
      }
    } else {
      productId = opts.newId();
      products.push({
        id: productId,
        category_id: category.id,
        name: g.name.slice(0, 200),
        slug: uniqueSlug(g.name, productSlugs),
        description: g.description ?? null,
        image_path: g.image ?? null,
        source: opts.source,
        source_ref: ref,
      });
    }

    for (const v of g.variants) {
      const label = v.sizeLabel.slice(0, 60);
      if (knownRefs.has(v.source) || knownLabels.has(label.toLowerCase())) {
        matchedVariants++;
        sizes.push({ label, isNew: false });
        continue;
      }
      knownLabels.add(label.toLowerCase());
      variants.push({
        product_id: productId,
        size_label: label,
        size_sort: Math.min(MAX_SIZE_SORT, Math.max(0, Math.round(v.sortKey))),
        supplier_id: opts.supplierId,
        vat_rate_bp: v.vatBp ?? category.default_vat_rate_bp,
        sku: v.sku ?? null,
        source_ref: v.source.slice(0, 500),
        cost_pence: null,
      });
      sizes.push({ label, isNew: true });
    }
    // The preview lists what will change; products with nothing new are only counted.
    if ((!existing || sizes.some((sz) => sz.isNew)) && preview.length < (opts.previewLimit ?? 200)) {
      preview.push({ name: g.name, category: category.name, isNew: !existing, sizes });
    }
  }

  return { categories, products, variants, matchedProducts, matchedVariants, preview };
}
