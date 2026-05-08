import React, { createContext, useEffect, useState, useCallback } from 'react';
import { Usuario, Session } from '../types/index';
import { authService } from '../services/auth';
import { supabase } from '../services/supabase';

// Helper para evitar bloqueos infinitos
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    ),
  ]);
}

export interface AuthContextType {
  usuario: Usuario | null;
  session: Session | null;
  cargando: boolean;
  error: string | null;
  registrar: (email: string, password: string, nombre: string, nombreTienda: string) => Promise<void>;
  iniciarSesion: (email: string, password: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  limpiarError: () => void;
  refrescarUsuario: () => Promise<void>;
}

// Volvemos a un valor por defecto para evitar regresiones en componentes que no usan el hook
export const AuthContext = createContext<AuthContextType>({
  usuario: null,
  session: null,
  cargando: true,
  error: null,
  registrar: async () => {},
  iniciarSesion: async () => {},
  cerrarSesion: async () => {},
  limpiarError: () => {},
  refrescarUsuario: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const verificarSesion = async () => {
      try {
        const respuesta = await authService.obtenerSesion();
        if (mounted && respuesta.user && respuesta.session) {
          setUsuario(respuesta.user);
          setSession(respuesta.session);
        }
      } catch (err) {
        console.error('Error verificando sesión inicial:', err);
      } finally {
        if (mounted) setCargando(false);
      }
    };

    verificarSesion();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, sessionData) => {
      if (event === 'SIGNED_OUT') {
        if (mounted) {
          setUsuario(null);
          setSession(null);
          setCargando(false);
        }
        return;
      }

      if (sessionData?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        try {
          const respuesta = await authService.obtenerSesion();
          if (mounted && respuesta.user) {
            setUsuario(respuesta.user);
            setSession(sessionData as unknown as Session);
          }
        } catch (err) {
          console.error('Error actualizando sesión en listener:', err);
        }
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const registrar = useCallback(async (email: string, password: string, nombre: string, nombreTienda: string) => {
    try {
      setCargando(true);
      setError(null);
      const respuesta = await authService.registrar(email, password, nombre, nombreTienda);

      if (respuesta.error) {
        setError(respuesta.error);
        throw new Error(respuesta.error);
      }

      if (respuesta.user && respuesta.session) {
        setUsuario(respuesta.user);
        setSession(respuesta.session);
      }
    } catch (err: any) {
      setError(err.message || 'Error en el registro');
      throw err;
    } finally {
      setCargando(false);
    }
  }, []);

  const iniciarSesion = useCallback(async (email: string, password: string) => {
    try {
      setCargando(true);
      setError(null);
      const respuesta = await authService.iniciarSesion(email, password);

      if (respuesta.error) {
        setError(respuesta.error);
        throw new Error(respuesta.error);
      }

      if (respuesta.user && respuesta.session) {
        setUsuario(respuesta.user);
        setSession(respuesta.session);
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
      throw err;
    } finally {
      setCargando(false);
    }
  }, []);

  const cerrarSesion = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      await authService.cerrarSesion();
    } catch (err: any) {
      console.error('Error al cerrar sesión:', err);
    } finally {
      setUsuario(null);
      setSession(null);
      setCargando(false);
    }
  }, []);

  const limpiarError = useCallback(() => {
    setError(null);
  }, []);

  const refrescarUsuario = useCallback(async () => {
    try {
      const { data: { session: currentSession } } = await withTimeout(supabase.auth.getSession(), 3000);
      if (currentSession?.user) {
        const { data: userData } = await withTimeout(
          Promise.resolve(supabase.from('usuarios').select('*').eq('id', currentSession.user.id).single()),
          3000
        );
        if (userData) setUsuario(userData as Usuario);
      }
    } catch (err) {
      console.error('Error al refrescar usuario:', err);
    }
  }, []);

  const value = {
    usuario,
    session,
    cargando,
    error,
    registrar,
    iniciarSesion,
    cerrarSesion,
    limpiarError,
    refrescarUsuario,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
