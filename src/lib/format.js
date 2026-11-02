/**
 * Util format dan validasi bersama.
 * Sengaja tanpa Intl.NumberFormat: dukungan locale id-ID pada Hermes/Expo Go
 * bervariasi antar versi, jadi format Rupiah dihitung manual agar konsisten.
 */

/** 25000 -> "Rp25.000". Pecahan dibulatkan karena harga tiket selalu bulat. */
export function formatRupiah(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'Rp0';
  const rounded = Math.round(Math.abs(n));
  const digits = String(rounded);
  let out = '';
  for (let i = 0; i < digits.length; i += 1) {
    // Sisipkan titik setiap 3 digit dihitung dari kanan.
    const fromRight = digits.length - i;
    out += digits[i];
    if (fromRight > 1 && fromRight % 3 === 1) out += '.';
  }
  return (n < 0 ? '-Rp' : 'Rp') + out;
}

/** Date -> "2026-11-02" memakai waktu lokal perangkat, bukan UTC. */
export function toISODate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/** "2026-11-02" -> "Senin, 2 November 2026". */
export function formatDateLong(isoDate) {
  if (!isoDate) return '-';
  const [y, m, d] = String(isoDate).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return String(isoDate);
  const date = new Date(y, m - 1, d);
  return `${DAY_NAMES[date.getDay()]}, ${d} ${MONTH_NAMES[m - 1]} ${y}`;
}

/** "2026-11-02" -> "2 Nov 2026", untuk ruang sempit seperti baris daftar. */
export function formatDateShort(isoDate) {
  if (!isoDate) return '-';
  const [y, m, d] = String(isoDate).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return String(isoDate);
  return `${d} ${MONTH_NAMES[m - 1].slice(0, 3)} ${y}`;
}

/** Timestamptz -> "2 Nov 2026, 14.05" untuk riwayat dan log admin. */
export function formatDateTime(timestamp) {
  if (!timestamp) return '-';
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return String(timestamp);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${formatDateShort(toISODate(d))}, ${hh}.${mm}`;
}

/** Tanggal hari ini dan N hari ke depan, dipakai pemilih tanggal kunjungan. */
export function nextDays(count) {
  const out = [];
  const base = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    out.push({
      iso: toISODate(d),
      dayName: DAY_NAMES[d.getDay()],
      dayNumber: d.getDate(),
      monthShort: MONTH_NAMES[d.getMonth()].slice(0, 3),
      isToday: i === 0,
    });
  }
  return out;
}

/** Validasi email sederhana: cukup untuk mencegah salah ketik, bukan RFC 5322. */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim());
}

/**
 * Harga dari TextInput admin. Menerima "25000", "25.000", dan "25000,50".
 * Mengembalikan null jika bukan angka nonnegatif yang sah.
 */
export function parsePriceInput(raw) {
  const cleaned = String(raw || '')
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  if (cleaned === '' || cleaned === '-') return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

/** Label status pesanan dalam bahasa Indonesia untuk tampilan. */
export const ORDER_STATUS_LABEL = {
  pending: 'Menunggu konfirmasi',
  confirmed: 'Dikonfirmasi',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export const PAYMENT_STATUS_LABEL = {
  unpaid: 'Belum dibayar',
  paid: 'Lunas',
  refunded: 'Dikembalikan',
};

export const PAYMENT_METHOD_LABEL = {
  onsite: 'Bayar di loket',
  transfer: 'Transfer bank (simulasi)',
};

/**
 * Transisi status yang diizinkan alur bisnis. Dipakai panel admin agar tombol
 * yang muncul hanya langkah yang masuk akal; database menegakkan aturan yang
 * sama lewat trigger, jadi daftar ini bukan satu-satunya penjaga.
 */
export const ALLOWED_STATUS_FLOW = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};
