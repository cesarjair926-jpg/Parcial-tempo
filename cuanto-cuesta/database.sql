-- ============================================================
-- CuantoCuesta — Base de Datos Completa
-- Stack: Supabase (PostgreSQL + Auth + Storage + RLS)
-- Última actualización: 2026-05-07
-- ============================================================

-- ============================================================
-- 1. LIMPIEZA (solo para reinstalación desde cero)
-- ============================================================
DROP TABLE IF EXISTS factura_items CASCADE;
DROP TABLE IF EXISTS facturas CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS tiendas CASCADE;

-- ============================================================
-- 2. TABLAS
-- ============================================================

-- Tabla de tiendas (cada admin tiene una tienda)
CREATE TABLE IF NOT EXISTS tiendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  propietario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de usuarios (admin o empleado, vinculados a una tienda)
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  nombre VARCHAR(255) NOT NULL,
  rol VARCHAR(50) NOT NULL CHECK (rol IN ('admin', 'empleado')) DEFAULT 'empleado',
  tienda_id UUID NOT NULL REFERENCES tiendas(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de productos (inventario de cada tienda)
CREATE TABLE IF NOT EXISTS productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  precio DECIMAL(10, 2) NOT NULL CHECK (precio > 0),
  categoria VARCHAR(100) NOT NULL,
  tienda_id UUID NOT NULL REFERENCES tiendas(id) ON DELETE CASCADE,
  imagen_url TEXT,
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de facturas (ventas realizadas)
CREATE TABLE IF NOT EXISTS facturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tienda_id UUID NOT NULL REFERENCES tiendas(id) ON DELETE CASCADE,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  estado VARCHAR(50) NOT NULL CHECK (estado IN ('pendiente', 'completada', 'cancelada')) DEFAULT 'pendiente',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de items de cada factura (detalle de venta)
CREATE TABLE IF NOT EXISTS factura_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario DECIMAL(10, 2) NOT NULL CHECK (precio_unitario > 0),
  subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal > 0),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 3. ÍNDICES (mejora de rendimiento en consultas frecuentes)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_usuarios_tienda ON usuarios(tienda_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_productos_tienda ON productos(tienda_id);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
CREATE INDEX IF NOT EXISTS idx_facturas_usuario ON facturas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_facturas_tienda ON facturas(tienda_id);
CREATE INDEX IF NOT EXISTS idx_facturas_estado ON facturas(estado);
CREATE INDEX IF NOT EXISTS idx_factura_items_factura ON factura_items(factura_id);
CREATE INDEX IF NOT EXISTS idx_factura_items_producto ON factura_items(producto_id);

-- ============================================================
-- 4. HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE tiendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE factura_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. POLÍTICAS RLS — TIENDAS
-- ============================================================

-- El propietario puede ver su tienda
CREATE POLICY "tiendas_select_propietario" ON tiendas
  FOR SELECT
  USING (propietario_id = auth.uid());

-- Cualquier usuario autenticado puede crear una tienda
CREATE POLICY "tiendas_insert" ON tiendas
  FOR INSERT
  WITH CHECK (propietario_id = auth.uid());

-- El propietario puede actualizar su tienda
CREATE POLICY "tiendas_update_propietario" ON tiendas
  FOR UPDATE
  USING (propietario_id = auth.uid());

-- ============================================================
-- 6. POLÍTICAS RLS — USUARIOS
-- ============================================================

-- Cada usuario puede ver su propio perfil
CREATE POLICY "usuarios_select_propio" ON usuarios
  FOR SELECT
  USING (id = auth.uid());

-- El admin puede ver a todos los empleados de su tienda
CREATE POLICY "usuarios_select_admin_tienda" ON usuarios
  FOR SELECT
  USING (
    tienda_id IN (
      SELECT id FROM tiendas WHERE propietario_id = auth.uid()
    )
  );

-- Un usuario puede crear su propio perfil, o un admin puede crear empleados
CREATE POLICY "usuarios_insert" ON usuarios
  FOR INSERT
  WITH CHECK (
    id = auth.uid() OR
    tienda_id IN (SELECT id FROM tiendas WHERE propietario_id = auth.uid())
  );

-- El admin puede actualizar datos de empleados de su tienda
CREATE POLICY "usuarios_update_admin" ON usuarios
  FOR UPDATE
  USING (
    id = auth.uid() OR
    tienda_id IN (SELECT id FROM tiendas WHERE propietario_id = auth.uid())
  );

-- El admin puede eliminar empleados de su tienda
CREATE POLICY "usuarios_delete_admin" ON usuarios
  FOR DELETE
  USING (
    tienda_id IN (SELECT id FROM tiendas WHERE propietario_id = auth.uid())
  );

-- ============================================================
-- 7. POLÍTICAS RLS — PRODUCTOS
-- ============================================================

-- Cualquier miembro de la tienda puede ver los productos
CREATE POLICY "productos_select_tienda" ON productos
  FOR SELECT
  USING (
    tienda_id IN (
      SELECT tienda_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- Solo admins pueden crear productos
CREATE POLICY "productos_insert_admin" ON productos
  FOR INSERT
  WITH CHECK (
    tienda_id IN (
      SELECT tienda_id FROM usuarios
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- Solo admins pueden actualizar productos
CREATE POLICY "productos_update_admin" ON productos
  FOR UPDATE
  USING (
    tienda_id IN (
      SELECT tienda_id FROM usuarios
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- Solo admins pueden eliminar productos
CREATE POLICY "productos_delete_admin" ON productos
  FOR DELETE
  USING (
    tienda_id IN (
      SELECT tienda_id FROM usuarios
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- ============================================================
-- 8. POLÍTICAS RLS — FACTURAS
-- ============================================================

-- Cada usuario puede ver sus propias facturas
CREATE POLICY "facturas_select_propias" ON facturas
  FOR SELECT
  USING (usuario_id = auth.uid());

-- El admin puede ver TODAS las facturas de su tienda
CREATE POLICY "facturas_select_admin_tienda" ON facturas
  FOR SELECT
  USING (
    tienda_id IN (
      SELECT id FROM tiendas WHERE propietario_id = auth.uid()
    )
  );

-- Los empleados pueden ver las facturas de su tienda
CREATE POLICY "facturas_select_empleado_tienda" ON facturas
  FOR SELECT
  USING (
    tienda_id IN (
      SELECT tienda_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- Cualquier usuario autenticado puede crear facturas
CREATE POLICY "facturas_insert" ON facturas
  FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

-- Solo admins pueden actualizar el estado de una factura
CREATE POLICY "facturas_update_admin" ON facturas
  FOR UPDATE
  USING (
    tienda_id IN (
      SELECT id FROM tiendas WHERE propietario_id = auth.uid()
    )
  );

-- Solo admins pueden eliminar facturas
CREATE POLICY "facturas_delete_admin" ON facturas
  FOR DELETE
  USING (
    tienda_id IN (
      SELECT id FROM tiendas WHERE propietario_id = auth.uid()
    )
  );

-- ============================================================
-- 9. POLÍTICAS RLS — FACTURA_ITEMS
-- ============================================================

-- Cada usuario puede ver los items de sus facturas
CREATE POLICY "factura_items_select_propias" ON factura_items
  FOR SELECT
  USING (
    factura_id IN (
      SELECT id FROM facturas WHERE usuario_id = auth.uid()
    )
  );

-- El admin puede ver los items de todas las facturas de su tienda
CREATE POLICY "factura_items_select_admin_tienda" ON factura_items
  FOR SELECT
  USING (
    factura_id IN (
      SELECT id FROM facturas
      WHERE tienda_id IN (
        SELECT id FROM tiendas WHERE propietario_id = auth.uid()
      )
    )
  );

-- Los empleados pueden ver items de facturas de su tienda
CREATE POLICY "factura_items_select_empleado_tienda" ON factura_items
  FOR SELECT
  USING (
    factura_id IN (
      SELECT id FROM facturas
      WHERE tienda_id IN (
        SELECT tienda_id FROM usuarios WHERE id = auth.uid()
      )
    )
  );

-- Cualquier usuario autenticado puede insertar items en sus facturas
CREATE POLICY "factura_items_insert" ON factura_items
  FOR INSERT
  WITH CHECK (
    factura_id IN (
      SELECT id FROM facturas WHERE usuario_id = auth.uid()
    )
  );

-- Solo admins pueden eliminar items (al cancelar/eliminar facturas)
CREATE POLICY "factura_items_delete_admin" ON factura_items
  FOR DELETE
  USING (
    factura_id IN (
      SELECT id FROM facturas
      WHERE tienda_id IN (
        SELECT id FROM tiendas WHERE propietario_id = auth.uid()
      )
    )
  );

-- ============================================================
-- 10. STORAGE — Bucket para imágenes de productos
-- ============================================================
-- NOTA: Ejecutar esto desde el SQL Editor de Supabase.
-- Si el bucket ya existe, estas sentencias se ignorarán.

INSERT INTO storage.buckets (id, name, public)
VALUES ('productos', 'productos', true)
ON CONFLICT (id) DO NOTHING;

-- Cualquier usuario autenticado puede subir imágenes
CREATE POLICY "productos_storage_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'productos' AND auth.role() = 'authenticated'
  );

-- Cualquiera puede ver las imágenes (bucket público)
CREATE POLICY "productos_storage_select" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'productos');

-- El usuario que subió la imagen puede actualizarla
CREATE POLICY "productos_storage_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'productos' AND auth.uid() = owner
  );

-- El usuario que subió la imagen puede eliminarla
CREATE POLICY "productos_storage_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'productos' AND auth.uid() = owner
  );
