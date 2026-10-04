-- Catalogue fingerprint: run locally (psql) and on hosted (execute_sql) after an import; rows must match.
select (select count(*) from public.products) products,
       (select count(*) from public.product_variants) sizes,
       (select count(*) from public.products where image_path is not null) photos,
       (select md5(string_agg(c.slug || '|' || p.slug || '|' || p.name || '|' || split_part(p.source_ref, '::', 2) || '|' || coalesce(p.image_path, '')
          || '|' || coalesce(p.source, '') || '|' || v.size_label || '|' || v.size_sort || '|' || v.vat_rate_bp || '|' || coalesce(v.sku, '')
          || '|' || coalesce(s.name, '') || '|' || coalesce(v.cost_pence::text, 'null'), ',' order by p.slug, v.size_label))
          from public.products p join public.categories c on c.id = p.category_id
          join public.product_variants v on v.product_id = p.id left join public.suppliers s on s.id = v.supplier_id) hash;
