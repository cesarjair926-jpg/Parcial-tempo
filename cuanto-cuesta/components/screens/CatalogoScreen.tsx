import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  View,
  Text,
  ActivityIndicator,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { productosService } from '../../src/services/productos';
import { supabase } from '../../src/services/supabase';
import { Producto } from '../../src/types';
import ProfileMenu from '../ProfileMenu';
import { Ionicons } from '@expo/vector-icons';

export default function CatalogoScreen() {
  const { usuario } = useAuth();
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<string[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      cargarDatos();
    }, [usuario])
  );

  // Suscripción en tiempo real
  useEffect(() => {
    if (!usuario) return;

    // Crear un nombre de canal único para evitar colisiones
    const canalId = `productos-${usuario.tienda_id}-${Math.random().toString(36).slice(2, 9)}`;
    const canal = supabase.channel(canalId);
    
    canal
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'productos',
          filter: `tienda_id=eq.${usuario.tienda_id}`,
        },
        () => {
          console.log('Cambio detectado en productos, recargando...');
          cargarDatos();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Suscrito a cambios de productos');
        }
      });

    return () => {
      console.log('Limpiando canal de productos...');
      supabase.removeChannel(canal);
    };
  }, [usuario]);

  const cargarDatos = async () => {
    if (!usuario) return;

    try {
      setCargando(true);

      // Cargar productos
      const resProductos = await productosService.obtenerPorTienda(usuario.tienda_id);
      if (resProductos.success && resProductos.data) {
        setProductos(resProductos.data);
      }

      // Cargar categorías
      const resCategorias = await productosService.obtenerCategorias(usuario.tienda_id);
      if (resCategorias.success && resCategorias.data) {
        setCategorias(resCategorias.data);
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudieron cargar los productos');
    } finally {
      setCargando(false);
    }
  };

  const handleBuscar = async () => {
    if (!usuario) return;

    try {
      setCargando(true);
      const res = await productosService.buscar(usuario.tienda_id, {
        busqueda,
        categoria: categoriaSeleccionada || undefined,
      });

      if (res.success && res.data) {
        setProductos(res.data);
      }
    } catch (err) {
      Alert.alert('Error', 'Error en la búsqueda');
    } finally {
      setCargando(false);
    }
  };

  const renderProducto = ({ item }: { item: Producto }) => (
    <View style={styles.productoCard}>
      {item.imagen_url ? (
        <Image source={{ uri: item.imagen_url }} style={styles.imagen} />
      ) : (
        <View style={[styles.imagen, styles.placeholderImagen]}>
          <Ionicons name="cube-outline" size={30} color="#94A3B8" />
        </View>
      )}
      <View style={styles.productoInfo}>
        <Text style={styles.nombreProducto}>{item.nombre}</Text>
        <Text style={styles.categoria}>{item.categoria}</Text>
        {item.descripcion && <Text style={styles.descripcion}>{item.descripcion}</Text>}
        <Text style={styles.precio}>${item.precio.toFixed(2)}</Text>
      </View>
      <View style={styles.accionesProducto}>
        {usuario?.rol === 'admin' && (
          <TouchableOpacity 
            style={[styles.accionBtn, styles.editBtn]} 
            onPress={() => router.push({ pathname: '/productos', params: { id: item.id, edit: 'true' } })}
          >
            <Text style={styles.editBtnText}>✎</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.agregarBtn}>
          <Text style={styles.agregarBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Catálogo</Text>
        <ProfileMenu />
      </View>

      <ScrollView style={styles.content}>
        {/* Barra de búsqueda */}
        <View style={styles.busquedaContainer}>
          <TextInput
            style={styles.busquedaInput}
            placeholder="Buscar productos..."
            value={busqueda}
            onChangeText={setBusqueda}
            placeholderTextColor="#999"
          />
          <TouchableOpacity style={styles.busquedaBtn} onPress={handleBuscar}>
            <Text style={styles.busquedaBtnText}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* Filtro de categorías */}
        {categorias.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorias}>
            <TouchableOpacity
              style={[
                styles.categoriaBtn,
                categoriaSeleccionada === null && styles.categoriaBtnActive,
              ]}
              onPress={() => {
                setCategoriaSeleccionada(null);
                handleBuscar();
              }}
            >
              <Text
                style={[
                  styles.categoriaBtnText,
                  categoriaSeleccionada === null && styles.categoriaBtnTextActive,
                ]}
              >
                Todos
              </Text>
            </TouchableOpacity>
            {categorias.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoriaBtn, categoriaSeleccionada === cat && styles.categoriaBtnActive]}
                onPress={() => {
                  setCategoriaSeleccionada(cat);
                }}
              >
                <Text
                  style={[
                    styles.categoriaBtnText,
                    categoriaSeleccionada === cat && styles.categoriaBtnTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Lista de productos */}
        {cargando ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007a99" />
          </View>
        ) : productos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay productos disponibles</Text>
          </View>
        ) : (
          <FlatList
            data={productos}
            renderItem={renderProducto}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            style={styles.lista}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Color de fondo más limpio
  },
  header: {
    backgroundColor: '#083344', // Azul marino profundo premium
    paddingVertical: 20,
    paddingHorizontal: 24,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '800', // Más grueso para impacto
    color: '#fff',
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  busquedaContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  busquedaInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16, // Más redondeado
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    fontSize: 15,
    color: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  busquedaBtn: {
    backgroundColor: '#0E7490', // Cian oscuro vibrante
    borderRadius: 16,
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0E7490',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  busquedaBtnText: {
    fontSize: 18,
  },
  categorias: {
    marginBottom: 20,
    paddingBottom: 4,
  },
  categoriaBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  categoriaBtnActive: {
    backgroundColor: '#0E7490',
    borderColor: '#0E7490',
    shadowColor: '#0E7490',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  categoriaBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  categoriaBtnTextActive: {
    color: '#fff',
  },
  lista: {
    paddingBottom: 40,
  },
  productoCard: {
    backgroundColor: '#fff',
    borderRadius: 20, // Bordes muy redondeados premium
    marginBottom: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 5,
  },
  imagen: {
    width: 100, // Más grande
    height: 100,
    backgroundColor: '#F1F5F9',
  },
  placeholderImagen: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  productoInfo: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  nombreProducto: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  categoria: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  descripcion: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 8,
    lineHeight: 18,
  },
  precio: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0891B2',
  },
  accionesProducto: {
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderLeftColor: '#CFFAFE',
  },
  agregarBtn: {
    backgroundColor: '#ECFEFF',
    width: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agregarBtnText: {
    fontSize: 24,
    color: '#0E7490',
    fontWeight: '700',
  },
  accionBtn: {
    width: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
  },
  editBtn: {
    backgroundColor: '#F8FAFC',
  },
  editBtnText: {
    fontSize: 18,
    color: '#64748B',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '500',
  },
});
