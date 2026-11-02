/**
 * Navigasi bawah berbasis state.
 *
 * Tanpa pustaka navigasi: layar aktif ditentukan satu nilai string di context,
 * sehingga aplikasi tetap ringan dan langsung berjalan di Expo Snack.
 *
 * Penanda tab aktif memakai tiga sinyal sekaligus, tidak hanya warna: garis
 * atas, berat huruf, dan `accessibilityState.selected`.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TAB_BAR_HEIGHT } from './Screen';
import { colors, elevation, radius, space } from '../theme';

const CUSTOMER_TABS = [
  { key: 'home', label: 'Beranda' },
  { key: 'catalog', label: 'Tiket' },
  { key: 'orders', label: 'Pesanan' },
  { key: 'profile', label: 'Profil' },
];

const ADMIN_TABS = [
  { key: 'home', label: 'Dasbor' },
  { key: 'catalog', label: 'Produk' },
  { key: 'orders', label: 'Pesanan' },
  { key: 'profile', label: 'Promo' },
];

export default function TabBar({ active, onChange, isAdmin, cartCount }) {
  const tabs = isAdmin ? ADMIN_TABS : CUSTOMER_TABS;

  return (
    <View style={styles.bar} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const selected = active === tab.key;
        // Jumlah keranjang hanya relevan pada tab katalog milik pelanggan.
        const badge = !isAdmin && tab.key === 'catalog' && cartCount > 0 ? cartCount : 0;

        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={
              badge > 0 ? `${tab.label}, ${badge} item di keranjang` : tab.label
            }
            style={({ pressed }) => [styles.tab, pressed && { opacity: 0.7 }]}
          >
            <View style={[styles.indicator, selected && styles.indicatorOn]} />
            <View style={styles.labelRow}>
              <Text
                style={[styles.label, selected && styles.labelOn]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
              {badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
                </View>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...elevation.bar,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    height: 3,
    width: 38,
    borderBottomLeftRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
    backgroundColor: 'transparent',
  },
  indicatorOn: {
    backgroundColor: colors.ocean,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.inkMuted,
  },
  labelOn: {
    fontWeight: '700',
    color: colors.ocean,
  },
  badge: {
    marginLeft: space.xs + 2,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: radius.chip,
    backgroundColor: colors.turquoise,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.inkOnDark,
    fontSize: 11,
    fontWeight: '700',
  },
});
