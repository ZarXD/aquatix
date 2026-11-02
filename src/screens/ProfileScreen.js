/**
 * Profil pelanggan.
 *
 * Peran ditampilkan sebagai informasi, bukan pilihan. Tidak ada jalur di
 * aplikasi untuk mengubah peran sendiri menjadi admin; perubahan itu hanya
 * bisa dilakukan lewat SQL Editor oleh pemilik project Supabase.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Header, Screen } from '../components/Screen';
import {
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  ErrorState,
  Field,
  Notice,
  Row,
  SectionTitle,
} from '../components/ui';
import { VENUE } from '../config';
import { formatDateShort } from '../lib/format';
import { useApp } from '../state/AppContext';
import { colors, space } from '../theme';

export default function ProfileScreen() {
  const {
    profile,
    profileError,
    session,
    isSignedIn,
    isAdmin,
    isDemoMode,
    openOverlay,
    signOut,
    updateProfile,
    refreshProfile,
  } = useApp();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    if (profile) {
      setForm({ full_name: profile.full_name || '', phone: profile.phone || '' });
    }
  }, [profile]);

  const save = useCallback(async () => {
    if (form.full_name.trim().length < 3) {
      setBanner({ tone: 'danger', text: 'Nama lengkap minimal 3 huruf.' });
      return;
    }
    setSaving(true);
    const { data, error } = await updateProfile({
      full_name: form.full_name,
      phone: form.phone,
    });
    setSaving(false);

    if (error) {
      setBanner({ tone: 'danger', text: error.message });
      return;
    }
    setEditing(false);
    setBanner({
      tone: data.persisted === false ? 'warning' : 'success',
      text:
        data.persisted === false
          ? 'Perubahan hanya tersimpan sementara di perangkat (Mode Demo).'
          : 'Profil berhasil diperbarui.',
    });
  }, [form, updateProfile]);

  const confirmSignOut = useCallback(() => {
    Alert.alert('Keluar dari akun?', 'Keranjang yang belum di-checkout akan dikosongkan.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => signOut() },
    ]);
  }, [signOut]);

  const header = <Header title="Profil" subtitle={isSignedIn ? session.email : undefined} />;

  if (!isSignedIn) {
    return (
      <Screen header={header}>
        <EmptyState
          title="Belum masuk"
          description="Masuk untuk menyimpan data pemesan dan melihat riwayat pesanan Anda."
          actionLabel="Masuk atau daftar"
          onAction={() => openOverlay('auth')}
        />
        <Card style={styles.venueCard}>
          <SectionTitle>Tentang {VENUE.name}</SectionTitle>
          <Text style={styles.venueText}>{VENUE.tagline}</Text>
          <Text style={styles.venueText}>{VENUE.notes}</Text>
        </Card>
      </Screen>
    );
  }

  // Sesi ada tetapi baris profil tidak terbaca: biasanya skema belum dipasang.
  if (profileError) {
    return (
      <Screen header={header}>
        <ErrorState error={profileError} onRetry={refreshProfile} retryLabel="Muat ulang profil" />
        <Button label="Keluar dari akun" tone="secondary" onPress={confirmSignOut} full />
      </Screen>
    );
  }

  return (
    <Screen header={header}>
      {Boolean(banner) && (
        <Notice tone={banner.tone} style={styles.block}>
          {banner.text}
        </Notice>
      )}

      <Card style={styles.block}>
        {editing ? (
          <View>
            <Field
              label="Nama lengkap"
              value={form.full_name}
              onChangeText={(v) => setForm((p) => ({ ...p, full_name: v }))}
              autoCapitalize="words"
              maxLength={80}
            />
            <Field
              label="Nomor telepon"
              value={form.phone}
              onChangeText={(v) => setForm((p) => ({ ...p, phone: v }))}
              placeholder="08xxxxxxxxxx"
              keyboardType="phone-pad"
              hint="Dipakai petugas bila ada perubahan jadwal kunjungan."
              maxLength={20}
            />
            <View style={styles.editActions}>
              <Button
                label="Batal"
                tone="secondary"
                onPress={() => {
                  setEditing(false);
                  setBanner(null);
                  setForm({
                    full_name: profile.full_name || '',
                    phone: profile.phone || '',
                  });
                }}
                style={styles.editButton}
              />
              <Button
                label="Simpan"
                onPress={save}
                loading={saving}
                style={styles.editButton}
              />
            </View>
          </View>
        ) : (
          <View>
            <View style={styles.identity}>
              <View style={styles.identityText}>
                <Text style={styles.name}>{profile ? profile.full_name : '-'}</Text>
                <Text style={styles.email}>{session.email}</Text>
              </View>
              <Chip
                label={isAdmin ? 'Admin' : 'Pelanggan'}
                tone={isAdmin ? 'accent' : 'info'}
              />
            </View>

            <Divider />
            <Row label="Nomor telepon" value={profile && profile.phone ? profile.phone : 'Belum diisi'} />
            {Boolean(profile && profile.created_at) && (
              <Row label="Bergabung sejak" value={formatDateShort(profile.created_at)} />
            )}

            <Button
              label="Ubah data profil"
              tone="secondary"
              onPress={() => {
                setEditing(true);
                setBanner(null);
              }}
              full
              style={styles.editTrigger}
            />
          </View>
        )}
      </Card>

      {isAdmin && (
        <Notice tone="accent" title="Akses admin aktif" style={styles.block}>
          Peran ini dibaca dari tabel profiles di database. Navigasi bawah sudah
          berganti ke dasbor, manajemen produk, pesanan, dan promo.
        </Notice>
      )}

      {isDemoMode && (
        <Notice tone="warning" title="Mode Demo aktif" style={styles.block}>
          Data profil ini tidak tersimpan ke server. Isi src/config.js dengan URL
          dan anon key Supabase untuk menyalakan backend.
        </Notice>
      )}

      <Card style={styles.block}>
        <SectionTitle>Informasi kunjungan</SectionTitle>
        {VENUE.openHours.map((slot) => (
          <Row key={slot.day} label={slot.day} value={slot.hours} />
        ))}
        <Text style={styles.venueText}>{VENUE.notes}</Text>
      </Card>

      <Button label="Keluar dari akun" tone="danger" onPress={confirmSignOut} full />
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: {
    marginBottom: space.xl,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  identityText: {
    flex: 1,
    paddingRight: space.md,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  email: {
    marginTop: 2,
    fontSize: 13,
    color: colors.inkMuted,
  },
  editTrigger: {
    marginTop: space.lg,
  },
  editActions: {
    flexDirection: 'row',
  },
  editButton: {
    flex: 1,
    marginHorizontal: space.xs,
  },
  venueCard: {
    marginTop: space.xl,
  },
  venueText: {
    marginTop: space.sm,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted,
  },
});
