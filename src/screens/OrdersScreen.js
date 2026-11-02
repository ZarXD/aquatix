/**
 * Riwayat pesanan pelanggan.
 *
 * Setiap kartu bisa dibuka untuk melihat rincian tiket. Pembukaan memakai
 * state lokal, bukan layar baru, agar pengguna tidak kehilangan posisi gulir.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Header, Screen } from '../components/Screen';
import {
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
  Row,
} from '../components/ui';
import { orders as ordersApi } from '../lib/api';
import {
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  formatDateLong,
  formatDateTime,
  formatRupiah,
} from '../lib/format';
import { useApp } from '../state/AppContext';
import { colors, radius, space } from '../theme';

const STATUS_TONE = {
  pending: 'warning',
  confirmed: 'info',
  completed: 'success',
  cancelled: 'danger',
};

export default function OrdersScreen() {
  const { session, isSignedIn, isDemoMode, goTab, openOverlay } = useApp();

  const [state, setState] = useState({ loading: true, error: null });
  const [rows, setRows] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh) => {
      if (!session) {
        setState({ loading: false, error: null });
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setState({ loading: true, error: null });

      const { data, error } = await ordersApi.listMine(session.userId);
      if (error) {
        setState({ loading: false, error });
        setRefreshing(false);
        return;
      }
      setRows(data);
      setState({ loading: false, error: null });
      setRefreshing(false);
    },
    [session],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const header = <Header title="Pesanan saya" subtitle="Riwayat tiket yang pernah dipesan" />;

  // Belum masuk: ini bukan status kosong, melainkan syarat akses.
  if (!isSignedIn) {
    return (
      <Screen header={header}>
        <EmptyState
          title="Masuk untuk melihat pesanan"
          description="Riwayat pemesanan tersimpan pada akun Anda, jadi perlu masuk terlebih dahulu."
          actionLabel="Masuk atau daftar"
          onAction={() => openOverlay('auth')}
        />
      </Screen>
    );
  }

  if (state.loading) {
    return (
      <Screen header={header}>
        <LoadingState label="Memuat riwayat pesanan" />
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

  if (rows.length === 0) {
    return (
      <Screen header={header}>
        {isDemoMode && (
          <Notice tone="warning" title="Mode Demo aktif" style={styles.notice}>
            Pesanan yang dibuat di mode ini hanya bertahan selama aplikasi
            berjalan.
          </Notice>
        )}
        <EmptyState
          title="Belum ada pesanan"
          description="Pesanan pertama Anda akan muncul di sini setelah checkout selesai."
          actionLabel="Lihat katalog tiket"
          onAction={() => goTab('catalog')}
        />
      </Screen>
    );
  }

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
        <Notice tone="warning" title="Mode Demo aktif" style={styles.notice}>
          Daftar ini berasal dari memori perangkat, bukan dari Supabase.
        </Notice>
      )}

      {rows.map((order) => {
        const items = order.order_items || [];
        const isOpen = expanded === order.id;
        const quantity = items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);

        return (
          <Card key={order.id} style={styles.orderCard}>
            <View style={styles.orderHead}>
              <View style={styles.orderHeadInfo}>
                <Text style={styles.bookingCode} selectable>
                  {order.booking_code}
                </Text>
                <Text style={styles.orderDate}>
                  Kunjungan {formatDateLong(order.visit_date)}
                </Text>
              </View>
              <Chip
                label={ORDER_STATUS_LABEL[order.status] || order.status}
                tone={STATUS_TONE[order.status] || 'neutral'}
              />
            </View>

            <View style={styles.orderMeta}>
              <Text style={styles.orderMetaText}>
                {quantity} tiket, {PAYMENT_METHOD_LABEL[order.payment_method] || order.payment_method}
              </Text>
              <Text style={styles.orderTotal}>{formatRupiah(order.total_amount)}</Text>
            </View>

            <Pressable
              onPress={() => setExpanded(isOpen ? null : order.id)}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              accessibilityLabel={
                isOpen
                  ? `Tutup rincian pesanan ${order.booking_code}`
                  : `Lihat rincian pesanan ${order.booking_code}`
              }
              style={({ pressed }) => [styles.toggle, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.toggleLabel}>
                {isOpen ? 'Tutup rincian' : 'Lihat rincian'}
              </Text>
            </Pressable>

            {isOpen && (
              <View style={styles.detail}>
                <Divider />
                {items.map((item, index) => (
                  <View key={item.id || `${order.id}-${index}`} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {item.product_name}
                      </Text>
                      <Text style={styles.itemMeta}>
                        {item.quantity} x {formatRupiah(item.unit_price)}
                      </Text>
                    </View>
                    <Text style={styles.itemSubtotal}>
                      {formatRupiah(item.subtotal)}
                    </Text>
                  </View>
                ))}

                <Divider />
                <Row label="Subtotal" value={formatRupiah(order.subtotal)} />
                {Number(order.discount_amount) > 0 && (
                  <Row
                    label="Potongan promo"
                    value={`− ${formatRupiah(order.discount_amount)}`}
                    tone="accent"
                  />
                )}
                <Row
                  label="Total pembayaran"
                  value={formatRupiah(order.total_amount)}
                  strong
                />
                <Row
                  label="Status pembayaran"
                  value={PAYMENT_STATUS_LABEL[order.payment_status] || order.payment_status}
                />
                <Row label="Dipesan pada" value={formatDateTime(order.created_at)} />

                {order.status === 'pending' && (
                  <Text style={styles.pendingNote}>
                    Pesanan menunggu konfirmasi petugas. Hubungi loket bila
                    tanggal kunjungan perlu diubah.
                  </Text>
                )}
              </View>
            )}
          </Card>
        );
      })}

      <Button
        label="Pesan tiket lagi"
        tone="secondary"
        onPress={() => goTab('catalog')}
        full
        style={styles.footerAction}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: {
    marginBottom: space.lg,
  },
  orderCard: {
    marginBottom: space.md,
  },
  orderHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  orderHeadInfo: {
    flex: 1,
    paddingRight: space.md,
  },
  bookingCode: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: 0.5,
  },
  orderDate: {
    marginTop: 2,
    fontSize: 12,
    color: colors.inkMuted,
  },
  orderMeta: {
    marginTop: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderMetaText: {
    flex: 1,
    fontSize: 13,
    color: colors.inkMuted,
    paddingRight: space.md,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  toggle: {
    marginTop: space.md,
    minHeight: 40,
    justifyContent: 'center',
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ocean,
  },
  detail: {
    marginTop: space.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.xs + 2,
  },
  itemInfo: {
    flex: 1,
    paddingRight: space.md,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  itemMeta: {
    marginTop: 1,
    fontSize: 12,
    color: colors.inkMuted,
  },
  itemSubtotal: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  pendingNote: {
    marginTop: space.md,
    padding: space.md,
    borderRadius: radius.sm,
    backgroundColor: colors.warningSoft,
    fontSize: 12,
    lineHeight: 18,
    color: colors.warning,
  },
  footerAction: {
    marginTop: space.sm,
  },
});
