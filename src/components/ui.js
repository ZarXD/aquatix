/**
 * Komponen dasar yang dipakai ulang seluruh layar.
 *
 * Semua komponen di sini bergantung hanya pada core React Native agar tetap
 * berjalan di Expo Go tanpa modul native tambahan.
 */

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { TAP_MIN, colors, radius, space, type } from '../theme';

/* -------------------------------------------------------------------------- */
/* Teks                                                                        */
/* -------------------------------------------------------------------------- */

export function Title({ children, style }) {
  return <Text style={[type.title, style]}>{children}</Text>;
}

export function SectionTitle({ children, style }) {
  return <Text style={[type.section, style]}>{children}</Text>;
}

export function Body({ children, style, numberOfLines }) {
  return (
    <Text style={[type.body, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function Muted({ children, style, numberOfLines }) {
  return (
    <Text style={[type.small, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

/* -------------------------------------------------------------------------- */
/* Permukaan                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Kartu memakai garis tepi, bukan bayangan, supaya elevasi tetap punya arti
 * ketika dipakai pada dua elemen yang memang melayang (tab bar dan bilah
 * ringkasan checkout).
 */
export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Pembungkus satu bagian halaman dengan judul dan aksi opsional di kanan. */
export function Section({ title, action, children, style }) {
  return (
    <View style={[styles.section, style]}>
      {(title || action) && (
        <View style={styles.sectionHead}>
          {title ? <SectionTitle>{title}</SectionTitle> : <View />}
          {action}
        </View>
      )}
      {children}
    </View>
  );
}

/** Garis pemisah tipis antar baris dalam satu kartu. */
export function Divider({ style }) {
  return <View style={[styles.divider, style]} />;
}

/* -------------------------------------------------------------------------- */
/* Tombol                                                                      */
/* -------------------------------------------------------------------------- */

const BUTTON_TONES = {
  primary: { bg: colors.ocean, text: colors.inkOnDark, border: colors.ocean },
  secondary: { bg: colors.surface, text: colors.ocean, border: colors.borderStrong },
  danger: { bg: colors.danger, text: colors.inkOnDark, border: colors.danger },
  ghost: { bg: 'transparent', text: colors.ocean, border: 'transparent' },
};

/**
 * Tombol utama aplikasi.
 * Tinggi minimum 44px memenuhi target sentuh yang nyaman, dan status ditekan
 * ditandai perubahan opasitas, bukan animasi, sesuai dial MOTION 1.
 */
export function Button({
  label,
  onPress,
  tone = 'primary',
  size = 'md',
  disabled,
  loading,
  full,
  style,
  accessibilityLabel,
}) {
  const palette = BUTTON_TONES[tone] || BUTTON_TONES.primary;
  const isOff = disabled || loading;

  return (
    <Pressable
      onPress={isOff ? undefined : onPress}
      disabled={isOff}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isOff), busy: Boolean(loading) }}
      accessibilityLabel={accessibilityLabel || label}
      style={({ pressed }) => [
        styles.button,
        size === 'sm' && styles.buttonSm,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: isOff ? 0.5 : pressed ? 0.82 : 1,
        },
        full && styles.buttonFull,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.text} />
      ) : (
        <Text
          style={[
            styles.buttonLabel,
            size === 'sm' && styles.buttonLabelSm,
            { color: palette.text },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/** Tombol bulat kecil untuk mengubah jumlah tiket di keranjang. */
export function StepperButton({ label, onPress, disabled, accessibilityLabel }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        styles.stepper,
        { opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
      ]}
    >
      <Text style={styles.stepperLabel}>{label}</Text>
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */
/* Input                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Field dengan label dan pesan galat di bawahnya.
 * Pesan galat ditulis sebagai teks, bukan hanya warna merah, agar tetap
 * terbaca oleh pengguna yang sulit membedakan warna.
 */
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  hint,
  keyboardType,
  secureTextEntry,
  autoCapitalize = 'sentences',
  multiline,
  editable = true,
  maxLength,
  returnKeyType,
  onSubmitEditing,
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkMuted}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        multiline={multiline}
        editable={editable}
        maxLength={maxLength}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        accessibilityLabel={label}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          !editable && styles.inputDisabled,
          Boolean(error) && styles.inputError,
        ]}
      />
      {Boolean(error) && <Text style={styles.fieldError}>{error}</Text>}
      {!error && Boolean(hint) && <Text style={styles.fieldHint}>{hint}</Text>}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Penanda status                                                              */
/* -------------------------------------------------------------------------- */

const CHIP_TONES = {
  neutral: { bg: colors.bg, text: colors.inkMuted, border: colors.border },
  info: { bg: colors.infoSoft, text: colors.info, border: '#BBD7E8' },
  success: { bg: colors.successSoft, text: colors.success, border: '#B6DCC7' },
  warning: { bg: colors.warningSoft, text: colors.warning, border: '#E6CF9A' },
  danger: { bg: colors.dangerSoft, text: colors.danger, border: '#EDBDB8' },
  accent: { bg: colors.turquoiseSoft, text: colors.turquoise, border: '#B5DED8' },
};

/** Label status ringkas. Warna hanya pendukung; teksnya yang menyampaikan arti. */
export function Chip({ label, tone = 'neutral', style }) {
  const palette = CHIP_TONES[tone] || CHIP_TONES.neutral;
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: palette.bg, borderColor: palette.border },
        style,
      ]}
    >
      <Text style={[styles.chipLabel, { color: palette.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Pilihan berbentuk chip yang bisa ditekan, dipakai filter kategori dan status. */
export function SelectChip({ label, selected, onPress, accessibilityLabel }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      accessibilityLabel={accessibilityLabel || label}
      style={({ pressed }) => [
        styles.selectChip,
        selected && styles.selectChipOn,
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text
        style={[styles.selectChipLabel, selected && styles.selectChipLabelOn]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */
/* Status halaman                                                              */
/* -------------------------------------------------------------------------- */

/** Status memuat dengan keterangan apa yang sedang diambil. */
export function LoadingState({ label = 'Memuat data' }) {
  return (
    <View style={styles.stateBox}>
      <ActivityIndicator size="large" color={colors.ocean} />
      <Text style={styles.stateTitle}>{label}</Text>
    </View>
  );
}

/**
 * Status kosong. Judul menjelaskan sebabnya, bukan sekadar "tidak ada data",
 * dan menyertakan satu tindakan yang mengisinya bila ada.
 */
export function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <View style={styles.stateBox}>
      <Text style={styles.stateTitle}>{title}</Text>
      {Boolean(description) && <Text style={styles.stateText}>{description}</Text>}
      {Boolean(actionLabel) && (
        <Button label={actionLabel} onPress={onAction} style={styles.stateAction} />
      )}
    </View>
  );
}

/**
 * Status galat. Menampilkan penyebab yang bisa dipahami, detail teknis bila
 * ada, dan tombol coba lagi.
 */
export function ErrorState({ error, onRetry, retryLabel = 'Coba lagi' }) {
  const message = typeof error === 'string' ? error : error && error.message;
  const detail = typeof error === 'object' && error ? error.detail : null;

  return (
    <View style={styles.stateBox}>
      <Text style={styles.stateTitle}>Data gagal dimuat</Text>
      <Text style={styles.stateText}>{message || 'Penyebabnya belum diketahui.'}</Text>
      {Boolean(detail) && detail !== message && (
        <Text style={styles.stateDetail}>{detail}</Text>
      )}
      {Boolean(onRetry) && (
        <Button label={retryLabel} onPress={onRetry} style={styles.stateAction} />
      )}
    </View>
  );
}

/**
 * Pesan sebaris di dalam alur, misalnya hasil penerapan kode promo atau
 * peringatan Mode Demo.
 */
export function Notice({ tone = 'info', title, children, style }) {
  const palette = CHIP_TONES[tone] || CHIP_TONES.info;
  return (
    <View
      style={[
        styles.notice,
        { backgroundColor: palette.bg, borderColor: palette.border },
        style,
      ]}
    >
      {Boolean(title) && (
        <Text style={[styles.noticeTitle, { color: palette.text }]}>{title}</Text>
      )}
      {typeof children === 'string' ? (
        <Text style={styles.noticeText}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

/** Baris label dan nilai untuk ringkasan harga dan detail pesanan. */
export function Row({ label, value, strong, tone, style }) {
  const valueColor =
    tone === 'danger' ? colors.danger : tone === 'accent' ? colors.turquoise : colors.ink;
  return (
    <View style={[styles.row, style]}>
      <Text style={[styles.rowLabel, strong && styles.rowLabelStrong]} numberOfLines={2}>
        {label}
      </Text>
      <Text
        style={[styles.rowValue, strong && styles.rowValueStrong, { color: valueColor }]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  section: {
    marginBottom: space.xxl,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: space.md,
  },

  button: {
    minHeight: TAP_MIN,
    paddingHorizontal: space.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSm: {
    minHeight: 38,
    paddingHorizontal: space.md,
  },
  buttonFull: {
    alignSelf: 'stretch',
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  buttonLabelSm: {
    fontSize: 13,
  },

  stepper: {
    width: TAP_MIN,
    height: TAP_MIN,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ocean,
    lineHeight: 22,
  },

  field: {
    marginBottom: space.lg,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: space.xs + 2,
  },
  input: {
    minHeight: TAP_MIN,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  inputDisabled: {
    backgroundColor: colors.bg,
    color: colors.inkMuted,
  },
  inputError: {
    borderColor: colors.danger,
    borderWidth: 2,
  },
  fieldError: {
    marginTop: space.xs + 2,
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
  },
  fieldHint: {
    marginTop: space.xs + 2,
    fontSize: 12,
    color: colors.inkMuted,
  },

  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.md,
    paddingVertical: 5,
    borderRadius: radius.chip,
    borderWidth: 1,
    maxWidth: '100%',
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '700',
  },

  selectChip: {
    minHeight: 38,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    marginRight: space.sm,
  },
  selectChipOn: {
    backgroundColor: colors.ocean,
    borderColor: colors.ocean,
  },
  selectChipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  selectChipLabelOn: {
    color: colors.inkOnDark,
  },

  stateBox: {
    alignItems: 'center',
    paddingVertical: space.xxxl,
    paddingHorizontal: space.xl,
  },
  stateTitle: {
    marginTop: space.md,
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  stateText: {
    marginTop: space.sm,
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  stateDetail: {
    marginTop: space.sm,
    fontSize: 12,
    color: colors.inkMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  stateAction: {
    marginTop: space.xl,
    minWidth: 170,
  },

  notice: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: space.xs,
  },
  noticeText: {
    fontSize: 13,
    color: colors.ink,
    lineHeight: 19,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: space.xs + 2,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.inkMuted,
    paddingRight: space.md,
  },
  rowLabelStrong: {
    color: colors.ink,
    fontWeight: '600',
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  rowValueStrong: {
    fontSize: 17,
    fontWeight: '700',
  },
});
