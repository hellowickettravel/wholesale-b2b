-- seed.sql — LOCAL DEVELOPMENT AND TESTS ONLY. Never run against the hosted project.
-- Loaded by `supabase db reset` after migrations. Fixed UUIDs so tests can refer to rows.
--
-- Accounts (password for all: Password123!)
--   admin@example.com         admin
--   supplier.a@example.com    supplier  -> Dev Supplier A
--   supplier.b@example.com    supplier  -> Dev Supplier B
--   restaurant.a@example.com  customer  -> Dev Restaurant A (approved)
--   restaurant.b@example.com  customer  -> Dev Restaurant B (approved)
--   pending@example.com       customer  -> Dev Pending Kitchen (pending approval)

-- Trading rules: the tests exercise the minimum order, delivery charge and delivery days, so the dev
-- stack keeps the original example values (migration 0010 turns them off on the live project).
update public.settings set min_order_pence = 15000, delivery_charge_pence = 1200, delivery_days = '{1,2,3,4,5,6}';

-- Suppliers --------------------------------------------------------------------------------------
insert into public.suppliers (id, name, email, phone, address, notes) values
  ('00000000-0000-4000-a000-000000000001', 'Dev Supplier A', 'supplier.a@example.com', '020 0000 0001',
   '1 Warehouse Road, Barking, IG11 0AA', 'ADMIN NOTE: supplier A pays net 30'),
  ('00000000-0000-4000-a000-000000000002', 'Dev Supplier B', 'supplier.b@example.com', '020 0000 0002',
   '2 Depot Lane, Wembley, HA9 0BB', 'ADMIN NOTE: supplier B')
on conflict (id) do nothing;

-- Customers --------------------------------------------------------------------------------------
insert into public.customers (id, business_name, contact_name, email, phone, address_line1, city, postcode, status, approved_at) values
  ('20000000-0000-4000-a000-000000000001', 'Dev Restaurant A', 'Asha A', 'restaurant.a@example.com', '07000 000001',
   '10 High Street', 'London', 'E1 1AA', 'approved', now()),
  ('20000000-0000-4000-a000-000000000002', 'Dev Restaurant B', 'Bilal B', 'restaurant.b@example.com', '07000 000002',
   '20 Market Street', 'London', 'E2 2BB', 'approved', now()),
  ('20000000-0000-4000-a000-000000000003', 'Dev Pending Kitchen', 'Priya P', 'pending@example.com', '07000 000003',
   '30 New Road', 'London', 'E3 3CC', 'pending', null)
on conflict (id) do nothing;

insert into public.customer_private (customer_id, default_margin_bp, admin_notes) values
  ('20000000-0000-4000-a000-000000000001', 1500, 'ADMIN NOTE: A negotiates hard'),
  ('20000000-0000-4000-a000-000000000002', null, null)
on conflict (customer_id) do nothing;

-- Auth users (handle_new_user creates their profiles as plain customers) ------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
)
select '00000000-0000-0000-0000-000000000000', u.id::uuid, 'authenticated', 'authenticated', u.email,
       extensions.crypt('Password123!', extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       jsonb_build_object('full_name', u.full_name), now(), now(),
       '', '', '', '', '', '', '', ''
from (values
  ('10000000-0000-4000-a000-000000000001', 'admin@example.com', 'Dev Admin'),
  ('10000000-0000-4000-a000-000000000002', 'supplier.a@example.com', 'Sam Supplier A'),
  ('10000000-0000-4000-a000-000000000003', 'supplier.b@example.com', 'Sue Supplier B'),
  ('10000000-0000-4000-a000-000000000004', 'restaurant.a@example.com', 'Asha A'),
  ('10000000-0000-4000-a000-000000000005', 'restaurant.b@example.com', 'Bilal B'),
  ('10000000-0000-4000-a000-000000000006', 'pending@example.com', 'Priya P')
) as u(id, email, full_name)
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.id::text like '10000000-0000-4000-a000-%'
on conflict do nothing;

-- Roles and links (what an admin would do in the app) -------------------------------------------
update public.profiles set role = 'admin' where id = '10000000-0000-4000-a000-000000000001';
update public.profiles set role = 'supplier', supplier_id = '00000000-0000-4000-a000-000000000001'
  where id = '10000000-0000-4000-a000-000000000002';
update public.profiles set role = 'supplier', supplier_id = '00000000-0000-4000-a000-000000000002'
  where id = '10000000-0000-4000-a000-000000000003';
update public.profiles set customer_id = '20000000-0000-4000-a000-000000000001'
  where id = '10000000-0000-4000-a000-000000000004';
update public.profiles set customer_id = '20000000-0000-4000-a000-000000000002'
  where id = '10000000-0000-4000-a000-000000000005';
update public.profiles set customer_id = '20000000-0000-4000-a000-000000000003'
  where id = '10000000-0000-4000-a000-000000000006';

-- Catalogue ---------------------------------------------------------------------------------------
-- Categories come from migration 0005 (fixed ids ca7e0000-...).

insert into public.products (id, category_id, name, slug, source) values
  ('40000000-0000-4000-a000-000000000001', 'ca7e0000-0000-4000-a000-000000000001', 'Basant Basmati Rice', 'basant-basmati-rice', 'seed'),
  ('40000000-0000-4000-a000-000000000002', 'ca7e0000-0000-4000-a000-000000000010', 'Mango Drink', 'mango-drink', 'seed'),
  ('40000000-0000-4000-a000-000000000003', 'ca7e0000-0000-4000-a000-000000000003', 'Green Cardamom', 'green-cardamom', 'seed')
on conflict (id) do nothing;

-- Import keys (DECISIONS D22) so a catalogue import adds sizes to these instead of duplicating them.
update public.products set source_ref = category_id || '::' || upper(name)
  where source = 'seed' and source_ref is null;

insert into public.product_variants (id, product_id, size_label, size_sort, supplier_id, cost_pence, vat_rate_bp, sku) values
  ('50000000-0000-4000-a000-000000000001', '40000000-0000-4000-a000-000000000001', '5 kg', 5000,
   '00000000-0000-4000-a000-000000000001', 1200, 0, 'RICE-BAS-5'),
  ('50000000-0000-4000-a000-000000000002', '40000000-0000-4000-a000-000000000001', '20 kg', 20000,
   '00000000-0000-4000-a000-000000000001', 4200, 0, 'RICE-BAS-20'),
  ('50000000-0000-4000-a000-000000000003', '40000000-0000-4000-a000-000000000002', '330 ml × 24', 7920,
   '00000000-0000-4000-a000-000000000002', 1450, 2000, 'DRK-MAN-330x24'),
  ('50000000-0000-4000-a000-000000000004', '40000000-0000-4000-a000-000000000003', '100 g', 100,
   '00000000-0000-4000-a000-000000000001', null, 0, 'SPI-CAR-100')
on conflict (id) do nothing;

-- Per-customer catalogue and pricing --------------------------------------------------------------
insert into public.customer_category_access (customer_id, category_id) values
  ('20000000-0000-4000-a000-000000000001', 'ca7e0000-0000-4000-a000-000000000001'),
  ('20000000-0000-4000-a000-000000000001', 'ca7e0000-0000-4000-a000-000000000010'),
  ('20000000-0000-4000-a000-000000000001', 'ca7e0000-0000-4000-a000-000000000003'),
  ('20000000-0000-4000-a000-000000000002', 'ca7e0000-0000-4000-a000-000000000001'),
  ('20000000-0000-4000-a000-000000000002', 'ca7e0000-0000-4000-a000-000000000010')
on conflict do nothing;

insert into public.customer_category_margins (customer_id, category_id, margin_bp) values
  ('20000000-0000-4000-a000-000000000001', 'ca7e0000-0000-4000-a000-000000000001', 1000)
on conflict do nothing;

-- Restaurant A's agreed price for the mango drink case: £17.00 (sentinel value 1700 in tests).
insert into public.customer_price_overrides (customer_id, variant_id, price_pence) values
  ('20000000-0000-4000-a000-000000000001', '50000000-0000-4000-a000-000000000003', 1700)
on conflict do nothing;

-- Orders (through the real transaction function) ---------------------------------------------------
-- A: 2 × rice 20 kg @ £46.20 (cost £42 + 10%) from Supplier A, 3 × mango drink @ £17.00 (override)
--    from Supplier B. Goods £143.40 < £150 so £12 delivery; delivery VAT apportioned = 85p.
do $$
begin
  if not exists (select 1 from public.orders where customer_id = '20000000-0000-4000-a000-000000000001') then
    perform public.create_order_tx(jsonb_build_object(
      'customer_id', '20000000-0000-4000-a000-000000000001',
      'placed_by', '10000000-0000-4000-a000-000000000004',
      'delivery_date', (current_date + 3)::text,
      'note', 'Back door, before 11am please',
      'payment_terms', 'within_7_days',
      'promised_pay_date', (current_date + 10)::text,
      'totals', jsonb_build_object('goods_net_pence', 14340, 'goods_vat_pence', 1020,
        'delivery_net_pence', 1200, 'delivery_vat_pence', 85, 'vat_pence', 1105, 'total_pence', 16645),
      'supplier_orders', jsonb_build_array(
        jsonb_build_object('supplier_id', '00000000-0000-4000-a000-000000000001', 'items', jsonb_build_array(
          jsonb_build_object('variant_id', '50000000-0000-4000-a000-000000000002',
            'product_id', '40000000-0000-4000-a000-000000000001', 'product_name', 'Basant Basmati Rice',
            'size_label', '20 kg', 'sku', 'RICE-BAS-20', 'qty', 2, 'unit_price_pence', 4620,
            'unit_cost_pence', 4200, 'vat_rate_bp', 0, 'line_net_pence', 9240, 'line_vat_pence', 0))),
        jsonb_build_object('supplier_id', '00000000-0000-4000-a000-000000000002', 'items', jsonb_build_array(
          jsonb_build_object('variant_id', '50000000-0000-4000-a000-000000000003',
            'product_id', '40000000-0000-4000-a000-000000000002', 'product_name', 'Mango Drink',
            'size_label', '330 ml × 24', 'sku', 'DRK-MAN-330x24', 'qty', 3, 'unit_price_pence', 1700,
            'unit_cost_pence', 1450, 'vat_rate_bp', 2000, 'line_net_pence', 5100, 'line_vat_pence', 1020)))
      )
    ));
  end if;

  -- B: 12 × rice 5 kg @ £14.40 (cost £12 + global 20%) from Supplier A. £172.80, free delivery.
  if not exists (select 1 from public.orders where customer_id = '20000000-0000-4000-a000-000000000002') then
    perform public.create_order_tx(jsonb_build_object(
      'customer_id', '20000000-0000-4000-a000-000000000002',
      'placed_by', '10000000-0000-4000-a000-000000000005',
      'delivery_date', (current_date + 2)::text,
      'note', null,
      'payment_terms', 'on_delivery',
      'promised_pay_date', null,
      'totals', jsonb_build_object('goods_net_pence', 17280, 'goods_vat_pence', 0,
        'delivery_net_pence', 0, 'delivery_vat_pence', 0, 'vat_pence', 0, 'total_pence', 17280),
      'supplier_orders', jsonb_build_array(
        jsonb_build_object('supplier_id', '00000000-0000-4000-a000-000000000001', 'items', jsonb_build_array(
          jsonb_build_object('variant_id', '50000000-0000-4000-a000-000000000001',
            'product_id', '40000000-0000-4000-a000-000000000001', 'product_name', 'Basant Basmati Rice',
            'size_label', '5 kg', 'sku', 'RICE-BAS-5', 'qty', 12, 'unit_price_pence', 1440,
            'unit_cost_pence', 1200, 'vat_rate_bp', 0, 'line_net_pence', 17280, 'line_vat_pence', 0)))
      )
    ));
  end if;
end $$;

-- Payments and a driver link ------------------------------------------------------------------------
insert into public.customer_payments (order_id, customer_id, amount_pence, paid_on, method, reference, recorded_by)
select o.id, o.customer_id, 5000, current_date, 'bank_transfer', 'ORDER-' || o.number, '10000000-0000-4000-a000-000000000001'
from public.orders o
where o.customer_id = '20000000-0000-4000-a000-000000000001'
  and not exists (select 1 from public.customer_payments cp where cp.order_id = o.id);

insert into public.supplier_payments (supplier_order_id, supplier_id, amount_pence, paid_on, reference, recorded_by)
select so.id, so.supplier_id, 8400, current_date, 'SUP-A-1', '10000000-0000-4000-a000-000000000001'
from public.supplier_orders so
join public.orders o on o.id = so.order_id
where o.customer_id = '20000000-0000-4000-a000-000000000001'
  and so.supplier_id = '00000000-0000-4000-a000-000000000001'
  and not exists (select 1 from public.supplier_payments sp where sp.supplier_order_id = so.id);

insert into public.delivery_proofs (supplier_order_id, token_hash, expires_at, created_by)
select so.id, extensions.digest('dev-driver-token', 'sha256'), now() + interval '72 hours',
       '10000000-0000-4000-a000-000000000002'
from public.supplier_orders so
join public.orders o on o.id = so.order_id
where o.customer_id = '20000000-0000-4000-a000-000000000002'
  and not exists (select 1 from public.delivery_proofs dp where dp.supplier_order_id = so.id);
