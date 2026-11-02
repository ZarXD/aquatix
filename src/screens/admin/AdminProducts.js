/**
 * Manajemen produk dan layanan.
 *
 * Form tambah dan ubah memakai satu modal yang sama, karena bidangnya identik
 * dan menduplikasinya hanya menambah tempat terjadinya perbedaan perilaku.
 *
 * Penghapusan sengaja dibuat lebih sulit daripada penonaktifan: produk yang
 * sudah pernah dipesan tidak boleh hilang, karena baris pesanan lama merujuk
 * padanya untuk pelaporan.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
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
  Field,
  LoadingState,
  Notice,
  SelectChip,
} from '../../components/ui';
import { CATEGORIES, categoryVisual } from '../../lib/catalog';
import { formatRupiah, parsePriceInput } from '../../lib/format';
import { products as productsApi } from '../../lib/api';
import { useApp } from '../../state/AppContext';
import { colors, radius, space } from '../../theme';

const EMPTY_FORM = {
  name: '',
  description: '',
  category: CATEGORIES[0],
  price: '',
  stock: '',
  is_active: true,
};

export default function AdminProducts() {
  const { isDemoMode } = useApp();

  const [state, setState] = useState({ loading: true, error: null });
  const [rows, setRows] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true);
    else setState({ loading: true, error: null });

    const { data, error } = await productsApi.listAll();
    if (error) {
      setState({ loading: false, error });
      setRefreshing(false);
      return;
    }
    setRows(data);
    setState({ loading: false, error: null });
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setEditorOpen(true);
  }, []);

  const openEdit = useCallback((row) => {
    setEditingId(row.id);
    setForm({
      name: row.name || '',
      description: row.description || '',
      category: row.category || CATEGORIES[0],
      price: String(row.price ?? ''),
      stock: row.stock === null || row.stock === undefined ? '' : String(row.stock),
      is_active: row.is_active !== false,
    });
    setFormErrors({});
    setEditorOpen(true);
  }, []);

  const validate = useCallback(() => {
    const errors = {};
    if (form.name.trim().length < 3) {
      errors.name = 'Nama produk minimal 3 huruf.';
    }
    const price = parsePriceInput(form.price);
    if (price === null) {
      errors.price = 'Harga harus berupa angka dan tidak boleh negatif.';
    }
    if (form.stock.trim() !== '') {
      const stock = Number(form.stock.replace(/\D/g, ''));
      if (!Number.isInteger(stock) || stock < 0) {
        errors.stock = 'Kuota harus bilangan bulat nol atau lebih.';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0 ? { price } : null;
  }, [form]);

  const save = useCallback(async () => {
    const checked = validate();
    if (!checked) return;

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category,
      price: checked.price,
      is_active: form.is_active,
      // Kosong berarti kuota tidak dibatasi, bukan kuota nol.
      stock: form.stock.trim() === '' ? null : Number(form.stock.replace(/\D/g, '')),
    };

    const result = editingId
      ? await productsApi.update(editingId, payload)
      : await productsApi.create(payload);
    setSaving(false);

    if (result.error) {
      setFormErrors({ submit: result.error.message });
      return;
    }

    setEditorOpen(false);
    setBanner({
      tone: result.data.persisted === false ? 'warning' : 'success',
      text:
        result.data.persisted === false
          ? `"${payload.name}" hanya tersimpan sementara di perangkat (Mode Demo).`
          : editingId
          ? `"${payload.name}" berhasil diperbarui.`
          : `"${payload.name}" berhasil ditambahkan ke katalog.`,
    });
    load(false);
  }, [validate, form, editingId, load]);

  const toggleActive = useCallback(
    async (row) => {
      const { data, error } = await productsApi.update(row.id, {
        is_active: !row.is_active,
      });
      if (error) {
        setBanner({ tone: 'danger', text: error.message });
        return;
      }
      setBanner({
        tone: data.persisted === false ? 'warning' : 'success',
        text: row.is_active
          ? `"${row.name}" dinonaktifkan dan tidak lagi muncul di katalog.`
          : `"${row.name}" diaktifkan kembali di katalog.`,
      });
      load(false);
    },
    [load],
  );

  const confirmDelete = useCallback(
    (row) => {
      Alert.alert(
        `Hapus "${row.name}"?`,
        'Produk yang sudah pernah dipesan tidak bisa dihapus. Pilih nonaktifkan ' +
          'bila hanya ingin menyembunyikannya dari katalog.',
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Hapus',
            style: 'destructive',
            onPress: async () => {
              const { data, error } = await productsApi.remove(row.id);
              if (error) {
                setBanner({ tone: 'danger', text: error.message });
                return;
              }
              setBanner({
                tone: data.persisted === false ? 'warning' : 'success',
                text: `"${row.name}" dihapus dari daftar produk.`,
              });
              load(false);
            },
          },
        ],
      );
    },
    [load],
  );

  const header = (
    <Header
      title="Produk dan layanan"
      subtitle={rows.length > 0 ? `${rows.length} produk terdaftar` : undefined}
    />
  );

  if (state.loading) {
    return (
      <Screen header={header}>
        <LoadingState label="Memuat daftar produk" />
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
          Perubahan produk tidak dikirim ke Supabase dan hilang saat aplikasi
          dimuat ulang.
        </Notice>
      )}

      {Boolean(banner) && (
        <Notice tone={banner.tone} style={styles.block}>
          {banner.text}
        </Notice>
      )}

      <Button label="Tambah produk baru" onPress={openCreate} full style={styles.block} />

      {rows.length === 0 ? (
        <EmptyState
          title="Belum ada produk"
          description="Tambahkan tiket atau layanan agar katalog pelanggan terisi."
          actionLabel="Tambah produk pertama"
          onAction={openCreate}
        />
      ) : (
        rows.map((row) => {
          const visual = categoryVisual(row.category);
          return (
            <Card key={row.id} style={styles.productCard}>
              <View style={styles.productHead}>
                <View style={[styles.thumb, { backgroundColor: visual.tint }]}>
                  <Text style={styles.thumbGlyph}>{visual.glyph}</Text>
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {row.name}
                  </Text>
                  <Text style={styles.productCategory}>{row.category}</Text>
                  <Text style={styles.productPrice}>{formatRupiah(row.price)}</Text>
                </View>
                <Chip
                  label={row.is_active ? 'Aktif' : 'Nonaktif'}
                  tone={row.is_active ? 'success' : 'neutral'}
                />
              </View>

              {Boolean(row.description) && (
                <Text style={styles.productDescription} numberOfLines={2}>
                  {row.description}
                </Text>
              )}

              <Text style={styles.productStock}>
                {row.stock === null || row.stock === undefined
                  ? 'Kuota tidak dibatasi'
                  : `Kuota tersisa ${row.stock} unit`}
              </Text>

              <Divider />
              <View style={styles.productActions}>
                <Button
                  label="Ubah"
                  tone="secondary"
                  size="sm"
                  onPress={() => openEdit(row)}
                  style={styles.actionButton}
                  accessibilityLabel={`Ubah produk ${row.name}`}
                />
                <Button
                  label={row.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  tone="secondary"
                  size="sm"
                  onPress={() => toggleActive(row)}
                  style={styles.actionButton}
                  accessibilityLabel={`${row.is_active ? 'Nonaktifkan' : 'Aktifkan'} produk ${row.name}`}
                />
                <Button
                  label="Hapus"
                  tone="ghost"
                  size="sm"
                  onPress={() => confirmDelete(row)}
                  style={styles.actionButton}
                  accessibilityLabel={`Hapus produk ${row.name}`}
                />
              </View>
            </Card>
          );
        })
      )}

      {/* Editor produk */}
      <Modal
        visible={editorOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setEditorOpen(false)}
      >
        <Screen
          header={
            <Header
              title={editingId ? 'Ubah produk' : 'Produk baru'}
              onBack={() => setEditorOpen(false)}
            />
          }
          withTabBar={false}
        >
          {Boolean(formErrors.submit) && (
            <Notice tone="danger" title="Gagal menyimpan" style={styles.block}>
              {formErrors.submit}
            </Notice>
          )}

          <Field
            label="Nama produk"
            value={form.name}
            onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
            placeholder="Contoh: Tiket Dewasa"
            error={formErrors.name}
            maxLength={80}
          />

          <Field
            label="Deskripsi"
            value={form.description}
            onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
            placeholder="Jelaskan cakupan tiket atau layanan ini"
            multiline
            maxLength={400}
          />

          <Text style={styles.pickerLabel}>Kategori</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pickerRow}
          >
            {CATEGORIES.map((category) => (
              <SelectChip
                key={category}
                label={category}
                selected={form.category === category}
                onPress={() => setForm((p) => ({ ...p, category }))}
                accessibilityLabel={`Pilih kategori ${category}`}
              />
            ))}
          </ScrollView>

          <Field
            label="Harga (Rupiah)"
            value={form.price}
            onChangeText={(v) => setForm((p) => ({ ...p, price: v }))}
            placeholder="25000"
            keyboardType="numeric"
            error={formErrors.price}
            hint="Masukkan angka saja, tanpa titik atau tanda Rp."
            maxLength={12}
          />

          <Field
            label="Kuota harian"
            value={form.stock}
            onChangeText={(v) => setForm((p) => ({ ...p, stock: v }))}
            placeholder="Kosongkan bila tidak dibatasi"
            keyboardType="numeric"
            error={formErrors.stock}
            maxLength={6}
          />

          <Pressable
            onPress={() => setForm((p) => ({ ...p, is_active: !p.is_active }))}
            accessibilityRole="switch"
            accessibilityState={{ checked: form.is_active }}
            accessibilityLabel="Tampilkan produk di katalog pelanggan"
            style={({ pressed }) => [styles.toggleRow, pressed && { opacity: 0.85 }]}
          >
            <View style={[styles.checkbox, form.is_active && styles.checkboxOn]}>
              {form.is_active && <View style={styles.checkboxMark} />}
            </View>
            <View style={styles.toggleText}>
              <Text style={styles.toggleTitle}>Tampilkan di katalog</Text>
              <Text style={styles.toggleHint}>
                Produk nonaktif tetap tersimpan, tetapi tidak bisa dipesan
                pelanggan.
              </Text>
            </View>
          </Pressable>

          <Button
            label={editingId ? 'Simpan perubahan' : 'Tambahkan produk'}
            onPress={save}
            loading={saving}
            full
            style={styles.saveButton}
          />
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: {
    marginBottom: space.xl,
  },

  productCard: {
    marginBottom: space.md,
  },
  productHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbGlyph: {
    fontSize: 21,
  },
  productInfo: {
    flex: 1,
    marginHorizontal: space.md,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  productCategory: {
    marginTop: 1,
    fontSize: 12,
    color: colors.inkMuted,
  },
  productPrice: {
    marginTop: space.xs,
    fontSize: 15,
    fontWeight: '700',
    color: colors.turquoise,
  },
  productDescription: {
    marginTop: space.md,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted,
  },
  productStock: {
    marginTop: space.sm,
    fontSize: 12,
    fontWeight: '600',
    color: colors.ocean,
  },
  productActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  actionButton: {
    marginRight: space.sm,
    marginBottom: space.xs,
  },

  pickerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: space.sm,
  },
  pickerRow: {
    paddingBottom: space.xl,
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: space.md,
    marginBottom: space.lg,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.md,
  },
  checkboxOn: {
    borderColor: colors.ocean,
    backgroundColor: colors.ocean,
  },
  checkboxMark: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: colors.inkOnDark,
  },
  toggleText: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  toggleHint: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkMuted,
  },

  saveButton: {
    marginBottom: space.xxl,
  },
});
