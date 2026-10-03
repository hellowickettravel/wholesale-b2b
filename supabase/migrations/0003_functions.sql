-- 0003_functions.sql — rate limiting, new-user provisioning, atomic order creation, audit log,
-- and the one-off admin bootstrap. Re-runnable (create or replace / drop trigger if exists).

-- ---------------------------------------------------------------------------------------------
-- Rate limiting (DECISIONS.md D10): fixed-window counter shared by every server instance.
-- Returns true when the call is allowed. Keys are hashed by the app before they get here.
-- ---------------------------------------------------------------------------------------------
create or replace function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_count integer;
begin
  if p_key is null or length(p_key) > 300 or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit arguments' using errcode = '22023';
  end if;
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning r.count into v_count;

  -- Opportunistic cleanup so the table stays small without a cron job.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_count <= p_limit;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- New auth user -> profile. The role is ALWAYS 'customer' here; it is never read from metadata.
-- Self-registration passes business details in user metadata; those create a PENDING customer.
-- Nothing in metadata can link the user to an existing customer or supplier (only admins can).
-- ---------------------------------------------------------------------------------------------
create or replace function public.clean_text(p text, p_max integer)
returns text
language sql immutable
set search_path = ''
as $$
  select nullif(btrim(left(p, p_max)), '')
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_business text := public.clean_text(meta ->> 'business_name', 200);
  v_contact text := public.clean_text(coalesce(meta ->> 'contact_name', meta ->> 'full_name'), 200);
  v_phone text := public.clean_text(meta ->> 'phone', 50);
  v_customer_id uuid;
begin
  if v_business is not null then
    insert into public.customers
      (business_name, contact_name, email, phone, address_line1, address_line2, city, postcode, status)
    values (
      v_business, v_contact, new.email, v_phone,
      public.clean_text(meta ->> 'address_line1', 200),
      public.clean_text(meta ->> 'address_line2', 200),
      public.clean_text(meta ->> 'city', 100),
      upper(public.clean_text(meta ->> 'postcode', 20)),
      'pending'
    )
    returning id into v_customer_id;
  end if;

  insert into public.profiles (id, role, email, full_name, phone, customer_id)
  values (new.id, 'customer', new.email, v_contact, v_phone, v_customer_id)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------------------------
-- Gapless counters (orders, invoices). The row lock serialises callers; a rolled-back
-- transaction releases its number, so there are no gaps.
-- ---------------------------------------------------------------------------------------------
create or replace function public.next_counter(p_name text)
returns bigint
language sql
security definer
set search_path = ''
as $$
  update public.counters set value = value + 1 where name = p_name returning value
$$;

-- ---------------------------------------------------------------------------------------------
-- Audit log (who, what, when) for prices, payments, orders, accounts and settings.
-- Actor = the signed-in user (auth.uid()), or app.actor_id set by trusted server code.
-- ---------------------------------------------------------------------------------------------
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) - 'token_hash' end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) - 'token_hash' end;
  v_row jsonb := coalesce(v_new, v_old);
  v_actor uuid;
begin
  if tg_op = 'UPDATE' and (v_old - 'updated_at') = (v_new - 'updated_at') then
    return null;
  end if;
  v_actor := coalesce(auth.uid(), nullif(current_setting('app.actor_id', true), '')::uuid);
  insert into public.audit_log (actor_id, action, entity, entity_id, before, after)
  values (
    v_actor,
    lower(tg_op),
    tg_table_name,
    coalesce(
      v_row ->> 'id',
      concat_ws(':', v_row ->> 'customer_id',
                coalesce(v_row ->> 'variant_id', v_row ->> 'category_id', v_row ->> 'product_id'))
    ),
    v_old,
    v_new
  );
  return null;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'customers', 'customer_private', 'suppliers', 'product_variants',
    'customer_category_access', 'customer_product_rules', 'customer_category_margins',
    'customer_price_overrides', 'orders', 'supplier_orders', 'order_items', 'delivery_proofs',
    'customer_payments', 'supplier_payments', 'invoices', 'settings'
  ] loop
    execute format('drop trigger if exists audit on public.%I', t);
    execute format(
      'create trigger audit after insert or update or delete on public.%I '
      'for each row execute function public.audit_row_change()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Atomic order creation (service role only). The server computes every figure with
-- src/domain (pure, unit-tested) and passes the result here; this function re-checks the
-- arithmetic, allocates gapless order and invoice numbers and writes everything in one
-- transaction. Payload shape:
-- {
--   "customer_id": uuid, "placed_by": uuid, "delivery_date": "YYYY-MM-DD", "note": text|null,
--   "payment_terms": "on_delivery"|"within_7_days"|"on_date", "promised_pay_date": date|null,
--   "totals": { goods_net_pence, goods_vat_pence, delivery_net_pence, delivery_vat_pence,
--               vat_pence, total_pence },
--   "supplier_orders": [ { "supplier_id": uuid, "items": [ { variant_id, product_id,
--       product_name, size_label, sku, qty, unit_price_pence, unit_cost_pence, vat_rate_bp,
--       line_net_pence, line_vat_pence } ] } ]
-- }
-- Returns { order_id, number, invoice_id, invoice_number }.
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
  v_order_id uuid;
  v_number bigint;
  v_invoice_id uuid;
  v_invoice_number bigint;
  v_so jsonb;
  v_item jsonb;
  v_so_id uuid;
  v_sort integer := 0;
  v_goods_net bigint := 0;
  v_goods_vat bigint := 0;
  v_qty integer;
  v_price bigint;
begin
  select * into v_customer from public.customers where id = (p ->> 'customer_id')::uuid for share;
  if not found or v_customer.status <> 'approved' then
    raise exception 'customer is not approved' using errcode = 'P0001';
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
    vat_pence, total_pence, placed_by
  ) values (
    v_number, v_customer.id, 'placed', (p ->> 'delivery_date')::date,
    concat_ws(', ', v_customer.business_name, v_customer.address_line1, v_customer.address_line2,
              v_customer.city, v_customer.postcode),
    public.clean_text(p ->> 'note', 2000),
    coalesce((p ->> 'payment_terms')::public.payment_terms, 'on_delivery'),
    (p ->> 'promised_pay_date')::date,
    (t ->> 'goods_net_pence')::bigint, (t ->> 'goods_vat_pence')::bigint,
    (t ->> 'delivery_net_pence')::bigint, (t ->> 'delivery_vat_pence')::bigint,
    (t ->> 'vat_pence')::bigint, (t ->> 'total_pence')::bigint,
    (p ->> 'placed_by')::uuid
  ) returning id into v_order_id;

  for v_so in select value from jsonb_array_elements(p -> 'supplier_orders') loop
    if jsonb_typeof(v_so -> 'items') is distinct from 'array' or jsonb_array_length(v_so -> 'items') = 0 then
      raise exception 'supplier order has no lines' using errcode = 'P0001';
    end if;
    insert into public.supplier_orders (order_id, supplier_id, status)
    values (v_order_id, (v_so ->> 'supplier_id')::uuid, 'placed')
    returning id into v_so_id;

    for v_item in select value from jsonb_array_elements(v_so -> 'items') loop
      v_sort := v_sort + 1;
      v_qty := (v_item ->> 'qty')::integer;
      v_price := (v_item ->> 'unit_price_pence')::bigint;
      insert into public.order_items (
        order_id, supplier_order_id, supplier_id, variant_id, product_id, product_name, size_label,
        sku, qty, unit_price_pence, unit_cost_pence, vat_rate_bp, line_net_pence, line_vat_pence, sort
      ) values (
        v_order_id, v_so_id, (v_so ->> 'supplier_id')::uuid, (v_item ->> 'variant_id')::uuid,
        (v_item ->> 'product_id')::uuid, v_item ->> 'product_name', v_item ->> 'size_label',
        v_item ->> 'sku', v_qty, v_price, (v_item ->> 'unit_cost_pence')::bigint,
        (v_item ->> 'vat_rate_bp')::integer, (v_item ->> 'line_net_pence')::bigint,
        (v_item ->> 'line_vat_pence')::bigint, v_sort
      );
      v_goods_net := v_goods_net + (v_item ->> 'line_net_pence')::bigint;
      v_goods_vat := v_goods_vat + (v_item ->> 'line_vat_pence')::bigint;
    end loop;
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

  return jsonb_build_object('order_id', v_order_id, 'number', v_number,
                            'invoice_id', v_invoice_id, 'invoice_number', v_invoice_number);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- One-off bootstrap of the first admin. Run by the owner in the SQL editor:
--   select public.promote_to_admin('owner@example.com');
-- Not callable through the API by anyone (not even the service role).
-- ---------------------------------------------------------------------------------------------
create or replace function public.promote_to_admin(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_customer uuid;
begin
  select customer_id into v_customer from public.profiles where lower(email) = lower(p_email);
  if not found then
    raise exception 'no user with email %', p_email;
  end if;
  update public.profiles
     set role = 'admin', customer_id = null, supplier_id = null, active = true
   where lower(email) = lower(p_email);
  -- A pending customer row created by an accidental self-registration is removed.
  delete from public.customers c
   where c.id = v_customer and c.status = 'pending'
     and not exists (select 1 from public.orders o where o.customer_id = c.id);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Function privileges: nothing here is callable by anon/authenticated.
-- ---------------------------------------------------------------------------------------------
revoke execute on function public.hit_rate_limit(text, integer, integer),
  public.handle_new_user(), public.handle_user_email_change(), public.next_counter(text),
  public.audit_row_change(), public.create_order_tx(jsonb), public.promote_to_admin(text),
  public.clean_text(text, integer), public.set_updated_at(), public.guard_profile_update(),
  public.guard_customer_update()
  from public, anon, authenticated;
revoke execute on function public.promote_to_admin(text), public.next_counter(text) from service_role;
grant execute on function public.hit_rate_limit(text, integer, integer), public.create_order_tx(jsonb)
  to service_role;
