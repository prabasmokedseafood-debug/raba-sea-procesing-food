-- PRABA FISH V37 — schema-exact atomic checkout + tracking + admin RPCs
-- Targets the verified public schema:
-- orders, order_items, product_variants, inventory_stock, order_status_history.
-- Run only against the intended Praba-Fish Supabase project.

create extension if not exists pgcrypto;

create or replace function public.create_praba_order_v3(
  p_order_number text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_customer_note text,
  p_payment_method text,
  p_total numeric,
  p_items jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_tracking text;
  v_created timestamptz;
  v_item jsonb;
  v_variant_id uuid;
  v_sku text;
  v_qty integer;
  v_authoritative_unit numeric;
  v_authoritative_name text;
  v_authoritative_packaging text;
  v_sum numeric := 0;
  v_total_qty integer := 0;
  v_stock integer;
  v_reserved integer;
  v_updated integer;
begin
  if coalesce(trim(p_customer_name), '') = '' then
    raise exception 'Nama pelanggan wajib diisi';
  end if;

  if coalesce(trim(p_customer_phone), '') = '' then
    raise exception 'Nomor WhatsApp wajib diisi';
  end if;

  if coalesce(trim(p_customer_address), '') = '' then
    raise exception 'Alamat wajib diisi';
  end if;

  if p_total is null or p_total < 0 then
    raise exception 'Total pesanan tidak valid';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart kosong';
  end if;

  if exists (
    select 1 from public.orders
    where order_number = trim(p_order_number)
  ) then
    raise exception 'Nomor pesanan sudah digunakan: %', p_order_number;
  end if;

  -- Validate all items and lock their stock rows before creating anything.
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_sku := nullif(trim(v_item->>'variant_sku'), '');
    v_qty := coalesce((v_item->>'qty')::integer, 0);

    if v_sku is null then
      raise exception 'variant_sku wajib dikirim untuk setiap item';
    end if;

    if v_qty <= 0 then
      raise exception 'Jumlah item tidak valid untuk %', v_sku;
    end if;

    select
      pv.id,
      pv.price,
      pv.name::text,
      pv.packaging::text
    into
      v_variant_id,
      v_authoritative_unit,
      v_authoritative_name,
      v_authoritative_packaging
    from public.product_variants pv
    where pv.sku = v_sku
      and coalesce(pv.active, true) = true
    limit 1;

    if v_variant_id is null then
      raise exception 'Varian produk tidak ditemukan atau tidak aktif: %', v_sku;
    end if;

    if v_authoritative_unit is null then
      raise exception 'Harga varian belum tersedia: %', v_sku;
    end if;

    select
      s.quantity,
      coalesce(s.reserved_quantity, 0)
    into
      v_stock,
      v_reserved
    from public.inventory_stock s
    where s.variant_id = v_variant_id
    for update;

    if not found then
      raise exception 'Stok belum tersedia untuk varian: %', v_sku;
    end if;

    if coalesce(v_stock, 0) - coalesce(v_reserved, 0) < v_qty then
      raise exception
        'Stok tidak mencukupi untuk %. Tersedia: %, diminta: %',
        v_sku,
        greatest(0, coalesce(v_stock, 0) - coalesce(v_reserved, 0)),
        v_qty;
    end if;

    v_total_qty := v_total_qty + v_qty;
    v_sum := v_sum + (v_authoritative_unit * v_qty);
  end loop;

  if v_total_qty > 10 then
    raise exception 'Maksimal 10 unit per pesanan';
  end if;

  if abs(v_sum - p_total) > 0.01 then
    raise exception 'Total pesanan tidak cocok dengan harga database';
  end if;

  -- Create the order using the exact verified orders schema.
  v_tracking := encode(extensions.gen_random_bytes(18), 'hex');

  insert into public.orders (
    order_number,
    tracking_token,
    customer_name,
    customer_phone,
    customer_address,
    customer_notes,
    subtotal,
    delivery_fee,
    total,
    payment_status,
    payment_method,
    deposit_required,
    deposit_paid,
    status
  )
  values (
    trim(p_order_number),
    v_tracking,
    trim(p_customer_name),
    trim(p_customer_phone),
    trim(p_customer_address),
    coalesce(p_customer_note, ''),
    p_total,
    0,
    p_total,
    'BELUM DIBAYAR',
    coalesce(nullif(trim(p_payment_method), ''), 'cod'),
    0,
    0,
    'PESANAN BARU'
  )
  returning id, created_at
  into v_order_id, v_created;

  -- Insert order items and decrement stock atomically.
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_sku := trim(v_item->>'variant_sku');
    v_qty := (v_item->>'qty')::integer;

    select
      pv.id,
      pv.price,
      pv.name::text,
      pv.packaging::text
    into
      v_variant_id,
      v_authoritative_unit,
      v_authoritative_name,
      v_authoritative_packaging
    from public.product_variants pv
    where pv.sku = v_sku
      and coalesce(pv.active, true) = true
    limit 1;

    insert into public.order_items (
      order_id,
      variant_id,
      product_name,
      variant_name,
      quantity,
      unit_price,
      subtotal
    )
    values (
      v_order_id,
      v_variant_id,
      coalesce(v_authoritative_name, 'Produk'),
      coalesce(v_authoritative_packaging, ''),
      v_qty,
      v_authoritative_unit,
      v_authoritative_unit * v_qty
    );

    update public.inventory_stock
    set quantity = quantity - v_qty,
        updated_at = now()
    where variant_id = v_variant_id
      and quantity - coalesce(reserved_quantity, 0) >= v_qty;

    get diagnostics v_updated = row_count;

    if v_updated <> 1 then
      raise exception 'Stok berubah saat checkout. Silakan ulangi pesanan.';
    end if;
  end loop;

  if to_regclass('public.order_status_history') is not null then
    insert into public.order_status_history(order_id, status, note)
    values (v_order_id, 'PESANAN BARU', 'Pesanan dibuat melalui checkout website');
  end if;

  return jsonb_build_object(
    'id', v_order_id,
    'order_number', trim(p_order_number),
    'tracking_token', v_tracking,
    'status', 'PESANAN BARU',
    'created_at', coalesce(v_created, now()),
    'total', p_total,
    'items_count', jsonb_array_length(p_items)
  );
end;
$$;

revoke all on function public.create_praba_order_v3(text,text,text,text,text,text,numeric,jsonb) from public;
grant execute on function public.create_praba_order_v3(text,text,text,text,text,text,numeric,jsonb) to anon, authenticated;


create or replace function public.get_praba_order_tracking_v1(
  p_order_number text default null,
  p_tracking_token text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_order_number text;
  v_status text;
  v_created timestamptz;
  v_total numeric;
  v_items jsonb;
begin
  if p_tracking_token is not null and trim(p_tracking_token) <> '' then
    select
      o.id,
      o.order_number,
      o.status,
      o.created_at,
      o.total
    into
      v_id,
      v_order_number,
      v_status,
      v_created,
      v_total
    from public.orders o
    where o.tracking_token = trim(p_tracking_token)
    limit 1;
  elsif p_order_number is not null and trim(p_order_number) <> '' then
    select
      o.id,
      o.order_number,
      o.status,
      o.created_at,
      o.total
    into
      v_id,
      v_order_number,
      v_status,
      v_created,
      v_total
    from public.orders o
    where o.order_number = trim(p_order_number)
    limit 1;
  end if;

  if v_id is null then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'product_name', i.product_name,
        'variant_name', coalesce(i.variant_name, ''),
        'qty', i.quantity,
        'unit_price', i.unit_price,
        'line_total', i.subtotal
      )
      order by i.id
    ),
    '[]'::jsonb
  )
  into v_items
  from public.order_items i
  where i.order_id = v_id;

  return jsonb_build_object(
    'order_number', v_order_number,
    'status', coalesce(v_status, 'PESANAN BARU'),
    'created_at', v_created,
    'total', v_total,
    'items', coalesce(v_items, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_praba_order_tracking_v1(text,text) from public;
grant execute on function public.get_praba_order_tracking_v1(text,text) to anon, authenticated;


create table if not exists public.praba_admin_users (
  email text primary key,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.praba_admin_users enable row level security;

drop policy if exists "deny public admin list" on public.praba_admin_users;
create policy "deny public admin list"
  on public.praba_admin_users
  for select to anon
  using (false);

drop policy if exists "deny authenticated admin list" on public.praba_admin_users;
create policy "deny authenticated admin list"
  on public.praba_admin_users
  for select to authenticated
  using (false);


create or replace function public.is_praba_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.praba_admin_users a
    where lower(a.email) = lower(coalesce(auth.jwt()->>'email', ''))
      and a.active = true
  );
$$;

revoke all on function public.is_praba_admin() from public;
grant execute on function public.is_praba_admin() to anon, authenticated;


create or replace function public.update_praba_order_status_v1(
  p_order_number text,
  p_status text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_status text := upper(trim(p_status));
  v_updated integer;
begin
  if not public.is_praba_admin() then
    raise exception 'Akses admin ditolak';
  end if;

  if v_status not in (
    'PESANAN BARU',
    'MENUNGGU PEMBAYARAN',
    'DIPROSES',
    'DIKEMAS',
    'DIKIRIM',
    'SUDAH TERKIRIM',
    'SELESAI',
    'DIBATALKAN'
  ) then
    raise exception 'Status tidak valid';
  end if;

  select id, order_number
  into v_order_id, v_order_number
  from public.orders
  where order_number = trim(p_order_number)
  for update;

  if v_order_id is null then
    raise exception 'Pesanan tidak ditemukan: %', p_order_number;
  end if;

  update public.orders
  set status = v_status,
      updated_at = now()
  where id = v_order_id;

  get diagnostics v_updated = row_count;

  if v_updated <> 1 then
    raise exception 'Status pesanan gagal diperbarui';
  end if;

  if to_regclass('public.order_status_history') is not null then
    insert into public.order_status_history(order_id, status, note)
    values (v_order_id, v_status, 'Status diperbarui oleh admin');
  end if;

  return jsonb_build_object(
    'order_number', v_order_number,
    'status', v_status
  );
end;
$$;

revoke all on function public.update_praba_order_status_v1(text,text) from public;
grant execute on function public.update_praba_order_status_v1(text,text) to authenticated;


create or replace function public.get_praba_admin_orders_v1()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_praba_admin() then
    raise exception 'Akses admin ditolak';
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'order_number', o.order_number,
          'customer_name', o.customer_name,
          'customer_phone', o.customer_phone,
          'customer_address', o.customer_address,
          'total', o.total,
          'status', o.status,
          'created_at', o.created_at
        )
        order by o.created_at desc
      )
      from public.orders o
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.get_praba_admin_orders_v1() from public;
grant execute on function public.get_praba_admin_orders_v1() to authenticated;


create or replace function public.get_praba_admin_stock_v1()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_praba_admin() then
    raise exception 'Akses admin ditolak';
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'sku', v.sku,
          'name', v.name,
          'packaging', v.packaging,
          'price', v.price,
          'quantity', s.quantity,
          'reserved_quantity', s.reserved_quantity,
          'available', greatest(0, s.quantity - coalesce(s.reserved_quantity, 0))
        )
        order by v.sku
      )
      from public.inventory_stock s
      join public.product_variants v on v.id = s.variant_id
      where coalesce(v.active, true) = true
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.get_praba_admin_stock_v1() from public;
grant execute on function public.get_praba_admin_stock_v1() to authenticated;


create or replace function public.set_praba_stock_v1(
  p_sku text,
  p_quantity integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_variant_id uuid;
  v_reserved integer;
  v_updated integer;
begin
  if not public.is_praba_admin() then
    raise exception 'Akses admin ditolak';
  end if;

  if p_quantity is null or p_quantity < 0 then
    raise exception 'Jumlah stok tidak valid';
  end if;

  select id
  into v_variant_id
  from public.product_variants
  where sku = trim(p_sku)
    and coalesce(active, true) = true
  limit 1;

  if v_variant_id is null then
    raise exception 'SKU tidak ditemukan: %', p_sku;
  end if;

  select reserved_quantity
  into v_reserved
  from public.inventory_stock
  where variant_id = v_variant_id
  for update;

  if not found then
    raise exception 'Baris inventory tidak ditemukan untuk SKU: %', p_sku;
  end if;

  if p_quantity < coalesce(v_reserved, 0) then
    raise exception 'Stok baru tidak boleh lebih kecil dari reserved quantity';
  end if;

  update public.inventory_stock
  set quantity = p_quantity,
      updated_at = now()
  where variant_id = v_variant_id;

  get diagnostics v_updated = row_count;

  if v_updated <> 1 then
    raise exception 'Stok gagal diperbarui';
  end if;

  return jsonb_build_object(
    'sku', trim(p_sku),
    'quantity', p_quantity,
    'reserved_quantity', coalesce(v_reserved, 0),
    'available', p_quantity - coalesce(v_reserved, 0)
  );
end;
$$;

revoke all on function public.set_praba_stock_v1(text,integer) from public;
grant execute on function public.set_praba_stock_v1(text,integer) to authenticated;
