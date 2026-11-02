# PROJECT: AquaTix --- Aplikasi Pemesanan Tiket Kolam Renang Berbasis React Native Expo + Supabase

## 1. PERAN DAN TUJUAN

Bertindak sebagai senior React Native developer yang berpengalaman
menggunakan Expo Snack dan Supabase.

Bangun aplikasi mobile bernama **AquaTix**, yaitu aplikasi pemesanan
tiket kolam renang untuk tempat wisata keluarga di Indonesia.

Aplikasi harus memenuhi 7 persyaratan tugas UAS Mobile Programming
Framework:

1.  Landing Page / Halaman Utama.
2.  Katalog / Daftar Layanan.
3.  Keranjang Belanja / Input Layanan.
4.  Sistem Login.
5.  Manajemen Produk/Layanan dan Pelanggan.
6.  Promo / Pemasaran / Pengumuman.
7.  Dashboard / Laporan Bisnis / Laporan Pelayanan.

**Prioritas utama:** - Aplikasi harus kompatibel dengan Expo Snack dan
Expo Go. - Source code harus bisa dijalankan langsung melalui
https://snack.expo.dev. - Backend menggunakan Supabase. - Gunakan React
Native, bukan React DOM, Next.js, atau Vite. - Jangan menggunakan
package native yang membutuhkan development build atau konfigurasi
Android/iOS khusus. - Jangan hanya membuat mockup UI. Buat alur aplikasi
yang benar-benar berfungsi. - Jangan berhenti setelah membuat rencana.
Implementasikan seluruh aplikasi dan berikan source code lengkap.

## 2. TEKNOLOGI

Gunakan: - React Native. - Expo Snack. - JavaScript dengan functional
components. - React Hooks: useState, useEffect, useMemo. -
@supabase/supabase-js versi yang kompatibel dengan Expo Snack. -
@react-native-async-storage/async-storage untuk penyimpanan sesi jika
diperlukan. - @react-native-picker/picker hanya jika kompatibel dengan
Snack; jika tidak, gunakan komponen pilihan buatan sendiri. - React
Native core components: View, Text, ScrollView, TextInput, Pressable,
Image, Modal, ActivityIndicator, Alert. - StyleSheet untuk styling. -
Supabase Auth untuk autentikasi. - Supabase PostgreSQL untuk database.

Hindari: - NativeWind atau Tailwind yang membutuhkan konfigurasi
tambahan. - Expo Router jika menyebabkan kesulitan menjalankan aplikasi
di Snack. - React Navigation jika navigasi sederhana dengan state sudah
cukup. - Firebase. - Backend Node.js terpisah. - File system lokal,
dotenv yang membutuhkan bundler khusus, atau konfigurasi native. -
Package yang tidak kompatibel dengan Expo Snack.

Gunakan navigasi berbasis state dengan tab bar buatan sendiri agar mudah
dijalankan di Snack.

## 3. DESAIN UI/UX

Buat desain mobile-first yang modern, profesional, bersih, dan
responsif.

Identitas visual: - Nama aplikasi: AquaTix. - Tema wisata kolam renang
tropis. - Warna utama: biru laut. - Warna sekunder: turquoise. -
Background putih atau abu-abu sangat muda. - Card dengan sudut
membulat. - Spacing konsisten. - Typography jelas. - Tombol besar dan
mudah ditekan. - Tampilan optimal pada layar smartphone. - Gunakan emoji
atau ilustrasi sederhana sebagai fallback jika gambar eksternal gagal
dimuat.

Buat status loading, empty state, success state, dan error state.

Jangan membuat layout desktop sebagai prioritas. Pastikan konten dapat
di-scroll dan tidak terpotong oleh status bar atau navigation bar.

## 4. FITUR PELANGGAN

### A. Landing Page

Tampilkan: - Header AquaTix. - Sapaan pelanggan. - Banner promosi kolam
renang. - Tombol "Pesan Tiket". - Ringkasan harga tiket. - Promo yang
sedang aktif. - Jam operasional dan informasi fasilitas. - Kategori
tiket populer. - Navigasi bawah: Beranda, Tiket, Pesanan, Profil.

Pengunjung yang belum login tetap dapat melihat halaman utama dan
katalog.

### B. Katalog Tiket dan Layanan

Sediakan katalog yang datanya dibaca dari Supabase.

Kategori awal: - Tiket Dewasa. - Tiket Anak-anak. - Paket Keluarga. -
Sewa Ban. - Sewa Loker.

Setiap item menampilkan: - Nama produk. - Deskripsi. - Harga dalam
format Rupiah. - Kategori. - Gambar atau ilustrasi. - Status
ketersediaan. - Tombol tambah ke keranjang.

Gunakan data seed awal dengan harga dummy: - Tiket Dewasa: Rp25.000. -
Tiket Anak-anak: Rp15.000. - Paket Keluarga: Rp70.000. - Sewa Ban:
Rp10.000. - Sewa Loker: Rp5.000.

Harga tersebut adalah data contoh dan harus dapat diubah admin.

### C. Keranjang Belanja

Implementasikan: - Tambah item. - Kurangi jumlah item. - Hapus item. -
Ringkasan pesanan. - Pemilihan tanggal kunjungan. - Validasi jumlah
tiket. - Perhitungan subtotal. - Penerapan kode promo jika tersedia. -
Total akhir. - Tombol checkout. - Konfirmasi sebelum transaksi disimpan.

Checkout harus menyimpan pesanan ke Supabase, bukan sekadar menampilkan
notifikasi sukses.

Gunakan status transaksi: - pending. - confirmed. - cancelled. -
completed.

Untuk pembayaran, gunakan simulasi pembayaran tanpa mengumpulkan data
kartu atau mengklaim transaksi uang sungguhan. Tampilkan instruksi bahwa
pembayaran dilakukan di lokasi jika metode yang dipilih adalah
pembayaran di tempat.

Setelah checkout berhasil, buat kode booking unik dan tampilkan: - Kode
booking. - Nama pemesan. - Tanggal kunjungan. - Daftar tiket. - Jumlah
item. - Total pembayaran. - Status pesanan.

Sediakan halaman riwayat pesanan.

### D. Sistem Login dan Registrasi

Gunakan Supabase Auth.

Fitur: - Registrasi menggunakan nama, email, dan password. - Login email
dan password. - Logout. - Status sesi persisten. - Validasi input. -
Pesan error yang mudah dipahami. - Profil pelanggan. - Riwayat pesanan
berdasarkan akun yang login.

Jangan menyimpan password secara manual di tabel profil.

Jika email confirmation Supabase aktif, tangani status verifikasi dengan
pesan yang sesuai.

Sediakan mode guest untuk menjelajahi katalog. Wajib login sebelum
melakukan checkout.

## 5. FITUR ADMIN

Buat dua peran: - customer. - admin.

Role harus disimpan di database dan diverifikasi melalui Supabase, bukan
hanya melalui state lokal atau pilihan yang bisa diubah pengguna.

Akun yang baru registrasi secara default menjadi customer.

Jangan pernah memberikan akses admin melalui tombol "Jadikan Admin" di
aplikasi publik.

### A. Manajemen Produk/Layanan

Admin dapat: - Melihat daftar produk. - Menambahkan produk. - Mengedit
nama produk. - Mengedit deskripsi. - Mengubah harga. - Mengubah
kategori. - Mengaktifkan atau menonaktifkan produk. - Menghapus produk
jika tidak memiliki ketergantungan transaksi yang melarang penghapusan.

Validasi harga harus berupa angka nonnegatif.

### B. Manajemen Pelanggan dan Pesanan

Admin dapat: - Melihat daftar pelanggan yang relevan. - Melihat daftar
pesanan. - Melihat detail pesanan. - Memfilter pesanan berdasarkan
tanggal atau status. - Mengubah status pesanan sesuai alur bisnis. -
Melihat kode booking dan total pembayaran.

Jangan mengekspos password, token autentikasi, atau data sensitif
pelanggan.

### C. Promo dan Pengumuman

Admin dapat: - Menambah promo. - Mengedit promo. - Mengaktifkan atau
menonaktifkan promo. - Menentukan kode promo. - Menentukan diskon
nominal atau persentase. - Menentukan periode promo. - Menentukan
pengumuman yang ditampilkan di halaman utama.

Validasi masa berlaku promo dan batas diskon. Diskon tidak boleh membuat
total transaksi negatif.

### D. Dashboard dan Laporan

Tampilkan metrik: - Total transaksi. - Total pendapatan dari pesanan
yang memenuhi kriteria. - Jumlah tiket terjual. - Jumlah pelanggan. -
Jumlah pesanan pending. - Pesanan terbaru. - Produk terlaris. -
Ringkasan penjualan harian.

Sediakan filter periode jika memungkinkan.

Gunakan agregasi data pesanan yang konsisten. Jangan menghitung pesanan
cancelled sebagai pendapatan. Jelaskan perbedaan total pesanan, total
booking, dan pendapatan aktual.

Dashboard harus mengambil data dari Supabase.

## 6. DATABASE SUPABASE

Buat SQL schema lengkap yang dapat dijalankan melalui Supabase SQL
Editor.

Gunakan tabel berikut.

### profiles

-   id UUID primary key references auth.users(id).
-   full_name TEXT.
-   role TEXT default 'customer', dibatasi menjadi customer atau admin.
-   phone TEXT nullable.
-   created_at TIMESTAMPTZ.

### products

-   id UUID primary key.
-   name TEXT not null.
-   description TEXT.
-   category TEXT.
-   price NUMERIC(12,2) not null.
-   image_url TEXT nullable.
-   is_active BOOLEAN default true.
-   stock INTEGER nullable jika dibutuhkan.
-   created_at TIMESTAMPTZ.
-   updated_at TIMESTAMPTZ.

### orders

-   id UUID primary key.
-   booking_code TEXT unique.
-   user_id UUID references auth.users(id).
-   visit_date DATE not null.
-   subtotal NUMERIC(12,2) not null.
-   discount_amount NUMERIC(12,2) default 0.
-   total_amount NUMERIC(12,2) not null.
-   status TEXT.
-   payment_method TEXT.
-   payment_status TEXT.
-   created_at TIMESTAMPTZ.

### order_items

-   id UUID primary key.
-   order_id UUID references orders(id).
-   product_id UUID references products(id).
-   product_name TEXT not null sebagai snapshot.
-   unit_price NUMERIC(12,2) not null sebagai snapshot.
-   quantity INTEGER not null.
-   subtotal NUMERIC(12,2) not null.

### promotions

-   id UUID primary key.
-   title TEXT not null.
-   description TEXT.
-   promo_code TEXT nullable.
-   discount_type TEXT.
-   discount_value NUMERIC(12,2).
-   minimum_purchase NUMERIC(12,2) default 0.
-   starts_at TIMESTAMPTZ.
-   ends_at TIMESTAMPTZ.
-   is_active BOOLEAN default true.
-   created_at TIMESTAMPTZ.

### announcements

-   id UUID primary key.
-   title TEXT not null.
-   content TEXT not null.
-   is_active BOOLEAN default true.
-   published_at TIMESTAMPTZ.
-   created_at TIMESTAMPTZ.

Buat foreign key, CHECK constraints, index, default value, dan aturan
penghapusan yang sesuai.

Jika dibutuhkan untuk keamanan transaksi, gunakan PostgreSQL
function/RPC untuk membuat pesanan secara atomik.

## 7. KEAMANAN SUPABASE

Aktifkan Row Level Security (RLS) untuk semua tabel yang berisi data
aplikasi.

Buat policy yang benar-benar aman: - Pengguna hanya bisa membaca dan
mengubah profilnya sendiri, kecuali hak baca tambahan yang memang
diperlukan admin. - Pengguna tidak bisa mengubah role dirinya sendiri
menjadi admin. - Customer hanya dapat membaca pesanan dan item
pesanannya sendiri. - Customer tidak boleh membuat order dengan user_id
milik orang lain. - Customer tidak boleh mengubah total transaksi, harga
item, status pesanan, atau payment_status sesuka hati. - Produk aktif
dapat dibaca publik. - Hanya admin yang dapat mengelola produk, promo,
dan pengumuman. - Hanya admin yang dapat melihat data agregat bisnis dan
data pelanggan sesuai kebutuhan. - Order_items mengikuti hak akses order
terkait.

Buat mekanisme bootstrap admin yang aman: 1. Registrasikan akun admin
awal melalui Supabase Auth. 2. Tetapkan role admin secara manual melalui
SQL Editor sebagai langkah setup satu kali, atau mekanisme administratif
aman lainnya. 3. Jangan memasukkan kredensial admin ke source code. 4.
Jangan membuat RPC publik yang memungkinkan siapa pun mempromosikan
dirinya menjadi admin.

Jangan pernah memasukkan Supabase service_role key ke aplikasi client.

Gunakan hanya: - Supabase project URL. - Supabase anon key atau
publishable key.

Harga, diskon, dan total transaksi harus divalidasi ulang oleh backend
sebelum pesanan disimpan. Jangan mempercayai harga atau total yang
dikirim client.

Jika memungkinkan, gunakan PostgreSQL RPC untuk checkout: - Validasi
user yang sedang login. - Baca ulang harga produk dari database. -
Validasi produk aktif. - Validasi promo dan tanggal kunjungan. - Hitung
ulang subtotal, diskon, dan total di server. - Buat order dan
order_items dalam satu transaksi. - Kembalikan kode booking dan detail
pesanan. - Pastikan kegagalan tidak meninggalkan order parsial.

Buat SQL RLS dan fungsi checkout yang lengkap, bukan hanya contoh
pseudocode.

## 8. INTEGRASI EXPO SNACK

Buat aplikasi dengan struktur sesederhana mungkin.

Target file utama: - App.js sebagai entry point lengkap. - SQL schema
lengkap untuk Supabase. - README berisi setup dan troubleshooting.

Jika menggunakan file terpisah, setiap file harus diberikan secara
lengkap beserta nama dan path-nya. Pastikan seluruh file dapat
dimasukkan ke Expo Snack tanpa konfigurasi yang tidak tersedia.

Gunakan konfigurasi Supabase yang mudah diganti:

``` js
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});
```

Jangan menggunakan variabel process.env yang memerlukan setup bundler
khusus. Untuk tugas ini, gunakan placeholder konfigurasi yang mudah
diganti langsung di Snack. Jangan pernah memasukkan service_role key.

Jika konfigurasi Supabase belum diisi: - Aplikasi tetap dapat dibuka
dalam mode demo. - Tampilkan badge "Mode Demo". - Gunakan data dummy
lokal. - Jangan menampilkan notifikasi seolah-olah transaksi berhasil
tersimpan ke server. - Beri pesan jelas bahwa data hanya tersimpan
secara lokal atau sementara. - Sediakan petunjuk untuk mengaktifkan
backend Supabase.

Jika Supabase gagal terhubung: - Jangan biarkan seluruh aplikasi
crash. - Tampilkan error yang mudah dipahami. - Sediakan tombol coba
lagi. - Jangan menampilkan data lokal sebagai data server tanpa
penjelasan.

## 9. KOMPATIBILITAS DAN PENGUJIAN

Sebelum menyatakan aplikasi selesai, periksa: - App.js menggunakan
syntax JavaScript yang valid. - Semua import package benar. - Semua
komponen mempunyai export/import yang konsisten. - Tidak ada referensi
file yang hilang. - Tidak ada penggunaan DOM API atau browser-only
API. - Tidak ada dependensi yang membutuhkan native module di luar Expo
Go. - Navigasi bekerja pada Snack. - Semua tombol utama berfungsi. -
Layout tidak overflow di layar kecil. - Keyboard tidak menutupi input
penting. - Loading dan error state tersedia. - Login dan logout
terintegrasi. - Katalog mengambil data dari Supabase. - Checkout tidak
dapat memanipulasi harga dari client. - RLS benar-benar membatasi akses
pengguna. - Admin tidak bisa diperoleh dengan memanipulasi state
lokal. - Dashboard hanya menampilkan metrik berdasarkan data yang dapat
diakses.

Jangan mengklaim telah menjalankan pengujian di Snack jika pengujian
tersebut belum benar-benar dilakukan. Jika ada keterbatasan yang tidak
dapat diverifikasi, jelaskan dengan jujur.

## 10. OUTPUT WAJIB

Berikan hasil dalam urutan berikut:

1.  Ringkasan fitur aplikasi.
2.  Source code App.js lengkap, siap ditempel ke https://snack.expo.dev.
3.  SQL schema Supabase lengkap.
4.  SQL RLS policies dan PostgreSQL function/RPC untuk checkout jika
    digunakan.
5.  SQL seed data untuk produk, promo, dan pengumuman.
6.  Panduan konfigurasi project Supabase.
7.  Panduan bootstrap admin yang aman.
8.  Panduan menjalankan aplikasi di Expo Snack.
9.  Checklist pengujian manual.
10. Daftar keterbatasan atau fitur yang memerlukan konfigurasi tambahan.

Jangan mengganti implementasi dengan pseudocode, potongan kode yang
tidak lengkap, atau instruksi "implementasikan sendiri".

Jika output terlalu panjang, pecah menjadi beberapa bagian dengan urutan
yang jelas. Pastikan setiap file tetap utuh dan tidak terpotong.

Mulai implementasi sekarang. Prioritaskan aplikasi yang stabil,
kompatibel dengan Expo Snack, aman pada sisi backend, dan memenuhi
seluruh tujuh persyaratan UAS.