import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';
import { Usuario, ApiResponse } from '../types';

/**
 * Función auxiliar para añadir un tiempo de límite (timeout) a las promesas
 */
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Tiempo de espera agotado (Timeout)')), timeoutMs)
    ),
  ]);
};

/**
 * Servicio para gestión de empleados
 */
export const empleadosService = {
  /**
   * Crear un nuevo empleado asociado a la tienda del admin.
   * Usa fetch directo a la API REST de Supabase para NO afectar
   * la sesión actual del administrador.
   */
  async crearEmpleado(
    email: string,
    password: string,
    nombre: string,
    tiendaId: string
  ): Promise<ApiResponse<Usuario>> {
    try {
      console.log('Intentando crear cuenta en auth...', { email, url: SUPABASE_URL });
      
      const signUpResponse = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      console.log('Respuesta de auth recibida. Status:', signUpResponse.status);
      
      let signUpData;
      const responseText = await signUpResponse.text();
      try {
        signUpData = JSON.parse(responseText);
      } catch (e) {
        console.error('Error al parsear respuesta JSON:', responseText);
        throw new Error('La respuesta del servidor no es válida');
      }

      if (!signUpResponse.ok) {
        console.error('Error en auth signup:', signUpData);
        throw new Error(signUpData.msg || signUpData.message || signUpData.error_description || 'Error al crear cuenta del empleado');
      }

      // La API devuelve { id, email, ... } o { user: { id, ... } }
      const userId = signUpData.id || signUpData.user?.id;

      if (!userId) {
        throw new Error('No se recibió un ID de usuario válido');
      }

      const now = new Date().toISOString();

      // 2. Insertar perfil del empleado en la tabla pública
      //    Usamos el cliente normal de supabase (que aún tiene la sesión del admin)
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .insert([
          {
            id: userId,
            email,
            nombre,
            tienda_id: tiendaId,
            rol: 'empleado',
            created_at: now,
            updated_at: now,
          },
        ])
        .select()
        .single();

      if (usuarioError) {
        throw new Error('Cuenta creada pero error al guardar perfil: ' + usuarioError.message);
      }

      return {
        data: usuarioData as Usuario,
        error: null,
        success: true,
      };
    } catch (error: any) {
      return {
        data: null,
        error: error.message || 'Error al crear empleado',
        success: false,
      };
    }
  },

  /**
   * Obtener todos los empleados de una tienda
   */
  async obtenerEmpleados(tiendaId: string): Promise<ApiResponse<Usuario[]>> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('tienda_id', tiendaId)
        .eq('rol', 'empleado')
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
        error: error.message || 'Error al obtener empleados',
        success: false,
      };
    }
  },

  /**
   * Eliminar un empleado
   */
  async eliminarEmpleado(userId: string): Promise<ApiResponse<null>> {
    try {
      const { error: deleteError } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', userId);

      if (deleteError) throw deleteError;

      return {
        data: null,
        error: null,
        success: true,
      };
    } catch (error: any) {
      return {
        data: null,
        error: error.message || 'Error al eliminar empleado',
        success: false,
      };
    }
  },

  /**
   * Actualizar datos de un empleado (Admin)
   */
  async actualizarEmpleado(
    userId: string,
    datos: { nombre?: string, email?: string }
  ): Promise<ApiResponse<Usuario>> {
    try {
      console.log('Iniciando actualización de empleado:', userId, datos);
      
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          ...datos,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error en update Supabase:', updateError);
        throw updateError;
      }

      console.log('Update exitoso.');

      return {
        data: { id: userId, ...datos } as any,
        error: null,
        success: true,
      };
    } catch (error: any) {
      console.error('Error capturado en actualizarEmpleado:', error);
      return {
        data: null,
        error: error.message || 'Error al actualizar empleado',
        success: false,
      };
    }
  },
};
