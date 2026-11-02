/**
 * Penyimpanan Mode Demo: seluruh data hidup di memori proses aplikasi.
 *
 * Mode ini hanya aktif bila src/config.js belum diisi. Tujuannya agar aplikasi
 * tetap bisa dibuka dan dinilai tanpa backend. Semua perubahan hilang saat
 * aplikasi dimuat ulang, dan setiap layar yang menulis data wajib mengatakan
 * hal itu kepada pengguna, bukan menampilkan pesan "tersimpan" seolah-olah
 * data sudah sampai ke server.
 */

import { toISODate } from './format';

let counter = 0;
/** Pengganti uuid: cukup unik di dalam satu sesi demo. */
function localId(prefix) {
  counter += 1;
  return `${prefix}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

/**
 * Harga di bawah adalah data contoh sesuai dokumen kebutuhan. Pada mode
 * Supabase, nilai yang sama ditanam lewat sql/04_seed.sql dan dapat diubah
 * admin kapan saja.
 */
function seedProducts() {
  const now = new Date().toISOString();
  return [
    {
      id: localId('prod'),
      name: 'Tiket Dewasa',
      description:
        'Akses kolam dewasa dan kolam arus untuk satu orang berusia 12 tahun ke atas, berlaku sepanjang jam operasional.',
      category: 'Tiket Dewasa',
      price: 25000,
      image_url: null,
      is_active: true,
      stock: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: localId('prod'),
      name: 'Tiket Anak-anak',
      description:
        'Akses kolam anak dan perosotan untuk satu anak usia 3 sampai 11 tahun. Wajib didampingi orang dewasa.',
      category: 'Tiket Anak-anak',
      price: 15000,
      image_url: null,
      is_active: true,
      stock: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: localId('prod'),
      name: 'Paket Keluarga',
      description:
        'Dua tiket dewasa dan dua tiket anak dalam satu transaksi, sudah termasuk satu sewa loker.',
      category: 'Paket Keluarga',
      price: 70000,
      image_url: null,
      is_active: true,
      stock: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: localId('prod'),
      name: 'Sewa Ban',
      description:
        'Satu ban pelampung ukuran dewasa atau anak untuk dipakai selama kunjungan. Dikembalikan di loket.',
      category: 'Sewa Ban',
      price: 10000,
      image_url: null,
      is_active: true,
      stock: 40,
      created_at: now,
      updated_at: now,
    },
    {
      id: localId('prod'),
      name: 'Sewa Loker',
      description:
        'Satu loker berkunci di ruang bilas untuk menyimpan tas dan pakaian ganti.',
      category: 'Sewa Loker',
      price: 5000,
      image_url: null,
      is_active: true,
      stock: 60,
      created_at: now,
      updated_at: now,
    },
  ];
}

function seedPromotions() {
  return [
    {
      id: localId('promo'),
      title: 'Potongan Rp10.000 untuk kunjungan keluarga',
      description:
        'Berlaku untuk transaksi minimal Rp70.000 pada hari kerja maupun akhir pekan.',
      promo_code: 'KELUARGA10',
      discount_type: 'fixed',
      discount_value: 10000,
      minimum_purchase: 70000,
      starts_at: daysFromNow(-7),
      ends_at: daysFromNow(30),
      is_active: true,
      created_at: daysFromNow(-7),
    },
    {
      id: localId('promo'),
      title: 'Diskon 15 persen pemesanan pertama',
      description:
        'Potongan 15 persen dengan batas maksimal Rp20.000 untuk transaksi minimal Rp50.000.',
      promo_code: 'RENANG15',
      discount_type: 'percent',
      discount_value: 15,
      minimum_purchase: 50000,
      starts_at: daysFromNow(-3),
      ends_at: daysFromNow(14),
      is_active: true,
      created_at: daysFromNow(-3),
    },
  ];
}

function seedAnnouncements() {
  return [
    {
      id: localId('ann'),
      title: 'Pengurasan kolam dewasa setiap Senin pagi',
      content:
        'Kolam dewasa dibuka pukul 10.00 setiap hari Senin karena pengurasan rutin. Kolam anak tetap buka pukul 08.00.',
      is_active: true,
      published_at: daysFromNow(-2),
      created_at: daysFromNow(-2),
    },
    {
      id: localId('ann'),
      title: 'Penukaran kode booking di loket',
      content:
        'Tunjukkan kode booking pada petugas loket untuk ditukar gelang masuk. Satu kode berlaku untuk seluruh tiket dalam pesanan tersebut.',
      is_active: true,
      published_at: daysFromNow(-10),
      created_at: daysFromNow(-10),
    },
  ];
}

/**
 * Akun demo disediakan agar alur login dan peran admin bisa dicoba tanpa
 * backend. Kata sandi di sini bukan kredensial produksi: ia tidak pernah
 * dipakai pada mode Supabase, dan tidak ada data nyata di baliknya.
 */
function seedUsers() {
  return [
    {
      id: localId('user'),
      email: 'demo@aquatix.test',
      password: 'demo123',
      full_name: 'Pengguna Demo',
      role: 'customer',
      phone: null,
      created_at: daysFromNow(-20),
    },
    {
      id: localId('user'),
      email: 'admin@aquatix.test',
      password: 'admin123',
      full_name: 'Admin Demo',
      role: 'admin',
      phone: null,
      created_at: daysFromNow(-20),
    },
  ];
}

/** State tunggal yang dibaca dan ditulis seluruh layar pada Mode Demo. */
export const store = {
  products: seedProducts(),
  promotions: seedPromotions(),
  announcements: seedAnnouncements(),
  users: seedUsers(),
  orders: [],
  orderItems: [],
  session: null, // { userId }
};

export { localId };

/** Kode booking demo mengikuti format yang sama dengan versi server. */
export function makeBookingCode() {
  const d = new Date();
  const ymd = toISODate(d).replace(/-/g, '').slice(2); // contoh: 261102
  const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `AQX-${ymd}-${rand}`;
}

export function currentDemoUser() {
  if (!store.session) return null;
  return store.users.find((u) => u.id === store.session.userId) || null;
}
