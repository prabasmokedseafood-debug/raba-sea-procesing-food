# Praba Fish — E-commerce V37

## Production flow

`produk.html` → cart → `checkout.html` → Supabase RPC `create_praba_order_v3`.

The database validates the variant, uses the authoritative variant price, validates available stock, inserts the order and line items, and decrements stock in one transaction.

## Tracking

The receipt QR contains a public tracking URL with a random `tracking_token`. Public tracking does not expose customer name, WhatsApp number, or address.

## Admin

`admin.html` uses Supabase Auth. Access is granted only to emails listed in `public.praba_admin_users`.

`scan.html` can read the QR. After admin login, the shipment action can update the order to `SUDAH TERKIRIM`.

## Stock

Live stock comes from `inventory_stock` joined to `product_variants`. The website does not create production stock automatically.

## Excel / Power Automate

Excel synchronization is not considered active until a real Power Automate webhook is configured and tested. Supabase remains the source of truth.
