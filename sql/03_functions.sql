-- =============================================================================
-- AquaTix -- 03. FUNGSI CHECKOUT
-- Jalankan SETELAH 02_policies.sql.
--
-- Fungsi create_order adalah satu-satunya jalan membuat pesanan. Klien hanya
-- mengirim id produk, jumlah, tanggal kunjungan, metode bayar, dan kode promo.
-- Harga, subtotal, diskon, dan total dibaca dan dihitung ulang di sini, jadi
-- angka apa pun yang ditampilkan di aplikasi tidak memengaruhi tagihan.
--
-- Fungsi berjalan sebagai satu transaksi tunggal. Bila ada baris yang gagal,
-- seluruh pesanan dibatalkan sehingga tidak pernah ada order tanpa item.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Pembuat kode booking unik.
--
-- Format: AQX-YYMMDD-XXXX. Enam digit tanggal memudahkan petugas loket
-- mengenali kapan transaksi dibuat tanpa membuka basis data.
--
-- Pengulangan sampai 20 kali menutup kemungkinan tabrakan acak. Bila tetap
-- gagal, transaksi dihentikan; memakai kode ganda lebih berbahaya daripada
-- meminta pelanggan mengulang checkout.
-- -----------------------------------------------------------------------------

create or replace function public.generate_booking_code()
returns text
language plpgsql
volatile
as $$
declare
  v_code    text;
  v_attempt integer := 0;
begin
  loop
    v_attempt := v_attempt + 1;

    v_code :=
      'AQX-'
      || to_char(now() at time zone 'Asia/Jakarta', 'YYMMDD')
      || '-'
      || upper(substring(md5(gen_random_uuid()::text) from 1 for 4));

    exit when not exists (
      select 1 from public.orders where booking_code = v_code
    );

    if v_attempt >= 20 then
      raise exception 'Gagal membuat kode booking unik. Silakan ulangi checkout.'
        using errcode = 'internal_error';
    end if;
  end loop;

  return v_code;
end;
$$;


-- -----------------------------------------------------------------------------
-- create_order
--
-- Parameter:
--   p_items          jsonb  array [{"product_id": uuid, "quantity": int}, ...]
--   p_visit_date     date   tanggal kunjungan
--   p_payment_method text   'onsite' atau 'transfer'
--   p_promo_code     text   kode promo opsional, boleh NULL
--
-- Mengembalikan jsonb: { "order": {...}, "items": [...] }
--
-- Alur sengaja dibuat dua tahap: seluruh item diperiksa dan dihitung lebih
-- dulu, baru baris pesanan ditulis dengan nilai final. Dengan begitu kolom
-- uang tidak pernah di-UPDATE, sehingga trigger guard_order_update tidak perlu
-- dilewati. Menonaktifkan trigger membutuhkan hak superuser yang tidak tersedia
-- pada project Supabase biasa, dan melemahkan penjaga yang justru melindungi
-- nilai transaksi.
--
-- security definer dipakai agar fungsi dapat menulis ke orders dan order_items
-- meski peran authenticated tidak diberi hak INSERT pada kedua tabel itu.
-- search_path dikunci supaya nama tabel tidak dapat dibajak lewat skema lain.
-- -----------------------------------------------------------------------------

create or replace function public.create_order(
  p_items          jsonb,
  p_visit_date     date,
  p_payment_method text default 'onsite',
  p_promo_code     text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id    uuid := auth.uid();
  v_order_id   uuid;
  v_code       text;
  v_subtotal   numeric(12, 2) := 0;
  v_discount   numeric(12, 2) := 0;
  v_total      numeric(12, 2);
  v_promo      public.promotions%rowtype;
  v_item       jsonb;
  v_product    public.products%rowtype;
  v_quantity   integer;
  v_line_total numeric(12, 2);
  -- Menampung baris yang sudah divalidasi sampai order induknya terbentuk.
  v_lines      jsonb := '[]'::jsonb;
  v_line       jsonb;
  v_result     jsonb;
begin
  -- ---------------------------------------------------------------- Identitas
  if v_user_id is null then
    raise exception 'Masuk terlebih dahulu sebelum membuat pesanan.'
      using errcode = 'insufficient_privilege';
  end if;

  -- ---------------------------------------------------------------- Validasi
  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang kosong atau formatnya tidak dikenali.'
      using errcode = 'check_violation';
  end if;

  if jsonb_array_length(p_items) > 20 then
    raise exception 'Satu pesanan maksimal berisi 20 jenis tiket berbeda.'
      using errcode = 'check_violation';
  end if;

  if p_visit_date is null then
    raise exception 'Tanggal kunjungan wajib diisi.'
      using errcode = 'check_violation';
  end if;

  -- Tanggal dibandingkan dengan waktu Jakarta, bukan UTC, agar pemesanan pada
  -- malam hari untuk "hari ini" tidak ditolak karena selisih zona waktu.
  if p_visit_date < (now() at time zone 'Asia/Jakarta')::date then
    raise exception 'Tanggal kunjungan tidak boleh di masa lalu.'
      using errcode = 'check_violation';
  end if;

  if p_visit_date > ((now() at time zone 'Asia/Jakarta')::date + 90) then
    raise exception 'Pemesanan hanya dibuka sampai 90 hari ke depan.'
      using errcode = 'check_violation';
  end if;

  if p_payment_method is null or p_payment_method not in ('onsite', 'transfer') then
    raise exception 'Metode pembayaran tidak dikenali.'
      using errcode = 'check_violation';
  end if;

  -- ------------------------------------------------- Tahap 1: periksa item
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := nullif(v_item ->> 'quantity', '')::integer;

    if v_quantity is null or v_quantity < 1 or v_quantity > 50 then
      raise exception 'Jumlah tiket harus antara 1 dan 50 untuk setiap item.'
        using errcode = 'check_violation';
    end if;

    -- FOR UPDATE mengunci baris produk sampai transaksi selesai, sehingga dua
    -- pesanan bersamaan tidak dapat membaca kuota yang sama lalu lolos berdua.
    select * into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid
    for update;

    if not found then
      raise exception 'Ada produk di keranjang yang sudah tidak terdaftar.'
        using errcode = 'check_violation';
    end if;

    if not v_product.is_active then
      raise exception 'Produk "%" sedang tidak dijual.', v_product.name
        using errcode = 'check_violation';
    end if;

    -- stock NULL berarti kuota tidak dibatasi, jadi pemeriksaan dilewati.
    if v_product.stock is not null then
      if v_product.stock < v_quantity then
        raise exception 'Kuota "%" tinggal % unit, sedangkan diminta % unit.',
          v_product.name, v_product.stock, v_quantity
          using errcode = 'check_violation';
      end if;

      update public.products
      set stock = stock - v_quantity
      where id = v_product.id;
    end if;

    -- Harga diambil dari baris produk yang baru dibaca, bukan dari klien.
    v_line_total := v_product.price * v_quantity;
    v_subtotal := v_subtotal + v_line_total;

    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object(
        'product_id',   v_product.id,
        'product_name', v_product.name,
        'unit_price',   v_product.price,
        'quantity',     v_quantity,
        'subtotal',     v_line_total
      )
    );
  end loop;

  if jsonb_array_length(v_lines) = 0 then
    raise exception 'Tidak ada item sah di dalam pesanan.'
      using errcode = 'check_violation';
  end if;

  -- -------------------------------------------------- Tahap 2: hitung promo
  if p_promo_code is not null and trim(p_promo_code) <> '' then
    select * into v_promo
    from public.promotions
    where promo_code = upper(trim(p_promo_code))
      and is_active = true
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now());

    if found and v_subtotal >= v_promo.minimum_purchase then
      if v_promo.discount_type = 'percent' then
        v_discount := floor(v_subtotal * v_promo.discount_value / 100);
      else
        v_discount := floor(v_promo.discount_value);
      end if;

      -- Dibatasi subtotal supaya total tidak pernah negatif.
      v_discount := least(greatest(v_discount, 0), v_subtotal);
    end if;
    -- Kode yang tidak ditemukan atau belum memenuhi minimum tidak membatalkan
    -- pesanan; potongan sekadar tidak diterapkan. Aplikasi sudah memeriksa
    -- kode lebih dulu, jadi kegagalan promo di sini bukan kesalahan fatal.
  end if;

  v_total := v_subtotal - v_discount;

  -- ------------------------------------- Tahap 3: tulis pesanan dan itemnya
  v_code := public.generate_booking_code();

  insert into public.orders (
    booking_code, user_id, visit_date,
    subtotal, discount_amount, total_amount,
    status, payment_method, payment_status
  )
  values (
    v_code, v_user_id, p_visit_date,
    v_subtotal, v_discount, v_total,
    'pending', p_payment_method, 'unpaid'
  )
  returning id into v_order_id;

  for v_line in select * from jsonb_array_elements(v_lines)
  loop
    insert into public.order_items (
      order_id, product_id, product_name, unit_price, quantity, subtotal
    )
    values (
      v_order_id,
      (v_line ->> 'product_id')::uuid,
      v_line ->> 'product_name',
      (v_line ->> 'unit_price')::numeric,
      (v_line ->> 'quantity')::integer,
      (v_line ->> 'subtotal')::numeric
    );
  end loop;

  -- ------------------------------------------------------------------ Hasil
  select jsonb_build_object(
    'order', to_jsonb(o.*),
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id',           i.id,
            'product_id',   i.product_id,
            'product_name', i.product_name,
            'unit_price',   i.unit_price,
            'quantity',     i.quantity,
            'subtotal',     i.subtotal
          )
          order by i.product_name
        )
        from public.order_items i
        where i.order_id = o.id
      ),
      '[]'::jsonb
    )
  )
  into v_result
  from public.orders o
  where o.id = v_order_id;

  return v_result;
end;
$$;

comment on function public.create_order(jsonb, date, text, text) is
  'Membuat pesanan secara atomik. Harga dan total dihitung ulang di server, bukan diambil dari klien.';


-- -----------------------------------------------------------------------------
-- HAK AKSES FUNGSI
--
-- Hanya pengguna yang sudah masuk boleh memanggil create_order. Peran anon
-- dicabut eksplisit agar tamu tidak dapat membuat pesanan.
-- -----------------------------------------------------------------------------

revoke all on function public.create_order(jsonb, date, text, text) from public, anon;
grant execute on function public.create_order(jsonb, date, text, text) to authenticated;

-- generate_booking_code hanya dipakai di dalam create_order, jadi tidak perlu
-- bisa dipanggil langsung lewat API.
revoke all on function public.generate_booking_code() from public, anon, authenticated;

-- is_admin dipakai kebijakan RLS dan boleh dieksekusi pengguna yang sudah masuk.
grant execute on function public.is_admin() to authenticated;
