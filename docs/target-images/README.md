# Withheld target images

Folder ini menyimpan referensi visual yang dipakai untuk membangun halaman, bukan bukti
tentang perilaku halaman. Tidak ada satu pun berkas di sini yang membuktikan hosting,
invocation oleh model, fairness marking, atau validasi pengguna. Semua itu punya
evidence-nya sendiri di `docs/evidence/` dan `docs/PROGRESS.md`.

## Isi folder

| File | Ukuran | Perannya |
| --- | ---: | --- |
| `withheld.png` | 1710 × 3531 | halaman sebelum redesign, ditangkap penuh (karena itu bar bawah muncul dua kali: sticky element ikut tercetak di tengah dokumen) |
| `withheld-v2-monochrome-generated.png` | 1487 × 1058 | monokrom generasi pertama; ditinggalkan, disimpan sebagai jejak |
| `withheld-v3-monochrome-refined.png` | 1487 × 1058 | **target yang berlaku**; halaman sekarang dibangun ke gambar ini |

## Kontrak visual v3

- **Monokrom sepenuhnya.** Tidak ada hue. Enam belas token warna, semuanya abu-abu, dan
  `tests/contrast.test.mts` menolak hex, `rgb()`, atau `color-mix()` di luar `:root`.
- **Kapital berarti bisa ditekan.** Huruf besar dipakai untuk kontrol yang bisa ditekan
  seseorang; sentence case berarti ini sebuah keadaan, bukan tombol. Satu pengecualian
  sengaja dibiarkan: pager, karena ia hanya memindahkan halaman daftar.
- **Tiga kolom** yang terukur `322px 761px 357px` pada 1440px, satu bar di atas, satu band
  di bawahnya, dan satu bar sticky di kaki halaman.
- **Angka proporsional lewat kelas, bukan `style`.** CSP produksi tidak mengizinkan inline
  style, jadi setiap panjang bar datang sebagai satu dari 21 kelas `bars__fill--N`.

## Membandingkannya dengan halaman

Frame pembanding yang sah hanya satu: `docs/evidence/browser-fold-1487.png`, diambil pada
1487 × 1058 dengan `captureBeyondViewport: false`. Tangkapan full-page tidak bisa
dibandingkan dengan mockup karena bar sticky di kaki halaman akan tercetak di tengah
dokumen — lihat `withheld.png` di tabel atas untuk contoh persisnya.

## Penyimpangan yang disengaja

Halaman **tidak** identik dengan v3, dan sebelas selisihnya dicatat sebagai `docs/DECISIONS.md`
**D-27** — antara lain: angka pada band adalah hitungan sesi yang hidup (`14 / 0 / 0 / 0`)
sementara gambar menggambar `14 / 0 / 1 / 0`, sebuah keadaan yang tidak mungkin dicapai karena
hold diturunkan dari mark; daftar tool berisi sepuluh baris, bukan tujuh; dan tombol rilis
kedua di bar atas tetap berupa anchor, karena hanya satu kontrol di halaman ini yang
mengirim mark.

Target sebelum ini adalah dua SVG berpalet biru/amber (1440 × 900 dan 390 × 844). Keduanya
sudah tidak ada di folder ini; penyimpangan halaman dari target lama itu tercatat sebagai
**D-21**.
