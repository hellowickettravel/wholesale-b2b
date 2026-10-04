-- 0005_catalogue.sql — Phase 3: catalogue structure for import and admin editing.
-- Re-runnable; no DROP/DELETE (DECISIONS D20).

-- Default VAT for new sizes in a category (admin can change per size). Not a price.
alter table public.categories
  add column if not exists default_vat_rate_bp integer not null default 0
  check (default_vat_rate_bp between 0 and 10000);

-- Import identity (DECISIONS D22). products.source_ref = "<CATEGORY KEY>::<PRODUCT KEY>", the
-- normalised category + base name, so the same item in the same category is one product no
-- matter which list it came from. product_variants.source_ref = the original source line.
alter table public.product_variants
  add column if not exists source_ref text check (source_ref is null or length(source_ref) <= 500);

create unique index if not exists products_source_ref_key
  on public.products (source_ref) where source_ref is not null;
create unique index if not exists product_variants_source_ref_key
  on public.product_variants (product_id, source_ref) where source_ref is not null;
create index if not exists products_active_name_idx on public.products (name) where active;

-- Launch categories from the brief (fixed ids so local seed data can reference them).
-- Drinks and packaging/cleaning default to standard-rate VAT; food defaults to zero-rated.
-- Defaults only: the accountant should confirm per item (DECISIONS D23).
insert into public.categories (id, name, slug, sort, default_vat_rate_bp) values
  ('ca7e0000-0000-4000-a000-000000000001', 'Rice', 'rice', 1, 0),
  ('ca7e0000-0000-4000-a000-000000000002', 'Pulses, Nuts & Groceries', 'pulses-nuts-and-groceries', 2, 0),
  ('ca7e0000-0000-4000-a000-000000000003', 'Whole Spices', 'whole-spices', 3, 0),
  ('ca7e0000-0000-4000-a000-000000000004', 'Powders & Ground Masala', 'powders-and-ground-masala', 4, 0),
  ('ca7e0000-0000-4000-a000-000000000005', 'Flours, Atta & Rava', 'flours-atta-and-rava', 5, 0),
  ('ca7e0000-0000-4000-a000-000000000006', 'Tea Powders & Milk Mix', 'tea-powders-and-milk-mix', 6, 0),
  ('ca7e0000-0000-4000-a000-000000000007', 'Sauces', 'sauces', 7, 0),
  ('ca7e0000-0000-4000-a000-000000000008', 'Food Colours', 'food-colours', 8, 0),
  ('ca7e0000-0000-4000-a000-000000000009', 'Restaurant Groceries', 'restaurant-groceries', 9, 0),
  ('ca7e0000-0000-4000-a000-000000000010', 'Drinks', 'drinks', 10, 2000),
  ('ca7e0000-0000-4000-a000-000000000011', 'Restaurant Packing & Cleaning', 'restaurant-packing-and-cleaning', 11, 2000)
on conflict do nothing;

-- Public sees a product only while both it and its category are active.
select public.ensure_policy('public', 'products', 'public_read', 'select', 'anon, authenticated',
  '(active and exists (select 1 from public.categories c where c.id = category_id and c.active)) or (select public.is_admin())');

-- Catalogue edits are audited too (actor = the admin, since admins write with their own client).
create or replace trigger audit after insert or update or delete on public.categories
  for each row execute function public.audit_row_change();
create or replace trigger audit after insert or update or delete on public.products
  for each row execute function public.audit_row_change();
