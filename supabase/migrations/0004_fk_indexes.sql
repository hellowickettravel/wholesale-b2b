-- 0004_fk_indexes.sql — covering indexes for foreign keys flagged by the Supabase performance
-- advisor (keeps cascades and joins cheap as data grows). Re-runnable.

create index if not exists customer_category_access_category_idx on public.customer_category_access (category_id);
create index if not exists customer_category_margins_category_idx on public.customer_category_margins (category_id);
create index if not exists customer_product_rules_product_idx on public.customer_product_rules (product_id);
create index if not exists customer_payments_recorded_by_idx on public.customer_payments (recorded_by);
create index if not exists supplier_payments_recorded_by_idx on public.supplier_payments (recorded_by);
create index if not exists delivery_proofs_created_by_idx on public.delivery_proofs (created_by);
create index if not exists order_items_product_idx on public.order_items (product_id);
create index if not exists order_items_supplier_idx on public.order_items (supplier_id);
create index if not exists order_items_variant_idx on public.order_items (variant_id);
create index if not exists orders_placed_by_idx on public.orders (placed_by);
