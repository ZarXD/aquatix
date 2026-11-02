/**
 * Masuk dan daftar.
 *
 * Satu layar dengan dua mode agar pengguna yang salah pilih tidak perlu
 * berpindah halaman. Validasi dijalankan saat tombol ditekan, bukan saat
 * mengetik, supaya pesan galat tidak berkedip di tengah pengisian.
 */

import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Header, Screen } from '../components/Screen';
import { Button, Card, Field, Notice } from '../components/ui';
import { isValidEmail } from '../lib/format';
import { useApp } from '../state/AppContext';
import { colors, space } from '../theme';

const MIN_PASSWORD = 6;

export default function AuthScreen() {
  const { signIn, signUp, isDemoMode, closeOverlay } = useApp();

  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState(null); // { tone, title, text }

  const isSignUp = mode === 'signup';
  const setField = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const switchMode = useCallback((next) => {
    setMode(next);
    setErrors({});
    setBanner(null);
  }, []);

  const validate = useCallback(() => {
    const next = {};
    if (isSignUp && form.fullName.trim().length < 3) {
      next.fullName = 'Tulis nama lengkap minimal 3 huruf.';
    }
    if (!isValidEmail(form.email)) {
      next.email = 'Format email belum benar. Contoh: nama@email.com';
    }
    if (form.password.length < MIN_PASSWORD) {
      next.password = `Kata sandi minimal ${MIN_PASSWORD} karakter.`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form, isSignUp]);

  const submit = useCallback(async () => {
    setBanner(null);
    if (!validate()) return;

    setSubmitting(true);
    const result = isSignUp
      ? await signUp(form.fullName, form.email, form.password)
      : await signIn(form.email, form.password);
    setSubmitting(false);

    if (result.error) {
      setBanner({ tone: 'danger', title: 'Gagal melanjutkan', text: result.error.message });
      return;
    }

    // Supabase dengan konfirmasi email aktif tidak membuat sesi langsung.
    if (isSignUp && result.data.needsVerification) {
      setBanner({
        tone: 'info',
        title: 'Periksa email Anda',
        text:
          `Tautan verifikasi dikirim ke ${form.email.trim()}. Buka tautan itu, ` +
          'lalu kembali ke sini untuk masuk.',
      });
      setMode('signin');
      setForm((prev) => ({ ...prev, password: '' }));
      return;
    }

    closeOverlay();
  }, [validate, isSignUp, signUp, signIn, form, closeOverlay]);

  return (
    <Screen
      header={
        <Header
          title={isSignUp ? 'Buat akun' : 'Masuk'}
          subtitle={
            isSignUp
              ? 'Akun baru otomatis berperan pelanggan.'
              : 'Masuk untuk memesan dan melihat riwayat.'
          }
          onBack={closeOverlay}
        />
      }
      withTabBar={false}
    >
      {isDemoMode && (
        <Notice tone="warning" title="Mode Demo aktif" style={styles.block}>
          Tidak ada autentikasi nyata di mode ini. Gunakan akun contoh
          demo@aquatix.test dengan kata sandi demo123, atau admin@aquatix.test
          dengan kata sandi admin123 untuk mencoba panel admin.
        </Notice>
      )}

      {Boolean(banner) && (
        <Notice tone={banner.tone} title={banner.title} style={styles.block}>
          {banner.text}
        </Notice>
      )}

      <Card style={styles.block}>
        {isSignUp && (
          <Field
            label="Nama lengkap"
            value={form.fullName}
            onChangeText={setField('fullName')}
            placeholder="Nama sesuai identitas"
            autoCapitalize="words"
            error={errors.fullName}
            maxLength={80}
          />
        )}

        <Field
          label="Email"
          value={form.email}
          onChangeText={setField('email')}
          placeholder="nama@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors.email}
          maxLength={120}
        />

        <Field
          label="Kata sandi"
          value={form.password}
          onChangeText={setField('password')}
          placeholder={`Minimal ${MIN_PASSWORD} karakter`}
          secureTextEntry
          autoCapitalize="none"
          error={errors.password}
          hint={isSignUp ? 'Kata sandi disimpan terenkripsi oleh Supabase Auth.' : undefined}
          returnKeyType="go"
          onSubmitEditing={submit}
          maxLength={72}
        />

        <Button
          label={isSignUp ? 'Daftar sekarang' : 'Masuk'}
          onPress={submit}
          loading={submitting}
          full
        />
      </Card>

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>
          {isSignUp ? 'Sudah punya akun?' : 'Belum punya akun?'}
        </Text>
        <Button
          label={isSignUp ? 'Masuk di sini' : 'Daftar di sini'}
          tone="ghost"
          size="sm"
          onPress={() => switchMode(isSignUp ? 'signin' : 'signup')}
        />
      </View>

      <Text style={styles.guestNote}>
        Katalog dan daftar harga tetap bisa dilihat tanpa masuk. Akun hanya
        diperlukan saat menyimpan pesanan.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: {
    marginBottom: space.xl,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchText: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  guestNote: {
    marginTop: space.xl,
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkMuted,
    textAlign: 'center',
  },
});
