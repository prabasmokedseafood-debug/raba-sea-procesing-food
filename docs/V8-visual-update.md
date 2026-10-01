# V8 — Visual Upgrade Halaman Tentang Kami

V8 mempertahankan arsitektur JSON + i18n + Source Registry dari V7 dan memusatkan peningkatan pada presentasi visual halaman `tentang.html`.

## Perubahan
- Hero editorial dengan metrik konteks Juwana.
- Showcase Juwana/Pati dengan hierarki visual baru.
- Data industri dalam kartu statistik yang lebih kuat.
- Diagram sistem mutu 4 unsur dan alur BAHAN BAKU → PROSES → KEAMANAN → PENYIMPANAN → DISTRIBUSI → KONSUMEN.
- Feature panel bahan baku dan pengasapan dengan gambar AI yang diberi keterangan.
- Kartu referensi ISO 9001 dan ISO 14001 dengan status BELUM BERSERTIFIKAT.
- Modul edukasi mutu ikan dengan 5 aspek pemeriksaan.
- Perbandingan 8 ilustrasi edukasi; tidak menggunakan label aman/berbahaya berdasarkan gambar.
- Modul risiko keamanan pangan biologis, kimia, dan fisik.
- Diagram rantai dingin dan catatan suhu sebagai referensi KKP, bukan prosedur internal Praba.
- Diagram FIFO dan catatan FEFO.
- Panel komitmen dan referensi sumber.
- Semua konten baru yang relevan tetap memakai `data-i18n` dan tersedia dalam Indonesia, English, dan Simplified Chinese.

## Catatan visual
Visual perbandingan mutu dibuat sebagai ilustrasi edukasi berbasis CSS, bukan foto ikan aktual. Foto yang sudah tersedia dan tercatat sebagai AI tetap diberi caption AI-generated sesuai Source Registry.

## Validasi
- 101 kunci `data-i18n` pada halaman Tentang Kami; tidak ada kunci terjemahan yang hilang.
- HTML tag-balance check lulus untuk section/div/article/figure/a/p.
- JavaScript syntax check lulus untuk language.js, data-loader.js, dan script.js.
- Source ID yang dipakai halaman mengacu pada Source Registry.
