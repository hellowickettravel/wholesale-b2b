-- 0007_shop.sql — Phase 5: basket, idempotent order placement, supplier notifications.
-- Re-runnable; no DROP/DELETE (DECISIONS D20).

-- ---------------------------------------------------------------------------------------------
-- Basket: one per restaurant (shared by everyone who orders for it), kept across devices.
-- Holds quantities only. Prices are never stored here: the server prices the basket on every
-- view and again when the order is placed.
-- ---------------------------------------------------------------------------------------------
create table if not exists public.basket_items (
  customer_id  uuid not null references public.customers (id) on delete cascade,
  variant_id   uuid not null references public.product_variants (id) on delete cascade,
  qty          integer not null check (qty between 1 and 9999),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (customer_id, variant_id)
);
create index if not exists basket_items_variant_id_idx on public.basket_items (variant_id);

create or replace trigger set_updated_at before update on public.basket_items
  for each row execute function public.set_updated_at();

alter table public.basket_items enable row level security;
revoke all on public.basket_items from anon, authenticated;
grant select, insert, update, delete on public.basket_items to authenticated;

-- Approved restaurant users: own basket only. Admins: read (to help on the phone).
select public.ensure_policy('public', 'basket_items', 'basket_select', 'select', 'authenticated',
  'customer_id = (select public.my_approved_customer_id()) or (select public.is_admin())');
select public.ensure_policy('public', 'basket_items', 'basket_insert', 'insert', 'authenticated',
  null, 'customer_id = (select public.my_approved_customer_id())');
select public.ensure_policy('public', 'basket_items', 'basket_update', 'update', 'authenticated',
  'customer_id = (select public.my_approved_customer_id())', 'customer_id = (select public.my_approved_customer_id())');
select public.ensure_policy('public', 'basket_items', 'basket_remove', 'delete', 'authenticated',
  'customer_id = (select public.my_approved_customer_id())');

-- ---------------------------------------------------------------------------------------------
-- Checkout key: one per basket view, so a double click or a retried request places one order.
-- ---------------------------------------------------------------------------------------------
alter table public.orders add column if not exists checkout_key uuid;
create unique index if not exists orders_checkout_key
  on public.orders (customer_id, checkout_key) where checkout_key is not null;

-- ---------------------------------------------------------------------------------------------
-- create_order_tx v2. Called only by the server (service role) with lines it has priced itself.
-- Adds: idempotency (checkout_key), active-supplier check, in-portal notifications for the
-- supplier's users, and queued emails (supplier: new order; restaurant: confirmation).
-- ---------------------------------------------------------------------------------------------
create or replace function public.create_order_tx(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer public.customers%rowtype;
  t jsonb := p -> 'totals';
  v_key uuid := nullif(p ->> 'checkout_key', '')::uuid;
  v_existing public.orders%rowtype;
  v_order_id uuid;
  v_number bigint;
  v_invoice_id uuid;
  v_invoice_number bigint;
  v_so jsonb;
  v_item jsonb;
  v_so_id uuid;
  v_supplier public.suppliers%rowtype;
  v_sort integer := 0;
  v_lines integer;
  v_goods_net bigint := 0;
  v_goods_vat bigint := 0;
  v_delivery date := (p ->> 'delivery_date')::date;
begin
  select * into v_customer from public.customers where id = (p ->> 'customer_id')::uuid for share;
  if not found or v_customer.status <> 'approved' then
    raise exception 'customer is not approved' using errcode = 'P0001';
  end if;

  if v_key is not null then
    select * into v_existing from public.orders where customer_id = v_customer.id and checkout_key = v_key;
    if found then
      return jsonb_build_object('order_id', v_existing.id, 'number', v_existing.number,
        'invoice_id', (select i.id from public.invoices i where i.order_id = v_existing.id),
        'invoice_number', (select i.number from public.invoices i where i.order_id = v_existing.id),
        'existing', true);
    end if;
  end if;

  if jsonb_typeof(p -> 'supplier_orders') is distinct from 'array'
     or jsonb_array_length(p -> 'supplier_orders') = 0 then
    raise exception 'order has no lines' using errcode = 'P0001';
  end if;

  perform set_config('app.actor_id', coalesce(p ->> 'placed_by', ''), true);
  v_number := public.next_counter('order');

  insert into public.orders (
    number, customer_id, status, delivery_date, delivery_address, note, payment_terms,
    promised_pay_date, goods_net_pence, goods_vat_pence, delivery_net_pence, delivery_vat_pence,
    vat_pence, total_pence, placed_by, checkout_key
  ) values (
    v_number, v_customer.id, 'placed', v_delivery,
    concat_ws(', ', v_customer.business_name, v_customer.address_line1, v_customer.address_line2,
              v_customer.city, v_customer.postcode),
    public.clean_text(p ->> 'note', 2000),
    coalesce((p ->> 'payment_terms')::public.payment_terms, 'on_delivery'),
    (p ->> 'promised_pay_date')::date,
    (t ->> 'goods_net_pence')::bigint, (t ->> 'goods_vat_pence')::bigint,
    (t ->> 'delivery_net_pence')::bigint, (t ->> 'delivery_vat_pence')::bigint,
    (t ->> 'vat_pence')::bigint, (t ->> 'total_pence')::bigint,
    (p ->> 'placed_by')::uuid, v_key
  ) returning id into v_order_id;

  for v_so in select value from jsonb_array_elements(p -> 'supplier_orders') loop
    if jsonb_typeof(v_so -> 'items') is distinct from 'array' or jsonb_array_length(v_so -> 'items') = 0 then
      raise exception 'supplier order has no lines' using errcode = 'P0001';
    end if;
    select * into v_supplier from public.suppliers where id = (v_so ->> 'supplier_id')::uuid;
    if not found or not v_supplier.active then
      raise exception 'supplier is not active' using errcode = 'P0001';
    end if;

    insert into public.supplier_orders (order_id, supplier_id, status)
    values (v_order_id, v_supplier.id, 'placed')
    returning id into v_so_id;

    v_lines := 0;
    for v_item in select value from jsonb_array_elements(v_so -> 'items') loop
      v_sort := v_sort + 1;
      v_lines := v_lines + 1;
      insert into public.order_items (
        order_id, supplier_order_id, supplier_id, variant_id, product_id, product_name, size_label,
        sku, qty, unit_price_pence, unit_cost_pence, vat_rate_bp, line_net_pence, line_vat_pence, sort
      ) values (
        v_order_id, v_so_id, v_supplier.id, (v_item ->> 'variant_id')::uuid,
        (v_item ->> 'product_id')::uuid, v_item ->> 'product_name', v_item ->> 'size_label',
        v_item ->> 'sku', (v_item ->> 'qty')::integer, (v_item ->> 'unit_price_pence')::bigint,
        (v_item ->> 'unit_cost_pence')::bigint, (v_item ->> 'vat_rate_bp')::integer,
        (v_item ->> 'line_net_pence')::bigint, (v_item ->> 'line_vat_pence')::bigint, v_sort
      );
      v_goods_net := v_goods_net + (v_item ->> 'line_net_pence')::bigint;
      v_goods_vat := v_goods_vat + (v_item ->> 'line_vat_pence')::bigint;
    end loop;

    -- Tell the supplier: in the portal (every active login of that supplier) and by email.
    insert into public.notifications (user_id, kind, title, body, link)
    select pr.id, 'supplier_order_new', 'New order ORDER-' || v_number,
           v_lines || case when v_lines = 1 then ' line' else ' lines' end
             || ' for delivery on ' || to_char(v_delivery, 'Dy FMDD Mon YYYY')
             || ' to ' || v_customer.business_name,
           '/supplier/orders/' || v_so_id
    from public.profiles pr
    where pr.supplier_id = v_supplier.id and pr.role = 'supplier' and pr.active;

    if v_supplier.email is not null then
      insert into public.email_log (to_email, template, subject, status, entity, entity_id)
      values (v_supplier.email, 'supplier_order_new',
              'New order ORDER-' || v_number || ' for delivery ' || to_char(v_delivery, 'Dy FMDD Mon'),
              'queued', 'supplier_order', v_so_id::text);
    end if;
  end loop;

  if v_goods_net <> (t ->> 'goods_net_pence')::bigint or v_goods_vat <> (t ->> 'goods_vat_pence')::bigint then
    raise exception 'line totals do not match order totals' using errcode = 'P0001';
  end if;

  v_invoice_number := public.next_counter('invoice');
  insert into public.invoices (
    order_id, customer_id, number, goods_net_pence, goods_vat_pence, delivery_net_pence,
    delivery_vat_pence, vat_pence, total_pence
  ) values (
    v_order_id, v_customer.id, v_invoice_number, (t ->> 'goods_net_pence')::bigint,
    (t ->> 'goods_vat_pence')::bigint, (t ->> 'delivery_net_pence')::bigint,
    (t ->> 'delivery_vat_pence')::bigint, (t ->> 'vat_pence')::bigint, (t ->> 'total_pence')::bigint
  ) returning id into v_invoice_id;

  if v_customer.email is not null then
    insert into public.email_log (to_email, template, subject, status, entity, entity_id)
    values (v_customer.email, 'order_confirmation', 'Order ORDER-' || v_number || ' confirmed',
            'queued', 'order', v_order_id::text);
  end if;

  return jsonb_build_object('order_id', v_order_id, 'number', v_number,
                            'invoice_id', v_invoice_id, 'invoice_number', v_invoice_number,
                            'existing', false);
end;
$$;

revoke execute on function public.create_order_tx(jsonb) from public, anon, authenticated;
grant execute on function public.create_order_tx(jsonb) to service_role;
