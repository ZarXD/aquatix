# AquaTix

Aplikasi pemesanan tiket kolam renang keluarga, dibangun dengan **React Native + Expo (SDK 51)** dan **Supabase** (Auth + PostgreSQL). Seluruh alur berfungsi: katalog dari database, keranjang, checkout atomik lewat RPC, riwayat pesanan, panel admin, promo, dan laporan penjualan.

Dibuat untuk memenuhi tujuh persyaratan UAS Mobile Programming: landing page, katalog layanan, keranjang, sistem login, manajemen produk/pelanggan, promo/pengumuman, dan dashboard laporan.

---

## 1. Ringkasan fitur

**Pelanggan**
- Beranda: sapaan, banner promo, ringkasan harga tiket, promo aktif, pengumuman, jam operasional, fasilitas.
- Katalog dengan filter kategori, pencarian, indikator stok, dan tambah ke keranjang.
- Keranjang: ubah jumlah, hapus item, pilih tanggal kunjungan, kode promo, subtotal/diskon/total, checkout dengan konfirmasi.
- Halaman sukses berisi kode booking, daftar tiket, total, status, dan instruksi pembayaran.
- Riwayat pesanan per akun, detail pesanan, pembatalan pesanan `pending`.
- Registrasi, login, logout, sesi persisten (AsyncStorage), profil.

**Admin**
- Dashboard: total transaksi, pendapatan (tanpa pesanan `cancelled`), tiket terjual, jumlah pelanggan, pesanan pending, produk terlaris, ringkasan harian, filter periode.
- Produk: tambah, ubah nama/deskripsi/harga/kategori, aktif/nonaktif, hapus (ditolak bila sudah dipakai transaksi).
- Pesanan: daftar, filter status/tanggal, detail, ubah status sesuai alur bisnis.
- Promo: kode, diskon nominal/persentase, minimum belanja, periode berlaku, aktif/nonaktif.
- Pengumuman: tambah, ubah, aktif/nonaktif.

**Keamanan**
- RLS aktif pada semua tabel; peran dibaca dari `profiles.role` di database, bukan dari state lokal.
- Harga, diskon, dan total dihitung ulang di server di dalam `create_order`; nilai dari client tidak dipercaya.
- Tidak ada RPC publik untuk menaikkan peran. Tidak ada service_role key di aplikasi.

---

## 2. Struktur proyek

```
App.js                      Entry point: shell, routing berbasis state, tab per peran
app.json                    Konfigurasi Expo (SDK 51)
src/config.js               URL + anon key Supabase. Satu-satunya file yang wajib diedit
src/theme.js                Token warna, spasi, radius, tipografi
src/lib/supabase.js         Klien Supabase (AsyncStorage, refresh token)
src/lib/api.js              Seluruh akses data: auth, products, orders, admin, RPC checkout
src/lib/demoStore.js        Data dan sesi Mode Demo (in-memory)
src/lib/catalog.js          Ilustrasi/kategori bawaan
src/lib/format.js           Rupiah, tanggal, kode booking
src/state/AppContext.js     Reducer global, sesi, keranjang, derivasi total
src/components/ui.js        Button, Card, Badge, Field, EmptyState, dll.
src/components/Screen.js    Kerangka layar + area aman + jarak tab bar
src/components/TabBar.js    Navigasi bawah buatan sendiri
src/components/ProductCard.js
src/screens/                Home, Catalog, Cart, Auth, Orders, Profile, BookingSuccess
src/screens/admin/          AdminDashboard, AdminProducts, AdminOrders, AdminPromos
sql/01_schema.sql           Tabel, constraint, index, trigger
sql/02_policies.sql         Row Level Security
sql/03_functions.sql        create_order (atomik), is_admin, trigger penjaga peran
sql/04_seed.sql             Produk, promo, pengumuman, petunjuk bootstrap admin
```

---

## 3. Menjalankan di Expo Snack

1. Buka https://snack.expo.dev dan pilih **blank** (JavaScript).
2. Ganti isi `App.js` dengan isi `App.js` proyek ini.
3. Buat file lain sesuai struktur di atas (`src/...`, `package.json` diabaikan Snack karena dependensi diatur di panel *Dependencies*).
4. Tambahkan dependensi berikut di panel **Dependencies**:
   - `@supabase/supabase-js` → `2.45.4`
   - `@react-native-async-storage/async-storage` → `1.23.1`
   - `react-native-url-polyfill` → `2.0.0`
5. Unggah folder `src/` ke Snack (menu *Add file* per folder), atau salin isi tiap file.
6. Jalankan di **Expo Go**. Tanpa konfigurasi Supabase, aplikasi otomatis masuk **Mode Demo**.

> Snack tidak membaca `package.json` proyek lokal; pastikan versi dependensi di panel Dependencies sama dengan yang tertulis di atas.

---

## 4. Menjalankan secara lokal (opsional)

```bash
npm install
npx expo start
```

Pindai QR dengan Expo Go. `npm start` juga bisa dipakai bila skrip tersedia.

---

## 5. Konfigurasi Supabase

1. Buat project di https://supabase.com.
2. Buka **Settings → API**.
3. Salin **Project URL** dan **anon/publishable key**.
4. Buka `src/config.js` dan ganti:

```js
export const SUPABASE_URL = 'https://xxxxxxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOi...'; // anon key, BUKAN service_role
```

5. Simpan lalu muat ulang aplikasi. Badge **Mode Demo** hilang bila konfigurasi valid.

`isSupabaseConfigured()` memeriksa bentuk URL dan panjang key, sehingga nilai setengah jadi tidak menghasilkan error jaringan yang membingungkan.

### Menjalankan SQL

Buka **SQL Editor** di Supabase, lalu jalankan berurutan:

| Urutan | File | Isi |
|---|---|---|
| 1 | `sql/01_schema.sql` | Tabel `profiles`, `products`, `orders`, `order_items`, `promotions`, `announcements`, constraint, index, trigger, fungsi `is_admin` |
| 2 | `sql/02_policies.sql` | Semua kebijakan RLS |
| 3 | `sql/03_functions.sql` | RPC `create_order` dan trigger penjaga peran |
| 4 | `sql/04_seed.sql` | Produk contoh, promo, pengumuman (idempoten) |

Harga seed: Tiket Dewasa Rp25.000, Tiket Anak-anak Rp15.000, Paket Keluarga Rp70.000, Sewa Ban Rp10.000, Sewa Loker Rp5.000. Semua dapat diubah admin.

---

## 6. Bootstrap admin (aman)

Peran selalu `customer` saat registrasi. Tidak ada tombol di aplikasi untuk menjadi admin.

1. Daftar satu akun lewat halaman **Registrasi** aplikasi (atau **Authentication → Users** di Supabase). Baris `profiles` dibuat otomatis oleh trigger.
2. Buka **SQL Editor**, lalu jalankan:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'email-admin-anda@contoh.com');
```

3. Verifikasi:

```sql
select p.id, p.full_name, p.role, u.email
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'admin';
```

4. Logout lalu login kembali di aplikasi. Tab admin muncul berdasarkan hasil pembacaan `profiles.role`.

Trigger `guard_profile_role` menolak perubahan peran dari sesi pengguna, sehingga langkah di atas hanya berhasil dari SQL Editor.

Jika **email confirmation** aktif di Supabase, akun baru harus dikonfirmasi sebelum login. Aplikasi menampilkan pesan yang sesuai.

---

## 7. Mode Demo

Aktif selama `src/config.js` masih berisi placeholder.

- Data produk, promo, pengumuman, dan pesanan berasal dari memori perangkat.
- Checkout berhasil di layar tetapi **tidak tersimpan ke server**; aplikasi menyatakan hal ini secara eksplisit.
- Data hilang saat aplikasi dimuat ulang.

Akun demo:

| Peran | Email | Password |
|---|---|---|
| Customer | `demo@aquatix.test` | `demo123` |
| Admin | `admin@aquatix.test` | `admin123` |

---

## 8. Alur pengujian manual

1. Buka aplikasi tanpa login: beranda dan katalog tetap dapat dilihat, badge Mode Demo tampil (bila belum dikonfigurasi).
2. Tambah dua produk berbeda ke keranjang; ubah jumlah dan hapus satu item.
3. Pilih tanggal kunjungan; coba checkout tanpa login → diarahkan ke halaman login.
4. Login sebagai customer, terapkan kode promo, periksa subtotal/diskon/total.
5. Checkout → halaman sukses menampilkan kode booking unik, daftar tiket, total, status `pending`.
6. Buka **Pesanan**: pesanan baru muncul; buka detail; batalkan pesanan `pending`.
7. Logout, login sebagai admin: dashboard menampilkan metrik; ubah status pesanan menjadi `confirmed` lalu `completed`.
8. Di panel produk: ubah harga, nonaktifkan produk → produk hilang dari katalog customer.
9. Tambah promo diskon persentase dengan minimum belanja; uji bahwa total tidak pernah negatif.
10. Tambah pengumuman → tampil di beranda.
11. Periksa bahwa akun customer tidak melihat tab admin dan tidak dapat membaca pesanan pengguna lain.
12. Uji layar kecil (±320 dp): tidak ada teks terpotong, tombol tetap ≥44 px.

---

## 9. Catatan keamanan

- Gunakan hanya **anon/publishable key**. `service_role` tidak boleh masuk ke aplikasi client.
- Semua tabel memakai RLS; customer hanya membaca/menulis datanya sendiri.
- `create_order` memvalidasi sesi, membaca ulang harga produk, memeriksa produk aktif, menghitung diskon dan total di server, lalu menyimpan order + item dalam satu transaksi.
- Client tidak dapat mengubah `subtotal`, `total_amount`, `status`, atau `payment_status` pesanan secara langsung.
- Peran admin tidak dapat diperoleh dengan memanipulasi state aplikasi.

---

## 10. Keterbatasan

- Pembayaran hanya simulasi; tidak ada gateway uang sungguhan dan tidak ada data kartu.
- Gambar produk memakai ilustrasi bawaan; belum ada unggah gambar dari panel admin.
- Mode Demo menyimpan data di memori, sehingga hilang saat reload.
- Laporan dihitung dari pesanan yang dapat dibaca sesuai RLS, bukan dari tabel agregat terjadwal.
- Belum ada notifikasi push atau email transaksional di luar email bawaan Supabase.
- Aplikasi diuji dengan parser dan pemeriksaan statis; pengujian pada perangkat fisik/Snack perlu dilakukan ulang di lingkungan Anda.
