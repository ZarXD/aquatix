/**
 * Keranjang dan checkout.
 *
 * Angka yang tampil di sini adalah pratinjau. Saat checkout, klien hanya
 * mengirim id produk, jumlah, tanggal, metode bayar, dan kode promo. Harga,
 * diskon, dan total dihitung ulang oleh fungsi database `create_order`,
 * sehingga nilai di layar tidak bisa dipakai untuk menurunkan tagihan.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Header, Screen } from '../components/Screen';
import {
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  Field,
  Notice,
  Row,
  SectionTitle,
  StepperButton,
} from '../components/ui';
import { computeDiscount, orders, promotions } from '../lib/api';
import { categoryVisual } from '../lib/catalog';
import {
  PAYMENT_METHOD_LABEL,
  formatDateLong,
  formatRupiah,
  nextDays,
  toISODate,
} from '../lib/format';
import { useApp } from '../state/AppContext';
import { colors, radius, space } from '../theme';

const PAYMENT_METHODS = [
  {
    key: 'onsite',
    label: PAYMENT_METHOD_LABEL.onsite,
    detail:
      'Tunjukkan kode booking di loket, lalu bayar tunai atau kartu saat tiba. Pesanan ditahan sampai jam tutup pada tanggal kunjungan.',
  },
  {
    key: 'transfer',
    label: PAYMENT_METHOD_LABEL.transfer,
    detail:
      'Simulasi transfer untuk keperluan demo. Tidak ada tagihan nyata yang dibuat dan tidak ada data kartu yang diminta. Pembayaran tetap diverifikasi petugas di loket.',
  },
];

export default function CartScreen() {
  const {
    cart,
    subtotal,
    itemCount,
    isSignedIn,
    isDemoMode,
    session,
    setQuantity,
    removeFromCart,
    clearCart,
    closeOverlay,
    openOverlay,
  } = useApp();

  const dates = useMemo(() => nextDays(14), []);
  const [visitDate, setVisitDate] = useState(() => toISODate(new Date()));
  const [paymentMethod, setPaymentMethod] = useState('onsite');

  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState(null);
  const [promoState, setPromoState] = useState({ checking: false, message: null, tone: 'info' });

  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [confirmVisible, setConfirmVisible] = useState(false);

  // Promo yang sudah diterapkan bisa menjadi tidak valid saat jumlah item
  // dikurangi di bawah batas minimum, jadi statusnya diperiksa ulang.
  const discount = useMemo(() => computeDiscount(promo, subtotal), [promo, subtotal]);
  const total = Math.max(0, subtotal - discount);
  const promoBelowMinimum =
    promo !== null && subtotal < Number(promo.minimum_purchase || 0);

  useEffect(() => {
    if (promoBelowMinimum) {
      setPromoState({
        checking: false,
        tone: 'warning',
        message: `Potongan "${promo.promo_code}" baru aktif untuk belanja minimal ${formatRupiah(promo.minimum_purchase)}.`,
      });
    }
  }, [promoBelowMinimum, promo]);

  const applyPromo = useCallback(async () => {
    setPromoState({ checking: true, message: null, tone: 'info' });
    const { data, error } = await promotions.findByCode(promoInput);
    if (error) {
      setPromo(null);
      setPromoState({ checking: false, tone: 'danger', message: error.message });
      return;
    }
    const value = computeDiscount(data, subtotal);
    setPromo(data);
    if (value === 0) {
      setPromoState({
        checking: false,
        tone: 'warning',
        message: `Kode berlaku, tetapi belanja minimal ${formatRupiah(data.minimum_purchase)} agar potongan aktif.`,
      });
      return;
    }
    setPromoState({
      checking: false,
      tone: 'success',
      message: `Kode "${data.promo_code}" diterapkan. Potongan ${formatRupiah(value)}.`,
    });
  }, [promoInput, subtotal]);

  const clearPromo = useCallback(() => {
    setPromo(null);
    setPromoInput('');
    setPromoState({ checking: false, message: null, tone: 'info' });
  }, []);

  const submit = useCallback(async () => {
    setConfirmVisible(false);
    setSubmitting(true);
    setCheckoutError(null);

    const { data, error } = await orders.checkout({
      items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      visitDate,
      paymentMethod,
      promoCode: promo ? promo.promo_code : null,
      userId: session ? session.userId : null,
    });

    setSubmitting(false);

    if (error) {
      setCheckoutError(error);
      return;
    }

    clearCart();
    openOverlay('bookingSuccess', {
      order: data.order,
      items: data.items,
      persisted: data.persisted,
    });
  }, [cart, visitDate, paymentMethod, promo, session, clearCart, openOverlay]);

  const startCheckout = useCallback(() => {
    if (!isSignedIn) {
      Alert.alert(
        'Masuk dulu untuk memesan',
        'Pesanan disimpan pada akun Anda agar bisa dilihat kembali di riwayat.',
        [
          { text: 'Nanti saja', style: 'cancel' },
          { text: 'Masuk sekarang', onPress: () => openOverlay('auth') },
        ],
      );
      return;
    }
    setConfirmVisible(true);
  }, [isSignedIn, openOverlay]);

  const header = (
    <Header
      title="Keranjang"
      subtitle={itemCount > 0 ? `${itemCount} item siap dipesan` : undefined}
      onBack={closeOverlay}
    />
  );

  if (cart.length === 0) {
    return (
      <Screen header={header} withTabBar={false}>
        <EmptyState
          title="Keranjang masih kosong"
          description="Pilih tiket dari katalog, lalu kembali ke sini untuk menentukan tanggal kunjungan."
          actionLabel="Buka katalog"
          onAction={closeOverlay}
        />
      </Screen>
    );
  }

  return (
    <Screen header={header} withTabBar={false}>
      {isDemoMode && (
        <Notice tone="warning" title="Mode Demo aktif" style={styles.block}>
          Checkout pada mode ini tidak dikirim ke server mana pun. Pesanan hanya
          disimpan di memori perangkat dan hilang saat aplikasi dimuat ulang.
        </Notice>
      )}

      {/* 1. Daftar item */}
      <SectionTitle style={styles.blockTitle}>Tiket yang dipesan</SectionTitle>
      <Card style={styles.block}>
        {cart.map((line, index) => {
          const visual = categoryVisual(line.category);
          return (
            <View key={line.productId}>
              {index > 0 && <Divider />}
              <View style={styles.lineRow}>
                <View style={[styles.lineThumb, { backgroundColor: visual.tint }]}>
                  <Text style={styles.lineGlyph}>{visual.glyph}</Text>
                </View>
                <View style={styles.lineInfo}>
                  <Text style={styles.lineName} numberOfLines={2}>
                    {line.name}
                  </Text>
                  <Text style={styles.linePrice}>
                    {formatRupiah(line.price)} per unit
                  </Text>
                </View>
                <Text style={styles.lineSubtotal}>
                  {formatRupiah(line.price * line.quantity)}
                </Text>
              </View>

              <View style={styles.lineActions}>
                <View style={styles.stepperGroup}>
                  <StepperButton
                    label="−"
                    onPress={() => setQuantity(line.productId, line.quantity - 1)}
                    accessibilityLabel={`Kurangi jumlah ${line.name}`}
                  />
                  <Text style={styles.quantity}>{line.quantity}</Text>
                  <StepperButton
                    label="+"
                    onPress={() => setQuantity(line.productId, line.quantity + 1)}
                    disabled={line.quantity >= 50}
                    accessibilityLabel={`Tambah jumlah ${line.name}`}
                  />
                </View>
                <Button
                  label="Hapus"
                  tone="ghost"
                  size="sm"
                  onPress={() => removeFromCart(line.productId)}
                  accessibilityLabel={`Hapus ${line.name} dari keranjang`}
                />
              </View>
              {line.quantity >= 50 && (
                <Text style={styles.limitNote}>
                  Batas maksimal 50 unit per jenis tiket dalam satu pesanan.
                </Text>
              )}
            </View>
          );
        })}
      </Card>

      {/* 2. Tanggal kunjungan */}
      <SectionTitle style={styles.blockTitle}>Tanggal kunjungan</SectionTitle>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateRow}
      >
        {dates.map((d) => {
          const selected = d.iso === visitDate;
          return (
            <Pressable
              key={d.iso}
              onPress={() => setVisitDate(d.iso)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Pilih tanggal ${formatDateLong(d.iso)}`}
              style={({ pressed }) => [
                styles.dateCard,
                selected && styles.dateCardOn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.dateDay, selected && styles.dateTextOn]}>
                {d.isToday ? 'Hari ini' : d.dayName.slice(0, 3)}
              </Text>
              <Text style={[styles.dateNumber, selected && styles.dateTextOn]}>
                {d.dayNumber}
              </Text>
              <Text style={[styles.dateMonth, selected && styles.dateTextOn]}>
                {d.monthShort}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={styles.dateSelected}>
        Dipilih: {formatDateLong(visitDate)}
      </Text>

      {/* 3. Kode promo */}
      <SectionTitle style={styles.blockTitle}>Kode promo</SectionTitle>
      <Card style={styles.block}>
        {promo && discount > 0 ? (
          <View>
            <View style={styles.promoApplied}>
              <Chip label={promo.promo_code} tone="accent" />
              <Button
                label="Lepas kode"
                tone="ghost"
                size="sm"
                onPress={clearPromo}
                accessibilityLabel={`Lepas kode promo ${promo.promo_code}`}
              />
            </View>
            <Text style={styles.promoTitle}>{promo.title}</Text>
          </View>
        ) : (
          <View>
            <View style={styles.promoInputRow}>
              <View style={styles.promoField}>
                <Field
                  label="Punya kode promo?"
                  value={promoInput}
                  onChangeText={(t) => setPromoInput(t.toUpperCase())}
                  placeholder="Contoh: KELUARGA10"
                  autoCapitalize="characters"
                  maxLength={32}
                  returnKeyType="done"
                  onSubmitEditing={applyPromo}
                />
              </View>
              <Button
                label="Terapkan"
                tone="secondary"
                onPress={applyPromo}
                loading={promoState.checking}
                disabled={promoInput.trim().length === 0}
                style={styles.promoButton}
              />
            </View>
          </View>
        )}

        {Boolean(promoState.message) && (
          <Notice tone={promoState.tone} style={styles.promoNotice}>
            {promoState.message}
          </Notice>
        )}
      </Card>

      {/* 4. Metode pembayaran */}
      <SectionTitle style={styles.blockTitle}>Metode pembayaran</SectionTitle>
      <View style={styles.block}>
        {PAYMENT_METHODS.map((method) => {
          const selected = paymentMethod === method.key;
          return (
            <Pressable
              key={method.key}
              onPress={() => setPaymentMethod(method.key)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={method.label}
              style={({ pressed }) => [
                styles.methodCard,
                selected && styles.methodCardOn,
                pressed && { opacity: 0.9 },
              ]}
            >
              <View style={styles.methodHead}>
                {/* Penanda terpilih memakai bentuk, bukan warna saja. */}
                <View style={[styles.radio, selected && styles.radioOn]}>
                  {selected && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.methodLabel, selected && styles.methodLabelOn]}>
                  {method.label}
                </Text>
              </View>
              <Text style={styles.methodDetail}>{method.detail}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* 5. Ringkasan */}
      <SectionTitle style={styles.blockTitle}>Ringkasan pembayaran</SectionTitle>
      <Card style={styles.summaryCard}>
        <Row label={`Subtotal (${itemCount} item)`} value={formatRupiah(subtotal)} />
        <Row
          label="Potongan promo"
          value={discount > 0 ? `− ${formatRupiah(discount)}` : formatRupiah(0)}
          tone={discount > 0 ? 'accent' : undefined}
        />
        <Divider />
        <Row label="Total pembayaran" value={formatRupiah(total)} strong />
        <Text style={styles.summaryNote}>
          Nilai akhir dihitung ulang oleh server saat pesanan disimpan, memakai
          harga produk terbaru.
        </Text>
      </Card>

      {Boolean(checkoutError) && (
        <Notice tone="danger" title="Checkout gagal" style={styles.block}>
          {checkoutError.message}
        </Notice>
      )}

      <Button
        label={isSignedIn ? 'Lanjut ke konfirmasi' : 'Masuk untuk memesan'}
        onPress={startCheckout}
        loading={submitting}
        full
        style={styles.submit}
      />

      {/* Dialog konfirmasi sebelum transaksi benar-benar dikirim. */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Konfirmasi pesanan</Text>
            <Text style={styles.modalText}>
              Pesanan akan disimpan dengan rincian berikut. Setelah tersimpan,
              perubahan jumlah tiket harus dilakukan petugas di loket.
            </Text>

            <View style={styles.modalSummary}>
              <Row label="Tanggal kunjungan" value={formatDateLong(visitDate)} />
              <Row label="Jumlah item" value={`${itemCount} item`} />
              <Row
                label="Metode pembayaran"
                value={PAYMENT_METHOD_LABEL[paymentMethod]}
              />
              <Divider />
              <Row label="Total perkiraan" value={formatRupiah(total)} strong />
            </View>

            <View style={styles.modalActions}>
              <Button
                label="Periksa lagi"
                tone="secondary"
                onPress={() => setConfirmVisible(false)}
                style={styles.modalButton}
              />
              <Button
                label="Simpan pesanan"
                onPress={submit}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
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

  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lineThumb: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineGlyph: {
    fontSize: 21,
  },
  lineInfo: {
    flex: 1,
    marginLeft: space.md,
    paddingRight: space.sm,
  },
  lineName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  linePrice: {
    marginTop: 1,
    fontSize: 12,
    color: colors.inkMuted,
  },
  lineSubtotal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  lineActions: {
    marginTop: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantity: {
    minWidth: 44,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  limitNote: {
    marginTop: space.sm,
    fontSize: 12,
    color: colors.warning,
    fontWeight: '600',
  },

  dateRow: {
    paddingBottom: space.md,
  },
  dateCard: {
    width: 68,
    paddingVertical: space.md,
    marginRight: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  dateCardOn: {
    backgroundColor: colors.ocean,
    borderColor: colors.ocean,
  },
  dateDay: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.inkMuted,
  },
  dateNumber: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
  },
  dateMonth: {
    fontSize: 11,
    color: colors.inkMuted,
  },
  dateTextOn: {
    color: colors.inkOnDark,
  },
  dateSelected: {
    marginBottom: space.xl,
    fontSize: 13,
    fontWeight: '600',
    color: colors.ocean,
  },

  promoInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  promoField: {
    flex: 1,
    marginRight: space.md,
  },
  promoButton: {
    marginTop: 23,
  },
  promoApplied: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoTitle: {
    marginTop: space.sm,
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 19,
  },
  promoNotice: {
    marginTop: space.md,
  },

  methodCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: space.lg,
    marginBottom: space.md,
  },
  methodCardOn: {
    borderColor: colors.ocean,
    borderWidth: 2,
    backgroundColor: colors.oceanSoft,
  },
  methodHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.md,
  },
  radioOn: {
    borderColor: colors.ocean,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.ocean,
  },
  methodLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  methodLabelOn: {
    color: colors.deep,
    fontWeight: '700',
  },
  methodDetail: {
    marginTop: space.sm,
    marginLeft: 32,
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkMuted,
  },

  summaryCard: {
    marginBottom: space.xl,
  },
  summaryNote: {
    marginTop: space.md,
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkMuted,
  },

  submit: {
    marginBottom: space.xl,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 36, 48, 0.55)',
    justifyContent: 'center',
    padding: space.xl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.xl,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  modalText: {
    marginTop: space.sm,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted,
  },
  modalSummary: {
    marginTop: space.lg,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalActions: {
    marginTop: space.xl,
    flexDirection: 'row',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: space.xs,
  },
});
