import { supabase } from './supabase';
import { Usuario, AuthResponse, Session } from '../types';

/**
 * Servicio de autenticación con Supabase
 */
export const authService = {
  /**
   * Registrar nuevo usuario
   */
  async registrar(email: string, password: string, nombre: string, nombreTienda: string): Promise<AuthResponse> {
    try {
      // Crear usuario en Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (!authData.user) {
        return {
          user: null,
          session: null,
          error: 'No se pudo crear el usuario',
        };
      }

      const now = new Date().toISOString();

      // 1. Crear la tienda primero
      const { data: tiendaData, error: tiendaError } = await supabase
        .from('tiendas')
        .insert([
          {
            nombre: nombreTienda,
            propietario_id: authData.user.id,
          },
        ])
        .select()
        .single();

      if (tiendaError) {
        throw new Error('Error al crear la tienda: ' + tiendaError.message);
      }

      // 2. Crear perfil del usuario en tabla usuarios como admin
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .insert([
          {
            id: authData.user.id,
            email,
            nombre,
            tienda_id: tiendaData.id,
            rol: 'admin',
          },
        ])
        .select()
        .single();

      if (usuarioError) {
        throw new Error('Error al crear el perfil de usuario: ' + usuarioError.message);
      }

      return {
        user: usuarioData as Usuario,
        session: authData.session as Session | null,
        error: null,
      };
    } catch (error: any) {
      return {
        user: null,
        session: null,
        error: error.message || 'Error en registro',
      };
    }
  },

  /**
   * Iniciar sesión
   */
  async iniciarSesion(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (!authData.user) {
        return {
          user: null,
          session: null,
          error: 'Usuario o contraseña incorrectos',
        };
      }

      // Obtener datos del usuario
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (usuarioError) throw usuarioError;

      if (!usuarioData) {
        throw new Error('No se encontró el perfil de usuario. Contacte al administrador.');
      }

      return {
        user: usuarioData as Usuario,
        session: authData.session as Session | null,
        error: null,
      };
    } catch (error: any) {
      return {
        user: null,
        session: null,
        error: error.message || 'Error al iniciar sesión',
      };
    }
  },

  /**
   * Obtener sesión actual
   */
  async obtenerSesion(): Promise<AuthResponse> {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!sessionData.session) {
        return {
          user: null,
          session: null,
          error: 'No hay sesión activa',
        };
      }

      // Obtener datos del usuario
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', sessionData.session.user.id)
        .maybeSingle();

      if (usuarioError) throw usuarioError;

      return {
        user: usuarioData as Usuario,
        session: sessionData.session as Session,
        error: null,
      };
    } catch (error: any) {
      return {
        user: null,
        session: null,
        error: error.message || 'Error al obtener sesión',
      };
    }
  },

  /**
   * Cerrar sesión
   */
  async cerrarSesion(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error: error.message || 'Error al cerrar sesión' };
    }
  },

  /**
   * Cambiar contraseña
   */
  async cambiarContrasena(nuevaContrasena: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: nuevaContrasena,
      });
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error: error.message || 'Error al cambiar contraseña' };
    }
  },

  /**
   * Recuperar contraseña
   */
  async recuperarContrasena(email: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error: error.message || 'Error al recuperar contraseña' };
    }
  },
};
