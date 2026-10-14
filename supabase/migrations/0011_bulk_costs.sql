-- Bulk cost import (admin only): sets the cost of many sizes in one transaction.
-- Each row: { "id": variant uuid, "cost_pence": integer, "vat_rate_bp"?: integer, "supplier_id"?: uuid }.
-- Only those columns change; the audit trigger on product_variants records every change under the signed-in admin.
-- Re-runnable. No data change by itself.

create or replace function public.admin_set_variant_costs(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) > 1000 then
    raise exception 'expected an array of at most 1000 rows' using errcode = '22023';
  end if;

  with r as (
    select (e ->> 'id')::uuid as id,
           (e ->> 'cost_pence')::bigint as cost_pence,
           (e ->> 'vat_rate_bp')::integer as vat_rate_bp,
           (e ->> 'supplier_id')::uuid as supplier_id
    from jsonb_array_elements(p_rows) e
  ), u as (
    update public.product_variants v
       set cost_pence = r.cost_pence,
           vat_rate_bp = coalesce(r.vat_rate_bp, v.vat_rate_bp),
           supplier_id = coalesce(r.supplier_id, v.supplier_id)
      from r
     where v.id = r.id
    returning 1
  )
  select count(*) into v_count from u;
  return v_count;
end;
$$;

revoke execute on function public.admin_set_variant_costs(jsonb) from public, anon;
grant execute on function public.admin_set_variant_costs(jsonb) to authenticated;
