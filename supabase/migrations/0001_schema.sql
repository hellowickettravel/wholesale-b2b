-- 0001_schema.sql — tables, enums, indexes, updated_at triggers, counters, settings row.
--
-- Conventions (DECISIONS.md D3): money is integer pence (bigint), rates are integer basis points
-- (20% = 2000). Re-runnable: every statement is guarded (if not exists / or replace / on conflict).
-- Access control lives in 0002_rls.sql; functions and triggers with logic in 0003_functions.sql.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('customer', 'admin', 'supplier');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.customer_status as enum ('pending', 'approved', 'rejected', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum
    ('placed', 'sent', 'out_for_delivery', 'partially_delivered', 'delivered', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.supplier_order_status as enum ('placed', 'sent', 'out_for_delivery', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_terms as enum ('on_delivery', 'within_7_days', 'on_date');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('bank_transfer', 'cash', 'cheque', 'card', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.product_rule_mode as enum ('allow', 'deny');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.delivery_vat_mode as enum ('apportioned', 'fixed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.proof_submitter as enum ('driver', 'supplier', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.email_status as enum ('queued', 'sent', 'failed', 'skipped');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Parties: suppliers, customers, profiles
-- ---------------------------------------------------------------------------------------------
create table if not exists public.suppliers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(name) between 1 and 200),
  email       text check (email is null or length(email) <= 320),
  phone       text check (phone is null or length(phone) <= 50),
  address     text check (address is null or length(address) <= 500),
  notes       text check (notes is null or length(notes) <= 4000), -- admin only
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- What a restaurant may see about itself. Anything admin-private lives in customer_private.
create table if not exists public.customers (
  id               uuid primary key default gen_random_uuid(),
  business_name    text not null check (length(business_name) between 1 and 200),
  contact_name     text check (contact_name is null or length(contact_name) <= 200),
  email            text check (email is null or length(email) <= 320),
  phone            text check (phone is null or length(phone) <= 50),
  address_line1    text check (address_line1 is null or length(address_line1) <= 200),
  address_line2    text check (address_line2 is null or length(address_line2) <= 200),
  city             text check (city is null or length(city) <= 100),
  postcode         text check (postcode is null or length(postcode) <= 20),
  delivery_notes   text check (delivery_notes is null or length(delivery_notes) <= 1000),
  status           public.customer_status not null default 'pending',
  status_reason    text check (status_reason is null or length(status_reason) <= 1000),
  approved_at      timestamptz,
  approved_by      uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists customers_status_idx on public.customers (status, created_at desc);

-- Admin-only facts about a customer: margins and internal notes. Never readable by the customer.
create table if not exists public.customer_private (
  customer_id        uuid primary key references public.customers (id) on delete cascade,
  default_margin_bp  integer check (default_margin_bp is null or default_margin_bp between -10000 and 100000),
  admin_notes        text check (admin_notes is null or length(admin_notes) <= 4000),
  updated_at         timestamptz not null default now()
);

-- One row per auth user. role is the ONLY source of authorisation (never user metadata).
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         public.user_role not null default 'customer',
  email        text,
  full_name    text check (full_name is null or length(full_name) <= 200),
  phone        text check (phone is null or length(phone) <= 50),
  customer_id  uuid references public.customers (id) on delete set null,
  supplier_id  uuid references public.suppliers (id) on delete set null,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint profiles_customer_link check (role = 'customer' or customer_id is null),
  constraint profiles_supplier_link check (role = 'supplier' or supplier_id is null)
);
create index if not exists profiles_customer_idx on public.profiles (customer_id);
create index if not exists profiles_supplier_idx on public.profiles (supplier_id);
create index if not exists profiles_role_idx on public.profiles (role);
create unique index if not exists profiles_email_idx on public.profiles (lower(email));

-- ---------------------------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------------------------
create table if not exists public.categories (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(name) between 1 and 120),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description  text check (description is null or length(description) <= 1000),
  image_path   text,
  sort         integer not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references public.categories (id) on delete restrict,
  name         text not null check (length(name) between 1 and 200),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description  text check (description is null or length(description) <= 4000),
  image_path   text,
  active       boolean not null default true,
  source       text,      -- e.g. 'shrivi_items_pdf', 'admin'
  source_ref   text,      -- original row text, for idempotent re-import
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists products_category_idx on public.products (category_id, name);
create index if not exists products_name_trgm_idx on public.products using gin (name extensions.gin_trgm_ops);

-- cost_pence and supplier_id are admin-only (base table is admin-only; see catalogue_variants view).
create table if not exists public.product_variants (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  size_label   text not null check (length(size_label) between 1 and 60),
  size_sort    integer not null default 0,
  supplier_id  uuid references public.suppliers (id) on delete restrict,
  cost_pence   bigint check (cost_pence is null or cost_pence >= 0),
  vat_rate_bp  integer not null default 0 check (vat_rate_bp between 0 and 10000),
  sku          text check (sku is null or length(sku) <= 60),
  image_path   text,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (product_id, size_label)
);
create index if not exists product_variants_product_idx on public.product_variants (product_id, size_sort);
create index if not exists product_variants_supplier_idx on public.product_variants (supplier_id);
create index if not exists product_variants_needs_price_idx on public.product_variants (product_id) where cost_pence is null;

-- ---------------------------------------------------------------------------------------------
-- Per-customer catalogue and pricing (admin-only except the access lists)
-- ---------------------------------------------------------------------------------------------
create table if not exists public.customer_category_access (
  customer_id  uuid not null references public.customers (id) on delete cascade,
  category_id  uuid not null references public.categories (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (customer_id, category_id)
);

create table if not exists public.customer_product_rules (
  customer_id  uuid not null references public.customers (id) on delete cascade,
  product_id   uuid not null references public.products (id) on delete cascade,
  mode         public.product_rule_mode not null,
  created_at   timestamptz not null default now(),
  primary key (customer_id, product_id)
);

create table if not exists public.customer_category_margins (
  customer_id  uuid not null references public.customers (id) on delete cascade,
  category_id  uuid not null references public.categories (id) on delete cascade,
  margin_bp    integer not null check (margin_bp between -10000 and 100000),
  updated_at   timestamptz not null default now(),
  primary key (customer_id, category_id)
);

create table if not exists public.customer_price_overrides (
  customer_id  uuid not null references public.customers (id) on delete cascade,
  variant_id   uuid not null references public.product_variants (id) on delete cascade,
  price_pence  bigint not null check (price_pence >= 0),
  updated_at   timestamptz not null default now(),
  primary key (customer_id, variant_id)
);
create index if not exists customer_price_overrides_variant_idx on public.customer_price_overrides (variant_id);

-- ---------------------------------------------------------------------------------------------
-- Orders. Lines SNAPSHOT price, cost, VAT rate and supplier; never re-read live prices.
-- ---------------------------------------------------------------------------------------------
create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  number              bigint not null unique,
  customer_id         uuid not null references public.customers (id) on delete restrict,
  status              public.order_status not null default 'placed',
  delivery_date       date not null,
  delivery_address    text not null check (length(delivery_address) <= 1000),
  note                text check (note is null or length(note) <= 2000),
  payment_terms       public.payment_terms not null default 'on_delivery',
  promised_pay_date   date,
  next_chase_date     date,      -- admin only
  payment_notes       text check (payment_notes is null or length(payment_notes) <= 4000), -- admin only
  goods_net_pence     bigint not null check (goods_net_pence >= 0),
  goods_vat_pence     bigint not null check (goods_vat_pence >= 0),
  delivery_net_pence  bigint not null default 0 check (delivery_net_pence >= 0),
  delivery_vat_pence  bigint not null default 0 check (delivery_vat_pence >= 0),
  vat_pence           bigint not null check (vat_pence >= 0),
  total_pence         bigint not null check (total_pence >= 0),
  placed_by           uuid references auth.users (id) on delete set null,
  locked_at           timestamptz,
  completed_at        timestamptz,
  cancelled_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint orders_totals_add_up check (
    vat_pence = goods_vat_pence + delivery_vat_pence
    and total_pence = goods_net_pence + delivery_net_pence + vat_pence
  )
);
create index if not exists orders_customer_idx on public.orders (customer_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status, created_at desc);
create index if not exists orders_chase_idx on public.orders (next_chase_date) where next_chase_date is not null;
create index if not exists orders_delivery_date_idx on public.orders (delivery_date);

create table if not exists public.supplier_orders (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders (id) on delete cascade,
  supplier_id       uuid not null references public.suppliers (id) on delete restrict,
  status            public.supplier_order_status not null default 'placed',
  sent_at           timestamptz,
  delivered_at      timestamptz,
  paid_to_supplier  boolean not null default false,
  supplier_paid_at  timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (order_id, supplier_id)
);
create index if not exists supplier_orders_supplier_idx on public.supplier_orders (supplier_id, status, created_at desc);

create table if not exists public.order_items (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references public.orders (id) on delete cascade,
  supplier_order_id  uuid not null references public.supplier_orders (id) on delete restrict,
  supplier_id        uuid not null references public.suppliers (id) on delete restrict,
  variant_id         uuid references public.product_variants (id) on delete set null,
  product_id         uuid references public.products (id) on delete set null,
  product_name       text not null,
  size_label         text not null,
  sku                text,
  qty                integer not null check (qty > 0),
  unit_price_pence   bigint not null check (unit_price_pence >= 0),
  unit_cost_pence    bigint check (unit_cost_pence is null or unit_cost_pence >= 0), -- admin only
  vat_rate_bp        integer not null check (vat_rate_bp between 0 and 10000),
  line_net_pence     bigint not null check (line_net_pence >= 0),
  line_vat_pence     bigint not null check (line_vat_pence >= 0),
  sort               integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint order_items_net check (line_net_pence = unit_price_pence * qty)
);
create index if not exists order_items_order_idx on public.order_items (order_id, sort);
create index if not exists order_items_supplier_order_idx on public.order_items (supplier_order_id);

-- Driver links and proof. Only the SHA-256 of the token is stored (DECISIONS.md D9).
create table if not exists public.delivery_proofs (
  id                 uuid primary key default gen_random_uuid(),
  supplier_order_id  uuid not null references public.supplier_orders (id) on delete cascade,
  token_hash         bytea unique,
  expires_at         timestamptz,
  created_by         uuid references auth.users (id) on delete set null,
  revoked_at         timestamptz,
  submitted_at       timestamptz,
  submitted_by_kind  public.proof_submitter,
  photo_path         text,
  document_path      text,
  signature_path     text,
  signed_by_name     text check (signed_by_name is null or length(signed_by_name) <= 200),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists delivery_proofs_supplier_order_idx on public.delivery_proofs (supplier_order_id, created_at desc);

-- ---------------------------------------------------------------------------------------------
-- Money in and out (manual ledger)
-- ---------------------------------------------------------------------------------------------
create table if not exists public.customer_payments (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete restrict,
  customer_id   uuid not null references public.customers (id) on delete restrict,
  amount_pence  bigint not null check (amount_pence <> 0),
  paid_on       date not null,
  method        public.payment_method not null default 'bank_transfer',
  reference     text check (reference is null or length(reference) <= 200),
  note          text check (note is null or length(note) <= 2000),
  recorded_by   uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists customer_payments_order_idx on public.customer_payments (order_id);
create index if not exists customer_payments_customer_idx on public.customer_payments (customer_id, paid_on desc);

create table if not exists public.supplier_payments (
  id                 uuid primary key default gen_random_uuid(),
  supplier_order_id  uuid not null references public.supplier_orders (id) on delete restrict,
  supplier_id        uuid not null references public.suppliers (id) on delete restrict,
  amount_pence       bigint not null check (amount_pence <> 0),
  paid_on            date not null,
  method             public.payment_method not null default 'bank_transfer',
  reference          text check (reference is null or length(reference) <= 200),
  note               text check (note is null or length(note) <= 2000),
  recorded_by        uuid references auth.users (id) on delete set null,
  created_at         timestamptz not null default now()
);
create index if not exists supplier_payments_supplier_order_idx on public.supplier_payments (supplier_order_id);
create index if not exists supplier_payments_supplier_idx on public.supplier_payments (supplier_id, paid_on desc);

-- Invoice totals are a snapshot of the order at issue time. Gapless numbers (DECISIONS.md D13).
create table if not exists public.invoices (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null unique references public.orders (id) on delete restrict,
  customer_id         uuid not null references public.customers (id) on delete restrict,
  number              bigint not null unique,
  issued_at           timestamptz not null default now(),
  goods_net_pence     bigint not null,
  goods_vat_pence     bigint not null,
  delivery_net_pence  bigint not null,
  delivery_vat_pence  bigint not null,
  vat_pence           bigint not null,
  total_pence         bigint not null,
  voided_at           timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists invoices_customer_idx on public.invoices (customer_id, issued_at desc);

-- ---------------------------------------------------------------------------------------------
-- Settings (singleton), counters, audit, email log, notifications, rate limits
-- ---------------------------------------------------------------------------------------------
create table if not exists public.settings (
  id                      boolean primary key default true check (id),
  min_order_pence         bigint not null default 15000 check (min_order_pence >= 0),
  delivery_charge_pence   bigint not null default 1200 check (delivery_charge_pence >= 0),
  delivery_vat_mode       public.delivery_vat_mode not null default 'apportioned',
  delivery_fixed_vat_bp   integer not null default 2000 check (delivery_fixed_vat_bp between 0 and 10000),
  -- ISO weekday numbers, 1 = Monday ... 7 = Sunday
  delivery_days           smallint[] not null default '{1,2,3,4,5,6}',
  global_margin_bp        integer not null default 2000 check (global_margin_bp between -10000 and 100000),
  show_prices_inc_vat     boolean not null default false,
  business_legal_name     text not null default '[Client legal name Ltd]',
  business_address        text not null default '[Client business address]',
  vat_number              text not null default '[VAT number]',
  bank_name               text not null default '[Bank name]',
  bank_account_name       text not null default '[Account name]',
  bank_sort_code          text not null default '[00-00-00]',
  bank_account_number     text not null default '[00000000]',
  bank_iban               text,
  invoice_footer          text not null default '[Payment terms and footer text]',
  updated_at              timestamptz not null default now()
);
insert into public.settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.counters (
  name   text primary key,
  value  bigint not null
);
-- Orders start at 1001; invoices at 1 (INV-000001).
insert into public.counters (name, value) values ('order', 1000), ('invoice', 0) on conflict (name) do nothing;

create table if not exists public.audit_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  actor_id   uuid,
  action     text not null,
  entity     text not null,
  entity_id  text,
  before     jsonb,
  after      jsonb
);
create index if not exists audit_log_entity_idx on public.audit_log (entity, entity_id, at desc);
create index if not exists audit_log_at_idx on public.audit_log (at desc);

create table if not exists public.email_log (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  to_email     text not null,
  template     text not null,
  subject      text not null,
  status       public.email_status not null default 'queued',
  provider_id  text,
  error        text,
  entity       text,
  entity_id    text
);
create index if not exists email_log_created_idx on public.email_log (created_at desc);

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

create table if not exists public.rate_limits (
  key           text not null,
  window_start  timestamptz not null,
  count         integer not null default 0,
  primary key (key, window_start)
);

-- ---------------------------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'suppliers', 'customers', 'customer_private', 'profiles', 'categories', 'products',
    'product_variants', 'customer_category_margins', 'customer_price_overrides', 'orders',
    'supplier_orders', 'order_items', 'delivery_proofs', 'invoices', 'settings'
  ] loop
    execute format(
      'create or replace trigger set_updated_at before update on public.%I '
      'for each row execute function public.set_updated_at()', t);
  end loop;
end $$;
