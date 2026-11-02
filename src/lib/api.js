/**
 * Satu-satunya pintu akses data untuk seluruh layar.
 *
 * Setiap fungsi mengembalikan bentuk yang sama: `{ data, error }`, dengan
 * `error` berupa `{ message, detail }` atau null. Layar tidak pernah memanggil
 * supabase langsung, sehingga penanganan Mode Demo dan terjemahan pesan error
 * cukup dikerjakan di satu tempat.
 *
 * Aturan penting Mode Demo: fungsi yang menulis data mengembalikan
 * `data.persisted === false`. Layar memakai penanda itu untuk mengatakan terus
 * terang bahwa data hanya tersimpan sementara di perangkat.
 */

import { describeError, isDemoMode, supabase } from './supabase';
import {
  currentDemoUser,
  localId,
  makeBookingCode,
  store,
} from './demoStore';
import { ALLOWED_STATUS_FLOW, toISODate } from './format';

const ok = (data) => ({ data, error: null });
const fail = (error) => ({ data: null, error });
const failMsg = (message, detail) => fail({ message, detail: detail || message });

/** Jeda buatan pada Mode Demo supaya status memuat benar-benar terlihat. */
const tick = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));

/* ========================================================================== */
/* AUTENTIKASI                                                                */
/* ========================================================================== */

export const auth = {
  /**
   * Mengambil sesi yang tersimpan. Dipanggil sekali saat aplikasi dibuka agar
   * pengguna yang sudah masuk tidak perlu masuk ulang.
   */
  async getSession() {
    if (isDemoMode) {
      const user = currentDemoUser();
      return ok(user ? { userId: user.id, email: user.email } : null);
    }
    const { data, error } = await supabase.auth.getSession();
    if (error) return fail(describeError(error));
    const session = data.session;
    return ok(
      session ? { userId: session.user.id, email: session.user.email } : null,
    );
  },

  /**
   * Profil berisi nama dan peran. Peran dibaca dari database, tidak pernah
   * dari state lokal, sehingga akses admin tidak bisa diperoleh dengan
   * memanipulasi aplikasi.
   */
  async getProfile(userId) {
    if (isDemoMode) {
      const user = store.users.find((u) => u.id === userId);
      if (!user) return failMsg('Profil demo tidak ditemukan.');
      return ok({
        id: user.id,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone,
        created_at: user.created_at,
      });
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, phone, created_at')
      .eq('id', userId)
      .maybeSingle();
    if (error) return fail(describeError(error));
    if (!data) {
      return failMsg(
        'Profil akun belum terbentuk. Jalankan sql/01_schema.sql agar trigger ' +
          'pembuat profil aktif, lalu daftar ulang.',
      );
    }
    return ok(data);
  },

  async signIn(email, password) {
    if (isDemoMode) {
      await tick();
      const user = store.users.find(
        (u) => u.email.toLowerCase() === String(email).trim().toLowerCase(),
      );
      if (!user || user.password !== password) {
        return failMsg('Email atau kata sandi tidak cocok. Periksa kembali keduanya.');
      }
      store.session = { userId: user.id };
      return ok({ userId: user.id, email: user.email, persisted: false });
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(email).trim(),
      password,
    });
    if (error) return fail(describeError(error));
    return ok({ userId: data.user.id, email: data.user.email, persisted: true });
  },

  /**
   * Nama lengkap dikirim sebagai metadata user. Trigger database membacanya
   * untuk mengisi tabel profiles dengan peran customer. Kata sandi tidak
   * pernah ditulis ke tabel profil.
   */
  async signUp(fullName, email, password) {
    if (isDemoMode) {
      await tick();
      const exists = store.users.some(
        (u) => u.email.toLowerCase() === String(email).trim().toLowerCase(),
      );
      if (exists) {
        return failMsg('Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.');
      }
      const user = {
        id: localId('user'),
        email: String(email).trim(),
        password,
        full_name: String(fullName).trim(),
        role: 'customer',
        phone: null,
        created_at: new Date().toISOString(),
      };
      store.users.push(user);
      store.session = { userId: user.id };
      return ok({ userId: user.id, needsVerification: false, persisted: false });
    }

    const { data, error } = await supabase.auth.signUp({
      email: String(email).trim(),
      password,
      options: { data: { full_name: String(fullName).trim() } },
    });
    if (error) return fail(describeError(error));

    // Bila konfirmasi email aktif, Supabase mengembalikan user tanpa session.
    const needsVerification = Boolean(data.user) && !data.session;
    return ok({
      userId: data.user ? data.user.id : null,
      needsVerification,
      persisted: true,
    });
  },

  async signOut() {
    if (isDemoMode) {
      store.session = null;
      return ok(true);
    }
    const { error } = await supabase.auth.signOut();
    if (error) return fail(describeError(error));
    return ok(true);
  },

  async updateProfile(userId, patch) {
    const payload = {};
    if (typeof patch.full_name === 'string') {
      payload.full_name = patch.full_name.trim();
    }
    if (typeof patch.phone === 'string') {
      payload.phone = patch.phone.trim() || null;
    }
    if (Object.keys(payload).length === 0) return failMsg('Tidak ada perubahan untuk disimpan.');

    if (isDemoMode) {
      await tick();
      const user = store.users.find((u) => u.id === userId);
      if (!user) return failMsg('Profil demo tidak ditemukan.');
      Object.assign(user, payload);
      return ok({ ...user, persisted: false });
    }
    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select('id, full_name, role, phone, created_at')
      .single();
    if (error) return fail(describeError(error));
    return ok({ ...data, persisted: true });
  },

  /**
   * Mendaftarkan pendengar perubahan sesi (misalnya token kedaluwarsa atau
   * keluar dari perangkat lain). Mengembalikan fungsi pembatalan.
   */
  onChange(handler) {
    if (isDemoMode) return () => {};
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      handler(session ? { userId: session.user.id, email: session.user.email } : null);
    });
    return () => data.subscription.unsubscribe();
  },
};

/* ========================================================================== */
/* KATALOG PRODUK                                                             */
/* ========================================================================== */

export const products = {
  /** Katalog pelanggan: hanya produk aktif, boleh dibaca tanpa login. */
  async listActive() {
    if (isDemoMode) {
      await tick();
      return ok(store.products.filter((p) => p.is_active));
    }
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    if (error) return fail(describeError(error));
    return ok(data || []);
  },

  /** Daftar admin: termasuk produk nonaktif. */
  async listAll() {
    if (isDemoMode) {
      await tick();
      return ok([...store.products]);
    }
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) return fail(describeError(error));
    return ok(data || []);
  },

  async create(input) {
    if (isDemoMode) {
      await tick();
      const now = new Date().toISOString();
      const row = {
        id: localId('prod'),
        name: input.name,
        description: input.description || null,
        category: input.category,
        price: input.price,
        image_url: input.image_url || null,
        is_active: input.is_active !== false,
        stock: input.stock ?? null,
        created_at: now,
        updated_at: now,
      };
      store.products.push(row);
      return ok({ row, persisted: false });
    }
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: input.name,
        description: input.description || null,
        category: input.category,
        price: input.price,
        image_url: input.image_url || null,
        is_active: input.is_active !== false,
        stock: input.stock ?? null,
      })
      .select('*')
      .single();
    if (error) return fail(describeError(error));
    return ok({ row: data, persisted: true });
  },

  async update(id, patch) {
    if (isDemoMode) {
      await tick();
      const row = store.products.find((p) => p.id === id);
      if (!row) return failMsg('Produk tidak ditemukan.');
      Object.assign(row, patch, { updated_at: new Date().toISOString() });
      return ok({ row, persisted: false });
    }
    const { data, error } = await supabase
      .from('products')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) return fail(describeError(error));
    return ok({ row: data, persisted: true });
  },

  /**
   * Penghapusan ditolak bila produk sudah pernah dipesan. Pada mode Supabase,
   * foreign key order_items memakai ON DELETE RESTRICT sehingga database yang
   * menjadi penjaga terakhir; pengecekan di sini hanya untuk pesan yang jelas.
   */
  async remove(id) {
    if (isDemoMode) {
      await tick();
      const used = store.orderItems.some((it) => it.product_id === id);
      if (used) {
        return failMsg(
          'Produk ini sudah dipakai pada pesanan yang tercatat, jadi tidak bisa ' +
            'dihapus. Nonaktifkan produk agar tidak muncul di katalog.',
        );
      }
      const idx = store.products.findIndex((p) => p.id === id);
      if (idx === -1) return failMsg('Produk tidak ditemukan.');
      store.products.splice(idx, 1);
      return ok({ persisted: false });
    }

    const { count, error: countError } = await supabase
      .from('order_items')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', id);
    if (countError) return fail(describeError(countError));
    if ((count || 0) > 0) {
      return failMsg(
        'Produk ini sudah dipakai pada pesanan yang tercatat, jadi tidak bisa ' +
          'dihapus. Nonaktifkan produk agar tidak muncul di katalog.',
      );
    }

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return fail(describeError(error));
    return ok({ persisted: true });
  },
};

/* ========================================================================== */
/* PROMO DAN PENGUMUMAN                                                       */
/* ========================================================================== */

/** Promo yang sedang berlaku menurut jam perangkat. */
function isPromoLive(promo, now = new Date()) {
  if (!promo.is_active) return false;
  if (promo.starts_at && new Date(promo.starts_at) > now) return false;
  if (promo.ends_at && new Date(promo.ends_at) < now) return false;
  return true;
}

/**
 * Hitung potongan untuk satu subtotal.
 * Hasilnya dibatasi agar tidak pernah melebihi subtotal, sehingga total akhir
 * tidak mungkin negatif. Perhitungan yang sama diulang di sisi server oleh
 * fungsi RPC checkout; versi ini hanya untuk pratinjau di layar keranjang.
 */
export function computeDiscount(promo, subtotal) {
  if (!promo) return 0;
  if (subtotal < Number(promo.minimum_purchase || 0)) return 0;
  const value = Number(promo.discount_value || 0);
  const raw =
    promo.discount_type === 'percent'
      ? Math.floor((subtotal * value) / 100)
      : Math.floor(value);
  return Math.max(0, Math.min(raw, subtotal));
}

export const promotions = {
  /** Promo aktif untuk beranda dan keranjang. */
  async listLive() {
    if (isDemoMode) {
      await tick();
      return ok(store.promotions.filter((p) => isPromoLive(p)));
    }
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
      .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
      .order('created_at', { ascending: false });
    if (error) return fail(describeError(error));
    return ok(data || []);
  },

  async listAll() {
    if (isDemoMode) {
      await tick();
      return ok([...store.promotions]);
    }
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return fail(describeError(error));
    return ok(data || []);
  },

  /**
   * Mencari promo berdasarkan kode yang diketik pelanggan.
   * Status "tidak ditemukan" dan "belum memenuhi minimum" dibedakan agar pesan
   * di layar keranjang bisa spesifik.
   */
  async findByCode(code) {
    const clean = String(code || '').trim().toUpperCase();
    if (!clean) return failMsg('Masukkan kode promo terlebih dahulu.');

    if (isDemoMode) {
      await tick();
      const promo = store.promotions.find(
        (p) => String(p.promo_code || '').toUpperCase() === clean,
      );
      if (!promo) return failMsg(`Kode "${clean}" tidak terdaftar.`);
      if (!isPromoLive(promo)) return failMsg(`Kode "${clean}" sudah tidak berlaku.`);
      return ok(promo);
    }

    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('promo_code', clean)
      .eq('is_active', true)
      .maybeSingle();
    if (error) return fail(describeError(error));
    if (!data) return failMsg(`Kode "${clean}" tidak terdaftar atau sedang nonaktif.`);
    if (!isPromoLive(data)) return failMsg(`Kode "${clean}" sudah tidak berlaku.`);
    return ok(data);
  },

  async create(input) {
    if (isDemoMode) {
      await tick();
      const row = { id: localId('promo'), created_at: new Date().toISOString(), ...input };
      store.promotions.unshift(row);
      return ok({ row, persisted: false });
    }
    const { data, error } = await supabase
      .from('promotions')
      .insert(input)
      .select('*')
      .single();
    if (error) return fail(describeError(error));
    return ok({ row: data, persisted: true });
  },

  async update(id, patch) {
    if (isDemoMode) {
      await tick();
      const row = store.promotions.find((p) => p.id === id);
      if (!row) return failMsg('Promo tidak ditemukan.');
      Object.assign(row, patch);
      return ok({ row, persisted: false });
    }
    const { data, error } = await supabase
      .from('promotions')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) return fail(describeError(error));
    return ok({ row: data, persisted: true });
  },
};

export const announcements = {
  async listLive() {
    if (isDemoMode) {
      await tick();
      return ok(store.announcements.filter((a) => a.is_active));
    }
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('published_at', { ascending: false });
    if (error) return fail(describeError(error));
    return ok(data || []);
  },

  async listAll() {
    if (isDemoMode) {
      await tick();
      return ok([...store.announcements]);
    }
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return fail(describeError(error));
    return ok(data || []);
  },

  async create(input) {
    if (isDemoMode) {
      await tick();
      const now = new Date().toISOString();
      const row = { id: localId('ann'), created_at: now, published_at: now, ...input };
      store.announcements.unshift(row);
      return ok({ row, persisted: false });
    }
    const { data, error } = await supabase
      .from('announcements')
      .insert(input)
      .select('*')
      .single();
    if (error) return fail(describeError(error));
    return ok({ row: data, persisted: true });
  },

  async update(id, patch) {
    if (isDemoMode) {
      await tick();
      const row = store.announcements.find((a) => a.id === id);
      if (!row) return failMsg('Pengumuman tidak ditemukan.');
      Object.assign(row, patch);
      return ok({ row, persisted: false });
    }
    const { data, error } = await supabase
      .from('announcements')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) return fail(describeError(error));
    return ok({ row: data, persisted: true });
  },
};

/* ========================================================================== */
/* PESANAN                                                                    */
/* ========================================================================== */

/**
 * Salinan aturan validasi checkout milik server, dipakai agar kesalahan umum
 * tertangkap sebelum permintaan dikirim. Server tetap memvalidasi ulang
 * semuanya; fungsi ini tidak dianggap sebagai pengaman.
 */
function validateCheckoutInput({ items, visitDate }) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'Keranjang masih kosong.';
  }
  if (items.some((it) => !Number.isInteger(it.quantity) || it.quantity < 1)) {
    return 'Jumlah tiket minimal 1 untuk setiap item.';
  }
  if (items.some((it) => it.quantity > 50)) {
    return 'Jumlah maksimal 50 per jenis tiket dalam satu pesanan.';
  }
  if (!visitDate) {
    return 'Pilih tanggal kunjungan terlebih dahulu.';
  }
  if (visitDate < toISODate(new Date())) {
    return 'Tanggal kunjungan tidak boleh di masa lalu.';
  }
  return null;
}

export const orders = {
  /**
   * Checkout.
   *
   * Mode Supabase memanggil fungsi RPC `create_order`. Klien hanya mengirim
   * id produk, jumlah, tanggal, metode bayar, dan kode promo. Harga, subtotal,
   * diskon, dan total dihitung ulang di dalam database, jadi nilai yang
   * ditampilkan di layar tidak bisa dipakai untuk memanipulasi tagihan.
   */
  async checkout({ items, visitDate, paymentMethod, promoCode, userId }) {
    const invalid = validateCheckoutInput({ items, visitDate });
    if (invalid) return failMsg(invalid);

    if (isDemoMode) {
      await tick(400);
      if (!userId) return failMsg('Masuk terlebih dahulu sebelum memesan.');

      // Hitung ulang dari data produk, bukan dari angka yang dikirim layar.
      const lines = [];
      for (const item of items) {
        const product = store.products.find((p) => p.id === item.productId);
        if (!product) return failMsg('Ada produk di keranjang yang sudah tidak tersedia.');
        if (!product.is_active) {
          return failMsg(`"${product.name}" sedang tidak dijual. Hapus dari keranjang.`);
        }
        lines.push({
          product_id: product.id,
          product_name: product.name,
          unit_price: product.price,
          quantity: item.quantity,
          subtotal: product.price * item.quantity,
        });
      }

      const subtotal = lines.reduce((sum, l) => sum + l.subtotal, 0);
      let discount = 0;
      if (promoCode) {
        const promo = store.promotions.find(
          (p) =>
            String(p.promo_code || '').toUpperCase() ===
            String(promoCode).trim().toUpperCase(),
        );
        if (promo && isPromoLive(promo)) discount = computeDiscount(promo, subtotal);
      }

      const order = {
        id: localId('order'),
        booking_code: makeBookingCode(),
        user_id: userId,
        visit_date: visitDate,
        subtotal,
        discount_amount: discount,
        total_amount: Math.max(0, subtotal - discount),
        status: 'pending',
        payment_method: paymentMethod,
        payment_status: 'unpaid',
        created_at: new Date().toISOString(),
      };
      store.orders.unshift(order);
      lines.forEach((l) => {
        store.orderItems.push({ id: localId('item'), order_id: order.id, ...l });
      });

      return ok({ order, items: lines, persisted: false });
    }

    const { data, error } = await supabase.rpc('create_order', {
      p_items: items.map((it) => ({
        product_id: it.productId,
        quantity: it.quantity,
      })),
      p_visit_date: visitDate,
      p_payment_method: paymentMethod,
      p_promo_code: promoCode ? String(promoCode).trim().toUpperCase() : null,
    });
    if (error) return fail(describeError(error));
    if (!data || !data.order) {
      return failMsg('Server tidak mengembalikan detail pesanan. Coba ulangi checkout.');
    }
    return ok({ order: data.order, items: data.items || [], persisted: true });
  },

  /** Riwayat pesanan milik akun yang sedang masuk. */
  async listMine(userId) {
    if (isDemoMode) {
      await tick();
      const mine = store.orders.filter((o) => o.user_id === userId);
      return ok(
        mine.map((o) => ({
          ...o,
          order_items: store.orderItems.filter((it) => it.order_id === o.id),
        })),
      );
    }
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) return fail(describeError(error));
    return ok(data || []);
  },

  /**
   * Daftar pesanan untuk admin. Penyaringan dikirim ke database agar perangkat
   * tidak perlu mengunduh seluruh tabel.
   */
  async listAll({ status, fromDate, toDate } = {}) {
    if (isDemoMode) {
      await tick();
      let rows = store.orders.map((o) => ({
        ...o,
        order_items: store.orderItems.filter((it) => it.order_id === o.id),
        profiles: (() => {
          const u = store.users.find((x) => x.id === o.user_id);
          return u ? { full_name: u.full_name } : null;
        })(),
      }));
      if (status) rows = rows.filter((o) => o.status === status);
      if (fromDate) rows = rows.filter((o) => o.visit_date >= fromDate);
      if (toDate) rows = rows.filter((o) => o.visit_date <= toDate);
      return ok(rows);
    }

    let query = supabase
      .from('orders')
      .select('*, order_items(*), profiles(full_name)')
      .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    if (fromDate) query = query.gte('visit_date', fromDate);
    if (toDate) query = query.lte('visit_date', toDate);

    const { data, error } = await query;
    if (error) return fail(describeError(error));
    return ok(data || []);
  },

  /**
   * Perubahan status oleh admin. Transisi diperiksa di sini untuk pesan yang
   * ramah, dan ditegakkan lagi oleh trigger database.
   */
  async updateStatus(orderId, fromStatus, toStatus) {
    const allowed = ALLOWED_STATUS_FLOW[fromStatus] || [];
    if (!allowed.includes(toStatus)) {
      return failMsg(
        `Status tidak bisa berpindah dari "${fromStatus}" ke "${toStatus}".`,
      );
    }

    // Pesanan selesai dianggap sudah dibayar di loket.
    const patch = { status: toStatus };
    if (toStatus === 'completed') patch.payment_status = 'paid';
    if (toStatus === 'cancelled') patch.payment_status = 'refunded';

    if (isDemoMode) {
      await tick();
      const order = store.orders.find((o) => o.id === orderId);
      if (!order) return failMsg('Pesanan tidak ditemukan.');
      Object.assign(order, patch);
      return ok({ order, persisted: false });
    }
    const { data, error } = await supabase
      .from('orders')
      .update(patch)
      .eq('id', orderId)
      .select('*')
      .single();
    if (error) return fail(describeError(error));
    return ok({ order: data, persisted: true });
  },
};

/* ========================================================================== */
/* PELANGGAN DAN LAPORAN                                                      */
/* ========================================================================== */

export const admin = {
  /** Daftar pelanggan. Hanya nama, peran, dan tanggal daftar; tanpa data sensitif. */
  async listCustomers() {
    if (isDemoMode) {
      await tick();
      return ok(
        store.users.map((u) => ({
          id: u.id,
          full_name: u.full_name,
          role: u.role,
          phone: u.phone,
          created_at: u.created_at,
        })),
      );
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, phone, created_at')
      .order('created_at', { ascending: false });
    if (error) return fail(describeError(error));
    return ok(data || []);
  },

  /**
   * Metrik dashboard.
   *
   * Tiga angka yang mudah tertukar sengaja dipisah:
   * - totalOrders: semua pesanan yang pernah dibuat, termasuk yang dibatalkan.
   * - billableOrders: pesanan berstatus confirmed atau completed.
   * - revenue: jumlah total_amount dari pesanan completed saja, yaitu uang
   *   yang benar-benar sudah diterima di loket. Pesanan dibatalkan tidak
   *   pernah dihitung sebagai pendapatan.
   */
  async dashboard({ fromDate, toDate } = {}) {
    const inRange = (visitDate) => {
      if (fromDate && visitDate < fromDate) return false;
      if (toDate && visitDate > toDate) return false;
      return true;
    };

    let orderRows = [];
    let itemRows = [];
    let customerCount = 0;

    if (isDemoMode) {
      await tick();
      orderRows = store.orders.filter((o) => inRange(o.visit_date));
      const ids = new Set(orderRows.map((o) => o.id));
      itemRows = store.orderItems.filter((it) => ids.has(it.order_id));
      customerCount = store.users.filter((u) => u.role === 'customer').length;
    } else {
      let query = supabase
        .from('orders')
        .select('id, visit_date, status, total_amount, booking_code, created_at, order_items(product_name, quantity, subtotal)')
        .order('created_at', { ascending: false });
      if (fromDate) query = query.gte('visit_date', fromDate);
      if (toDate) query = query.lte('visit_date', toDate);

      const { data, error } = await query;
      if (error) return fail(describeError(error));
      orderRows = data || [];
      itemRows = orderRows.flatMap((o) =>
        (o.order_items || []).map((it) => ({ ...it, order_id: o.id })),
      );

      const { count, error: countError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'customer');
      if (countError) return fail(describeError(countError));
      customerCount = count || 0;
    }

    const cancelledIds = new Set(
      orderRows.filter((o) => o.status === 'cancelled').map((o) => o.id),
    );
    const completed = orderRows.filter((o) => o.status === 'completed');
    const billable = orderRows.filter(
      (o) => o.status === 'confirmed' || o.status === 'completed',
    );

    // Tiket terjual menghitung baris pesanan yang tidak dibatalkan saja.
    const ticketsSold = itemRows
      .filter((it) => !cancelledIds.has(it.order_id))
      .reduce((sum, it) => sum + Number(it.quantity || 0), 0);

    // Produk terlaris diurutkan berdasarkan jumlah unit, bukan nilai rupiah,
    // karena yang dicari adalah layanan yang paling sering diambil pengunjung.
    const perProduct = new Map();
    itemRows
      .filter((it) => !cancelledIds.has(it.order_id))
      .forEach((it) => {
        const key = it.product_name;
        const prev = perProduct.get(key) || { name: key, quantity: 0, value: 0 };
        prev.quantity += Number(it.quantity || 0);
        prev.value += Number(it.subtotal || 0);
        perProduct.set(key, prev);
      });

    // Ringkasan harian memakai tanggal kunjungan agar admin tahu beban
    // operasional per hari buka, bukan per hari transaksi dibuat.
    const perDay = new Map();
    completed.forEach((o) => {
      const prev = perDay.get(o.visit_date) || { date: o.visit_date, orders: 0, revenue: 0 };
      prev.orders += 1;
      prev.revenue += Number(o.total_amount || 0);
      perDay.set(o.visit_date, prev);
    });

    return ok({
      totalOrders: orderRows.length,
      billableOrders: billable.length,
      completedOrders: completed.length,
      pendingOrders: orderRows.filter((o) => o.status === 'pending').length,
      cancelledOrders: cancelledIds.size,
      revenue: completed.reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
      projectedRevenue: billable.reduce(
        (sum, o) => sum + Number(o.total_amount || 0),
        0,
      ),
      ticketsSold,
      customerCount,
      recentOrders: orderRows.slice(0, 5),
      topProducts: [...perProduct.values()]
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5),
      dailySales: [...perDay.values()].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 7),
    });
  },
};
