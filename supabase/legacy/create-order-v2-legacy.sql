-- Praba Fish: order insertion bridge for the existing public.orders table.
-- Run this once in Supabase SQL Editor.
-- This function is intentionally limited to creating an order record.
-- Stock/order_items integration can be added after the first successful order test.

create or replace function public.create_praba_order_v2(
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
  v_id uuid;
  v_tracking text;
  v_created timestamptz;
  v_status text;
  v_order_number text;
  v_cols text[] := array[]::text[];
  v_vals text[] := array[]::text[];
  v_sql text;
  v_has_order_number boolean;
  v_has_order_no boolean;
  v_has_tracking boolean;
  v_has_customer_name boolean;
  v_has_customer_phone boolean;
  v_has_customer_address boolean;
  v_has_customer_note boolean;
  v_has_payment boolean;
  v_has_total boolean;
  v_has_status boolean;
  v_has_created boolean;
  v_has_id boolean;
begin
  if coalesce(trim(p_customer_name),'') = '' then raise exception 'Nama pelanggan wajib diisi'; end if;
  if coalesce(trim(p_customer_phone),'') = '' then raise exception 'Nomor WhatsApp wajib diisi'; end if;
  if coalesce(trim(p_customer_address),'') = '' then raise exception 'Alamat wajib diisi'; end if;
  if p_total is null or p_total < 0 then raise exception 'Total pesanan tidak valid'; end if;

  select exists(select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='order_number') into v_has_order_number;
  select exists(select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='order_no') into v_has_order_no;
  select exists(select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='tracking_token') into v_has_tracking;
  select exists(select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='customer_name') into v_has_customer_name;
  select exists(select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='customer_phone') into v_has_customer_phone;
  select exists(select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='customer_address') into v_has_customer_address;
  select exists(select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='customer_note') into v_has_customer_note;
  select exists(select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='payment_method') into v_has_payment;
  select exists(select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='total') into v_has_total;
  select exists(select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='status') into v_has_status;
  select exists(select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='created_at') into v_has_created;
  select exists(select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='id') into v_has_id;

  if not v_has_order_number and not v_has_order_no then raise exception 'Tabel orders tidak memiliki order_number/order_no'; end if;
  if not v_has_customer_name or not v_has_customer_phone or not v_has_customer_address then raise exception 'Kolom pelanggan pada orders belum lengkap'; end if;

  if v_has_id then v_cols := array_append(v_cols,'id'); v_vals := array_append(v_vals,'gen_random_uuid()'); end if;
  if v_has_order_number then v_cols := array_append(v_cols,'order_number'); v_vals := array_append(v_vals,format('%L',p_order_number)); end if;
  if v_has_order_no then v_cols := array_append(v_cols,'order_no'); v_vals := array_append(v_vals,format('%L',p_order_number)); end if;
  if v_has_tracking then v_cols := array_append(v_cols,'tracking_token'); v_vals := array_append(v_vals,'encode(gen_random_bytes(18),''hex'')'); end if;
  if v_has_customer_name then v_cols := array_append(v_cols,'customer_name'); v_vals := array_append(v_vals,format('%L',p_customer_name)); end if;
  if v_has_customer_phone then v_cols := array_append(v_cols,'customer_phone'); v_vals := array_append(v_vals,format('%L',p_customer_phone)); end if;
  if v_has_customer_address then v_cols := array_append(v_cols,'customer_address'); v_vals := array_append(v_vals,format('%L',p_customer_address)); end if;
  if v_has_customer_note then v_cols := array_append(v_cols,'customer_note'); v_vals := array_append(v_vals,format('%L',coalesce(p_customer_note,''))); end if;
  if v_has_payment then v_cols := array_append(v_cols,'payment_method'); v_vals := array_append(v_vals,format('%L',coalesce(p_payment_method,'cod'))); end if;
  if v_has_total then v_cols := array_append(v_cols,'total'); v_vals := array_append(v_vals,p_total::text); end if;
  if v_has_status then v_cols := array_append(v_cols,'status'); v_vals := array_append(v_vals,quote_literal('PESANAN BARU')); end if;

  v_sql := format('insert into public.orders(%s) values(%s) returning %s',array_to_string(v_cols,','),array_to_string(v_vals,','),case when v_has_id then 'id' else 'null::uuid' end);
  execute v_sql into v_id;

  v_order_number := p_order_number;
  if v_has_tracking then
    execute format('select tracking_token from public.orders where %I=$1 limit 1',case when v_has_order_number then 'order_number' else 'order_no' end) using p_order_number into v_tracking;
  end if;
  if v_has_status then v_status := 'PESANAN BARU'; end if;
  if v_has_created then
    execute format('select created_at from public.orders where %I=$1 limit 1',case when v_has_order_number then 'order_number' else 'order_no' end) using p_order_number into v_created;
  end if;

  return jsonb_build_object('id',v_id,'order_number',v_order_number,'tracking_token',v_tracking,'status',coalesce(v_status,'PESANAN BARU'),'created_at',coalesce(v_created,now()));
end;
$$;

grant execute on function public.create_praba_order_v2(text,text,text,text,text,text,numeric,jsonb) to anon, authenticated;
