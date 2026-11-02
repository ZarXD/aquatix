/**
 * Klien Supabase tunggal untuk seluruh aplikasi.
 *
 * Dibuat lewat factory yang mengembalikan null bila konfigurasi masih
 * placeholder, sehingga Mode Demo tidak pernah menyentuh jaringan dan tidak
 * melempar error saat aplikasi pertama dibuka.
 */

// Polyfill URL wajib didahulukan: supabase-js menyusun endpoint dengan
// `new URL()`, sedangkan Hermes tidak menyediakannya secara lengkap.
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from '../config';

let client = null;

if (isSupabaseConfigured()) {
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Wajib false di React Native: tidak ada URL browser untuk dibaca,
      // dan membiarkannya true memicu akses ke objek window.
      detectSessionInUrl: false,
    },
  });
}

export const supabase = client;

/** True bila aplikasi berjalan tanpa backend (data lokal sementara). */
export const isDemoMode = client === null;

/**
 * Menerjemahkan error Supabase ke kalimat yang bisa dimengerti pengguna.
 * Pesan asli tetap disertakan sebagai `detail` agar bisa dilihat pada layar
 * error, bukan hanya di console.
 */
export function describeError(error) {
  if (!error) return null;
  const raw = String(error.message || error.error_description || error);
  const code = error.code || error.status || '';

  const map = [
    {
      match: /invalid login credentials/i,
      text: 'Email atau kata sandi tidak cocok. Periksa kembali keduanya.',
    },
    {
      match: /email not confirmed/i,
      text:
        'Email ini belum diverifikasi. Buka tautan konfirmasi yang dikirim ' +
        'Supabase, lalu masuk lagi.',
    },
    {
      match: /user already registered|already been registered/i,
      text: 'Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.',
    },
    {
      match: /password should be at least/i,
      text: 'Kata sandi minimal 6 karakter.',
    },
    {
      match: /network request failed|fetch failed|failed to fetch/i,
      text:
        'Perangkat tidak bisa menghubungi Supabase. Periksa koneksi internet ' +
        'lalu coba lagi.',
    },
    {
      match: /jwt expired|invalid jwt|token has expired/i,
      text: 'Sesi Anda sudah berakhir. Silakan masuk kembali.',
    },
    {
      match: /row-level security|permission denied|not authorized/i,
      text: 'Akun Anda tidak punya izin untuk tindakan ini.',
    },
    {
      match: /relation .* does not exist|schema cache/i,
      text:
        'Tabel database belum dibuat. Jalankan file SQL pada folder sql/ ' +
        'melalui Supabase SQL Editor.',
    },
    {
      match: /could not find the function|function .* does not exist/i,
      text:
        'Fungsi checkout belum terpasang. Jalankan sql/03_functions.sql di ' +
        'Supabase SQL Editor.',
    },
    {
      match: /duplicate key value/i,
      text: 'Data dengan penanda yang sama sudah ada.',
    },
    {
      match: /for security purposes|rate limit|too many requests/i,
      text: 'Terlalu banyak percobaan. Tunggu sekitar satu menit, lalu ulangi.',
    },
  ];

  const hit = map.find((m) => m.match.test(raw));
  return {
    message: hit ? hit.text : 'Terjadi kesalahan saat menghubungi server.',
    detail: code ? `${code}: ${raw}` : raw,
  };
}
