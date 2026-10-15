-- Removes ONLY the throw-away "ZZ Smoke" test data from the live database (two test orders, two invoices,
-- three test restaurants, two test suppliers with logins, two test products) and puts the order and invoice
-- numbers back so your first real order is ORDER-1001 and your first invoice INV-000001.
-- Run in the Supabase dashboard > SQL editor, project qtztjbnaofonazruovty. Safe to run twice.
-- Before you run it, check that the only orders and invoices in the database are the test ones:
--   select number, customer_id from public.orders;   (expect ORDER 1001 and 1002, both ZZ Smoke restaurants)
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
-- Test emails only. Real queued emails (for example Raju's approval) are kept.
delete from public.email_log where to_email like '%@example.com' or to_email like 'zz.wholesale.smoke.%';
delete from public.customer_category_access where customer_id in (select id from public.customers where business_name like 'ZZ Smoke%');
delete from public.customer_private where customer_id in (select id from public.customers where business_name like 'ZZ Smoke%');
delete from public.product_variants where source_ref = 'smoke-test';
delete from public.products where source = 'smoke-test';
delete from public.profiles where email in ('smoke-a@example.com','smoke-b@example.com','zz-smoke-kitchen@example.com','zz-smoke-kitchen2@example.com','zz.wholesale.smoke.reg.7731@gmail.com');
delete from auth.users where email in ('smoke-a@example.com','smoke-b@example.com','zz-smoke-kitchen@example.com','zz-smoke-kitchen2@example.com','zz.wholesale.smoke.reg.7731@gmail.com');
delete from public.customers where business_name like 'ZZ Smoke%';
delete from public.suppliers where name like 'ZZ Smoke%';
update public.counters set value = 1000 where name = 'order';
update public.counters set value = 0 where name = 'invoice';
commit;
-- Then Storage > delivery-proofs: delete every folder (they only hold test photos; the bucket was empty before the tests).
