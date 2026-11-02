-- =============================================================================
-- AquaTix -- 04. DATA AWAL
-- Jalankan SETELAH 03_functions.sql.
--
-- Harga di bawah adalah data contoh untuk memulai. Admin dapat mengubahnya
-- kapan saja lewat panel manajemen produk di aplikasi.
--
-- File ini aman dijalankan berulang: setiap baris memakai WHERE NOT EXISTS,
-- jadi menjalankannya dua kali tidak menghasilkan data ganda.
-- =============================================================================


-- =============================================================================
-- PRODUK
-- =============================================================================

insert into public.products (name, description, category, price, is_active, stock)
select
  'Tiket Dewasa',
  'Akses kolam dewasa dan kolam arus untuk satu orang berusia 12 tahun ke atas, berlaku sepanjang jam operasional.',
  'Tiket Dewasa',
  25000,
  true,
  null
where not exists (select 1 from public.products where name = 'Tiket Dewasa');

insert into public.products (name, description, category, price, is_active, stock)
select
  'Tiket Anak-anak',
  'Akses kolam anak dan perosotan untuk satu anak usia 3 sampai 11 tahun. Wajib didampingi orang dewasa.',
  'Tiket Anak-anak',
  15000,
  true,
  null
where not exists (select 1 from public.products where name = 'Tiket Anak-anak');

insert into public.products (name, description, category, price, is_active, stock)
select
  'Paket Keluarga',
  'Dua tiket dewasa dan dua tiket anak dalam satu transaksi, sudah termasuk satu sewa loker.',
  'Paket Keluarga',
  70000,
  true,
  null
where not exists (select 1 from public.products where name = 'Paket Keluarga');

-- Dua layanan berikut memakai kuota karena jumlah fisiknya terbatas.
insert into public.products (name, description, category, price, is_active, stock)
select
  'Sewa Ban',
  'Satu ban pelampung ukuran dewasa atau anak untuk dipakai selama kunjungan. Dikembalikan di loket.',
  'Sewa Ban',
  10000,
  true,
  40
where not exists (select 1 from public.products where name = 'Sewa Ban');

insert into public.products (name, description, category, price, is_active, stock)
select
  'Sewa Loker',
  'Satu loker berkunci di ruang bilas untuk menyimpan tas dan pakaian ganti.',
  'Sewa Loker',
  5000,
  true,
  60
where not exists (select 1 from public.products where name = 'Sewa Loker');


-- =============================================================================
-- PROMO
--
-- Periode dihitung relatif terhadap waktu pemasangan supaya promo langsung
-- berlaku tanpa perlu menyunting tanggal secara manual.
-- =============================================================================

insert into public.promotions (
  title, description, promo_code,
  discount_type, discount_value, minimum_purchase,
  starts_at, ends_at, is_active
)
select
  'Potongan Rp10.000 untuk kunjungan keluarga',
  'Berlaku untuk transaksi minimal Rp70.000 pada hari kerja maupun akhir pekan.',
  'KELUARGA10',
  'fixed',
  10000,
  70000,
  now() - interval '7 days',
  now() + interval '30 days',
  true
where not exists (select 1 from public.promotions where promo_code = 'KELUARGA10');

insert into public.promotions (
  title, description, promo_code,
  discount_type, discount_value, minimum_purchase,
  starts_at, ends_at, is_active
)
select
  'Diskon 15 persen pemesanan pertama',
  'Potongan 15 persen untuk transaksi minimal Rp50.000.',
  'RENANG15',
  'percent',
  15,
  50000,
  now() - interval '3 days',
  now() + interval '14 days',
  true
where not exists (select 1 from public.promotions where promo_code = 'RENANG15');


-- =============================================================================
-- PENGUMUMAN
-- =============================================================================

insert into public.announcements (title, content, is_active, published_at)
select
  'Pengurasan kolam dewasa setiap Senin pagi',
  'Kolam dewasa dibuka pukul 10.00 setiap hari Senin karena pengurasan rutin. Kolam anak tetap buka pukul 08.00.',
  true,
  now() - interval '2 days'
where not exists (
  select 1 from public.announcements
  where title = 'Pengurasan kolam dewasa setiap Senin pagi'
);

insert into public.announcements (title, content, is_active, published_at)
select
  'Penukaran kode booking di loket',
  'Tunjukkan kode booking pada petugas loket untuk ditukar gelang masuk. Satu kode berlaku untuk seluruh tiket dalam pesanan tersebut.',
  true,
  now() - interval '10 days'
where not exists (
  select 1 from public.announcements
  where title = 'Penukaran kode booking di loket'
);


-- =============================================================================
-- PEMERIKSAAN HASIL
-- Jalankan kueri berikut untuk memastikan data awal masuk.
-- =============================================================================

select
  (select count(*) from public.products)      as jumlah_produk,
  (select count(*) from public.promotions)    as jumlah_promo,
  (select count(*) from public.announcements) as jumlah_pengumuman;


-- =============================================================================
-- MENJADIKAN SEBUAH AKUN SEBAGAI ADMIN
--
-- Langkah ini dilakukan SATU KALI, secara manual, setelah akun yang dimaksud
-- terdaftar lewat halaman registrasi aplikasi.
--
-- Tidak ada tombol "jadikan admin" di aplikasi, dan tidak ada fungsi RPC yang
-- bisa dipanggil siapa pun untuk menaikkan perannya sendiri. Pembaruan di
-- bawah hanya berhasil dari SQL Editor karena trigger guard_profile_role
-- menolak perubahan peran yang datang dari sesi pengguna.
--
-- Cara pakai: hapus tanda komentar pada dua baris berikut, ganti alamat email
-- dengan email akun Anda, lalu jalankan.
-- =============================================================================

-- update public.profiles
-- set role = 'admin'
-- where id = (select id from auth.users where email = 'email-admin-anda@contoh.com');

-- Pastikan perubahan berhasil:
-- select p.id, p.full_name, p.role, u.email
-- from public.profiles p
-- join auth.users u on u.id = p.id
-- where p.role = 'admin';
