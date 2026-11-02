/**
 * Dasbor admin.
 *
 * Keputusan yang dilayani layar ini: "apa yang perlu saya tangani hari ini,
 * dan berapa uang yang sudah benar-benar masuk." Karena itu pesanan menunggu
 * konfirmasi diletakkan paling atas sebagai tindakan, bukan sebagai angka
 * dekoratif, dan pendapatan dipisah dari nilai pesanan yang belum selesai.
 *
 * Tiga angka yang sering tertukar dibedakan secara eksplisit:
 * - Total pesanan: semua pesanan termasuk yang dibatalkan.
 * - Nilai pesanan berjalan: pesanan dikonfirmasi dan selesai.
 * - Pendapatan: hanya pesanan berstatus selesai, yaitu uang yang sudah diterima.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Header, Screen } from '../../components/Screen';
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
  SectionTitle,
  SelectChip,
} from '../../components/ui';
import { admin } from '../../lib/api';
import {
  ORDER_STATUS_LABEL,
  formatDateShort,
  formatRupiah,
  toISODate,
} from '../../lib/format';
import { useApp } from '../../state/AppContext';
import { colors, radius, space } from '../../theme';

/** Rentang laporan memakai tanggal kunjungan, bukan tanggal transaksi dibuat. */
const RANGES = [
  { key: '7', label: '7 hari ke depan', days: 7 },
  { key: '30', label: '30 hari ke depan', days: 30 },
  { key: 'all', label: 'Semua periode', days: null },
];

export default function AdminDashboard() {
  const { profile, isDemoMode, goTab } = useApp();

  const [rangeKey, setRangeKey] = useState('30');
  const [state, setState] = useState({ loading: true, error: null });
  const [metrics, setMetrics] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const range = useMemo(() => {
    const found = RANGES.find((r) => r.key === rangeKey) || RANGES[1];
    if (found.days === null) return {};
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + found.days);
    // Batas bawah mundur 30 hari agar kunjungan yang sudah lewat tetap terhitung.
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
    return { fromDate: toISODate(start), toDate: toISODate(end) };
  }, [rangeKey]);

  const load = useCallback(
    async (isRefresh) => {
      if (isRefresh) setRefreshing(true);
      else setState({ loading: true, error: null });

      const { data, error } = await admin.dashboard(range);
      if (error) {
        setState({ loading: false, error });
        setRefreshing(false);
        return;
      }
      setMetrics(data);
      setState({ loading: false, error: null });
      setRefreshing(false);
    },
    [range],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const header = (
    <Header
      title="Dasbor"
      subtitle={profile ? `Masuk sebagai ${profile.full_name}` : undefined}
    />
  );

  if (state.loading) {
    return (
      <Screen header={header}>
        <LoadingState label="Menghitung laporan penjualan" />
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
        <Notice tone="warning" title="Mode Demo aktif" style={styles.block}>
          Laporan dihitung dari data contoh di perangkat ini, bukan dari basis
          data Supabase.
        </Notice>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rangeRow}
      >
        {RANGES.map((r) => (
          <SelectChip
            key={r.key}
            label={r.label}
            selected={rangeKey === r.key}
            onPress={() => setRangeKey(r.key)}
            accessibilityLabel={`Tampilkan laporan untuk ${r.label}`}
          />
        ))}
      </ScrollView>

      {/* Tindakan paling mendesak diletakkan sebelum angka ringkasan. */}
      {metrics.pendingOrders > 0 ? (
        <View style={styles.actionPanel}>
          <Text style={styles.actionTitle}>
            {metrics.pendingOrders} pesanan menunggu konfirmasi
          </Text>
          <Text style={styles.actionText}>
            Pesanan belum dikonfirmasi tidak masuk hitungan pendapatan dan
            belum terlihat sebagai kuota terpakai di loket.
          </Text>
          <Button
            label="Tangani sekarang"
            onPress={() => goTab('orders')}
            full
            style={styles.actionButton}
          />
        </View>
      ) : (
        <Notice tone="success" title="Tidak ada antrean konfirmasi" style={styles.block}>
          Semua pesanan pada periode ini sudah diproses.
        </Notice>
      )}

      <SectionTitle style={styles.blockTitle}>Uang masuk</SectionTitle>
      <Card style={styles.block}>
        <Text style={styles.revenueLabel}>Pendapatan dari pesanan selesai</Text>
        <Text style={styles.revenueValue}>{formatRupiah(metrics.revenue)}</Text>
        <Text style={styles.revenueNote}>
          Dihitung dari {metrics.completedOrders} pesanan berstatus selesai.
          Pesanan yang dibatalkan tidak pernah dihitung.
        </Text>

        <Divider />
        <Row
          label="Nilai pesanan berjalan (dikonfirmasi dan selesai)"
          value={formatRupiah(metrics.projectedRevenue)}
        />
        <Row label="Pesanan berjalan" value={`${metrics.billableOrders} pesanan`} />
        <Text style={styles.revenueNote}>
          Nilai berjalan mencakup pesanan yang sudah dikonfirmasi tetapi
          pembayarannya belum tercatat selesai di loket.
        </Text>
      </Card>

      <SectionTitle style={styles.blockTitle}>Ringkasan operasional</SectionTitle>
      <Card style={styles.block}>
        <Row label="Total pesanan dibuat" value={`${metrics.totalOrders}`} strong />
        <Row label="Menunggu konfirmasi" value={`${metrics.pendingOrders}`} />
        <Row label="Selesai" value={`${metrics.completedOrders}`} />
        <Row
          label="Dibatalkan"
          value={`${metrics.cancelledOrders}`}
          tone={metrics.cancelledOrders > 0 ? 'danger' : undefined}
        />
        <Divider />
        <Row label="Tiket terjual (tanpa pesanan batal)" value={`${metrics.ticketsSold} tiket`} />
        <Row label="Pelanggan terdaftar" value={`${metrics.customerCount} akun`} />
      </Card>

      <SectionTitle style={styles.blockTitle}>Layanan paling banyak diambil</SectionTitle>
      {metrics.topProducts.length === 0 ? (
        <Card style={styles.block}>
          <EmptyState
            title="Belum ada tiket terjual pada periode ini"
            description="Angka akan muncul setelah ada pesanan yang tidak dibatalkan."
          />
        </Card>
      ) : (
        <Card style={styles.block}>
          {metrics.topProducts.map((item, index) => (
            <View key={item.name}>
              {index > 0 && <Divider />}
              <View style={styles.topRow}>
                <Text style={styles.topRank}>{index + 1}</Text>
                <View style={styles.topInfo}>
                  <Text style={styles.topName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.topMeta}>
                    {item.quantity} unit, {formatRupiah(item.value)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </Card>
      )}

      <SectionTitle style={styles.blockTitle}>
        Penjualan per tanggal kunjungan
      </SectionTitle>
      {metrics.dailySales.length === 0 ? (
        <Card style={styles.block}>
          <EmptyState
            title="Belum ada pesanan selesai"
            description="Ringkasan harian menghitung pesanan berstatus selesai saja."
          />
        </Card>
      ) : (
        <Card style={styles.block}>
          {metrics.dailySales.map((day, index) => (
            <View key={day.date}>
              {index > 0 && <Divider />}
              <View style={styles.dayRow}>
                <View style={styles.dayInfo}>
                  <Text style={styles.dayDate}>{formatDateShort(day.date)}</Text>
                  <Text style={styles.dayMeta}>{day.orders} pesanan selesai</Text>
                </View>
                <Text style={styles.dayValue}>{formatRupiah(day.revenue)}</Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      <SectionTitle style={styles.blockTitle}>Pesanan terbaru</SectionTitle>
      {metrics.recentOrders.length === 0 ? (
        <Card style={styles.lastBlock}>
          <EmptyState
            title="Belum ada pesanan masuk"
            description="Pesanan baru dari pelanggan akan muncul di sini."
          />
        </Card>
      ) : (
        <Card style={styles.lastBlock}>
          {metrics.recentOrders.map((order, index) => (
            <View key={order.id}>
              {index > 0 && <Divider />}
              <View style={styles.recentRow}>
                <View style={styles.recentInfo}>
                  <Text style={styles.recentCode}>{order.booking_code}</Text>
                  <Text style={styles.recentMeta}>
                    Kunjungan {formatDateShort(order.visit_date)}
                  </Text>
                </View>
                <View style={styles.recentRight}>
                  <Text style={styles.recentTotal}>
                    {formatRupiah(order.total_amount)}
                  </Text>
                  <Chip
                    label={ORDER_STATUS_LABEL[order.status] || order.status}
                    tone={
                      order.status === 'completed'
                        ? 'success'
                        : order.status === 'cancelled'
                        ? 'danger'
                        : order.status === 'pending'
                        ? 'warning'
                        : 'info'
                    }
                    style={styles.recentChip}
                  />
                </View>
              </View>
            </View>
          ))}
          <Button
            label="Buka semua pesanan"
            tone="secondary"
            onPress={() => goTab('orders')}
            full
            style={styles.recentAction}
          />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: {
    marginBottom: space.xl,
  },
  lastBlock: {
    marginBottom: space.md,
  },
  blockTitle: {
    marginBottom: space.md,
  },

  rangeRow: {
    paddingBottom: space.xl,
  },

  actionPanel: {
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: '#E6CF9A',
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.xl,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.warning,
  },
  actionText: {
    marginTop: space.sm,
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink,
  },
  actionButton: {
    marginTop: space.lg,
  },

  revenueLabel: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  revenueValue: {
    marginTop: space.xs,
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
  },
  revenueNote: {
    marginTop: space.sm,
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkMuted,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.xs,
  },
  topRank: {
    width: 26,
    fontSize: 15,
    fontWeight: '700',
    color: colors.ocean,
  },
  topInfo: {
    flex: 1,
  },
  topName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  topMeta: {
    marginTop: 1,
    fontSize: 12,
    color: colors.inkMuted,
  },

  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.xs,
  },
  dayInfo: {
    flex: 1,
    paddingRight: space.md,
  },
  dayDate: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  dayMeta: {
    marginTop: 1,
    fontSize: 12,
    color: colors.inkMuted,
  },
  dayValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },

  recentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: space.xs,
  },
  recentInfo: {
    flex: 1,
    paddingRight: space.md,
  },
  recentCode: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  recentMeta: {
    marginTop: 1,
    fontSize: 12,
    color: colors.inkMuted,
  },
  recentRight: {
    alignItems: 'flex-end',
  },
  recentTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  recentChip: {
    marginTop: space.xs,
  },
  recentAction: {
    marginTop: space.lg,
  },
});
