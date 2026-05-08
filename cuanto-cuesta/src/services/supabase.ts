import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Estas variables de entorno deben estar en .env
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const customStorage = {
  getItem: async (key: string) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window === 'undefined') return null;
        return window.localStorage.getItem(key);
      }
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.warn('AsyncStorage get error:', e);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(key, value);
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn('AsyncStorage set error:', e);
    }
  },
  removeItem: async (key: string) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window === 'undefined') return;
        window.localStorage.removeItem(key);
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn('AsyncStorage remove error:', e);
    }
  },
};

// Crear cliente de Supabase con soporte para React Native
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export type Database = {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string;
          email: string;
          nombre: string;
          rol: 'admin' | 'empleado';
          tienda_id: string;
          created_at: string;
          updated_at: string;
        };
      };
      productos: {
        Row: {
          id: string;
          nombre: string;
          precio: number;
          categoria: string;
          tienda_id: string;
          imagen_url: string | null;
          descripcion: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      tiendas: {
        Row: {
          id: string;
          nombre: string;
          propietario_id: string;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
};
