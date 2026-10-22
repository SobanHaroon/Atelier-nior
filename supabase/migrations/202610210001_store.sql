-- Apply once to a dedicated Supabase project. No public/customer table access.
begin;

create table public.store_inventory (
  product_id text not null, size text not null,
  stock integer not null default 0 check (stock >= 0),
  primary key (product_id, size)
);
create table public.store_orders (
  id uuid primary key, token_hash text not null, fingerprint text not null,
  email text not null, country text not null, lines jsonb not null,
  subtotal integer not null check (subtotal > 0), shipping integer not null check (shipping >= 0),
  shipping_label text not null, currency text not null default 'usd',
  status text not null default 'reserved' check (status in ('reserved', 'checkout', 'paid', 'expired', 'failed')),
  stripe_session text unique, checkout_url text, payment_intent text,
  amount_total integer, customer jsonb, paid_at timestamptz,
  terms_accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(), expires_at timestamptz not null default (now() + interval '35 minutes')
);
create index store_orders_pending_idx on public.store_orders (created_at) where status in ('reserved', 'checkout');
create table public.store_messages (
  id uuid primary key, fingerprint text not null, name text not null, email text not null,
  topic text not null, message text not null, created_at timestamptz not null default now(), delivered_at timestamptz
);
create table public.store_rate_limits (key text primary key, hits integer not null, bucket bigint not null, updated_at timestamptz not null default now());

alter table public.store_inventory enable row level security;
alter table public.store_orders enable row level security;
alter table public.store_messages enable row level security;
alter table public.store_rate_limits enable row level security;
revoke all on public.store_inventory, public.store_orders, public.store_messages, public.store_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.store_inventory, public.store_orders, public.store_messages, public.store_rate_limits to service_role;

create function public.take_store_rate_limit(p_key text, p_max integer, p_seconds integer) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare v_hits integer; v_bucket bigint := floor(extract(epoch from now()) / p_seconds);
begin
  delete from public.store_rate_limits where updated_at < now() - interval '2 days';
  insert into public.store_rate_limits as r (key, hits, bucket) values (p_key, 1, v_bucket)
  on conflict (key) do update set hits = case when r.bucket = v_bucket then r.hits + 1 else 1 end, bucket = v_bucket, updated_at = now()
  returning hits into v_hits;
  return v_hits <= p_max;
end; $$;

create function public.reserve_store_order(p_order jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare v_order public.store_orders; v_item jsonb; v_new boolean;
begin
  if jsonb_array_length(p_order->'lines') < 1 or jsonb_array_length(p_order->'lines') > 30 then raise exception 'INVALID_ITEMS'; end if;
  insert into public.store_orders (id, token_hash, fingerprint, email, country, lines, subtotal, shipping, shipping_label)
  values ((p_order->>'id')::uuid, p_order->>'token_hash', p_order->>'fingerprint', p_order->>'email', p_order->>'country', p_order->'lines', (p_order->>'subtotal')::integer, (p_order->>'shipping')::integer, p_order->>'shipping_label')
  on conflict (id) do nothing;
  v_new := found;
  select * into v_order from public.store_orders where id = (p_order->>'id')::uuid for update;
  if v_order.token_hash <> p_order->>'token_hash' or v_order.fingerprint <> p_order->>'fingerprint' then raise exception 'REQUEST_CONFLICT'; end if;
  if not v_new then return to_jsonb(v_order); end if;
  -- Stable lock order prevents competing multi-item baskets from deadlocking.
  for v_item in select value from jsonb_array_elements(v_order.lines) order by value->>'id', value->>'size' loop
    if (v_item->>'qty')::integer not between 1 and 5 then raise exception 'INVALID_QUANTITY'; end if;
    update public.store_inventory set stock = stock - (v_item->>'qty')::integer
    where product_id = v_item->>'id' and size = v_item->>'size' and stock >= (v_item->>'qty')::integer;
    if not found then raise exception 'INSUFFICIENT_STOCK'; end if;
  end loop;
  return to_jsonb(v_order);
end; $$;

create function public.attach_store_checkout(p_id uuid, p_session text, p_url text) returns void
language plpgsql security invoker set search_path = '' as $$
declare v_order public.store_orders;
begin
  select * into strict v_order from public.store_orders where id = p_id for update;
  if v_order.stripe_session is not null and v_order.stripe_session <> p_session then raise exception 'REQUEST_CONFLICT'; end if;
  update public.store_orders set stripe_session = p_session, checkout_url = p_url,
    status = case when status = 'reserved' then 'checkout' else status end where id = p_id;
end; $$;

create function public.finish_store_order(p_id uuid, p_session text, p_status text, p_total integer, p_customer jsonb, p_payment text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare v_order public.store_orders; v_item jsonb;
begin
  select * into strict v_order from public.store_orders where id = p_id for update;
  if p_status not in ('paid', 'expired', 'failed') then raise exception 'INVALID_STATUS'; end if;
  if v_order.stripe_session is not null and v_order.stripe_session is distinct from p_session then raise exception 'REQUEST_CONFLICT'; end if;
  -- Terminal states are idempotent; an old event can never release a paid order.
  if v_order.status = 'paid' then return to_jsonb(v_order); end if;
  if v_order.status in ('expired', 'failed') then
    if p_status = 'paid' then raise exception 'PAYMENT_REQUIRES_REVIEW'; end if;
    return to_jsonb(v_order);
  end if;
  if p_status = 'paid' then
    if p_session is null or p_total < v_order.subtotal + v_order.shipping then raise exception 'INVALID_PAYMENT'; end if;
    update public.store_orders set status = 'paid', stripe_session = p_session, amount_total = p_total, customer = p_customer, payment_intent = p_payment, paid_at = now() where id = p_id;
  else
    -- No clock-only expiry: release only after verified Stripe expiry or a definitive creation error.
    for v_item in select value from jsonb_array_elements(v_order.lines) order by value->>'id', value->>'size' loop
      update public.store_inventory set stock = stock + (v_item->>'qty')::integer where product_id = v_item->>'id' and size = v_item->>'size';
    end loop;
    update public.store_orders set status = p_status, stripe_session = coalesce(stripe_session, p_session) where id = p_id;
  end if;
  select * into v_order from public.store_orders where id = p_id;
  return to_jsonb(v_order);
end; $$;

create function public.save_store_message(p_message jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare v_message public.store_messages;
begin
  insert into public.store_messages (id, fingerprint, name, email, topic, message)
  values ((p_message->>'id')::uuid, p_message->>'fingerprint', p_message->>'name', p_message->>'email', p_message->>'topic', p_message->>'message') on conflict (id) do nothing;
  select * into strict v_message from public.store_messages where id = (p_message->>'id')::uuid;
  if v_message.fingerprint <> p_message->>'fingerprint' then raise exception 'REQUEST_CONFLICT'; end if;
  return to_jsonb(v_message);
end; $$;

revoke execute on function public.take_store_rate_limit(text,integer,integer), public.reserve_store_order(jsonb), public.attach_store_checkout(uuid,text,text), public.finish_store_order(uuid,text,text,integer,jsonb,text), public.save_store_message(jsonb) from public, anon, authenticated;
grant execute on function public.take_store_rate_limit(text,integer,integer), public.reserve_store_order(jsonb), public.attach_store_checkout(uuid,text,text), public.finish_store_order(uuid,text,text,integer,jsonb,text), public.save_store_message(jsonb) to service_role;

-- Safe launch: enter real available-to-sell quantities before opening checkout.
insert into public.store_inventory (product_id, size)
select product_id, unnest(sizes) from (values
  ('shell', array['S','M','L','XL']), ('coat', array['46','48','50','52']),
  ('trousers', array['46','48','50','52']), ('knit', array['S','M','L','XL']),
  ('boots', array['40','41','42','43','44']), ('shirt', array['38','40','42','44'])
) as variants(product_id, sizes);
commit;
