create extension if not exists pgcrypto;

create table if not exists public.products_stock (
  product_id text primary key,
  stock integer not null default 0 check (stock >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique not null,
  tracking_token text unique not null default encode(gen_random_bytes(18),'hex'),
  customer_name text not null,
  customer_phone text not null,
  customer_address text not null,
  customer_note text,
  payment_method text not null default 'cod',
  total numeric(14,2) not null default 0,
  status text not null default 'PESANAN BARU',
  created_at timestamptz not null default now(),
  shipped_at timestamptz
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  packaging text not null,
  qty integer not null check(qty > 0),
  unit_price numeric(14,2) not null,
  line_total numeric(14,2) not null
);

alter table public.products_stock enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "public read stock" on public.products_stock for select using (true);

create or replace function public.create_praba_order(
  p_order_no text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_customer_note text,
  p_payment_method text,
  p_total numeric,
  p_items jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_order_id uuid;
  v_token text;
  v jsonb;
  v_stock integer;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)=0 then
    raise exception 'Cart kosong';
  end if;

  for v in select * from jsonb_array_elements(p_items) loop
    select stock into v_stock from products_stock where product_id=v->>'product_id' for update;
    if v_stock is null then raise exception 'Produk belum memiliki stok: %', v->>'product_id'; end if;
    if v_stock < (v->>'qty')::integer then raise exception 'Stok tidak mencukupi untuk %', v->>'product_id'; end if;
  end loop;

  insert into orders(order_no,customer_name,customer_phone,customer_address,customer_note,payment_method,total)
  values(p_order_no,p_customer_name,p_customer_phone,p_customer_address,p_customer_note,p_payment_method,p_total)
  returning id,tracking_token into v_order_id,v_token;

  for v in select * from jsonb_array_elements(p_items) loop
    insert into order_items(order_id,product_id,product_name,packaging,qty,unit_price,line_total)
    values(v_order_id,v->>'product_id',v->>'product_name',v->>'packaging',(v->>'qty')::integer,(v->>'unit_price')::numeric,(v->>'line_total')::numeric);
    update products_stock set stock=stock-(v->>'qty')::integer,updated_at=now() where product_id=v->>'product_id';
  end loop;

  return jsonb_build_object('id',v_order_id,'order_no',p_order_no,'tracking_token',v_token);
end $$;

-- Public tracking: expose only the minimum data needed by a tracking token.
create or replace view public.order_tracking as
select o.order_no,o.tracking_token,o.customer_name,o.customer_phone,o.customer_address,o.total,o.status,o.created_at,o.shipped_at,
       coalesce(jsonb_agg(jsonb_build_object('product_name',i.product_name,'packaging',i.packaging,'qty',i.qty,'unit_price',i.unit_price,'line_total',i.line_total)) filter (where i.id is not null),'[]'::jsonb) items
from orders o left join order_items i on i.order_id=o.id
group by o.id;

grant select on public.order_tracking to anon, authenticated;
grant execute on function public.create_praba_order(text,text,text,text,text,text,numeric,jsonb) to anon, authenticated;

-- Production admin: enable Supabase Auth and replace broad authenticated policies
-- with an allow-list/role check before exposing the admin page publicly.
create policy "authenticated read orders" on public.orders for select to authenticated using (true);
create policy "authenticated read order items" on public.order_items for select to authenticated using (true);
create policy "authenticated update orders" on public.orders for update to authenticated using (true) with check (true);
