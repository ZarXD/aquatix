/**
 * Design tokens AquaTix.
 *
 * Arah visual: "coastal utility" -- biru laut sebagai warna institusional kolam
 * renang, turquoise hanya sebagai aksen tindakan. Semua warna solid, tanpa
 * gradient, agar identitas datang dari hierarki bukan dari dekorasi.
 *
 * Dial: ENERGY 2 / RHYTHM 2 / MOTION 1.
 */

/**
 * Palet inti dibatasi 2 warna utama (deep + ocean) + 1 aksen (turquoise).
 * Netral tidak dihitung sebagai warna inti.
 * Semua pasangan teks/latar di bawah sudah diverifikasi >= 4.5:1 (WCAG AA).
 */
export const colors = {
  // Warna inti
  deep: '#06374F', // header, permukaan gelap. Teks putih di atasnya = 12.6:1
  ocean: '#0B5C8A', // tombol primer, elemen aktif. Teks putih = 7.2:1
  oceanSoft: '#E4F0F7', // latar lunak untuk penanda terpilih
  // Aksen tunggal, dipakai hemat: badge promo dan ikon harga
  turquoise: '#0A7A6E', // teks putih = 5.2:1
  turquoiseSoft: '#E0F2EF',

  // Netral
  bg: '#F3F6F8',
  surface: '#FFFFFF',
  border: '#D8E1E8',
  borderStrong: '#B6C5D0',

  // Teks
  ink: '#102430', // di atas putih = 15.9:1
  inkMuted: '#53646F', // di atas putih = 6.1:1, di atas bg = 5.7:1
  inkOnDark: '#FFFFFF',
  inkOnDarkMuted: '#C3D7E3', // di atas deep = 8.5:1

  // Status
  danger: '#A4231C', // teks putih = 7.4:1
  dangerSoft: '#FBE9E7',
  warning: '#7A5200', // teks putih = 6.9:1
  warningSoft: '#FDF0D9',
  success: '#1A6340', // teks putih = 7.2:1
  successSoft: '#E2F1E9',
  info: '#0B5C8A',
  infoSoft: '#E4F0F7',
};

/** Skala spasi kelipatan 4 agar ritme antar bagian bisa divariasikan secara sadar. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

/**
 * Radius dibedakan per peran, bukan diseragamkan:
 * chip memakai pill karena menandai status, kartu memakai radius sedang.
 */
export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  chip: 999,
};

/**
 * Tipografi memakai font sistem (Roboto di Android, SF di iOS) karena Expo Go
 * memuatnya tanpa aset tambahan dan metrik bacanya sudah dioptimalkan vendor.
 * Hierarki dibangun dari ukuran dan berat, bukan dari letter-spacing lebar.
 */
export const type = {
  display: { fontSize: 26, fontWeight: '700', color: colors.ink },
  title: { fontSize: 20, fontWeight: '700', color: colors.ink },
  section: { fontSize: 16, fontWeight: '700', color: colors.ink },
  body: { fontSize: 15, fontWeight: '400', color: colors.ink },
  bodyStrong: { fontSize: 15, fontWeight: '600', color: colors.ink },
  small: { fontSize: 13, fontWeight: '400', color: colors.inkMuted },
  smallStrong: { fontSize: 13, fontWeight: '600', color: colors.ink },
  tiny: { fontSize: 11, fontWeight: '600', color: colors.inkMuted },
};

/**
 * Bayangan hanya dipakai pada dua elemen yang benar-benar melayang di atas
 * konten: tab bar bawah dan bilah ringkasan checkout. Kartu memakai garis tepi.
 */
export const elevation = {
  bar: {
    shadowColor: '#06374F',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
};

/** Tinggi minimum sentuh 44px sesuai target tap yang nyaman di ponsel. */
export const TAP_MIN = 44;
