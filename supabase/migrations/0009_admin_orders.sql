-- 0009_admin_orders.sql — Phase 7: admin order changes, cancellation, payments ledger views.
-- Re-runnable; no destructive statements (DECISIONS D20). Every function is server-only
-- (service role, called after requireRole("admin") with the admin as actor for the audit log).

-- ---------------------------------------------------------------------------------------------
-- A line taken off an order is kept, marked removed (audit trail, DECISIONS D36). Every reader
-- filters on removed_at is null; the restaurant and supplier views below do it for them.
-- ---------------------------------------------------------------------------------------------
alter table public.order_items add column if not exists removed_at timestamptz;
alter table public.orders add column if not exists cancel_reason text
  check (cancel_reason is null or length(cancel_reason) <= 500);

create or replace view public.customer_orders with (security_barrier = true) as
  select o.id, o.number, o.status, o.delivery_date, o.delivery_address, o.note, o.payment_terms,
         o.promised_pay_date, o.goods_net_pence, o.goods_vat_pence, o.delivery_net_pence,
         o.delivery_vat_pence, o.vat_pence, o.total_pence, o.created_at, o.updated_at,
         o.cancel_reason
  from public.orders o
  where o.customer_id = public.my_approved_customer_id();

create or replace view public.customer_order_items with (security_barrier = true) as
  select oi.id, oi.order_id, oi.supplier_order_id, oi.product_id, oi.product_name, oi.size_label,
         oi.sku, oi.qty, oi.unit_price_pence, oi.vat_rate_bp, oi.line_net_pence, oi.line_vat_pence,
         oi.sort
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.customer_id = public.my_approved_customer_id() and oi.removed_at is null;

create or replace view public.supplier_order_lines with (security_barrier = true) as
  select oi.id, oi.supplier_order_id, oi.product_name, oi.size_label, oi.sku, oi.qty, oi.sort
  from public.order_items oi
  join public.supplier_orders so on so.id = oi.supplier_order_id
  where so.supplier_id = public.my_supplier_id() and oi.removed_at is null;

-- ---------------------------------------------------------------------------------------------
-- Tell a supplier about its part of an order: every active login in the portal, plus a queued
-- email (sent in Phase 8).
-- ---------------------------------------------------------------------------------------------
create or replace function public.notify_supplier_order(p_supplier_order uuid, p_kind text, p_title text, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_so public.supplier_orders%rowtype;
  v_email text;
begin
  select * into v_so from public.supplier_orders where id = p_supplier_order;
  if not found then
    return;
  end if;
  insert into public.notifications (user_id, kind, title, body, link)
  select pr.id, p_kind, p_title, p_body, '/supplier/orders/' || v_so.id
  from public.profiles pr
  where pr.supplier_id = v_so.supplier_id and pr.role = 'supplier' and pr.active;
  select email into v_email from public.suppliers where id = v_so.supplier_id;
  if v_email is not null then
    insert into public.email_log (to_email, template, subject, status, entity, entity_id)
    values (v_email, p_kind, p_title, 'queued', 'supplier_order', v_so.id::text);
  end if;
end;
$$;

-- Same for the restaurant: its active logins, plus a queued email to the restaurant's address.
create or replace function public.notify_customer_order(p_order uuid, p_kind text, p_title text, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_email text;
begin
  select * into v_order from public.orders where id = p_order;
  if not found then
    return;
  end if;
  insert into public.notifications (user_id, kind, title, body, link)
  select pr.id, p_kind, p_title, p_body, '/orders/' || v_order.id
  from public.profiles pr
  where pr.customer_id = v_order.customer_id and pr.role = 'customer' and pr.active;
  select email into v_email from public.customers where id = v_order.customer_id;
  if v_email is not null then
    insert into public.email_log (to_email, template, subject, status, entity, entity_id)
    values (v_email, p_kind, p_title, 'queued', 'order', v_order.id::text);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Admin changes an order after speaking with the restaurant (brief §3 "Order flow"):
-- quantities, taking a line off, moving a line to another supplier (with that supplier's cost),
-- the delivery charge. The server rebuilds every figure with src/domain (rebuildOrder) and sends
-- ALL live lines; this function checks and applies them in one transaction:
--   * refused once any delivery is done, or the order is completed/cancelled (P0003);
--   * refused if the order changed since the admin opened it (P0004);
--   * a supplier left with no lines has its part cancelled (open driver links revoked);
--   * the order totals and the invoice snapshot follow (DECISIONS D36);
--   * suppliers whose lines changed and the restaurant are told.
-- p = { order_id, actor, expected_updated_at, totals {...}, lines: [{ id, qty (0 = take off),
--       supplier_id, unit_cost_pence, line_net_pence, line_vat_pence }] }
-- ---------------------------------------------------------------------------------------------
create or replace function public.admin_edit_order(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_item public.order_items%rowtype;
  v_so public.supplier_orders%rowtype;
  v_supplier public.suppliers%rowtype;
  v_actor uuid := nullif(p ->> 'actor', '')::uuid;
  t jsonb := p -> 'totals';
  v_line jsonb;
  v_qty integer;
  v_supplier_id uuid;
  v_cost bigint;
  v_target uuid;
  v_live integer;
  v_goods_net bigint;
  v_goods_vat bigint;
  v_touched uuid[] := '{}';
  v_new_parts uuid[] := '{}';
  v_cancelled uuid[] := '{}';
  v_lines integer;
  v_status public.order_status;
  r record;
begin
  perform set_config('app.actor_id', coalesce(v_actor::text, ''), true);
  select * into v_order from public.orders where id = (p ->> 'order_id')::uuid for update;
  if not found then
    raise exception 'order not found' using errcode = 'P0001';
  end if;
  if v_order.status in ('completed', 'cancelled')
     or exists (select 1 from public.supplier_orders where order_id = v_order.id and status = 'delivered') then
    raise exception 'order is locked' using errcode = 'P0003';
  end if;
  if nullif(p ->> 'expected_updated_at', '') is not null
     and v_order.updated_at <> (p ->> 'expected_updated_at')::timestamptz then
    raise exception 'order changed since it was opened' using errcode = 'P0004';
  end if;

  if jsonb_typeof(p -> 'lines') is distinct from 'array' then
    raise exception 'lines missing' using errcode = 'P0001';
  end if;
  select count(*) into v_live from public.order_items where order_id = v_order.id and removed_at is null;
  if jsonb_array_length(p -> 'lines') <> v_live
     or (select count(distinct l ->> 'id') from jsonb_array_elements(p -> 'lines') l) <> v_live then
    raise exception 'every line of the order must be sent once' using errcode = 'P0001';
  end if;

  for v_line in select value from jsonb_array_elements(p -> 'lines') loop
    select * into v_item from public.order_items
     where id = (v_line ->> 'id')::uuid and order_id = v_order.id and removed_at is null
     for update;
    if not found then
      raise exception 'line is not on this order' using errcode = 'P0001';
    end if;
    v_qty := (v_line ->> 'qty')::integer;
    if v_qty is null or v_qty < 0 or v_qty > 9999 then
      raise exception 'invalid quantity' using errcode = 'P0001';
    end if;

    if v_qty = 0 then
      update public.order_items set removed_at = now() where id = v_item.id;
      v_touched := v_touched || v_item.supplier_order_id;
      continue;
    end if;

    v_supplier_id := (v_line ->> 'supplier_id')::uuid;
    v_cost := nullif(v_line ->> 'unit_cost_pence', '')::bigint;
    v_target := v_item.supplier_order_id;
    if v_supplier_id is distinct from v_item.supplier_id then
      select * into v_supplier from public.suppliers where id = v_supplier_id;
      if not found or not v_supplier.active then
        raise exception 'supplier is not active' using errcode = 'P0001';
      end if;
      select * into v_so from public.supplier_orders
       where order_id = v_order.id and supplier_id = v_supplier_id for update;
      if found then
        v_target := v_so.id;
        if v_so.status = 'cancelled' then
          update public.supplier_orders set status = 'placed', sent_at = null where id = v_so.id;
          v_new_parts := v_new_parts || v_so.id;
        end if;
      else
        insert into public.supplier_orders (order_id, supplier_id, status)
        values (v_order.id, v_supplier_id, 'placed')
        returning id into v_target;
        v_new_parts := v_new_parts || v_target;
      end if;
      v_touched := v_touched || v_item.supplier_order_id;
    end if;

    if v_qty <> v_item.qty or v_target <> v_item.supplier_order_id then
      v_touched := v_touched || v_target;
    end if;
    if v_qty <> v_item.qty or v_target <> v_item.supplier_order_id
       or v_cost is distinct from v_item.unit_cost_pence
       or (v_line ->> 'line_vat_pence')::bigint <> v_item.line_vat_pence then
      update public.order_items
         set qty = v_qty, supplier_id = v_supplier_id, supplier_order_id = v_target,
             unit_cost_pence = v_cost,
             line_net_pence = (v_line ->> 'line_net_pence')::bigint,
             line_vat_pence = (v_line ->> 'line_vat_pence')::bigint
       where id = v_item.id;
    end if;
  end loop;

  select count(*), coalesce(sum(line_net_pence), 0), coalesce(sum(line_vat_pence), 0)
    into v_live, v_goods_net, v_goods_vat
    from public.order_items where order_id = v_order.id and removed_at is null;
  if v_live = 0 then
    raise exception 'an order needs at least one line; cancel the order instead' using errcode = 'P0001';
  end if;
  if v_goods_net <> (t ->> 'goods_net_pence')::bigint or v_goods_vat <> (t ->> 'goods_vat_pence')::bigint then
    raise exception 'line totals do not match order totals' using errcode = 'P0001';
  end if;

  update public.orders
     set goods_net_pence = (t ->> 'goods_net_pence')::bigint,
         goods_vat_pence = (t ->> 'goods_vat_pence')::bigint,
         delivery_net_pence = (t ->> 'delivery_net_pence')::bigint,
         delivery_vat_pence = (t ->> 'delivery_vat_pence')::bigint,
         vat_pence = (t ->> 'vat_pence')::bigint,
         total_pence = (t ->> 'total_pence')::bigint
   where id = v_order.id;
  update public.invoices
     set goods_net_pence = (t ->> 'goods_net_pence')::bigint,
         goods_vat_pence = (t ->> 'goods_vat_pence')::bigint,
         delivery_net_pence = (t ->> 'delivery_net_pence')::bigint,
         delivery_vat_pence = (t ->> 'delivery_vat_pence')::bigint,
         vat_pence = (t ->> 'vat_pence')::bigint,
         total_pence = (t ->> 'total_pence')::bigint
   where order_id = v_order.id and voided_at is null;

  -- A supplier with nothing left on this order: its part is cancelled.
  for r in
    select so.id from public.supplier_orders so
     where so.order_id = v_order.id and so.status <> 'cancelled'
       and not exists (select 1 from public.order_items oi where oi.supplier_order_id = so.id and oi.removed_at is null)
  loop
    update public.supplier_orders set status = 'cancelled' where id = r.id;
    update public.delivery_proofs set revoked_at = now()
     where supplier_order_id = r.id and submitted_at is null and revoked_at is null;
    v_cancelled := v_cancelled || r.id;
    perform public.notify_supplier_order(r.id, 'supplier_order_cancelled',
      'ORDER-' || v_order.number || ' cancelled', 'Your part of this order is no longer needed. Do not deliver it.');
  end loop;

  for r in select distinct u as id from unnest(v_touched || v_new_parts) u loop
    continue when r.id = any (v_cancelled);
    select count(*) into v_lines from public.order_items where supplier_order_id = r.id and removed_at is null;
    if r.id = any (v_new_parts) then
      perform public.notify_supplier_order(r.id, 'supplier_order_new', 'New order ORDER-' || v_order.number,
        v_lines || case when v_lines = 1 then ' line' else ' lines' end
          || ' for delivery on ' || to_char(v_order.delivery_date, 'Dy FMDD Mon YYYY'));
    else
      perform public.notify_supplier_order(r.id, 'supplier_order_changed', 'ORDER-' || v_order.number || ' changed',
        'Items or quantities changed. Check the order before you deliver it.');
    end if;
  end loop;

  v_status := public.rollup_order_status(v_order.id);
  perform public.notify_customer_order(v_order.id, 'order_changed', 'ORDER-' || v_order.number || ' was updated',
    'Your order was changed after we spoke. Check the items and the new total.');

  return jsonb_build_object('order_status', v_status, 'cancelled_parts', to_jsonb(v_cancelled),
                            'new_parts', to_jsonb(v_new_parts));
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Admin cancels a whole order (nothing delivered yet). Every open part is cancelled and its
-- driver links revoked, the invoice is voided (its number is kept: gapless, D13), suppliers and
-- the restaurant are told.
-- ---------------------------------------------------------------------------------------------
create or replace function public.admin_cancel_order(p_order uuid, p_actor uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  r record;
begin
  perform set_config('app.actor_id', coalesce(p_actor::text, ''), true);
  select * into v_order from public.orders where id = p_order for update;
  if not found then
    raise exception 'order not found' using errcode = 'P0001';
  end if;
  if v_order.status in ('completed', 'cancelled')
     or exists (select 1 from public.supplier_orders where order_id = v_order.id and status = 'delivered') then
    raise exception 'order is locked' using errcode = 'P0003';
  end if;

  update public.orders
     set status = 'cancelled', cancelled_at = now(), next_chase_date = null,
         cancel_reason = public.clean_text(p_reason, 500)
   where id = v_order.id;
  for r in select id from public.supplier_orders where order_id = v_order.id and status <> 'cancelled' loop
    update public.supplier_orders set status = 'cancelled' where id = r.id;
    update public.delivery_proofs set revoked_at = now()
     where supplier_order_id = r.id and submitted_at is null and revoked_at is null;
    perform public.notify_supplier_order(r.id, 'supplier_order_cancelled',
      'ORDER-' || v_order.number || ' cancelled', 'This order was cancelled. Do not deliver it.');
  end loop;
  update public.invoices set voided_at = now() where order_id = v_order.id and voided_at is null;
  perform public.notify_customer_order(v_order.id, 'order_cancelled', 'ORDER-' || v_order.number || ' cancelled',
    coalesce('Reason: ' || public.clean_text(p_reason, 500), 'Your order was cancelled.'));
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- record_delivery_proof v2: as 0008, plus
--   * the admin may add a proof to a part that is already delivered (to replace a poor photo;
--     the newest proof is shown). That changes no status and sends no message;
--   * "Delivery n of m" ignores cancelled parts and lines taken off the order.
-- ---------------------------------------------------------------------------------------------
create or replace function public.record_delivery_proof(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_proof public.delivery_proofs%rowtype;
  v_so public.supplier_orders%rowtype;
  v_order public.orders%rowtype;
  v_customer public.customers%rowtype;
  v_proof_id uuid := nullif(p ->> 'proof_id', '')::uuid;
  v_kind public.proof_submitter := (p ->> 'submitted_by_kind')::public.proof_submitter;
  v_actor uuid := nullif(p ->> 'actor', '')::uuid;
  v_status public.order_status;
  v_was_delivered boolean;
  v_part integer;
  v_parts integer;
begin
  perform set_config('app.actor_id', coalesce(v_actor::text, ''), true);
  if coalesce(p ->> 'photo_path', '') = '' then
    raise exception 'a delivery photo is required' using errcode = 'P0001';
  end if;
  if coalesce(p ->> 'document_path', '') = '' and coalesce(p ->> 'signature_path', '') = '' then
    raise exception 'a signed document or a signature is required' using errcode = 'P0001';
  end if;

  if v_proof_id is not null then
    select * into v_proof from public.delivery_proofs where id = v_proof_id for update;
    if not found or v_proof.submitted_at is not null or v_proof.revoked_at is not null
       or v_proof.expires_at is null or v_proof.expires_at <= now() then
      raise exception 'this link can no longer be used' using errcode = 'P0002';
    end if;
    select * into v_so from public.supplier_orders where id = v_proof.supplier_order_id for update;
  else
    select * into v_so from public.supplier_orders where id = (p ->> 'supplier_order_id')::uuid for update;
  end if;
  if not found or v_so.status = 'cancelled'
     or (v_so.status = 'delivered' and not (v_kind = 'admin' and v_proof_id is null)) then
    raise exception 'supplier order is not open' using errcode = 'P0002';
  end if;
  v_was_delivered := v_so.status = 'delivered';

  if v_proof_id is not null then
    update public.delivery_proofs
       set submitted_at = now(), submitted_by_kind = v_kind,
           photo_path = p ->> 'photo_path', document_path = nullif(p ->> 'document_path', ''),
           signature_path = nullif(p ->> 'signature_path', ''),
           signed_by_name = public.clean_text(p ->> 'signed_by_name', 200)
     where id = v_proof_id;
  else
    insert into public.delivery_proofs (supplier_order_id, created_by, submitted_at, submitted_by_kind,
      photo_path, document_path, signature_path, signed_by_name)
    values (v_so.id, v_actor, now(), v_kind, p ->> 'photo_path', nullif(p ->> 'document_path', ''),
      nullif(p ->> 'signature_path', ''), public.clean_text(p ->> 'signed_by_name', 200))
    returning id into v_proof_id;
  end if;

  if v_was_delivered then
    select status into v_status from public.orders where id = v_so.order_id;
    return jsonb_build_object('proof_id', v_proof_id, 'supplier_order_id', v_so.id, 'order_status', v_status);
  end if;

  update public.delivery_proofs
     set revoked_at = now()
   where supplier_order_id = v_so.id and submitted_at is null and revoked_at is null;

  update public.supplier_orders
     set status = 'delivered', delivered_at = now(), sent_at = coalesce(sent_at, now())
   where id = v_so.id;
  v_status := public.rollup_order_status(v_so.order_id);

  select * into v_order from public.orders where id = v_so.order_id;
  select * into v_customer from public.customers where id = v_order.customer_id;
  select count(*) into v_parts from public.supplier_orders where order_id = v_order.id and status <> 'cancelled';
  -- "Delivery n of m" in the order the restaurant sees them (by first basket line).
  select count(*) into v_part
  from (select oi.supplier_order_id, min(oi.sort) as first_sort from public.order_items oi
        join public.supplier_orders so on so.id = oi.supplier_order_id
        where oi.order_id = v_order.id and oi.removed_at is null and so.status <> 'cancelled'
        group by oi.supplier_order_id) x
  where x.first_sort <= (select min(oi.sort) from public.order_items oi
                         where oi.supplier_order_id = v_so.id and oi.removed_at is null);

  insert into public.notifications (user_id, kind, title, body, link)
  select pr.id, 'order_delivered',
         case when v_parts > 1 then 'Delivery ' || v_part || ' of ' || v_parts || ' for ORDER-' || v_order.number || ' delivered'
              else 'ORDER-' || v_order.number || ' delivered' end,
         'Proof of delivery is on the order.',
         '/orders/' || v_order.id
  from public.profiles pr
  where pr.customer_id = v_customer.id and pr.role = 'customer' and pr.active;

  if v_customer.email is not null then
    insert into public.email_log (to_email, template, subject, status, entity, entity_id)
    values (v_customer.email, 'order_delivered', 'ORDER-' || v_order.number || ': delivered', 'queued',
            'delivery_proof', v_proof_id::text);
  end if;

  return jsonb_build_object('proof_id', v_proof_id, 'supplier_order_id', v_so.id, 'order_status', v_status);
end;
$$;

revoke execute on function public.notify_supplier_order(uuid, text, text, text),
  public.notify_customer_order(uuid, text, text, text),
  public.admin_edit_order(jsonb),
  public.admin_cancel_order(uuid, uuid, text),
  public.record_delivery_proof(jsonb)
  from public, anon, authenticated;
grant execute on function public.admin_edit_order(jsonb),
  public.admin_cancel_order(uuid, uuid, text),
  public.record_delivery_proof(jsonb)
  to service_role;

-- ---------------------------------------------------------------------------------------------
-- Ledger views for the admin screens (security_invoker: base tables are admin-only, and the
-- explicit is_admin() filter returns nothing to anyone else). Plain sums only; profit and VAT
-- on cost are worked out in src/domain (D6).
-- ---------------------------------------------------------------------------------------------
create or replace view public.admin_order_summary with (security_invoker = true) as
  select o.id, o.number, o.status, o.created_at, o.updated_at, o.delivery_date, o.customer_id,
         c.business_name as customer_name, o.payment_terms, o.promised_pay_date, o.next_chase_date,
         o.payment_notes, o.goods_net_pence, o.delivery_net_pence, o.vat_pence, o.total_pence,
         coalesce(pay.paid_pence, 0)::bigint as paid_pence,
         (case when o.status = 'cancelled' then 0 else o.total_pence end - coalesce(pay.paid_pence, 0))::bigint as balance_pence,
         case when o.status = 'cancelled' then 'cancelled'
              when coalesce(pay.paid_pence, 0) <= 0 then 'unpaid'
              when pay.paid_pence < o.total_pence then 'part_paid'
              when pay.paid_pence = o.total_pence then 'paid'
              else 'overpaid' end as payment_state,
         li.cost_pence::bigint as cost_pence,
         coalesce(li.cost_missing, false) as cost_missing,
         coalesce(li.supplier_ids, '{}') as supplier_ids,
         coalesce(li.line_count, 0) as line_count
  from public.orders o
  join public.customers c on c.id = o.customer_id
  left join lateral (
    select sum(cp.amount_pence) as paid_pence from public.customer_payments cp where cp.order_id = o.id
  ) pay on true
  left join lateral (
    select sum(oi.unit_cost_pence * oi.qty) as cost_pence,
           bool_or(oi.unit_cost_pence is null) as cost_missing,
           array_agg(distinct oi.supplier_id) as supplier_ids,
           count(*)::int as line_count
    from public.order_items oi where oi.order_id = o.id and oi.removed_at is null
  ) li on true
  where (select public.is_admin());

create or replace view public.admin_supplier_order_summary with (security_invoker = true) as
  select so.id, so.order_id, o.number as order_number, o.status as order_status, so.supplier_id,
         s.name as supplier_name, so.status, so.created_at, o.delivery_date, so.delivered_at,
         so.paid_to_supplier, so.supplier_paid_at, o.customer_id, c.business_name as customer_name,
         coalesce(sp.paid_pence, 0)::bigint as paid_pence
  from public.supplier_orders so
  join public.orders o on o.id = so.order_id
  join public.suppliers s on s.id = so.supplier_id
  join public.customers c on c.id = o.customer_id
  left join lateral (
    select sum(p.amount_pence) as paid_pence from public.supplier_payments p where p.supplier_order_id = so.id
  ) sp on true
  where (select public.is_admin());

revoke all on public.admin_order_summary, public.admin_supplier_order_summary from public, anon, authenticated;
grant select on public.admin_order_summary, public.admin_supplier_order_summary to authenticated;

create index if not exists orders_promised_idx on public.orders (promised_pay_date) where promised_pay_date is not null;
create index if not exists audit_log_actor_idx on public.audit_log (actor_id, at desc);
