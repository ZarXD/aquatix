/**
 * Beranda pelanggan.
 *
 * Susunan bagian mengikuti urutan keputusan pengunjung: tahu harga dulu,
 * lalu promo yang sedang berlaku, lalu pengumuman operasional, baru informasi
 * jam buka dan fasilitas. Setiap bagian memakai komposisi berbeda agar halaman
 * tidak membaca seperti satu template berulang (dial RHYTHM 2).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Header, Screen } from '../components/Screen';
import {
  Body,
  Button,
  Card,
  Chip,
  ErrorState,
  LoadingState,
  Notice,
  Section,
} from '../components/ui';
import { VENUE } from '../config';
import { announcements, products, promotions } from '../lib/api';
import { categoryVisual } from '../lib/catalog';
import { formatDateShort, formatRupiah } from '../lib/format';
import { useApp } from '../state/AppContext';
import { colors, radius, space } from '../theme';

export default function HomeScreen() {
  const { profile, isSignedIn, isDemoMode, goTab, openOverlay, addToCart } = useApp();

  const [state, setState] = useState({ loading: true, error: null });
  const [data, setData] = useState({ products: [], promos: [], news: [] });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true);
    else setState({ loading: true, error: null });

    // Ketiga sumber dimuat bersamaan: satu yang gagal tidak menahan dua lainnya.
    const [p, pr, an] = await Promise.all([
      products.listActive(),
      promotions.listLive(),
      announcements.listLive(),
    ]);

    const firstError = p.error || pr.error || an.error;
    if (firstError) {
      setState({ loading: false, error: firstError });
      setRefreshing(false);
      return;
    }

    setData({ products: p.data, promos: pr.data, news: an.data });
    setState({ loading: false, error: null });
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const greeting = profile
    ? `Halo, ${profile.full_name.split(' ')[0]}`
    : 'Selamat datang di AquaTix';
  const subtitle = isSignedIn
    ? 'Pilih tanggal kunjungan dan pesan tiket tanpa antre di loket.'
    : 'Lihat harga dan promo tanpa perlu masuk. Masuk saat akan memesan.';

  const header = <Header title={greeting} subtitle={subtitle} />;

  if (state.loading) {
    return (
      <Screen header={header}>
        <LoadingState label="Memuat harga tiket dan promo" />
      </Screen>
    );
  }

  if (state.error) {
    return (
      <Screen header={header}>
        <ErrorState error={state.error} onRetry={() => load(false)} />
      </Screen>
    );
  }

  const cheapest = data.products.reduce(
    (min, p) => (min === null || Number(p.price) < Number(min.price) ? p : min),
    null,
  );

  return (
    <Screen
      header={header}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(true)}
          colors={[colors.ocean]}
          tintColor={colors.ocean}
        />
      }
    >
      {isDemoMode && (
        <Notice tone="warning" title="Mode Demo aktif" style={styles.demoNotice}>
          Backend Supabase belum dikonfigurasi. Data di layar ini berasal dari
          memori perangkat dan akan hilang saat aplikasi dimuat ulang. Isi
          src/config.js untuk menyalakan backend.
        </Notice>
      )}

      {/* Panel ajakan utama: satu titik fokus di layar pertama. */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Tiket masuk mulai {cheapest ? formatRupiah(cheapest.price) : 'Rp5.000'}</Text>
        <Text style={styles.heroText}>
          Pesan untuk tanggal yang Anda pilih, bayar di loket, lalu tukarkan kode
          booking dengan gelang masuk.
        </Text>
        <Button
          label="Pesan tiket sekarang"
          onPress={() => goTab('catalog')}
          full
          style={styles.heroButton}
        />
      </View>

      {/* Ringkasan harga: baris datar, bukan kartu, karena isinya nama dan angka. */}
      <Section
        title="Daftar harga"
        action={
          <Pressable
            onPress={() => goTab('catalog')}
            accessibilityRole="button"
            accessibilityLabel="Buka katalog lengkap"
            style={({ pressed }) => pressed && { opacity: 0.7 }}
          >
            <Text style={styles.linkText}>Lihat katalog</Text>
          </Pressable>
        }
      >
        <Card style={styles.priceCard}>
          {data.products.map((item, index) => (
            <View
              key={item.id}
              style={[styles.priceRow, index > 0 && styles.priceRowDivided]}
            >
              <View style={styles.priceInfo}>
                <Text style={styles.priceName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.priceCategory} numberOfLines={1}>
                  {item.category}
                </Text>
              </View>
              <Text style={styles.priceValue}>{formatRupiah(item.price)}</Text>
            </View>
          ))}
        </Card>
      </Section>

      {/* Kategori populer: gulir mendatar, komposisi berbeda dari bagian di atas. */}
      <Section title="Kategori tiket">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {data.products.slice(0, 5).map((item) => {
            const visual = categoryVisual(item.category);
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  addToCart(item);
                  goTab('catalog');
                }}
                accessibilityRole="button"
                accessibilityLabel={`Tambahkan ${item.name} ke keranjang lalu buka katalog`}
                style={({ pressed }) => [
                  styles.categoryCard,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={[styles.categoryGlyphBox, { backgroundColor: visual.tint }]}>
                  <Text style={styles.categoryGlyph}>{visual.glyph}</Text>
                </View>
                <Text style={styles.categoryName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.categoryPrice}>{formatRupiah(item.price)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Section>

      {/* Promo hanya muncul bila benar-benar ada yang berlaku. */}
      {data.promos.length > 0 && (
        <Section title="Promo yang sedang berlaku">
          {data.promos.map((promo) => (
            <Card key={promo.id} style={styles.promoCard}>
              <View style={styles.promoHead}>
                <Text style={styles.promoTitle}>{promo.title}</Text>
                {Boolean(promo.promo_code) && (
                  <Chip label={promo.promo_code} tone="accent" />
                )}
              </View>
              {Boolean(promo.description) && (
                <Body style={styles.promoText}>{promo.description}</Body>
              )}
              <View style={styles.promoMeta}>
                <Text style={styles.promoMetaText}>
                  {promo.discount_type === 'percent'
                    ? `Potongan ${Number(promo.discount_value)} persen`
                    : `Potongan ${formatRupiah(promo.discount_value)}`}
                </Text>
                {Number(promo.minimum_purchase) > 0 && (
                  <Text style={styles.promoMetaText}>
                    Minimal belanja {formatRupiah(promo.minimum_purchase)}
                  </Text>
                )}
                {Boolean(promo.ends_at) && (
                  <Text style={styles.promoMetaText}>
                    Berlaku sampai {formatDateShort(promo.ends_at)}
                  </Text>
                )}
              </View>
            </Card>
          ))}
        </Section>
      )}

      {data.news.length > 0 && (
        <Section title="Pengumuman">
          {data.news.map((item) => (
            <View key={item.id} style={styles.newsItem}>
              <Text style={styles.newsTitle}>{item.title}</Text>
              <Text style={styles.newsBody}>{item.content}</Text>
              {Boolean(item.published_at) && (
                <Text style={styles.newsDate}>
                  Diumumkan {formatDateShort(item.published_at)}
                </Text>
              )}
            </View>
          ))}
        </Section>
      )}

      <Section title="Jam operasional">
        <Card>
          {VENUE.openHours.map((slot) => (
            <View key={slot.day} style={styles.hoursRow}>
              <Text style={styles.hoursDay}>{slot.day}</Text>
              <Text style={styles.hoursValue}>{slot.hours}</Text>
            </View>
          ))}
          <Text style={styles.venueNote}>{VENUE.notes}</Text>
        </Card>
      </Section>

      <Section title="Fasilitas" style={styles.lastSection}>
        <Card>
          {VENUE.facilities.map((facility) => (
            <View key={facility} style={styles.facilityRow}>
              <View style={styles.facilityMarker} />
              <Text style={styles.facilityText}>{facility}</Text>
            </View>
          ))}
        </Card>
      </Section>

      {!isSignedIn && (
        <Card style={styles.signInCard}>
          <Text style={styles.signInTitle}>Punya akun AquaTix?</Text>
          <Text style={styles.signInText}>
            Masuk untuk menyimpan riwayat pesanan dan mempercepat pemesanan
            berikutnya.
          </Text>
          <Button
            label="Masuk atau daftar"
            tone="secondary"
            onPress={() => openOverlay('auth')}
            full
            style={styles.signInButton}
          />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  demoNotice: {
    marginBottom: space.lg,
  },

  hero: {
    backgroundColor: colors.deep,
    borderRadius: radius.lg,
    padding: space.xl,
    marginBottom: space.xxl,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.inkOnDark,
    lineHeight: 29,
  },
  heroText: {
    marginTop: space.sm,
    fontSize: 14,
    lineHeight: 21,
    color: colors.inkOnDarkMuted,
  },
  heroButton: {
    marginTop: space.lg,
    backgroundColor: colors.turquoise,
    borderColor: colors.turquoise,
  },

  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ocean,
  },

  priceCard: {
    paddingVertical: space.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
  },
  priceRowDivided: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceInfo: {
    flex: 1,
    paddingRight: space.md,
  },
  priceName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  priceCategory: {
    marginTop: 1,
    fontSize: 12,
    color: colors.inkMuted,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },

  categoryRow: {
    paddingRight: space.lg,
  },
  categoryCard: {
    width: 132,
    marginRight: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  categoryGlyphBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryGlyph: {
    fontSize: 22,
  },
  categoryName: {
    marginTop: space.md,
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
    minHeight: 34,
  },
  categoryPrice: {
    marginTop: space.xs,
    fontSize: 14,
    fontWeight: '700',
    color: colors.turquoise,
  },

  promoCard: {
    marginBottom: space.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.turquoise,
  },
  promoHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  promoTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    paddingRight: space.sm,
  },
  promoText: {
    marginTop: space.sm,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted,
  },
  promoMeta: {
    marginTop: space.md,
  },
  promoMetaText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ocean,
    marginBottom: 2,
  },

  newsItem: {
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  newsBody: {
    marginTop: space.xs + 2,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted,
  },
  newsDate: {
    marginTop: space.sm,
    fontSize: 11,
    color: colors.inkMuted,
  },

  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: space.sm,
  },
  hoursDay: {
    flex: 1,
    fontSize: 13,
    color: colors.inkMuted,
    paddingRight: space.md,
  },
  hoursValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  venueNote: {
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkMuted,
  },

  facilityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: space.sm - 2,
  },
  facilityMarker: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.ocean,
    marginTop: 7,
    marginRight: space.md,
  },
  facilityText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: colors.ink,
  },

  lastSection: {
    marginBottom: space.lg,
  },

  signInCard: {
    backgroundColor: colors.oceanSoft,
    borderColor: '#BBD7E8',
  },
  signInTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.deep,
  },
  signInText: {
    marginTop: space.xs + 2,
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink,
  },
  signInButton: {
    marginTop: space.lg,
  },
});
