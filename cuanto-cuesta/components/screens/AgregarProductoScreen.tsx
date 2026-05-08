import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Text,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { productosService } from '../../src/services/productos';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';

export default function AgregarProductoScreen() {
  const { usuario } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const editId = params.id as string;

  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoria, setCategoria] = useState('Otros');
  const [descripcion, setDescripcion] = useState('');
  const [codigoBarra, setCodigoBarra] = useState('');
  const [cargando, setCargando] = useState(false);
  const [inicializando, setInicializando] = useState(!!editId);
  const [feedback, setFeedback] = useState<{ tipo: 'exito' | 'error', mensaje: string } | null>(null);

  const categorias = ['Alimentos', 'Bebidas', 'Limpieza', 'Cuidado Personal', 'Otros'];

  // Cargar datos si estamos editando
  useEffect(() => {
    if (params.id) {
      cargarProducto(params.id as string);
    } else {
      handleLimpiarFormulario();
    }
  }, [params.id]);

  const cargarProducto = async (id: string) => {
    try {
      setInicializando(true);
      const res = await productosService.obtenerPorId(id);
      if (res.success && res.data) {
        setNombre(res.data.nombre);
        setPrecio(res.data.precio.toString());
        setCategoria(res.data.categoria);
        setDescripcion(res.data.descripcion || '');
      }
    } catch (err) {
      console.error('Error al cargar producto:', err);
    } finally {
      setInicializando(false);
    }
  };

  const handleLimpiarFormulario = () => {
    setNombre('');
    setPrecio('');
    setCategoria('Otros');
    setDescripcion('');
    router.setParams({ id: '', edit: 'false' }); 
  };

  const handleGuardarProducto = async () => {
    if (!nombre || !precio || !usuario) {
      Alert.alert('Error', 'Por favor completa los campos requeridos');
      return;
    }

    try {
      setCargando(true);
      setFeedback(null);
      
      const datos = {
        nombre,
        precio: parseFloat(precio),
        categoria,
        descripcion,
        tienda_id: usuario.tienda_id,
      };

      let res;
      if (editId) {
        res = await productosService.actualizar(editId, datos);
      } else {
        res = await productosService.crear(datos);
      }

      if (!res.success) {
        setFeedback({ tipo: 'error', mensaje: res.error || 'Error al guardar el producto' });
        return;
      }

      const mensajeOk = editId ? '¡Producto actualizado correctamente!' : '¡Producto creado correctamente!';
      setFeedback({ tipo: 'exito', mensaje: mensajeOk });

      // Limpiar mensaje, formulario y redirigir después de 2 segundos
      setTimeout(() => {
        setFeedback(null);
        handleLimpiarFormulario();
        router.push('/'); // Redirigir al catálogo
      }, 2000);

    } catch (err: any) {
      console.error('Error detallado al guardar:', err);
      setFeedback({ tipo: 'error', mensaje: err.message || 'Error inesperado' });
      Alert.alert('Error', err.message || 'No se pudo guardar el producto. Revisa tu conexión o permisos.');
    } finally {
      setCargando(false);
    }
  };

  if (usuario?.rol !== 'admin') {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Solo los administradores pueden agregar productos</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.titulo}>{editId ? 'Editar Producto' : 'Agregar Producto'}</Text>
        </View>

        <View style={styles.form}>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre del Producto *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Café Premium 500g"
              value={nombre}
              onChangeText={setNombre}
              editable={!cargando}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Precio ($) *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={precio}
              onChangeText={setPrecio}
              keyboardType="decimal-pad"
              editable={!cargando}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Categoría</Text>
            <View style={styles.categoriasContainer}>
              {categorias.map((cat) => {
                const activo = categoria === cat;

                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoriaBtn, activo && styles.categoriaBtnActive]}
                    onPress={() => setCategoria(cat)}
                    disabled={cargando}
                  >
                    <Text style={[styles.categoriaBtnText, activo && styles.categoriaBtnTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descripción (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe el producto..."
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              numberOfLines={4}
              editable={!cargando}
              placeholderTextColor="#999"
              textAlignVertical="top"
            />
          </View>

          {feedback && (
            <View style={[styles.feedbackBanner, feedback.tipo === 'exito' ? styles.exitoBanner : styles.errorBanner]}>
              <Text style={styles.feedbackText}>{feedback.mensaje}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.crearBtn, (cargando || inicializando) && styles.crearBtnDisabled]}
            onPress={handleGuardarProducto}
            disabled={cargando || inicializando}
          >
            {cargando || inicializando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.crearBtnText}>{editId ? 'Actualizar Producto' : 'Crear Producto'}</Text>
            )}
          </TouchableOpacity>

          {editId && (
            <TouchableOpacity
              style={styles.cancelarBtn}
              onPress={handleLimpiarFormulario}
              disabled={cargando}
            >
              <Text style={styles.cancelarBtnText}>Limpiar y Crear Nuevo</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: '#007a99',
    paddingVertical: 16,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  categoriasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoriaBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoriaBtnActive: {
    backgroundColor: '#007a99',
    borderColor: '#007a99',
  },
  categoriaBtnText: {
    color: '#333',
    fontSize: 13,
    fontWeight: '600',
  },
  categoriaBtnTextActive: {
    color: '#fff',
  },
  feedbackBanner: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  exitoBanner: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  feedbackText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
  },
  crearBtn: {
    backgroundColor: '#0E7490', // Cyan premium
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#0E7490',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  crearBtnDisabled: {
    backgroundColor: '#94A3B8',
    elevation: 0,
  },
  crearBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cancelarBtn: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelarBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '600',
  },
});
