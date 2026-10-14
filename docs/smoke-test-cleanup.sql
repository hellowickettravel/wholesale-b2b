-- Run in Supabase dashboard > SQL editor (project qtztjbnaofonazruovty). Removes only the "ZZ Smoke" test data.
begin;
delete from public.supplier_payments;
delete from public.customer_payments;
delete from public.delivery_proofs;
delete from public.invoices;
delete from public.order_items;
delete from public.supplier_orders;
delete from public.orders;
delete from public.notifications;
delete from public.basket_items;
delete from public.email_log where created_at > now() - interval '12 hours';
delete from public.customer_category_access where customer_id in (select id from public.customers where business_name = 'ZZ Smoke Kitchen');
delete from public.customer_private where customer_id in (select id from public.customers where business_name = 'ZZ Smoke Kitchen');
delete from public.product_variants where source_ref = 'smoke-test';
delete from public.products where source = 'smoke-test';
delete from public.profiles where email in ('smoke-a@example.com','smoke-b@example.com','zz-smoke-kitchen@example.com');
delete from auth.users where email in ('smoke-a@example.com','smoke-b@example.com','zz-smoke-kitchen@example.com');
delete from public.customers where business_name = 'ZZ Smoke Kitchen';
delete from public.suppliers where name like 'ZZ Smoke%';
update public.counters set value = 1000 where name = 'order';
update public.counters set value = 0 where name = 'invoice';
commit;
-- then Storage > delivery-proofs: delete the folders 30e2bbec-0282-4500-a81b-f74075b9124f and 94a942e0-b69d-488b-8309-92a5fb8d79c9
