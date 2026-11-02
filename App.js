/**
 * AquaTix -- aplikasi pemesanan tiket kolam renang.
 *
 * Titik masuk aplikasi. Berisi kerangka navigasi dan pemilihan layar; seluruh
 * logika lain berada di folder src/.
 *
 * KONFIGURASI: buka src/config.js dan isi SUPABASE_URL serta SUPABASE_ANON_KEY.
 * Selama belum diisi, aplikasi berjalan dalam Mode Demo dengan data lokal.
 *
 * Navigasi memakai state, bukan pustaka navigasi, agar langsung berjalan di
 * Expo Snack tanpa konfigurasi tambahan. Ada dua lapis:
 * 1. Tab: empat layar utama yang dipilih dari navigasi bawah.
 * 2. Overlay: layar yang menumpuk di atas tab, misalnya keranjang dan masuk.
 */

import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import TabBar from './src/components/TabBar';
import AuthScreen from './src/screens/AuthScreen';
import BookingSuccessScreen from './src/screens/BookingSuccessScreen';
import CartScreen from './src/screens/CartScreen';
import CatalogScreen from './src/screens/CatalogScreen';
import HomeScreen from './src/screens/HomeScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AdminDashboard from './src/screens/admin/AdminDashboard';
import AdminOrders from './src/screens/admin/AdminOrders';
import AdminProducts from './src/screens/admin/AdminProducts';
import AdminPromos from './src/screens/admin/AdminPromos';
import { AppProvider, useApp } from './src/state/AppContext';
import { colors, space } from './src/theme';

/** Peta tab ke layar, dipisah per peran agar tidak ada percabangan di JSX. */
const CUSTOMER_SCREENS = {
  home: HomeScreen,
  catalog: CatalogScreen,
  orders: OrdersScreen,
  profile: ProfileScreen,
};

const ADMIN_SCREENS = {
  home: AdminDashboard,
  catalog: AdminProducts,
  orders: AdminOrders,
  profile: AdminPromos,
};

const OVERLAY_SCREENS = {
  auth: AuthScreen,
  cart: CartScreen,
  bookingSuccess: BookingSuccessScreen,
};

/** Layar pembuka saat sesi tersimpan sedang dibaca. */
function BootScreen() {
  return (
    <SafeAreaView style={styles.boot}>
      <StatusBar barStyle="light-content" backgroundColor={colors.deep} />
      <ActivityIndicator size="large" color={colors.inkOnDark} />
      <Text style={styles.bootTitle}>AquaTix</Text>
      <Text style={styles.bootText}>Menyiapkan data tiket</Text>
    </SafeAreaView>
  );
}

function Shell() {
  const { bootstrapping, tab, overlay, isAdmin, itemCount, goTab, closeOverlay } = useApp();

  // Tombol kembali perangkat Android menutup overlay lebih dulu, baru keluar
  // aplikasi. Tanpa ini, pengguna di layar keranjang akan langsung terlempar
  // keluar saat menekan tombol kembali.
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (overlay) {
        closeOverlay();
        return true;
      }
      if (tab !== 'home') {
        goTab('home');
        return true;
      }
      return false; // Biarkan sistem menutup aplikasi.
    });

    return () => subscription.remove();
  }, [overlay, tab, closeOverlay, goTab]);

  if (bootstrapping) return <BootScreen />;

  // Overlay menggantikan seluruh layar termasuk tab bar, karena alurnya
  // bersifat fokus tunggal: selesaikan atau kembali.
  if (overlay) {
    const OverlayScreen = OVERLAY_SCREENS[overlay.name];
    if (OverlayScreen) {
      return (
        <View style={styles.root}>
          <OverlayScreen params={overlay.params} />
        </View>
      );
    }
  }

  const screens = isAdmin ? ADMIN_SCREENS : CUSTOMER_SCREENS;
  const ActiveScreen = screens[tab] || screens.home;

  return (
    <View style={styles.root}>
      <ActiveScreen />
      <TabBar active={tab} onChange={goTab} isAdmin={isAdmin} cartCount={itemCount} />
    </View>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  boot: {
    flex: 1,
    backgroundColor: colors.deep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bootTitle: {
    marginTop: space.xl,
    fontSize: 24,
    fontWeight: '700',
    color: colors.inkOnDark,
  },
  bootText: {
    marginTop: space.xs,
    fontSize: 13,
    color: colors.inkOnDarkMuted,
  },
});
