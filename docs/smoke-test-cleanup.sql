-- Removes ONLY the throw-away "ZZ Smoke" test data from the live database (two test orders, two invoices,
-- three test restaurants, two test suppliers with logins, two test products).
-- Run in the Supabase dashboard > SQL editor, project qtztjbnaofonazruovty. Safe to run twice.
--
-- Safety: every delete is limited to the "ZZ Smoke" restaurants, suppliers and products. If any order exists
-- for a real restaurant, or a real order went to a test supplier, the script stops with an error and
-- changes nothing. The order and invoice numbers are put back (first real order ORDER-1001, first invoice
-- INV-000001) only when no other order or invoice is left.
begin;

do $$
begin
  if exists (
    select 1 from public.orders o join public.customers c on c.id = o.customer_id
    where c.business_name not like 'ZZ Smoke%'
      and exists (select 1 from public.supplier_orders so join public.suppliers s on s.id = so.supplier_id
                  where so.order_id = o.id and s.name like 'ZZ Smoke%')
  ) then
    raise exception 'Stopped: a real restaurant has an order with a ZZ Smoke supplier. Nothing was changed.';
  end if;
end $$;

create temporary table smoke_orders on commit drop as
  select o.id from public.orders o join public.customers c on c.id = o.customer_id
  where c.business_name like 'ZZ Smoke%';

delete from public.supplier_payments where supplier_order_id in (select id from public.supplier_orders where order_id in (select id from smoke_orders));
delete from public.customer_payments where order_id in (select id from smoke_orders);
delete from public.delivery_proofs  where supplier_order_id in (select id from public.supplier_orders where order_id in (select id from smoke_orders));
delete from public.invoices         where order_id in (select id from smoke_orders);
delete from public.order_items      where order_id in (select id from smoke_orders);
delete from public.supplier_orders  where order_id in (select id from smoke_orders);
delete from public.orders           where id in (select id from smoke_orders);
delete from public.basket_items     where customer_id in (select id from public.customers where business_name like 'ZZ Smoke%');
-- Test emails only. Real queued emails (for example Raju's approval) are kept.
delete from public.email_log where to_email like '%@example.com' or to_email like 'zz.wholesale.smoke.%';
delete from public.customer_category_access where customer_id in (select id from public.customers where business_name like 'ZZ Smoke%');
delete from public.customer_private where customer_id in (select id from public.customers where business_name like 'ZZ Smoke%');
delete from public.product_variants where source_ref = 'smoke-test';
delete from public.products where source = 'smoke-test';
delete from public.profiles where email in ('smoke-a@example.com','smoke-b@example.com','zz-smoke-kitchen@example.com','zz-smoke-kitchen2@example.com','zz.wholesale.smoke.reg.7731@gmail.com');
-- Their notifications go with the logins (on delete cascade).
delete from auth.users where email in ('smoke-a@example.com','smoke-b@example.com','zz-smoke-kitchen@example.com','zz-smoke-kitchen2@example.com','zz.wholesale.smoke.reg.7731@gmail.com');
delete from public.customers where business_name like 'ZZ Smoke%';
delete from public.suppliers where name like 'ZZ Smoke%';
update public.counters set value = 1000 where name = 'order'   and not exists (select 1 from public.orders);
update public.counters set value = 0    where name = 'invoice' and not exists (select 1 from public.invoices);
commit;
-- Then Storage > delivery-proofs: delete the folders of the test orders (the bucket was empty before the tests).
