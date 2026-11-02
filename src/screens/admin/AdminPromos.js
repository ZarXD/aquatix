/**
 * Promo dan pengumuman.
 *
 * Dua jenis konten pemasaran dengan bentuk data berbeda digabung dalam satu
 * tab karena keduanya dikelola orang yang sama pada momen yang sama. Peralihan
 * memakai pilihan tampilan, bukan halaman terpisah.
 *
 * Validasi diskon menegakkan dua hal: persentase tidak melebihi 100, dan
 * periode berakhir tidak mendahului periode mulai. Batas yang membuat total
 * transaksi negatif ditutup di sisi server oleh fungsi checkout.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
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
  Row,
  SelectChip,
} from '../../components/ui';
import { announcements as annApi, promotions as promoApi } from '../../lib/api';
import {
  formatDateShort,
  formatRupiah,
  parsePriceInput,
  toISODate,
} from '../../lib/format';
import { useApp } from '../../state/AppContext';
import { colors, radius, space } from '../../theme';

const EMPTY_PROMO = {
  title: '',
  description: '',
  promo_code: '',
  discount_type: 'fixed',
  discount_value: '',
  minimum_purchase: '',
  starts_at: '',
  ends_at: '',
  is_active: true,
};

const EMPTY_ANN = { title: '', content: '', is_active: true };

/** "2026-11-30" -> ISO timestamp, atau null bila kosong. */
function dateInputToIso(value, endOfDay) {
  const clean = String(value || '').trim();
  if (!clean) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean);
  if (!match) return undefined; // undefined menandai format salah
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, 0);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export default function AdminPromos() {
  const { isDemoMode } = useApp();

  const [view, setView] = useState('promos');
  const [state, setState] = useState({ loading: true, error: null });
  const [promos, setPromos] = useState([]);
  const [news, setNews] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState(null);

  const [promoEditor, setPromoEditor] = useState(false);
  const [promoId, setPromoId] = useState(null);
  const [promoForm, setPromoForm] = useState(EMPTY_PROMO);
  const [promoErrors, setPromoErrors] = useState({});

  const [annEditor, setAnnEditor] = useState(false);
  const [annId, setAnnId] = useState(null);
  const [annForm, setAnnForm] = useState(EMPTY_ANN);
  const [annErrors, setAnnErrors] = useState({});

  const [saving, setSaving] = useState(false);

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true);
    else setState({ loading: true, error: null });

    const [p, a] = await Promise.all([promoApi.listAll(), annApi.listAll()]);
    const firstError = p.error || a.error;
    if (firstError) {
      setState({ loading: false, error: firstError });
      setRefreshing(false);
      return;
    }
    setPromos(p.data);
    setNews(a.data);
    setState({ loading: false, error: null });
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  /* ---------------------------------------------------------------- Promo */

  const openPromoCreate = useCallback(() => {
    setPromoId(null);
    setPromoForm(EMPTY_PROMO);
    setPromoErrors({});
    setPromoEditor(true);
  }, []);

  const openPromoEdit = useCallback((row) => {
    setPromoId(row.id);
    setPromoForm({
      title: row.title || '',
      description: row.description || '',
      promo_code: row.promo_code || '',
      discount_type: row.discount_type || 'fixed',
      discount_value: String(row.discount_value ?? ''),
      minimum_purchase: String(row.minimum_purchase ?? ''),
      starts_at: row.starts_at ? toISODate(row.starts_at) : '',
      ends_at: row.ends_at ? toISODate(row.ends_at) : '',
      is_active: row.is_active !== false,
    });
    setPromoErrors({});
    setPromoEditor(true);
  }, []);

  const savePromo = useCallback(async () => {
    const errors = {};

    if (promoForm.title.trim().length < 4) {
      errors.title = 'Judul promo minimal 4 huruf.';
    }

    const value = parsePriceInput(promoForm.discount_value);
    if (value === null || value <= 0) {
      errors.discount_value = 'Nilai diskon harus angka lebih besar dari nol.';
    } else if (promoForm.discount_type === 'percent' && value > 100) {
      errors.discount_value = 'Diskon persentase tidak boleh melebihi 100.';
    }

    const minimum =
      promoForm.minimum_purchase.trim() === ''
        ? 0
        : parsePriceInput(promoForm.minimum_purchase);
    if (minimum === null) {
      errors.minimum_purchase = 'Minimal belanja harus angka nol atau lebih.';
    }

    const startIso = dateInputToIso(promoForm.starts_at, false);
    const endIso = dateInputToIso(promoForm.ends_at, true);
    if (startIso === undefined) errors.starts_at = 'Format tanggal harus YYYY-MM-DD.';
    if (endIso === undefined) errors.ends_at = 'Format tanggal harus YYYY-MM-DD.';
    if (startIso && endIso && new Date(endIso) < new Date(startIso)) {
      errors.ends_at = 'Tanggal berakhir tidak boleh mendahului tanggal mulai.';
    }

    setPromoErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    const payload = {
      title: promoForm.title.trim(),
      description: promoForm.description.trim() || null,
      promo_code: promoForm.promo_code.trim().toUpperCase() || null,
      discount_type: promoForm.discount_type,
      discount_value: value,
      minimum_purchase: minimum,
      starts_at: startIso,
      ends_at: endIso,
      is_active: promoForm.is_active,
    };

    const result = promoId
      ? await promoApi.update(promoId, payload)
      : await promoApi.create(payload);
    setSaving(false);

    if (result.error) {
      setPromoErrors({ submit: result.error.message });
      return;
    }

    setPromoEditor(false);
    setBanner({
      tone: result.data.persisted === false ? 'warning' : 'success',
      text:
        result.data.persisted === false
          ? `Promo "${payload.title}" hanya tersimpan sementara (Mode Demo).`
          : promoId
          ? `Promo "${payload.title}" diperbarui.`
          : `Promo "${payload.title}" ditambahkan.`,
    });
    load(false);
  }, [promoForm, promoId, load]);

  const togglePromo = useCallback(
    async (row) => {
      const { data, error } = await promoApi.update(row.id, { is_active: !row.is_active });
      if (error) {
        setBanner({ tone: 'danger', text: error.message });
        return;
      }
      setBanner({
        tone: data.persisted === false ? 'warning' : 'success',
        text: row.is_active
          ? `Promo "${row.title}" dinonaktifkan.`
          : `Promo "${row.title}" diaktifkan.`,
      });
      load(false);
    },
    [load],
  );

  /* --------------------------------------------------------- Pengumuman */

  const openAnnCreate = useCallback(() => {
    setAnnId(null);
    setAnnForm(EMPTY_ANN);
    setAnnErrors({});
    setAnnEditor(true);
  }, []);

  const openAnnEdit = useCallback((row) => {
    setAnnId(row.id);
    setAnnForm({
      title: row.title || '',
      content: row.content || '',
      is_active: row.is_active !== false,
    });
    setAnnErrors({});
    setAnnEditor(true);
  }, []);

  const saveAnn = useCallback(async () => {
    const errors = {};
    if (annForm.title.trim().length < 4) errors.title = 'Judul minimal 4 huruf.';
    if (annForm.content.trim().length < 10) {
      errors.content = 'Isi pengumuman minimal 10 huruf agar jelas bagi pengunjung.';
    }
    setAnnErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    const payload = {
      title: annForm.title.trim(),
      content: annForm.content.trim(),
      is_active: annForm.is_active,
    };
    const result = annId
      ? await annApi.update(annId, payload)
      : await annApi.create(payload);
    setSaving(false);

    if (result.error) {
      setAnnErrors({ submit: result.error.message });
      return;
    }

    setAnnEditor(false);
    setBanner({
      tone: result.data.persisted === false ? 'warning' : 'success',
      text:
        result.data.persisted === false
          ? 'Pengumuman hanya tersimpan sementara (Mode Demo).'
          : annId
          ? 'Pengumuman diperbarui.'
          : 'Pengumuman ditambahkan dan tampil di beranda.',
    });
    load(false);
  }, [annForm, annId, load]);

  const toggleAnn = useCallback(
    async (row) => {
      const { data, error } = await annApi.update(row.id, { is_active: !row.is_active });
      if (error) {
        setBanner({ tone: 'danger', text: error.message });
        return;
      }
      setBanner({
        tone: data.persisted === false ? 'warning' : 'success',
        text: row.is_active
          ? 'Pengumuman disembunyikan dari beranda.'
          : 'Pengumuman ditampilkan di beranda.',
      });
      load(false);
    },
    [load],
  );

  /* ------------------------------------------------------------- Render */

  const header = <Header title="Promo dan pengumuman" />;

  if (state.loading) {
    return (
      <Screen header={header}>
        <LoadingState label="Memuat promo dan pengumuman" />
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
          Promo dan pengumuman yang dibuat di sini tidak tersimpan ke Supabase.
        </Notice>
      )}

      {Boolean(banner) && (
        <Notice tone={banner.tone} style={styles.block}>
          {banner.text}
        </Notice>
      )}

      <View style={styles.viewSwitch}>
        <SelectChip
          label={`Promo (${promos.length})`}
          selected={view === 'promos'}
          onPress={() => setView('promos')}
        />
        <SelectChip
          label={`Pengumuman (${news.length})`}
          selected={view === 'news'}
          onPress={() => setView('news')}
        />
      </View>

      {view === 'promos' ? (
        <View>
          <Button
            label="Tambah promo baru"
            onPress={openPromoCreate}
            full
            style={styles.block}
          />

          {promos.length === 0 ? (
            <EmptyState
              title="Belum ada promo"
              description="Promo aktif akan tampil di beranda dan bisa dipakai pelanggan saat checkout."
              actionLabel="Buat promo pertama"
              onAction={openPromoCreate}
            />
          ) : (
            promos.map((row) => {
              const now = new Date();
              const started = !row.starts_at || new Date(row.starts_at) <= now;
              const ended = row.ends_at && new Date(row.ends_at) < now;
              const live = row.is_active && started && !ended;

              return (
                <Card key={row.id} style={styles.itemCard}>
                  <View style={styles.itemHead}>
                    <Text style={styles.itemTitle} numberOfLines={2}>
                      {row.title}
                    </Text>
                    <Chip
                      label={
                        live
                          ? 'Berlaku'
                          : ended
                          ? 'Kedaluwarsa'
                          : !row.is_active
                          ? 'Nonaktif'
                          : 'Belum mulai'
                      }
                      tone={live ? 'success' : ended ? 'danger' : 'neutral'}
                    />
                  </View>

                  {Boolean(row.description) && (
                    <Text style={styles.itemBody}>{row.description}</Text>
                  )}

                  <Divider />
                  {Boolean(row.promo_code) && (
                    <Row label="Kode promo" value={row.promo_code} />
                  )}
                  <Row
                    label="Potongan"
                    value={
                      row.discount_type === 'percent'
                        ? `${Number(row.discount_value)} persen`
                        : formatRupiah(row.discount_value)
                    }
                  />
                  {Number(row.minimum_purchase) > 0 && (
                    <Row
                      label="Minimal belanja"
                      value={formatRupiah(row.minimum_purchase)}
                    />
                  )}
                  <Row
                    label="Periode"
                    value={`${row.starts_at ? formatDateShort(row.starts_at) : 'Tanpa batas awal'} sampai ${
                      row.ends_at ? formatDateShort(row.ends_at) : 'tanpa batas akhir'
                    }`}
                  />

                  <View style={styles.itemActions}>
                    <Button
                      label="Ubah"
                      tone="secondary"
                      size="sm"
                      onPress={() => openPromoEdit(row)}
                      style={styles.itemButton}
                      accessibilityLabel={`Ubah promo ${row.title}`}
                    />
                    <Button
                      label={row.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      tone="secondary"
                      size="sm"
                      onPress={() => togglePromo(row)}
                      style={styles.itemButton}
                      accessibilityLabel={`${row.is_active ? 'Nonaktifkan' : 'Aktifkan'} promo ${row.title}`}
                    />
                  </View>
                </Card>
              );
            })
          )}
        </View>
      ) : (
        <View>
          <Button
            label="Tambah pengumuman"
            onPress={openAnnCreate}
            full
            style={styles.block}
          />

          {news.length === 0 ? (
            <EmptyState
              title="Belum ada pengumuman"
              description="Pengumuman aktif muncul di beranda pelanggan, misalnya jadwal pengurasan kolam."
              actionLabel="Buat pengumuman pertama"
              onAction={openAnnCreate}
            />
          ) : (
            news.map((row) => (
              <Card key={row.id} style={styles.itemCard}>
                <View style={styles.itemHead}>
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {row.title}
                  </Text>
                  <Chip
                    label={row.is_active ? 'Tampil' : 'Disembunyikan'}
                    tone={row.is_active ? 'success' : 'neutral'}
                  />
                </View>
                <Text style={styles.itemBody}>{row.content}</Text>
                {Boolean(row.published_at) && (
                  <Text style={styles.itemDate}>
                    Diterbitkan {formatDateShort(row.published_at)}
                  </Text>
                )}

                <View style={styles.itemActions}>
                  <Button
                    label="Ubah"
                    tone="secondary"
                    size="sm"
                    onPress={() => openAnnEdit(row)}
                    style={styles.itemButton}
                    accessibilityLabel={`Ubah pengumuman ${row.title}`}
                  />
                  <Button
                    label={row.is_active ? 'Sembunyikan' : 'Tampilkan'}
                    tone="secondary"
                    size="sm"
                    onPress={() => toggleAnn(row)}
                    style={styles.itemButton}
                    accessibilityLabel={`${row.is_active ? 'Sembunyikan' : 'Tampilkan'} pengumuman ${row.title}`}
                  />
                </View>
              </Card>
            ))
          )}
        </View>
      )}

      {/* Editor promo */}
      <Modal
        visible={promoEditor}
        animationType="slide"
        onRequestClose={() => setPromoEditor(false)}
      >
        <Screen
          header={
            <Header
              title={promoId ? 'Ubah promo' : 'Promo baru'}
              onBack={() => setPromoEditor(false)}
            />
          }
          withTabBar={false}
        >
          {Boolean(promoErrors.submit) && (
            <Notice tone="danger" title="Gagal menyimpan" style={styles.block}>
              {promoErrors.submit}
            </Notice>
          )}

          <Field
            label="Judul promo"
            value={promoForm.title}
            onChangeText={(v) => setPromoForm((p) => ({ ...p, title: v }))}
            placeholder="Contoh: Potongan Rp10.000 untuk kunjungan keluarga"
            error={promoErrors.title}
            maxLength={120}
          />

          <Field
            label="Keterangan"
            value={promoForm.description}
            onChangeText={(v) => setPromoForm((p) => ({ ...p, description: v }))}
            placeholder="Jelaskan syarat berlakunya"
            multiline
            maxLength={300}
          />

          <Field
            label="Kode promo"
            value={promoForm.promo_code}
            onChangeText={(v) =>
              setPromoForm((p) => ({ ...p, promo_code: v.toUpperCase() }))
            }
            placeholder="KELUARGA10"
            autoCapitalize="characters"
            hint="Kosongkan bila promo hanya ditampilkan tanpa kode."
            maxLength={32}
          />

          <Text style={styles.pickerLabel}>Jenis potongan</Text>
          <View style={styles.typeRow}>
            <SelectChip
              label="Nominal Rupiah"
              selected={promoForm.discount_type === 'fixed'}
              onPress={() => setPromoForm((p) => ({ ...p, discount_type: 'fixed' }))}
            />
            <SelectChip
              label="Persentase"
              selected={promoForm.discount_type === 'percent'}
              onPress={() => setPromoForm((p) => ({ ...p, discount_type: 'percent' }))}
            />
          </View>

          <Field
            label={
              promoForm.discount_type === 'percent'
                ? 'Besar potongan (persen)'
                : 'Besar potongan (Rupiah)'
            }
            value={promoForm.discount_value}
            onChangeText={(v) => setPromoForm((p) => ({ ...p, discount_value: v }))}
            placeholder={promoForm.discount_type === 'percent' ? '15' : '10000'}
            keyboardType="numeric"
            error={promoErrors.discount_value}
            maxLength={12}
          />

          <Field
            label="Minimal belanja"
            value={promoForm.minimum_purchase}
            onChangeText={(v) => setPromoForm((p) => ({ ...p, minimum_purchase: v }))}
            placeholder="0"
            keyboardType="numeric"
            error={promoErrors.minimum_purchase}
            hint="Kosongkan atau isi 0 bila tidak ada minimal."
            maxLength={12}
          />

          <Field
            label="Mulai berlaku"
            value={promoForm.starts_at}
            onChangeText={(v) => setPromoForm((p) => ({ ...p, starts_at: v }))}
            placeholder="2026-11-01"
            error={promoErrors.starts_at}
            hint="Format YYYY-MM-DD. Kosongkan bila berlaku sejak sekarang."
            maxLength={10}
          />

          <Field
            label="Berakhir pada"
            value={promoForm.ends_at}
            onChangeText={(v) => setPromoForm((p) => ({ ...p, ends_at: v }))}
            placeholder="2026-12-31"
            error={promoErrors.ends_at}
            hint="Format YYYY-MM-DD. Kosongkan bila tanpa batas akhir."
            maxLength={10}
          />

          <Pressable
            onPress={() => setPromoForm((p) => ({ ...p, is_active: !p.is_active }))}
            accessibilityRole="switch"
            accessibilityState={{ checked: promoForm.is_active }}
            accessibilityLabel="Aktifkan promo"
            style={({ pressed }) => [styles.toggleRow, pressed && { opacity: 0.85 }]}
          >
            <View style={[styles.checkbox, promoForm.is_active && styles.checkboxOn]}>
              {promoForm.is_active && <View style={styles.checkboxMark} />}
            </View>
            <View style={styles.toggleText}>
              <Text style={styles.toggleTitle}>Aktifkan promo</Text>
              <Text style={styles.toggleHint}>
                Promo nonaktif tidak muncul di beranda dan kodenya ditolak saat
                checkout.
              </Text>
            </View>
          </Pressable>

          <Button
            label={promoId ? 'Simpan perubahan' : 'Tambahkan promo'}
            onPress={savePromo}
            loading={saving}
            full
            style={styles.saveButton}
          />
        </Screen>
      </Modal>

      {/* Editor pengumuman */}
      <Modal
        visible={annEditor}
        animationType="slide"
        onRequestClose={() => setAnnEditor(false)}
      >
        <Screen
          header={
            <Header
              title={annId ? 'Ubah pengumuman' : 'Pengumuman baru'}
              onBack={() => setAnnEditor(false)}
            />
          }
          withTabBar={false}
        >
          {Boolean(annErrors.submit) && (
            <Notice tone="danger" title="Gagal menyimpan" style={styles.block}>
              {annErrors.submit}
            </Notice>
          )}

          <Field
            label="Judul"
            value={annForm.title}
            onChangeText={(v) => setAnnForm((p) => ({ ...p, title: v }))}
            placeholder="Contoh: Pengurasan kolam dewasa setiap Senin pagi"
            error={annErrors.title}
            maxLength={120}
          />

          <Field
            label="Isi pengumuman"
            value={annForm.content}
            onChangeText={(v) => setAnnForm((p) => ({ ...p, content: v }))}
            placeholder="Tulis informasi yang perlu diketahui pengunjung"
            multiline
            error={annErrors.content}
            maxLength={600}
          />

          <Pressable
            onPress={() => setAnnForm((p) => ({ ...p, is_active: !p.is_active }))}
            accessibilityRole="switch"
            accessibilityState={{ checked: annForm.is_active }}
            accessibilityLabel="Tampilkan pengumuman di beranda"
            style={({ pressed }) => [styles.toggleRow, pressed && { opacity: 0.85 }]}
          >
            <View style={[styles.checkbox, annForm.is_active && styles.checkboxOn]}>
              {annForm.is_active && <View style={styles.checkboxMark} />}
            </View>
            <View style={styles.toggleText}>
              <Text style={styles.toggleTitle}>Tampilkan di beranda</Text>
              <Text style={styles.toggleHint}>
                Pengumuman nonaktif tetap tersimpan tetapi tidak terlihat
                pelanggan.
              </Text>
            </View>
          </Pressable>

          <Button
            label={annId ? 'Simpan perubahan' : 'Terbitkan pengumuman'}
            onPress={saveAnn}
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
  viewSwitch: {
    flexDirection: 'row',
    marginBottom: space.lg,
  },

  itemCard: {
    marginBottom: space.md,
  },
  itemHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  itemTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    paddingRight: space.sm,
  },
  itemBody: {
    marginTop: space.sm,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted,
  },
  itemDate: {
    marginTop: space.sm,
    fontSize: 11,
    color: colors.inkMuted,
  },
  itemActions: {
    marginTop: space.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  itemButton: {
    marginRight: space.sm,
    marginBottom: space.xs,
  },

  pickerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: space.sm,
  },
  typeRow: {
    flexDirection: 'row',
    marginBottom: space.xl,
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
