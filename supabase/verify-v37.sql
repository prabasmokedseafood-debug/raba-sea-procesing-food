-- Read-only verification for Praba Fish V37.
-- Safe to run before and after deploying.

select table_name, column_name, data_type
from information_schema.columns
where table_schema='public'
  and table_name in ('orders','order_items','product_variants','inventory_stock','order_status_history')
order by table_name, ordinal_position;

select sku, name, packaging, price, active
from public.product_variants
order by sku;

select v.sku, s.quantity, s.reserved_quantity,
       greatest(0, s.quantity - coalesce(s.reserved_quantity,0)) as available
from public.inventory_stock s
join public.product_variants v on v.id=s.variant_id
order by v.sku;

select count(*) as jumlah_pesanan,
       max(order_number) as pesanan_terakhir
from public.orders;

select count(*) as jumlah_item_pesanan
from public.order_items;

-- TEST ONLY — do not run automatically.
-- Set a real test quantity through admin.html, or manually update inventory_stock
-- after confirming the SKU and the intended quantity.
