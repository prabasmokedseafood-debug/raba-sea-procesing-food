# V37 — E-commerce Supabase

## Alur produksi
Produk → Keranjang → Checkout → `create_praba_order_v3` → orders + order_items + inventory_stock → QR token → tracking publik.

## Aturan penting
- Maksimal 10 unit per pesanan.
- Harga total diverifikasi di database berdasarkan payload item.
- Stok diverifikasi dan dikunci sebelum transaksi selesai.
- Jika salah satu item gagal, seluruh transaksi dibatalkan.
- QR menggunakan `tracking_token`, bukan data pelanggan.
- Tracking publik tidak menampilkan nama, WhatsApp, atau alamat pelanggan.
- Admin menggunakan Supabase Auth dan allow-list `praba_admin_users`.
- Admin dapat melihat dan memperbarui stok melalui `get_praba_admin_stock_v1` dan `set_praba_stock_v1`.

## Stok pengujian
Database saat audit terakhir memiliki stok 0 pada varian yang diperiksa. Karena itu checkout yang benar akan menolak pesanan sampai stok diisi oleh admin.
Jangan mengisi stok produksi secara otomatis untuk kebutuhan demo.

Untuk uji end-to-end, isi stok salah satu SKU secara manual di `inventory_stock`, lalu buat satu TEST order dan verifikasi:
1. satu baris `orders`;
2. satu/lebih baris `order_items`;
3. quantity `inventory_stock` berkurang sesuai jumlah;
4. QR membuka `track.html?token=...`;
5. tracking menampilkan status;
6. admin dapat mengubah status menjadi `SUDAH TERKIRIM`.

## Excel
Sinkronisasi Excel/Power Automate belum dianggap aktif sampai webhook resmi dikonfigurasi dan diuji. Database tetap menjadi sumber kebenaran.
