/**
 * Katalog tiket dan layanan.
 *
 * Memakai FlatList, bukan ScrollView, agar daftar panjang tetap ringan. Bilah
 * ringkasan keranjang muncul melayang di atas tab bar hanya saat keranjang
 * berisi, sehingga ruang layar tidak terpakai saat belum ada apa-apa.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import ProductCard from '../components/ProductCard';
import { Header, Screen, TAB_BAR_HEIGHT } from '../components/Screen';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
  SelectChip,
} from '../components/ui';
import { products as productsApi } from '../lib/api';
import { formatRupiah } from '../lib/format';
import { useApp } from '../state/AppContext';
import { colors, elevation, radius, space } from '../theme';

const ALL = 'Semua';

export default function CatalogScreen() {
  const { cart, itemCount, subtotal, isDemoMode, addToCart, openOverlay } = useApp();

  const [state, setState] = useState({ loading: true, error: null });
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState(ALL);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true);
    else setState({ loading: true, error: null });

    const { data, error } = await productsApi.listActive();
    if (error) {
      setState({ loading: false, error });
      setRefreshing(false);
      return;
    }
    setItems(data);
    setState({ loading: false, error: null });
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  // Filter dibangun dari kategori yang benar-benar ada di data, bukan dari
  // daftar tetap, supaya kategori baru buatan admin ikut muncul.
  const categories = useMemo(() => {
    const unique = [];
    items.forEach((item) => {
      if (item.category && !unique.includes(item.category)) unique.push(item.category);
    });
    return [ALL, ...unique];
  }, [items]);

  const visible = useMemo(
    () => (filter === ALL ? items : items.filter((p) => p.category === filter)),
    [items, filter],
  );

  const quantityOf = useCallback(
    (productId) => {
      const line = cart.find((l) => l.productId === productId);
      return line ? line.quantity : 0;
    },
    [cart],
  );

  const header = (
    <Header
      title="Katalog tiket"
      subtitle="Pilih tiket dan layanan, lalu atur jumlahnya di keranjang."
    />
  );

  if (state.loading) {
    return (
      <Screen header={header} scroll={false}>
        <LoadingState label="Memuat katalog" />
      </Screen>
    );
  }

  if (state.error) {
    return (
      <Screen header={header} scroll={false}>
        <ErrorState error={state.error} onRetry={() => load(false)} />
      </Screen>
    );
  }

  const listHeader = (
    <View>
      {isDemoMode && (
        <Notice tone="warning" title="Mode Demo aktif" style={styles.notice}>
          Katalog ini berasal dari data contoh di perangkat, bukan dari Supabase.
        </Notice>
      )}
      {categories.length > 2 && (
        <FlatList
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(c) => c}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item }) => (
            <SelectChip
              label={item}
              selected={filter === item}
              onPress={() => setFilter(item)}
              accessibilityLabel={`Saring katalog: ${item}`}
            />
          )}
        />
      )}
    </View>
  );

  return (
    <Screen header={header} scroll={false} contentStyle={styles.body}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[
          styles.listContent,
          // Ruang bawah menyesuaikan: lebih lega saat bilah keranjang tampil.
          { paddingBottom: TAB_BAR_HEIGHT + (itemCount > 0 ? 104 : space.xl) },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            colors={[colors.ocean]}
            tintColor={colors.ocean}
          />
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            quantityInCart={quantityOf(item.id)}
            onAdd={() => addToCart(item)}
          />
        )}
        ListEmptyComponent={
          filter === ALL ? (
            <EmptyState
              title="Belum ada tiket yang dijual"
              description="Admin belum mengaktifkan satu pun produk. Coba muat ulang beberapa saat lagi."
              actionLabel="Muat ulang"
              onAction={() => load(false)}
            />
          ) : (
            <EmptyState
              title={`Tidak ada tiket pada kategori ${filter}`}
              description="Kategori lain mungkin masih punya tiket yang tersedia."
              actionLabel="Tampilkan semua kategori"
              onAction={() => setFilter(ALL)}
            />
          )
        }
        showsVerticalScrollIndicator={false}
      />

      {itemCount > 0 && (
        <View style={styles.cartBar}>
          <View style={styles.cartInfo}>
            <Text style={styles.cartCount}>
              {itemCount} item di keranjang
            </Text>
            <Text style={styles.cartTotal}>{formatRupiah(subtotal)}</Text>
          </View>
          <Button
            label="Buka keranjang"
            onPress={() => openOverlay('cart')}
            accessibilityLabel={`Buka keranjang, ${itemCount} item, total ${formatRupiah(subtotal)}`}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 0,
  },
  listContent: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
  },
  notice: {
    marginBottom: space.lg,
  },
  filterRow: {
    paddingBottom: space.lg,
  },

  cartBar: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    bottom: TAB_BAR_HEIGHT + space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    ...elevation.bar,
  },
  cartInfo: {
    flex: 1,
    paddingRight: space.md,
  },
  cartCount: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  cartTotal: {
    marginTop: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
  },
});
