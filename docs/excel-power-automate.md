# Excel Online — sinkronisasi pesanan

## Struktur workbook
Gunakan `excel/praba-fish-orders-template.xlsx` lalu upload ke OneDrive/SharePoint dan ubah sheet `Orders` menjadi Excel Table.

## Kolom utama
`Order No`, `Tracking Token`, `Created At`, `Customer Name`, `WhatsApp`, `Address`, `Product`, `Packaging`, `Qty`, `Unit Price`, `Line Total`, `Total Order`, `Payment`, `Status`, `Shipped At`.

## Flow yang disarankan
1. Trigger: HTTP request diterima melalui Power Automate atau Edge Function.
2. Parse JSON.
3. Cari baris berdasarkan `Order No`.
4. Jika belum ada, `Add a row into a table`.
5. Jika sudah ada, `Update a row`.
6. Ketika status berubah menjadi `SUDAH TERKIRIM`, isi `Shipped At` dengan timestamp event.
7. Opsional: kirim notifikasi WhatsApp/email setelah status berubah.

## Catatan keamanan
Jangan menaruh Power Automate webhook rahasia di frontend. Simpan URL webhook di Supabase Edge Function secret `POWER_AUTOMATE_WEBHOOK`.
