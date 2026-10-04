-- 0008_delivery.sql — Phase 6: supplier order status, driver links, proof of delivery.
-- Re-runnable; no DROP/DELETE (DECISIONS D20). Every function here is server-only (service role).

-- ---------------------------------------------------------------------------------------------
-- Order status roll-up (same rules as src/domain/status.ts rollupOrderStatus). Completed and
-- cancelled orders are set by the admin and never changed here.
-- ---------------------------------------------------------------------------------------------
create or replace function public.rollup_order_status(p_order uuid)
returns public.order_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.order_status;
  v_statuses public.supplier_order_status[];
  v_live public.supplier_order_status[];
  v_next public.order_status;
begin
  select status into v_current from public.orders where id = p_order for update;
  if not found then
    raise exception 'order not found' using errcode = 'P0001';
  end if;
  if v_current in ('completed', 'cancelled') then
    return v_current;
  end if;
  select coalesce(array_agg(status), '{}') into v_statuses from public.supplier_orders where order_id = p_order;
  select coalesce(array_agg(s), '{}') into v_live from unnest(v_statuses) s where s <> 'cancelled';
  v_next := case
    when cardinality(v_live) = 0 then 'cancelled'
    when 'delivered' = all (v_live) then 'delivered'
    when 'delivered' = any (v_live) then 'partially_delivered'
    when 'out_for_delivery' = any (v_live) then 'out_for_delivery'
    when 'placed' = all (v_live) then 'placed'
    else 'sent'
  end::public.order_status;
  if v_next <> v_current then
    update public.orders set status = v_next where id = p_order;
  end if;
  return v_next;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Supplier moves its part of an order forward: placed -> sent (accepted) -> out_for_delivery.
-- "delivered" only comes with a proof (record_delivery_proof). Never backwards, never from a
-- delivered or cancelled supplier order.
-- ---------------------------------------------------------------------------------------------
create or replace function public.set_supplier_order_status(p_supplier_order uuid, p_status public.supplier_order_status, p_actor uuid)
returns public.order_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_so public.supplier_orders%rowtype;
  v_rank constant text[] := array['placed', 'sent', 'out_for_delivery', 'delivered'];
begin
  perform set_config('app.actor_id', coalesce(p_actor::text, ''), true);
  select * into v_so from public.supplier_orders where id = p_supplier_order for update;
  if not found then
    raise exception 'supplier order not found' using errcode = 'P0001';
  end if;
  if p_status not in ('sent', 'out_for_delivery') then
    raise exception 'status not allowed here' using errcode = 'P0001';
  end if;
  if v_so.status in ('delivered', 'cancelled')
     or array_position(v_rank, p_status::text) <= array_position(v_rank, v_so.status::text) then
    raise exception 'cannot move from % to %', v_so.status, p_status using errcode = 'P0001';
  end if;
  update public.supplier_orders
     set status = p_status, sent_at = coalesce(sent_at, now())
   where id = p_supplier_order;
  return public.rollup_order_status(v_so.order_id);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Driver link (DECISIONS D9): the server makes a 256-bit random token and passes only its
-- SHA-256 here. A new link revokes every unused earlier link for the same supplier order.
-- ---------------------------------------------------------------------------------------------
create or replace function public.create_driver_link(p_supplier_order uuid, p_token_hash bytea, p_expires_at timestamptz, p_actor uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_so public.supplier_orders%rowtype;
  v_id uuid;
begin
  perform set_config('app.actor_id', coalesce(p_actor::text, ''), true);
  if octet_length(p_token_hash) <> 32 then
    raise exception 'token hash must be 32 bytes' using errcode = 'P0001';
  end if;
  select * into v_so from public.supplier_orders where id = p_supplier_order for update;
  if not found or v_so.status in ('delivered', 'cancelled') then
    raise exception 'supplier order is not open' using errcode = 'P0001';
  end if;
  update public.delivery_proofs
     set revoked_at = now()
   where supplier_order_id = p_supplier_order and submitted_at is null and revoked_at is null;
  insert into public.delivery_proofs (supplier_order_id, token_hash, expires_at, created_by)
  values (p_supplier_order, p_token_hash, p_expires_at, p_actor)
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Record a proof and mark the supplier order delivered, atomically.
--   p.proof_id set   -> a driver link: must still be open (not used, revoked or expired).
--   p.proof_id null  -> the supplier (or admin) uploading it themselves: a new proof row.
-- Unused links for the same supplier order are revoked. The restaurant is told in the portal
-- and by a queued email.
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
  if not found or v_so.status in ('delivered', 'cancelled') then
    raise exception 'supplier order is not open' using errcode = 'P0002';
  end if;

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

  update public.delivery_proofs
     set revoked_at = now()
   where supplier_order_id = v_so.id and submitted_at is null and revoked_at is null;

  update public.supplier_orders
     set status = 'delivered', delivered_at = now(), sent_at = coalesce(sent_at, now())
   where id = v_so.id;
  v_status := public.rollup_order_status(v_so.order_id);

  select * into v_order from public.orders where id = v_so.order_id;
  select * into v_customer from public.customers where id = v_order.customer_id;
  select count(*) into v_parts from public.supplier_orders where order_id = v_order.id;
  -- "Delivery n of m" in the order the restaurant sees them (by first basket line).
  select count(*) into v_part
  from (select oi.supplier_order_id, min(oi.sort) as first_sort from public.order_items oi
        where oi.order_id = v_order.id group by oi.supplier_order_id) x
  where x.first_sort <= (select min(oi.sort) from public.order_items oi where oi.supplier_order_id = v_so.id);

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

revoke execute on function public.rollup_order_status(uuid),
  public.set_supplier_order_status(uuid, public.supplier_order_status, uuid),
  public.create_driver_link(uuid, bytea, timestamptz, uuid),
  public.record_delivery_proof(jsonb)
  from public, anon, authenticated;
grant execute on function public.set_supplier_order_status(uuid, public.supplier_order_status, uuid),
  public.create_driver_link(uuid, bytea, timestamptz, uuid),
  public.record_delivery_proof(jsonb)
  to service_role;

-- ---------------------------------------------------------------------------------------------
-- Who can see a submitted proof (file paths only; the files themselves are private and are
-- shown through short-lived signed URLs made by the server).
-- ---------------------------------------------------------------------------------------------
create or replace view public.customer_delivery_proofs with (security_barrier = true) as
  select dp.id, dp.supplier_order_id, so.order_id, dp.submitted_at, dp.submitted_by_kind,
         dp.photo_path, dp.document_path, dp.signature_path, dp.signed_by_name
  from public.delivery_proofs dp
  join public.supplier_orders so on so.id = dp.supplier_order_id
  join public.orders o on o.id = so.order_id
  where dp.submitted_at is not null and o.customer_id = public.my_approved_customer_id();

-- Supplier: its own links and proofs (never the token hash).
create or replace view public.supplier_delivery_proofs with (security_barrier = true) as
  select dp.id, dp.supplier_order_id, dp.created_at, dp.expires_at, dp.revoked_at, dp.submitted_at,
         dp.submitted_by_kind, dp.photo_path, dp.document_path, dp.signature_path, dp.signed_by_name
  from public.delivery_proofs dp
  join public.supplier_orders so on so.id = dp.supplier_order_id
  where so.supplier_id = public.my_supplier_id();

revoke all on public.customer_delivery_proofs, public.supplier_delivery_proofs from anon, authenticated;
grant select on public.customer_delivery_proofs, public.supplier_delivery_proofs to authenticated;

create index if not exists delivery_proofs_open_idx
  on public.delivery_proofs (supplier_order_id) where submitted_at is null and revoked_at is null;
