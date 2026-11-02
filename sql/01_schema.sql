-- =============================================================================
-- AquaTix -- 01. SKEMA DATABASE
-- Jalankan file ini PERTAMA di Supabase SQL Editor.
-- Urutan: 01_schema -> 02_policies -> 03_functions -> 04_seed
-- =============================================================================

-- gen_random_uuid() berasal dari pgcrypto. Pada project Supabase baru ekstensi
-- ini sudah aktif, tetapi pernyataan berikut membuat skrip aman dijalankan di
-- project lama maupun database PostgreSQL biasa.
create extension if not exists pgcrypto;


-- =============================================================================
-- TABEL: profiles
-- Menyimpan data tambahan pengguna. Kata sandi TIDAK pernah disimpan di sini;
-- auth.users milik Supabase yang mengelolanya secara terenkripsi.
-- =============================================================================

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default 'Pengguna AquaTix',
  role        text not null default 'customer',
  phone       text,
  created_at  timestamptz not null default now(),

  constraint profiles_role_valid check (role in ('customer', 'admin')),
  constraint profiles_full_name_len check (char_length(trim(full_name)) between 1 and 120),
  constraint profiles_phone_len check (phone is null or char_length(phone) between 5 and 30)
);

comment on table public.profiles is
  'Profil pengguna. Kolom role menentukan hak akses dan hanya boleh diubah lewat SQL Editor atau service_role.';

create index if not exists profiles_role_idx on public.profiles (role);


-- =============================================================================
-- TABEL: products
-- Katalog tiket dan layanan.
-- =============================================================================

create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  category    text not null default 'Lainnya',
  price       numeric(12, 2) not null,
  image_url   text,
  is_active   boolean not null default true,
  -- NULL berarti kuota tidak dibatasi; 0 berarti kuota habis. Keduanya berbeda.
  stock       integer,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint products_name_len check (char_length(trim(name)) between 1 and 120),
  constraint products_price_nonneg check (price >= 0),
  constraint products_stock_nonneg check (stock is null or stock >= 0)
);

comment on column public.products.stock is
  'NULL berarti kuota tidak dibatasi. Angka 0 berarti kuota habis.';

create index if not exists products_active_idx on public.products (is_active);
create index if not exists products_category_idx on public.products (category);


-- =============================================================================
-- TABEL: promotions
-- =============================================================================

create table if not exists public.promotions (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  -- Disimpan huruf besar agar pencarian kode tidak perlu case-insensitive.
  promo_code       text unique,
  discount_type    text not null default 'fixed',
  discount_value   numeric(12, 2) not null default 0,
  minimum_purchase numeric(12, 2) not null default 0,
  starts_at        timestamptz,
  ends_at          timestamptz,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),

  constraint promotions_title_len check (char_length(trim(title)) between 1 and 160),
  constraint promotions_type_valid check (discount_type in ('fixed', 'percent')),
  constraint promotions_value_positive check (discount_value > 0),
  -- Persentase dibatasi 100 supaya potongan tidak melebihi nilai transaksi.
  constraint promotions_percent_range check (
    discount_type <> 'percent' or discount_value <= 100
  ),
  constraint promotions_minimum_nonneg check (minimum_purchase >= 0),
  constraint promotions_period_order check (
    starts_at is null or ends_at is null or ends_at >= starts_at
  ),
  constraint promotions_code_format check (
    promo_code is null or promo_code = upper(promo_code)
  )
);

create index if not exists promotions_active_idx on public.promotions (is_active);
create index if not exists promotions_code_idx on public.promotions (promo_code);


-- =============================================================================
-- TABEL: announcements
-- =============================================================================

create table if not exists public.announcements (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  content      text not null,
  is_active    boolean not null default true,
  published_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),

  constraint announcements_title_len check (char_length(trim(title)) between 1 and 160),
  constraint announcements_content_len check (char_length(trim(content)) between 1 and 2000)
);

create index if not exists announcements_active_idx on public.announcements (is_active);


-- =============================================================================
-- TABEL: orders
--
-- on delete restrict pada user_id: pesanan adalah catatan keuangan, jadi akun
-- yang sudah pernah memesan tidak boleh dihapus begitu saja tanpa keputusan
-- sadar dari pengelola.
-- =============================================================================

create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  booking_code    text not null unique,
  user_id         uuid not null references auth.users (id) on delete restrict,
  visit_date      date not null,
  subtotal        numeric(12, 2) not null,
  discount_amount numeric(12, 2) not null default 0,
  total_amount    numeric(12, 2) not null,
  status          text not null default 'pending',
  payment_method  text not null default 'onsite',
  payment_status  text not null default 'unpaid',
  created_at      timestamptz not null default now(),

  constraint orders_status_valid check (
    status in ('pending', 'confirmed', 'completed', 'cancelled')
  ),
  constraint orders_payment_method_valid check (
    payment_method in ('onsite', 'transfer')
  ),
  constraint orders_payment_status_valid check (
    payment_status in ('unpaid', 'paid', 'refunded')
  ),
  constraint orders_subtotal_nonneg check (subtotal >= 0),
  constraint orders_discount_nonneg check (discount_amount >= 0),
  -- Diskon tidak boleh melampaui subtotal, sehingga total tidak pernah negatif.
  constraint orders_discount_cap check (discount_amount <= subtotal),
  constraint orders_total_nonneg check (total_amount >= 0),
  constraint orders_total_consistent check (total_amount = subtotal - discount_amount)
);

create index if not exists orders_user_idx on public.orders (user_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_visit_date_idx on public.orders (visit_date);
create index if not exists orders_created_idx on public.orders (created_at desc);


-- =============================================================================
-- TABEL: order_items
--
-- product_name dan unit_price adalah salinan nilai saat transaksi terjadi.
-- Tanpa salinan ini, perubahan harga oleh admin akan mengubah nilai pesanan
-- lama dan merusak laporan keuangan.
--
-- on delete restrict pada product_id mencegah penghapusan produk yang sudah
-- pernah dipesan.
-- =============================================================================

create table if not exists public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  product_id   uuid not null references public.products (id) on delete restrict,
  product_name text not null,
  unit_price   numeric(12, 2) not null,
  quantity     integer not null,
  subtotal     numeric(12, 2) not null,

  constraint order_items_quantity_range check (quantity between 1 and 50),
  constraint order_items_price_nonneg check (unit_price >= 0),
  constraint order_items_subtotal_consistent check (subtotal = unit_price * quantity)
);

create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_product_idx on public.order_items (product_id);


-- =============================================================================
-- FUNGSI PEMBANTU
-- =============================================================================

-- Pemeriksaan peran admin. Dideklarasikan security definer agar dapat membaca
-- tabel profiles tanpa terjerat kebijakan RLS pada tabel itu sendiri, yang
-- akan menimbulkan rekursi tak berujung.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

comment on function public.is_admin() is
  'True bila pengguna yang sedang masuk berperan admin. Dipakai kebijakan RLS.';


-- Membuat baris profil otomatis setiap kali akun baru terdaftar.
-- Peran selalu customer; tidak ada jalur dari aplikasi untuk menjadi admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(new.email, '@', 1)
    ),
    'customer'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


-- Menjaga kolom updated_at pada products tetap akurat.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
  before update on public.products
  for each row
  execute function public.touch_updated_at();


-- =============================================================================
-- PENJAGA PERUBAHAN PESANAN
--
-- Kebijakan RLS mengatur SIAPA yang boleh memperbarui baris, tetapi tidak bisa
-- membatasi KOLOM mana yang boleh berubah. Trigger berikut menutup celah itu:
-- angka uang dan identitas pesanan dikunci setelah dibuat, dan status hanya
-- boleh berpindah mengikuti alur bisnis.
-- =============================================================================

create or replace function public.guard_order_update()
returns trigger
language plpgsql
as $$
begin
  -- Nilai uang, pemilik, kode booking, dan tanggal kunjungan bersifat tetap.
  -- Pembatalan atau perubahan jadwal dilakukan lewat status, bukan dengan
  -- menimpa angka transaksi.
  if new.booking_code is distinct from old.booking_code
     or new.user_id is distinct from old.user_id
     or new.subtotal is distinct from old.subtotal
     or new.discount_amount is distinct from old.discount_amount
     or new.total_amount is distinct from old.total_amount
     or new.visit_date is distinct from old.visit_date
     or new.payment_method is distinct from old.payment_method
     or new.created_at is distinct from old.created_at then
    raise exception
      'Nilai transaksi dan identitas pesanan tidak dapat diubah setelah pesanan dibuat.'
      using errcode = 'check_violation';
  end if;

  -- Alur status: pending -> confirmed -> completed, dengan cancelled sebagai
  -- jalan keluar dari dua status pertama. Status akhir bersifat permanen.
  if new.status is distinct from old.status then
    if not (
      (old.status = 'pending'   and new.status in ('confirmed', 'cancelled')) or
      (old.status = 'confirmed' and new.status in ('completed', 'cancelled'))
    ) then
      raise exception 'Status pesanan tidak dapat berpindah dari % ke %.',
        old.status, new.status
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_guard_update on public.orders;
create trigger orders_guard_update
  before update on public.orders
  for each row
  execute function public.guard_order_update();


-- =============================================================================
-- PENJAGA PERUBAHAN PERAN
--
-- Mencegah pengguna menaikkan perannya sendiri menjadi admin. Perubahan peran
-- hanya sah bila dilakukan tanpa konteks pengguna, yaitu lewat SQL Editor atau
-- service_role, di mana auth.uid() bernilai NULL.
-- =============================================================================

create or replace function public.guard_profile_role()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    raise exception
      'Peran akun hanya dapat diubah oleh pengelola melalui SQL Editor.'
      using errcode = 'insufficient_privilege';
  end if;

  -- id profil terikat pada akun auth dan tidak boleh dipindahkan.
  if new.id is distinct from old.id then
    raise exception 'Identitas profil tidak dapat diubah.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row
  execute function public.guard_profile_role();
