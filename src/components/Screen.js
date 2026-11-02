/**
 * Kerangka halaman: header, area gulir, dan ruang aman.
 *
 * Padding bawah dihitung dari tinggi tab bar supaya konten terakhir tidak
 * tertutup navigasi, dan SafeAreaView menjaga header tidak bertabrakan dengan
 * status bar maupun notch.
 */

import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { TAP_MIN, colors, radius, space } from '../theme';

/** Tinggi tab bar, dipakai juga oleh TabBar agar keduanya selalu sinkron. */
export const TAB_BAR_HEIGHT = 62;

/**
 * Header halaman.
 * `onBack` memunculkan tombol kembali; dipakai layar yang menumpuk di atas tab.
 */
export function Header({ title, subtitle, onBack, right, tone = 'deep' }) {
  const bg = tone === 'deep' ? colors.deep : colors.surface;
  const titleColor = tone === 'deep' ? colors.inkOnDark : colors.ink;
  const subColor = tone === 'deep' ? colors.inkOnDarkMuted : colors.inkMuted;

  return (
    <View style={[styles.header, { backgroundColor: bg }]}>
      <View style={styles.headerRow}>
        {Boolean(onBack) && (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Kembali ke layar sebelumnya"
            style={({ pressed }) => [
              styles.backButton,
              tone !== 'deep' && styles.backButtonLight,
              pressed && { opacity: 0.75 },
            ]}
          >
            <Text style={[styles.backLabel, { color: titleColor }]}>Kembali</Text>
          </Pressable>
        )}
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: titleColor }]} numberOfLines={1}>
            {title}
          </Text>
          {Boolean(subtitle) && (
            <Text style={[styles.headerSubtitle, { color: subColor }]} numberOfLines={2}>
              {subtitle}
            </Text>
          )}
        </View>
        {right ? <View style={styles.headerRight}>{right}</View> : null}
      </View>
    </View>
  );
}

/**
 * Pembungkus halaman standar.
 *
 * `scroll` dimatikan untuk layar yang memakai daftar bergulir sendiri, supaya
 * tidak ada dua area gulir bertumpuk.
 */
export function Screen({
  children,
  header,
  scroll = true,
  footer,
  withTabBar = true,
  refreshControl,
  contentStyle,
}) {
  const bottomPad = (withTabBar ? TAB_BAR_HEIGHT : 0) + space.xl;

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: bottomPad },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.deep} />
      {header}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        // Offset hanya relevan di iOS; Android menangani lewat windowSoftInputMode.
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {body}
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: space.lg,
  },

  header: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
  },
  headerRight: {
    marginLeft: space.md,
  },
  backButton: {
    minHeight: TAP_MIN,
    justifyContent: 'center',
    paddingRight: space.md,
    marginRight: space.xs,
    borderRadius: radius.sm,
  },
  backButtonLight: {
    paddingLeft: 0,
  },
  backLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
