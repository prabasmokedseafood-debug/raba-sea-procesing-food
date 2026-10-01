# Supabase setup

Project URL is already configured in `js/config.js`.

Before publishing, replace only `supabaseAnonKey` in `js/config.js` with the Supabase **Publishable key** from Settings → API Keys.

Do not put a Secret key, service_role key, database password, or other privileged credential in this file.

The current website reads product stock from `public.inventory_stock`. Product/order creation remains guarded by the database function and RLS.

Current stock is intentionally 0 until the owner enters actual stock.
