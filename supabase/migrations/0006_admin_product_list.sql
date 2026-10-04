-- 0006_admin_product_list.sql — admin product list with size / needs-price counts, so the
-- admin screen can filter and paginate "needs price" in the database. Re-runnable.
-- security_invoker: the caller's RLS applies (variants are admin-only), and the explicit
-- is_admin() filter returns nothing to anyone else.
create or replace view public.admin_product_list with (security_invoker = true) as
  select p.id, p.name, p.slug, p.active, p.image_path, p.category_id, c.name as category_name,
         p.source, p.updated_at,
         count(v.id) filter (where v.active)::int as size_count,
         count(v.id) filter (where v.active and v.cost_pence is null)::int as needs_price_count,
         string_agg(distinct s.name, ', ') as supplier_names
  from public.products p
  join public.categories c on c.id = p.category_id
  left join public.product_variants v on v.product_id = p.id
  left join public.suppliers s on s.id = v.supplier_id
  where (select public.is_admin())
  group by p.id, c.name;

revoke all on public.admin_product_list from public, anon, authenticated;
grant select on public.admin_product_list to authenticated;
