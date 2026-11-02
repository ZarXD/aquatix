/**
 * State global: sesi, profil, keranjang, dan navigasi.
 *
 * Memakai Context + useReducer alih-alih pustaka state eksternal, karena
 * cakupannya kecil dan Expo Snack memuat lebih cepat tanpa dependensi tambahan.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';

import { auth } from '../lib/api';
import { isDemoMode } from '../lib/supabase';

const AppContext = createContext(null);

/** Tab utama; nilai ini juga dipakai sebagai kunci layar aktif. */
export const TABS = ['home', 'catalog', 'orders', 'profile'];

const initialState = {
  // Status awal: memuat sesi tersimpan sebelum layar pertama digambar.
  bootstrapping: true,
  session: null, // { userId, email }
  profile: null, // { id, full_name, role, phone }
  profileError: null,

  tab: 'home',
  // Layar yang menumpuk di atas tab, misalnya form masuk atau detail booking.
  overlay: null, // { name, params }

  cart: [], // [{ productId, name, price, quantity, category, imageUrl }]
};

function reducer(state, action) {
  switch (action.type) {
    case 'bootstrapped':
      return {
        ...state,
        bootstrapping: false,
        session: action.session,
        profile: action.profile || null,
        profileError: action.profileError || null,
      };

    case 'session':
      return { ...state, session: action.session };

    case 'profile':
      return { ...state, profile: action.profile, profileError: null };

    case 'profileError':
      return { ...state, profile: null, profileError: action.error };

    case 'signedOut':
      // Keranjang ikut dikosongkan: isinya milik akun yang baru saja keluar.
      return { ...state, session: null, profile: null, cart: [], overlay: null };

    case 'tab':
      return { ...state, tab: action.tab, overlay: null };

    case 'openOverlay':
      return { ...state, overlay: { name: action.name, params: action.params || {} } };

    case 'closeOverlay':
      return { ...state, overlay: null };

    case 'cartAdd': {
      const existing = state.cart.find((l) => l.productId === action.product.id);
      if (existing) {
        return {
          ...state,
          cart: state.cart.map((l) =>
            l.productId === action.product.id
              ? { ...l, quantity: Math.min(50, l.quantity + 1) }
              : l,
          ),
        };
      }
      return {
        ...state,
        cart: [
          ...state.cart,
          {
            productId: action.product.id,
            name: action.product.name,
            price: Number(action.product.price),
            category: action.product.category,
            imageUrl: action.product.image_url || null,
            quantity: 1,
          },
        ],
      };
    }

    case 'cartSetQuantity': {
      // Jumlah 0 berarti baris dihapus, sehingga tombol kurang pada jumlah 1
      // tidak meninggalkan baris kosong di keranjang.
      if (action.quantity < 1) {
        return { ...state, cart: state.cart.filter((l) => l.productId !== action.productId) };
      }
      return {
        ...state,
        cart: state.cart.map((l) =>
          l.productId === action.productId
            ? { ...l, quantity: Math.min(50, action.quantity) }
            : l,
        ),
      };
    }

    case 'cartRemove':
      return { ...state, cart: state.cart.filter((l) => l.productId !== action.productId) };

    case 'cartClear':
      return { ...state, cart: [] };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  // Menandai komponen masih terpasang agar hasil permintaan yang datang
  // terlambat tidak memperbarui state setelah layar dilepas.
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Memuat ulang profil dari database. Dipanggil saat sesi berubah. */
  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      dispatch({ type: 'profile', profile: null });
      return null;
    }
    const { data, error } = await auth.getProfile(userId);
    if (!mounted.current) return null;
    if (error) {
      dispatch({ type: 'profileError', error });
      return null;
    }
    dispatch({ type: 'profile', profile: data });
    return data;
  }, []);

  // Pemuatan awal: ambil sesi tersimpan, lalu profilnya.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: session } = await auth.getSession();
      let profile = null;
      let profileError = null;
      if (session) {
        const result = await auth.getProfile(session.userId);
        profile = result.data;
        profileError = result.error;
      }
      if (!active) return;
      dispatch({ type: 'bootstrapped', session, profile, profileError });
    })();
    return () => {
      active = false;
    };
  }, []);

  // Sesi dapat berubah di luar aksi pengguna, misalnya token kedaluwarsa.
  useEffect(() => {
    const unsubscribe = auth.onChange((session) => {
      dispatch({ type: 'session', session });
      if (session) loadProfile(session.userId);
      else dispatch({ type: 'profile', profile: null });
    });
    return unsubscribe;
  }, [loadProfile]);

  const actions = useMemo(
    () => ({
      goTab: (tab) => dispatch({ type: 'tab', tab }),
      openOverlay: (name, params) => dispatch({ type: 'openOverlay', name, params }),
      closeOverlay: () => dispatch({ type: 'closeOverlay' }),

      addToCart: (product) => dispatch({ type: 'cartAdd', product }),
      setQuantity: (productId, quantity) =>
        dispatch({ type: 'cartSetQuantity', productId, quantity }),
      removeFromCart: (productId) => dispatch({ type: 'cartRemove', productId }),
      clearCart: () => dispatch({ type: 'cartClear' }),

      async signIn(email, password) {
        const result = await auth.signIn(email, password);
        if (result.error) return result;
        dispatch({ type: 'session', session: { userId: result.data.userId, email } });
        const profile = await loadProfile(result.data.userId);
        return { data: { ...result.data, profile }, error: null };
      },

      async signUp(fullName, email, password) {
        const result = await auth.signUp(fullName, email, password);
        if (result.error) return result;
        // Bila verifikasi email aktif, belum ada sesi: pengguna diminta
        // membuka tautan konfirmasi lebih dulu.
        if (!result.data.needsVerification && result.data.userId) {
          dispatch({ type: 'session', session: { userId: result.data.userId, email } });
          await loadProfile(result.data.userId);
        }
        return result;
      },

      async signOut() {
        const result = await auth.signOut();
        dispatch({ type: 'signedOut' });
        return result;
      },

      async refreshProfile() {
        if (!state.session) return null;
        return loadProfile(state.session.userId);
      },

      async updateProfile(patch) {
        if (!state.session) return { data: null, error: { message: 'Belum masuk.' } };
        const result = await auth.updateProfile(state.session.userId, patch);
        if (result.data) {
          dispatch({
            type: 'profile',
            profile: {
              id: result.data.id,
              full_name: result.data.full_name,
              role: result.data.role,
              phone: result.data.phone,
              created_at: result.data.created_at,
            },
          });
        }
        return result;
      },
    }),
    [loadProfile, state.session],
  );

  const derived = useMemo(() => {
    const itemCount = state.cart.reduce((sum, l) => sum + l.quantity, 0);
    const subtotal = state.cart.reduce((sum, l) => sum + l.price * l.quantity, 0);
    return {
      itemCount,
      subtotal,
      isSignedIn: Boolean(state.session),
      // Peran dibaca dari profil hasil query database. Tidak ada jalur lain
      // untuk menjadi admin dari dalam aplikasi.
      isAdmin: state.profile ? state.profile.role === 'admin' : false,
      isDemoMode,
    };
  }, [state.cart, state.session, state.profile]);

  const value = useMemo(
    () => ({ ...state, ...derived, ...actions }),
    [state, derived, actions],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp harus dipakai di dalam AppProvider.');
  return ctx;
}
