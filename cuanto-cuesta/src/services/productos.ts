import { supabase } from './supabase';
import { Producto, ApiResponse, FiltroProductos } from '../types';

/**
 * Servicio para gestionar productos
 */
export const productosService = {
  /**
   * Obtener todos los productos de una tienda
   */
  async obtenerPorTienda(tienda_id: string): Promise<ApiResponse<Producto[]>> {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('tienda_id', tienda_id)
        .order('nombre', { ascending: true });

      if (error) throw error;

      return {
        data: data as Producto[],
        error: null,
        success: true,
      };
    } catch (error: any) {
      return {
        data: null,
        error: error.message || 'Error al obtener productos',
        success: false,
      };
    }
  },

  /**
   * Buscar productos con filtros
   */
  async buscar(tienda_id: string, filtros: FiltroProductos): Promise<ApiResponse<Producto[]>> {
    try {
      let query = supabase
        .from('productos')
        .select('*')
        .eq('tienda_id', tienda_id);

      if (filtros.categoria) {
        query = query.eq('categoria', filtros.categoria);
      }

      if (filtros.precioMin !== undefined) {
        query = query.gte('precio', filtros.precioMin);
      }

      if (filtros.precioMax !== undefined) {
        query = query.lte('precio', filtros.precioMax);
      }

      if (filtros.busqueda) {
        query = query.ilike('nombre', `%${filtros.busqueda}%`);
      }

      const { data, error } = await query.order('nombre', { ascending: true });

      if (error) throw error;

      return {
        data: data as Producto[],
        error: null,
        success: true,
      };
    } catch (error: any) {
      return {
        data: null,
        error: error.message || 'Error en búsqueda',
        success: false,
      };
    }
  },

  /**
   * Obtener producto por ID
   */
  async obtenerPorId(id: string): Promise<ApiResponse<Producto>> {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        data: data as Producto,
        error: null,
        success: true,
      };
    } catch (error: any) {
      return {
        data: null,
        error: error.message || 'Error al obtener producto',
        success: false,
      };
    }
  },

  /**
   * Crear nuevo producto
   */
  async crear(producto: Omit<Producto, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Producto>> {
    try {
      const { data, error } = await supabase
        .from('productos')
        .insert([
          {
            ...producto,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return {
        data: data as Producto,
        error: null,
        success: true,
      };
    } catch (error: any) {
      return {
        data: null,
        error: error.message || 'Error al crear producto',
        success: false,
      };
    }
  },

  /**
   * Actualizar producto
   */
  async actualizar(id: string, actualizaciones: Partial<Producto>): Promise<ApiResponse<Producto>> {
    try {
      const { data, error } = await supabase
        .from('productos')
        .update({
          ...actualizaciones,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        data: data as Producto,
        error: null,
        success: true,
      };
    } catch (error: any) {
      return {
        data: null,
        error: error.message || 'Error al actualizar producto',
        success: false,
      };
    }
  },

  /**
   * Eliminar producto
   */
  async eliminar(id: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await supabase.from('productos').delete().eq('id', id);

      if (error) throw error;

      return {
        data: null,
        error: null,
        success: true,
      };
    } catch (error: any) {
      return {
        data: null,
        error: error.message || 'Error al eliminar producto',
        success: false,
      };
    }
  },

  /**
   * Obtener categorías únicas
   */
  async obtenerCategorias(tienda_id: string): Promise<ApiResponse<string[]>> {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('categoria')
        .eq('tienda_id', tienda_id);

      if (error) throw error;

      // Obtener valores únicos en JS
      const categoriasUnicas = Array.from(new Set(data?.map((p: any) => p.categoria))).filter(Boolean) as string[];

      return {
        data: categoriasUnicas,
        error: null,
        success: true,
      };
    } catch (error: any) {
      return {
        data: null,
        error: error.message || 'Error al obtener categorías',
        success: false,
      };
    }
  },
};
