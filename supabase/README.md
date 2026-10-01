# Praba Fish — Supabase V37

## Sumber kebenaran
Database Supabase adalah sumber kebenaran untuk pesanan, item pesanan, stok, status, dan tracking.

## SQL utama
Jalankan hanya:

`create-order-v3.sql`

Fungsi utama:
- `create_praba_order_v3` — checkout atomik: orders + order_items + pengurangan inventory dalam satu transaksi.
- `get_praba_order_tracking_v1` — tracking publik tanpa menampilkan nama/telepon/alamat pelanggan.
- `get_praba_admin_orders_v1` — daftar pesanan untuk admin terautentikasi.
- `update_praba_order_status_v1` — perubahan status oleh admin.

## Admin
1. Buat pengguna admin di Supabase Auth.
2. Masukkan email tersebut ke `public.praba_admin_users` menggunakan SQL yang tersedia di akhir `create-order-v3.sql`.
3. Login melalui `admin.html`.

Jangan menaruh secret/service-role key di frontend.

## Stok
Stok dibaca dari `inventory_stock` dan varian dari `product_variants`.
Checkout akan ditolak jika stok tidak mencukupi. Tidak ada stok yang dibuat otomatis.

## SQL legacy
Folder `legacy/` hanya untuk arsip. Jangan menjalankan file di dalamnya pada database produksi.
