// ============================================================================
// KONFIGURASI SUPABASE -- SATU-SATUNYA FILE YANG PERLU DIUBAH
// ============================================================================
//
// 1. Buka project Supabase Anda: Settings > API.
// 2. Salin "Project URL" ke SUPABASE_URL.
// 3. Salin kunci "anon" / "publishable" ke SUPABASE_ANON_KEY.
//
// JANGAN pernah menempelkan service_role key di sini. Kunci itu melewati
// seluruh Row Level Security dan file ini ikut terkirim ke perangkat pengguna.
//
// Selama kedua nilai masih placeholder, aplikasi berjalan dalam Mode Demo:
// data berasal dari memori perangkat, tidak ada yang tersimpan ke server.

export const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY';

// Konfigurasi dianggap terisi hanya jika URL berbentuk https://xxx.supabase.co
// dan anon key berbentuk token JWT (3 segmen dipisah titik) atau kunci
// publishable baru (sb_publishable_...). Pengecekan ini mencegah aplikasi
// mencoba menyambung dengan nilai setengah jadi lalu melempar error jaringan
// yang membingungkan.
export function isSupabaseConfigured() {
  const url = String(SUPABASE_URL || '').trim();
  const key = String(SUPABASE_ANON_KEY || '').trim();

  const urlLooksReal =
    /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url) &&
    !url.includes('YOUR_PROJECT');

  const keyLooksReal =
    !key.includes('YOUR_SUPABASE') &&
    (key.split('.').length === 3 || key.startsWith('sb_publishable_')) &&
    key.length > 30;

  return urlLooksReal && keyLooksReal;
}

// Informasi operasional yang ditampilkan di beranda.
// Ini data contoh milik lokasi fiktif; ganti sesuai kolam renang Anda.
export const VENUE = {
  name: 'AquaTix',
  tagline: 'Pemesanan tiket kolam renang keluarga',
  openHours: [
    { day: 'Senin sampai Jumat', hours: '08.00 - 17.00 WIB' },
    { day: 'Sabtu, Minggu, libur nasional', hours: '07.00 - 18.00 WIB' },
  ],
  facilities: [
    'Kolam dewasa kedalaman 1,4 meter',
    'Kolam anak kedalaman 0,5 meter dengan perosotan',
    'Ruang bilas dan loker',
    'Kantin dan area makan beratap',
    'Parkir motor dan mobil',
  ],
  notes:
    'Tiket berlaku untuk tanggal kunjungan yang dipilih saat pemesanan. ' +
    'Tunjukkan kode booking di loket untuk ditukar gelang masuk.',
};
