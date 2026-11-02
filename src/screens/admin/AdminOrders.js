/**
 * Manajemen pesanan dan pelanggan.
 *
 * Dua tampilan dalam satu tab karena keduanya menjawab pertanyaan yang sama
 * dari sisi berbeda: "pesanan mana yang perlu diproses" dan "siapa yang
 * memesan". Berpindah di antaranya tidak memuat ulang halaman.
 *
 * Tombol perubahan status hanya menampilkan langkah yang sah menurut alur
 * bisnis. Database menegakkan aturan yang sama lewat trigger, jadi daftar di
 * aplikasi bukan satu-satunya penjaga.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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
  SelectChip,
} from '../../components/ui';
import { admin, orders as ordersApi } from '../../lib/api';
import {
  ALLOWED_STATUS_FLOW,
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  formatDateLong,
  formatDateShort,
  formatDateTime,
  formatRupiah,
} from '../../lib/format';
import { useApp } from '../../state/AppContext';
import { colors, space } from '../../theme';

const STATUS_FILTERS = [
  { key: '', label: 'Semua status' },
  { key: 'pending', label: 'Menunggu' },
  { key: 'confirmed', label: 'Dikonfirmasi' },
  { key: 'completed', label: 'Selesai' },
  { key: 'cancelled', label: 'Dibatalkan' },
];

const STATUS_TONE = {
  pending: 'warning',
  confirmed: 'info',
  completed: 'success',
  cancelled: 'danger',
};

export default function AdminOrders() {
  const { isDemoMode } = useApp();

  const [view, setView] = useState('orders');
  const [statusFilter, setStatusFilter] = useState('');
  const [state, setState] = useState({ loading: true, error: null });
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(
    async (isRefresh) => {
      if (isRefresh) setRefreshing(true);
      else setState({ loading: true, error: null });

      const [o, c] = await Promise.all([
        ordersApi.listAll({ status: statusFilter || undefined }),
        admin.listCustomers(),
      ]);

      const firstError = o.error || c.error;
      if (firstError) {
        setState({ loading: false, error: firstError });
        setRefreshing(false);
        return;
      }
      setRows(o.data);
      setCustomers(c.data);
      setState({ loading: false, error: null });
      setRefreshing(false);
    },
    [statusFilter],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const changeStatus = useCallback(
    (order, next) => {
      const labelNext = ORDER_STATUS_LABEL[next];
      Alert.alert(
        `Ubah status menjadi "${labelNext}"?`,
        next === 'cancelled'
          ? 'Pesanan dibatalkan tidak dihitung sebagai pendapatan dan tidak bisa dikembalikan ke status semula.'
          : next === 'completed'
          ? 'Status selesai menandakan pembayaran sudah diterima di loket dan pengunjung sudah masuk.'
          : 'Pesanan dikonfirmasi berarti kuota sudah dipastikan tersedia untuk tanggal kunjungan tersebut.',
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Ubah status',
            onPress: async () => {
              setUpdatingId(order.id);
              const { data, error } = await ordersApi.updateStatus(
                order.id,
                order.status,
                next,
              );
              setUpdatingId(null);

              if (error) {
                setBanner({ tone: 'danger', text: error.message });
                return;
              }
              setBanner({
                tone: data.persisted === false ? 'warning' : 'success',
                text: `${order.booking_code} sekarang berstatus "${labelNext}".`,
              });
              load(false);
            },
          },
        ],
      );
    },
    [load],
  );

  const header = <Header title="Pesanan masuk" subtitle={`${rows.length} pesanan pada tampilan ini`} />;

  if (state.loading) {
    return (
      <Screen header={header}>
        <LoadingState label="Memuat pesanan dan data pelanggan" />
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
          Perubahan status hanya berlaku di perangkat ini.
        </Notice>
      )}

      {Boolean(banner) && (
        <Notice tone={banner.tone} style={styles.block}>
          {banner.text}
        </Notice>
      )}

      <View style={styles.viewSwitch}>
        <SelectChip
          label="Daftar pesanan"
          selected={view === 'orders'}
          onPress={() => setView('orders')}
        />
        <SelectChip
          label={`Pelanggan (${customers.length})`}
          selected={view === 'customers'}
          onPress={() => setView('customers')}
        />
      </View>

      {view === 'orders' ? (
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {STATUS_FILTERS.map((f) => (
              <SelectChip
                key={f.key || 'all'}
                label={f.label}
                selected={statusFilter === f.key}
                onPress={() => setStatusFilter(f.key)}
                accessibilityLabel={`Saring pesanan: ${f.label}`}
              />
            ))}
          </ScrollView>

          {rows.length === 0 ? (
            <EmptyState
              title={
                statusFilter
                  ? `Tidak ada pesanan berstatus "${ORDER_STATUS_LABEL[statusFilter]}"`
                  : 'Belum ada pesanan masuk'
              }
              description={
                statusFilter
                  ? 'Hapus saringan untuk melihat seluruh pesanan.'
                  : 'Pesanan dari pelanggan akan muncul di sini segera setelah checkout.'
              }
              actionLabel={statusFilter ? 'Tampilkan semua pesanan' : undefined}
              onAction={statusFilter ? () => setStatusFilter('') : undefined}
            />
          ) : (
            rows.map((order) => {
              const items = order.order_items || [];
              const isOpen = expanded === order.id;
              const nextSteps = ALLOWED_STATUS_FLOW[order.status] || [];
              const customerName =
                order.profiles && order.profiles.full_name
                  ? order.profiles.full_name
                  : 'Nama tidak tersedia';

              return (
                <Card key={order.id} style={styles.orderCard}>
                  <View style={styles.orderHead}>
                    <View style={styles.orderHeadInfo}>
                      <Text style={styles.bookingCode} selectable>
                        {order.booking_code}
                      </Text>
                      <Text style={styles.orderMeta}>{customerName}</Text>
                      <Text style={styles.orderMeta}>
                        Kunjungan {formatDateShort(order.visit_date)}
                      </Text>
                    </View>
                    <View style={styles.orderHeadRight}>
                      <Text style={styles.orderTotal}>
                        {formatRupiah(order.total_amount)}
                      </Text>
                      <Chip
                        label={ORDER_STATUS_LABEL[order.status] || order.status}
                        tone={STATUS_TONE[order.status] || 'neutral'}
                        style={styles.orderChip}
                      />
                    </View>
                  </View>

                  <Button
                    label={isOpen ? 'Tutup rincian' : 'Lihat rincian'}
                    tone="ghost"
                    size="sm"
                    onPress={() => setExpanded(isOpen ? null : order.id)}
                    accessibilityLabel={`${isOpen ? 'Tutup' : 'Lihat'} rincian pesanan ${order.booking_code}`}
                    style={styles.detailToggle}
                  />

                  {isOpen && (
                    <View>
                      <Divider />
                      <Row label="Tanggal kunjungan" value={formatDateLong(order.visit_date)} />
                      <Row label="Dipesan pada" value={formatDateTime(order.created_at)} />
                      <Row
                        label="Metode pembayaran"
                        value={PAYMENT_METHOD_LABEL[order.payment_method] || order.payment_method}
                      />
                      <Row
                        label="Status pembayaran"
                        value={PAYMENT_STATUS_LABEL[order.payment_status] || order.payment_status}
                      />

                      <Divider />
                      {items.map((item, index) => (
                        <View key={item.id || index} style={styles.itemRow}>
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
                    </View>
                  )}

                  {nextSteps.length > 0 ? (
                    <View style={styles.statusActions}>
                      {nextSteps.map((next) => (
                        <Button
                          key={next}
                          label={ORDER_STATUS_LABEL[next]}
                          tone={next === 'cancelled' ? 'secondary' : 'primary'}
                          size="sm"
                          loading={updatingId === order.id}
                          onPress={() => changeStatus(order, next)}
                          style={styles.statusButton}
                          accessibilityLabel={`Ubah ${order.booking_code} menjadi ${ORDER_STATUS_LABEL[next]}`}
                        />
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.statusFinal}>
                      Status akhir. Pesanan ini tidak bisa diubah lagi.
                    </Text>
                  )}
                </Card>
              );
            })
          )}
        </View>
      ) : (
        <View>
          {customers.length === 0 ? (
            <EmptyState
              title="Belum ada akun terdaftar"
              description="Daftar ini terisi setelah ada pelanggan yang membuat akun."
            />
          ) : (
            customers.map((person) => (
              <Card key={person.id} style={styles.customerCard}>
                <View style={styles.customerHead}>
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{person.full_name}</Text>
                    <Text style={styles.customerMeta}>
                      {person.phone ? person.phone : 'Nomor telepon belum diisi'}
                    </Text>
                    <Text style={styles.customerMeta}>
                      Bergabung {formatDateShort(person.created_at)}
                    </Text>
                  </View>
                  <Chip
                    label={person.role === 'admin' ? 'Admin' : 'Pelanggan'}
                    tone={person.role === 'admin' ? 'accent' : 'info'}
                  />
                </View>
              </Card>
            ))
          )}
          <Text style={styles.privacyNote}>
            Daftar ini hanya memuat nama, nomor telepon, dan tanggal bergabung.
            Kata sandi dan token autentikasi tidak pernah dapat dibaca aplikasi.
          </Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: {
    marginBottom: space.lg,
  },
  viewSwitch: {
    flexDirection: 'row',
    marginBottom: space.lg,
  },
  filterRow: {
    paddingBottom: space.lg,
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
  orderHeadRight: {
    alignItems: 'flex-end',
  },
  bookingCode: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: 0.4,
  },
  orderMeta: {
    marginTop: 2,
    fontSize: 12,
    color: colors.inkMuted,
  },
  orderTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  orderChip: {
    marginTop: space.xs,
  },
  detailToggle: {
    alignSelf: 'flex-start',
    marginTop: space.sm,
    paddingHorizontal: 0,
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.xs,
  },
  itemInfo: {
    flex: 1,
    paddingRight: space.md,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  itemMeta: {
    marginTop: 1,
    fontSize: 12,
    color: colors.inkMuted,
  },
  itemSubtotal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },

  statusActions: {
    marginTop: space.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusButton: {
    marginRight: space.sm,
    marginBottom: space.xs,
  },
  statusFinal: {
    marginTop: space.md,
    fontSize: 12,
    color: colors.inkMuted,
  },

  customerCard: {
    marginBottom: space.md,
  },
  customerHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  customerInfo: {
    flex: 1,
    paddingRight: space.md,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  customerMeta: {
    marginTop: 2,
    fontSize: 12,
    color: colors.inkMuted,
  },
  privacyNote: {
    marginTop: space.md,
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkMuted,
  },
});
