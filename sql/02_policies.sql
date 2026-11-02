-- =============================================================================
-- AquaTix -- 02. ROW LEVEL SECURITY
-- Jalankan SETELAH 01_schema.sql.
--
-- Prinsip yang dipakai:
-- 1. Tanpa kebijakan yang cocok, akses ditolak. RLS menutup secara bawaan.
-- 2. Pelanggan hanya menyentuh barisnya sendiri.
-- 3. Angka uang tidak pernah ditulis langsung oleh klien; hanya fungsi
--    create_order (03_functions.sql) yang boleh membuat pesanan.
-- 4. Peran admin diperiksa lewat public.is_admin(), yang membaca tabel
--    profiles dengan security definer agar tidak terjadi rekursi RLS.
-- =============================================================================

alter table public.profiles      enable row level security;
alter table public.products      enable row level security;
alter table public.promotions    enable row level security;
alter table public.announcements enable row level security;
alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;

-- Menjalankan ulang file ini aman: kebijakan lama dihapus lebih dulu.
drop policy if exists profiles_select_self        on public.profiles;
drop policy if exists profiles_select_admin       on public.profiles;
drop policy if exists profiles_update_self        on public.profiles;
drop policy if exists profiles_insert_self        on public.profiles;

drop policy if exists products_select_public      on public.products;
drop policy if exists products_select_admin       on public.products;
drop policy if exists products_write_admin        on public.products;

drop policy if exists promotions_select_public    on public.promotions;
drop policy if exists promotions_select_admin     on public.promotions;
drop policy if exists promotions_write_admin      on public.promotions;

drop policy if exists announcements_select_public on public.announcements;
drop policy if exists announcements_select_admin  on public.announcements;
drop policy if exists announcements_write_admin   on public.announcements;

drop policy if exists orders_select_own           on public.orders;
drop policy if exists orders_select_admin         on public.orders;
drop policy if exists orders_update_admin         on public.orders;

drop policy if exists order_items_select_own      on public.order_items;
drop policy if exists order_items_select_admin    on public.order_items;


-- =============================================================================
-- profiles
--
-- Perhatikan: tidak ada kebijakan DELETE. Profil ikut terhapus hanya bila akun
-- auth dihapus, lewat ON DELETE CASCADE.
--
-- Kebijakan UPDATE mengizinkan pengguna menyunting barisnya sendiri, sedangkan
-- trigger guard_profile_role menolak perubahan kolom role. Keduanya bekerja
-- berpasangan karena RLS tidak dapat membatasi kolom.
-- =============================================================================

create policy profiles_select_self on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

-- Admin perlu membaca daftar pelanggan untuk manajemen pesanan.
create policy profiles_select_admin on public.profiles
  for select
  to authenticated
  using (public.is_admin());

create policy profiles_update_self on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Cadangan bila trigger handle_new_user belum berjalan, misalnya pada akun
-- yang dibuat sebelum skrip ini dipasang.
create policy profiles_insert_self on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid() and role = 'customer');


-- =============================================================================
-- products
--
-- Katalog aktif dapat dibaca tanpa masuk, termasuk oleh peran anon, karena
-- pengunjung boleh melihat harga sebelum membuat akun.
-- =============================================================================

create policy products_select_public on public.products
  for select
  to anon, authenticated
  using (is_active = true);

-- Admin juga perlu melihat produk nonaktif di panel manajemen.
create policy products_select_admin on public.products
  for select
  to authenticated
  using (public.is_admin());

create policy products_write_admin on public.products
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- =============================================================================
-- promotions
--
-- Promo yang sedang berlaku dapat dibaca publik supaya beranda dan pemeriksaan
-- kode di keranjang tetap berfungsi untuk pengunjung yang belum masuk.
-- =============================================================================

create policy promotions_select_public on public.promotions
  for select
  to anon, authenticated
  using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

create policy promotions_select_admin on public.promotions
  for select
  to authenticated
  using (public.is_admin());

create policy promotions_write_admin on public.promotions
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- =============================================================================
-- announcements
-- =============================================================================

create policy announcements_select_public on public.announcements
  for select
  to anon, authenticated
  using (is_active = true);

create policy announcements_select_admin on public.announcements
  for select
  to authenticated
  using (public.is_admin());

create policy announcements_write_admin on public.announcements
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- =============================================================================
-- orders
--
-- Tidak ada kebijakan INSERT untuk peran authenticated. Ini disengaja:
-- pesanan hanya boleh lahir dari fungsi create_order yang menghitung ulang
-- harga di server. Tanpa kebijakan INSERT, permintaan insert langsung dari
-- klien ditolak RLS, sehingga total transaksi tidak bisa dikarang.
--
-- Pelanggan juga tidak diberi kebijakan UPDATE: mengubah status atau status
-- pembayaran adalah wewenang petugas.
-- =============================================================================

create policy orders_select_own on public.orders
  for select
  to authenticated
  using (user_id = auth.uid());

create policy orders_select_admin on public.orders
  for select
  to authenticated
  using (public.is_admin());

-- Admin boleh memperbarui pesanan; trigger guard_order_update membatasi
-- perubahan hanya pada status dan payment_status.
create policy orders_update_admin on public.orders
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- =============================================================================
-- order_items
--
-- Hak baca mengikuti pesanan induknya. Tidak ada hak tulis bagi siapa pun
-- lewat API: baris item hanya dibuat di dalam fungsi create_order.
-- =============================================================================

create policy order_items_select_own on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and o.user_id = auth.uid()
    )
  );

create policy order_items_select_admin on public.order_items
  for select
  to authenticated
  using (public.is_admin());


-- =============================================================================
-- HAK AKSES TINGKAT TABEL
--
-- RLS bekerja di atas GRANT. Mencabut hak tulis langsung pada orders dan
-- order_items menambah satu lapis pertahanan: meski suatu saat ada kebijakan
-- yang keliru dibuat terlalu longgar, klien tetap tidak punya hak INSERT.
-- Fungsi create_order berjalan security definer sehingga tidak terpengaruh.
-- =============================================================================

revoke insert, update, delete on public.orders      from anon, authenticated;
revoke insert, update, delete on public.order_items from anon, authenticated;

-- Dikembalikan khusus untuk admin lewat kebijakan di atas. Tanpa GRANT ini,
-- kebijakan orders_update_admin tidak akan pernah terpakai.
grant update (status, payment_status) on public.orders to authenticated;
