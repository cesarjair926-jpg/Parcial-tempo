// Tipos de Usuario
export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'empleado';
  tienda_id: string;
  created_at: string;
  updated_at: string;
}

// Tipos de Producto
export interface Producto {
  id: string;
  nombre: string;
  precio: number;
  categoria: string;
  tienda_id: string;
  imagen_url?: string | null;
  descripcion?: string | null;
  created_at: string;
  updated_at: string;
}

// Tipos de Tienda
export interface Tienda {
  id: string;
  nombre: string;
  propietario_id: string;
  created_at: string;
  updated_at: string;
}

// Tipos de Autenticación
export interface AuthResponse {
  user: Usuario | null;
  session: Session | null;
  error: string | null;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

// Tipos de Respuesta de API
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

// Tipos de Filtros
export interface FiltroProductos {
  categoria?: string;
  busqueda?: string;
  precioMin?: number;
  precioMax?: number;
}
