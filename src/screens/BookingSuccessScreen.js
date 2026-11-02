/**
 * Bukti pemesanan setelah checkout berhasil.
 *
 * Pada Mode Demo, kartu ini menyatakan terus terang bahwa pesanan tidak
 * tersimpan di server, karena menampilkan bukti yang terlihat resmi untuk data
 * yang hanya ada di memori perangkat akan menyesatkan.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Header, Screen } from '../components/Screen';
import { Button, Card, Chip, Divider, Notice, Row, SectionTitle } from '../components/ui';
import {
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  formatDateLong,
  formatRupiah,
} from '../lib/format';
import { useApp } from '../state/AppContext';
import { colors, radius, space } from '../theme';

export default function BookingSuccessScreen({ params }) {
  const { profile, goTab, closeOverlay } = useApp();
  const order = params.order;
  const items = params.items || [];
  const persisted = params.persisted !== false;

  const totalQuantity = items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);

  return (
    <Screen
      header={<Header title="Pesanan tercatat" onBack={closeOverlay} />}
      withTabBar={false}
    >
      {!persisted && (
        <Notice tone="warning" title="Belum tersimpan di server" style={styles.block}>
          Aplikasi berjalan dalam Mode Demo. Pesanan ini hanya ada di memori
          perangkat dan akan hilang saat aplikasi dimuat ulang. Kode booking di
          bawah tidak berlaku di loket.
        </Notice>
      )}

      {/* Kode booking adalah informasi yang dicari pertama kali di layar ini. */}
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>Kode booking</Text>
        <Text style={styles.codeValue} selectable>
          {order.booking_code}
        </Text>
        <Text style={styles.codeHint}>
          Tunjukkan kode ini di loket untuk ditukar gelang masuk.
        </Text>
      </View>

      <SectionTitle style={styles.blockTitle}>Detail pesanan</SectionTitle>
      <Card style={styles.block}>
        <Row label="Nama pemesan" value={profile ? profile.full_name : '-'} />
        <Row label="Tanggal kunjungan" value={formatDateLong(order.visit_date)} />
        <Row label="Jumlah item" value={`${totalQuantity} tiket`} />
        <Row
          label="Metode pembayaran"
          value={PAYMENT_METHOD_LABEL[order.payment_method] || order.payment_method}
        />
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status pesanan</Text>
          <View style={styles.statusChips}>
            <Chip
              label={ORDER_STATUS_LABEL[order.status] || order.status}
              tone={order.status === 'pending' ? 'warning' : 'info'}
            />
            <Chip
              label={PAYMENT_STATUS_LABEL[order.payment_status] || order.payment_status}
              tone={order.payment_status === 'paid' ? 'success' : 'neutral'}
              style={styles.statusChipSpacing}
            />
          </View>
        </View>
      </Card>

      <SectionTitle style={styles.blockTitle}>Rincian tiket</SectionTitle>
      <Card style={styles.block}>
        {items.map((item, index) => (
          <View key={`${item.product_name}-${index}`}>
            {index > 0 && <Divider />}
            <View style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.product_name}
                </Text>
                <Text style={styles.itemMeta}>
                  {item.quantity} x {formatRupiah(item.unit_price)}
                </Text>
              </View>
              <Text style={styles.itemSubtotal}>{formatRupiah(item.subtotal)}</Text>
            </View>
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
        <Row label="Total pembayaran" value={formatRupiah(order.total_amount)} strong />
      </Card>

      {order.payment_method === 'onsite' && persisted && (
        <Notice tone="info" title="Pembayaran di loket" style={styles.block}>
          Siapkan pembayaran saat tiba. Pesanan ditahan sampai jam tutup pada
          tanggal kunjungan yang dipilih.
        </Notice>
      )}

      <Button
        label="Lihat riwayat pesanan"
        onPress={() => {
          closeOverlay();
          goTab('orders');
        }}
        full
        style={styles.action}
      />
      <Button
        label="Kembali ke beranda"
        tone="secondary"
        onPress={() => {
          closeOverlay();
          goTab('home');
        }}
        full
        style={styles.action}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: {
    marginBottom: space.xl,
  },
  blockTitle: {
    marginBottom: space.md,
  },

  codeCard: {
    backgroundColor: colors.deep,
    borderRadius: radius.lg,
    padding: space.xl,
    marginBottom: space.xl,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkOnDarkMuted,
  },
  codeValue: {
    marginTop: space.sm,
    fontSize: 28,
    fontWeight: '700',
    color: colors.inkOnDark,
    letterSpacing: 1,
  },
  codeHint: {
    marginTop: space.md,
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkOnDarkMuted,
    textAlign: 'center',
  },

  statusRow: {
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusLabel: {
    fontSize: 14,
    color: colors.inkMuted,
  },
  statusChips: {
    marginTop: space.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusChipSpacing: {
    marginLeft: space.sm,
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
    fontWeight: '700',
    color: colors.ink,
  },

  action: {
    marginBottom: space.md,
  },
});
