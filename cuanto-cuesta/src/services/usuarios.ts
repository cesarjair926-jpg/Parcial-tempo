import { supabase } from './supabase';
import { Usuario, ApiResponse } from '../types';

/**
 * Servicio para gestionar usuarios
 */
export const usuariosService = {
  /**
   * Obtener todos los usuarios de una tienda
   */
  async obtenerPorTienda(tienda_id: string): Promise<ApiResponse<Usuario[]>> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('tienda_id', tienda_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        data: data as Usuario[],
        error: null,
        success: true,
      };
    } catch (error: any) {
      return {
        data: null,
        error: error.message || 'Error al obtener usuarios',
        success: false,
      };
    }
  },

  /**
   * Obtener usuario por ID
   */
  async obtenerPorId(id: string): Promise<ApiResponse<Usuario>> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        data: data as Usuario,
        error: null,
        success: true,
      };
    } catch (error: any) {
      return {
        data: null,
        error: error.message || 'Error al obtener usuario',
        success: false,
      };
    }
  },

  /**
   * Crear usuario (solo para admin)
   */
  async crearUsuario(
    email: string,
    nombre: string,
    rol: 'admin' | 'empleado',
    tienda_id: string,
  ): Promise<ApiResponse<Usuario>> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .insert([
          {
            email,
            nombre,
            rol,
            tienda_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return {
        data: data as Usuario,
        error: null,
        success: true,
      };
    } catch (error: any) {
      return {
        data: null,
        error: error.message || 'Error al crear usuario',
        success: false,
      };
    }
  },

  /**
   * Actualizar usuario
   */
  async actualizar(id: string, actualizaciones: Partial<Usuario>): Promise<ApiResponse<Usuario>> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .update({
          ...actualizaciones,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        data: data as Usuario,
        error: null,
        success: true,
      };
    } catch (error: any) {
      return {
        data: null,
        error: error.message || 'Error al actualizar usuario',
        success: false,
      };
    }
  },

  /**
   * Eliminar usuario
   */
  async eliminar(id: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await supabase.from('usuarios').delete().eq('id', id);

      if (error) throw error;

      return {
        data: null,
        error: null,
        success: true,
      };
    } catch (error: any) {
      return {
        data: null,
        error: error.message || 'Error al eliminar usuario',
        success: false,
      };
    }
  },

  /**
   * Cambiar rol de usuario
   */
  async cambiarRol(id: string, nuevoRol: 'admin' | 'empleado'): Promise<ApiResponse<Usuario>> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .update({
          rol: nuevoRol,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        data: data as Usuario,
        error: null,
        success: true,
      };
    } catch (error: any) {
      return {
        data: null,
        error: error.message || 'Error al cambiar rol',
        success: false,
      };
    }
  },
};
