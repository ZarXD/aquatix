/**
 * Kategori layanan dan representasi visualnya.
 *
 * Catatan desain: emoji di sini adalah satu-satunya tempat emoji dipakai di
 * seluruh aplikasi, yaitu sebagai gambar pengganti ketika `image_url` kosong
 * atau gambar eksternal gagal dimuat. Emoji tidak dipakai pada judul, tombol,
 * label, atau isi teks, karena di sana ia hanya menjadi hiasan.
 */

export const CATEGORIES = [
  'Tiket Dewasa',
  'Tiket Anak-anak',
  'Paket Keluarga',
  'Sewa Ban',
  'Sewa Loker',
];

const FALLBACK = { glyph: '🎫', tint: '#E4F0F7', ink: '#06374F' };

/**
 * Warna latar thumbnail dibedakan per kategori supaya daftar panjang tetap
 * bisa dipindai mata tanpa membaca label satu per satu.
 */
const VISUALS = {
  'Tiket Dewasa': { glyph: '🏊', tint: '#E4F0F7', ink: '#06374F' },
  'Tiket Anak-anak': { glyph: '🛝', tint: '#FDF0D9', ink: '#7A5200' },
  'Paket Keluarga': { glyph: '👪', tint: '#E0F2EF', ink: '#0A7A6E' },
  'Sewa Ban': { glyph: '🛟', tint: '#FBE9E7', ink: '#A4231C' },
  'Sewa Loker': { glyph: '🔑', tint: '#EDEFF2', ink: '#53646F' },
};

export function categoryVisual(category) {
  return VISUALS[category] || FALLBACK;
}
