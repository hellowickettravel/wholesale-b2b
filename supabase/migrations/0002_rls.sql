-- 0002_rls.sql — deny-by-default access control.
--
-- Model (DECISIONS.md D15):
--   * Every table has RLS enabled. anon/authenticated get NO privileges unless granted below.
--   * Base tables that hold costs, sell prices, margins, overrides or admin notes are ADMIN-ONLY.
--   * Customers and suppliers read those facts only through the filtered views at the end of this
--     file, which expose an explicit column list (no cost for customers; no price or cost for
--     suppliers) and filter rows with the helper functions below.
--   * Roles come from public.profiles.role, never from JWT/user metadata.
--   * Guard triggers stop non-admins changing protected columns (role, links, customer status).
-- Re-runnable: policies are dropped and recreated; grants are revoked then re-granted.

-- ---------------------------------------------------------------------------------------------
-- Stop Supabase's default auto-grants for objects created later by this role.
-- Every future migration must GRANT explicitly (see MEMORY.md).
-- ---------------------------------------------------------------------------------------------
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Identity helpers. SECURITY DEFINER so they can read profiles regardless of the caller's RLS.
-- Named app_role() because CURRENT_ROLE is a reserved SQL function.
-- ---------------------------------------------------------------------------------------------
create or replace function public.app_role()
returns public.user_role
language sql stable security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.active
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((select p.role = 'admin' from public.profiles p where p.id = auth.uid() and p.active), false)
$$;

-- Linked customer of the caller, whatever its status (used for the caller's own customer row).
create or replace function public.my_customer_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select p.customer_id from public.profiles p
  where p.id = auth.uid() and p.active and p.role = 'customer'
$$;

-- Linked customer only when APPROVED. Everything priced is gated on this.
create or replace function public.my_approved_customer_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select c.id from public.profiles p
  join public.customers c on c.id = p.customer_id
  where p.id = auth.uid() and p.active and p.role = 'customer' and c.status = 'approved'
$$;

create or replace function public.my_supplier_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select s.id from public.profiles p
  join public.suppliers s on s.id = p.supplier_id
  where p.id = auth.uid() and p.active and p.role = 'supplier' and s.active
$$;

grant execute on function public.app_role(), public.is_admin(), public.my_customer_id(),
  public.my_approved_customer_id(), public.my_supplier_id() to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'suppliers', 'customers', 'customer_private', 'profiles', 'categories', 'products',
    'product_variants', 'customer_category_access', 'customer_product_rules',
    'customer_category_margins', 'customer_price_overrides', 'orders', 'supplier_orders',
    'order_items', 'delivery_proofs', 'customer_payments', 'supplier_payments', 'invoices',
    'settings', 'counters', 'audit_log', 'email_log', 'notifications', 'rate_limits'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Admin-only tables: full access for admins, nothing for anyone else.
-- ---------------------------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'suppliers', 'customer_private', 'product_variants', 'customer_category_margins',
    'customer_price_overrides', 'orders', 'supplier_orders', 'order_items', 'delivery_proofs',
    'customer_payments', 'supplier_payments', 'settings', 'email_log'
  ] loop
    execute format('drop policy if exists admin_all on public.%I', t);
    execute format(
      'create policy admin_all on public.%I for all to authenticated '
      'using ((select public.is_admin())) with check ((select public.is_admin()))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------------------------
-- profiles: own row or admin. Updates are column-guarded by trigger below. No direct insert or
-- delete: rows are created by handle_new_user() and removed with the auth user.
-- ---------------------------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

grant select, update on public.profiles to authenticated;

-- ---------------------------------------------------------------------------------------------
-- customers: own row (any status, so the pending page can show it) or admin.
-- ---------------------------------------------------------------------------------------------
drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers for select to authenticated
  using (id = (select public.my_customer_id()) or (select public.is_admin()));

drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers for update to authenticated
  using (id = (select public.my_customer_id()) or (select public.is_admin()))
  with check (id = (select public.my_customer_id()) or (select public.is_admin()));

drop policy if exists customers_admin_insert on public.customers;
create policy customers_admin_insert on public.customers for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists customers_admin_delete on public.customers;
create policy customers_admin_delete on public.customers for delete to authenticated
  using ((select public.is_admin()));

grant select, insert, update, delete on public.customers to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Catalogue structure (no prices in these tables): public can read active rows.
-- ---------------------------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['categories', 'products'] loop
    execute format('drop policy if exists public_read on public.%I', t);
    execute format(
      'create policy public_read on public.%I for select to anon, authenticated '
      'using (active or (select public.is_admin()))', t);
    execute format('drop policy if exists admin_write on public.%I', t);
    execute format(
      'create policy admin_write on public.%I for all to authenticated '
      'using ((select public.is_admin())) with check ((select public.is_admin()))', t);
    execute format('grant select on public.%I to anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Per-customer catalogue lists: the approved customer may read its own; admin manages.
-- (Margins and overrides are admin-only above.)
-- ---------------------------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['customer_category_access', 'customer_product_rules'] loop
    execute format('drop policy if exists own_read on public.%I', t);
    execute format(
      'create policy own_read on public.%I for select to authenticated '
      'using (customer_id = (select public.my_approved_customer_id()) or (select public.is_admin()))', t);
    execute format('drop policy if exists admin_write on public.%I', t);
    execute format(
      'create policy admin_write on public.%I for all to authenticated '
      'using ((select public.is_admin())) with check ((select public.is_admin()))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------------------------
-- invoices: approved customer reads own; admin all. Created by create_order_tx (service role).
-- ---------------------------------------------------------------------------------------------
drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices for select to authenticated
  using (customer_id = (select public.my_approved_customer_id()) or (select public.is_admin()));

drop policy if exists invoices_admin_write on public.invoices;
create policy invoices_admin_write on public.invoices for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

grant select, update on public.invoices to authenticated;

-- ---------------------------------------------------------------------------------------------
-- audit_log: admin read-only. Rows are written only by the audit trigger (security definer).
-- ---------------------------------------------------------------------------------------------
drop policy if exists audit_admin_read on public.audit_log;
create policy audit_admin_read on public.audit_log for select to authenticated
  using ((select public.is_admin()));
grant select on public.audit_log to authenticated;

-- ---------------------------------------------------------------------------------------------
-- notifications: own rows; may only mark read.
-- ---------------------------------------------------------------------------------------------
drop policy if exists notifications_own_read on public.notifications;
create policy notifications_own_read on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists notifications_own_mark on public.notifications;
create policy notifications_own_mark on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- counters, rate_limits: RLS on, no policies, no grants. Service role / definer functions only.

-- ---------------------------------------------------------------------------------------------
-- Guard triggers: non-admin callers cannot change protected columns even on their own row.
-- current_user is the invoking role; definer functions and the service role are trusted.
-- ---------------------------------------------------------------------------------------------
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    if new.id is distinct from old.id
       or new.role is distinct from old.role
       or new.customer_id is distinct from old.customer_id
       or new.supplier_id is distinct from old.supplier_id
       or new.active is distinct from old.active
       or new.email is distinct from old.email then
      raise exception 'permission denied: protected profile fields' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_update on public.profiles;
create trigger guard_profile_update before update on public.profiles
  for each row execute function public.guard_profile_update();

create or replace function public.guard_customer_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    if new.id is distinct from old.id
       or new.status is distinct from old.status
       or new.status_reason is distinct from old.status_reason
       or new.approved_at is distinct from old.approved_at
       or new.approved_by is distinct from old.approved_by
       or new.created_at is distinct from old.created_at then
      raise exception 'permission denied: protected customer fields' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_customer_update on public.customers;
create trigger guard_customer_update before update on public.customers
  for each row execute function public.guard_customer_update();

-- ---------------------------------------------------------------------------------------------
-- Projection views. Owned by postgres (bypasses RLS), so each view MUST filter its own rows.
-- security_barrier stops callers' predicates being pushed below the filter.
-- ---------------------------------------------------------------------------------------------

-- Public catalogue sizes: no cost, no supplier.
create or replace view public.catalogue_variants with (security_barrier = true) as
  select v.id, v.product_id, v.size_label, v.size_sort, v.sku, v.vat_rate_bp, v.image_path
  from public.product_variants v
  join public.products p on p.id = v.product_id
  join public.categories c on c.id = p.category_id
  where v.active and p.active and c.active;

-- Shop settings incl. bank details: approved customers (and admins) only.
create or replace view public.shop_settings with (security_barrier = true) as
  select s.min_order_pence, s.delivery_charge_pence, s.delivery_vat_mode, s.delivery_fixed_vat_bp,
         s.delivery_days, s.show_prices_inc_vat, s.business_legal_name, s.business_address,
         s.vat_number, s.bank_name, s.bank_account_name, s.bank_sort_code, s.bank_account_number,
         s.bank_iban, s.invoice_footer
  from public.settings s
  where public.my_approved_customer_id() is not null or public.is_admin();

-- The caller's own supplier record (no admin notes).
create or replace view public.my_supplier with (security_barrier = true) as
  select s.id, s.name, s.email, s.phone, s.address
  from public.suppliers s
  where s.id = public.my_supplier_id();

-- Customer: own orders, no admin chase fields.
create or replace view public.customer_orders with (security_barrier = true) as
  select o.id, o.number, o.status, o.delivery_date, o.delivery_address, o.note, o.payment_terms,
         o.promised_pay_date, o.goods_net_pence, o.goods_vat_pence, o.delivery_net_pence,
         o.delivery_vat_pence, o.vat_pence, o.total_pence, o.created_at, o.updated_at
  from public.orders o
  where o.customer_id = public.my_approved_customer_id();

-- Customer: own order lines. Sell price yes; cost and supplier identity no.
create or replace view public.customer_order_items with (security_barrier = true) as
  select oi.id, oi.order_id, oi.supplier_order_id, oi.product_id, oi.product_name, oi.size_label,
         oi.sku, oi.qty, oi.unit_price_pence, oi.vat_rate_bp, oi.line_net_pence, oi.line_vat_pence,
         oi.sort
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.customer_id = public.my_approved_customer_id();

-- Customer: delivery status per part of the order (no supplier identity, no payment flags).
create or replace view public.customer_deliveries with (security_barrier = true) as
  select so.id, so.order_id, so.status, so.delivered_at
  from public.supplier_orders so
  join public.orders o on o.id = so.order_id
  where o.customer_id = public.my_approved_customer_id();

-- Customer: payments recorded against own orders.
create or replace view public.customer_payment_history with (security_barrier = true) as
  select cp.id, cp.order_id, cp.amount_pence, cp.paid_on, cp.method, cp.reference
  from public.customer_payments cp
  where cp.customer_id = public.my_approved_customer_id();

-- Supplier: own supplier orders with delivery details. No prices anywhere.
create or replace view public.supplier_order_list with (security_barrier = true) as
  select so.id, so.order_id, o.number as order_number, so.status, so.sent_at, so.delivered_at,
         so.paid_to_supplier, o.delivery_date, o.delivery_address, o.note as order_note,
         c.business_name as customer_name, c.contact_name as customer_contact,
         c.phone as customer_phone, so.created_at
  from public.supplier_orders so
  join public.orders o on o.id = so.order_id
  join public.customers c on c.id = o.customer_id
  where so.supplier_id = public.my_supplier_id();

-- Supplier: lines of own supplier orders. Item, size, quantity only.
create or replace view public.supplier_order_lines with (security_barrier = true) as
  select oi.id, oi.supplier_order_id, oi.product_name, oi.size_label, oi.sku, oi.qty, oi.sort
  from public.order_items oi
  join public.supplier_orders so on so.id = oi.supplier_order_id
  where so.supplier_id = public.my_supplier_id();

revoke all on public.catalogue_variants, public.shop_settings, public.my_supplier,
  public.customer_orders, public.customer_order_items, public.customer_deliveries,
  public.customer_payment_history, public.supplier_order_list, public.supplier_order_lines
  from anon, authenticated;
grant select on public.catalogue_variants to anon, authenticated;
grant select on public.shop_settings, public.my_supplier, public.customer_orders,
  public.customer_order_items, public.customer_deliveries, public.customer_payment_history,
  public.supplier_order_list, public.supplier_order_lines to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Storage: product images public-read (bucket is public), admin-write.
-- Delivery proofs private: no policies at all, so only the service role (server) can touch them;
-- viewers get short-lived signed URLs from the server.
-- ---------------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('delivery-proofs', 'delivery-proofs', false, 10485760,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists product_images_admin_select on storage.objects;
create policy product_images_admin_select on storage.objects for select to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));
drop policy if exists product_images_admin_insert on storage.objects;
create policy product_images_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));
drop policy if exists product_images_admin_update on storage.objects;
create policy product_images_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()))
  with check (bucket_id = 'product-images' and (select public.is_admin()));
drop policy if exists product_images_admin_delete on storage.objects;
create policy product_images_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));
