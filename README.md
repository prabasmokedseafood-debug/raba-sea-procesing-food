# Praba Sea Procesing Food — V37

Website statis Praba Sea Procesing Food / Praba Fish berbasis HTML5, CSS3, Vanilla JavaScript, JSON, dan aset visual lokal.

## Menjalankan

1. Buka folder proyek di VS Code.
2. Jalankan `index.html` menggunakan Live Server.
3. Gunakan Live Server agar pemuatan data JSON berjalan konsisten.

## Identitas produksi

- Nama usaha: **Praba Sea Procesing Food**
- Brand/tagline: **Praba Fish**
- Website produksi: `https://prabafish.netlify.app/`
- WhatsApp: `0851 6111 6105`
- Email: `prabasmokedseafood@gmail.com`

## Struktur data

- `data/products.json` — katalog produk
- `data/recipes.json` — 15 resep
- `data/articles.json` — artikel blog
- `data/references.json` — referensi publik
- `data/industry-data.json` — data aktivitas wilayah
- `data/translations.json` — ID / English / 中文

## Sistem sumber

Folder `sources/` adalah registri internal. Pertahankan Source ID ketika menambah atau mengubah data.

Foto/visual AI tidak boleh dipresentasikan sebagai dokumentasi aktual fasilitas atau produk Praba.

## SEO produksi

V37 menggunakan:

- canonical URL per halaman
- Open Graph metadata
- Twitter Card metadata
- sitemap produksi
- robots.txt produksi
- structured data LocalBusiness pada beranda
- metadata tema browser

## Performa & Netlify

- Banner dan logo berat dikonversi ke WebP.
- Gambar konten menggunakan lazy loading dan asynchronous decoding.
- `_headers` berisi header dasar keamanan dan cache.
- Website dapat diperbarui dengan Netlify Drop menggunakan folder proyek V37 yang berisi `index.html`.

Netlify menerbitkan deploy produksi secara atomik; versi baru menggantikan versi produksi setelah seluruh file selesai diunggah.

## Validasi

```bash
node --check js/script.js
node --check js/language.js
node --check js/recipe.js
node --check js/fifo.js
node --check js/data-loader.js
node js/validate-data.js
```

Validasi V37 mencakup JSON, Source ID, path lokal, metadata SEO, JavaScript, aset lokal, checkout Supabase, tracking, QR, dan admin flow.

## Catatan legalitas

Praba Sea Procesing Food belum dinyatakan memiliki sertifikasi ISO 9001 maupun ISO 14001. Kedua standar digunakan sebagai referensi pengembangan sistem, bukan sebagai klaim sertifikasi.


## V37 Supabase E-commerce

Checkout produksi menggunakan Supabase sebagai sumber kebenaran. Stok divalidasi di database, transaksi checkout bersifat atomik, tracking publik menggunakan token, dan admin menggunakan Supabase Auth.

Lihat `docs/ecommerce-v37.md` dan `supabase/README.md`.

Halaman Produk menggunakan pemesanan langsung dengan pilihan ukuran, jumlah, kemasan, kalkulasi harga otomatis, dan batas maksimum 10 unit total per pesanan.
