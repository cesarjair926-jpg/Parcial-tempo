import React, { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { empleadosService } from '../src/services/empleados';
import { Usuario } from '../src/types';

type ModalType = 'none' | 'menu' | 'perfil' | 'editar' | 'empleado' | 'listaEmpleados' | 'editarEmpleado';

export default function ProfileMenu() {
  const { usuario, cerrarSesion, refrescarUsuario } = useAuth();
  const router = useRouter();
  const [modalActual, setModalActual] = useState<ModalType>('none');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Editar perfil
  const [nuevoNombre, setNuevoNombre] = useState('');

  // Crear empleado
  const [empEmail, setEmpEmail] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [empNombre, setEmpNombre] = useState('');

  // Lista empleados
  const [empleados, setEmpleados] = useState<Usuario[]>([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<Usuario | null>(null);

  // Formulario editar empleado
  const [editEmpNombre, setEditEmpNombre] = useState('');
  const [editEmpEmail, setEditEmpEmail] = useState('');

  if (!usuario) return null;

  const iniciales = usuario.nombre
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const cerrarTodo = () => {
    setModalActual('none');
    setMensaje(null);
    setMensajeError(null);
    setNuevoNombre('');
    setEmpEmail('');
    setEmpPassword('');
    setEmpNombre('');
    setEmpleadoSeleccionado(null);
    setEditEmpNombre('');
    setEditEmpEmail('');
    setCargando(false); // <--- FORZAR DESBLOQUEO SIEMPRE
  };

  const handleEditarPerfil = async () => {
    console.log('Botón Editar Perfil presionado');
    if (!nuevoNombre.trim()) {
      setMensajeError('Ingresa un nombre válido');
      return;
    }
    try {
      setCargando(true);
      setMensajeError(null);
      // Usamos el nuevo método genérico o el específico
      const res = await empleadosService.actualizarEmpleado(usuario.id, {
        nombre: nuevoNombre.trim(),
      });
      if (res.success) {
        setMensaje('Perfil actualizado correctamente');
        // Actualizar el estado global en segundo plano (NO esperar con await)
        refrescarUsuario();
        // Quitar el cargando antes de la pausa
        setCargando(false);
        setTimeout(() => cerrarTodo(), 1500);
      } else {
        setMensajeError(res.error || 'Error al actualizar');
        setCargando(false);
      }
    } catch (err: any) {
      setMensajeError(err.message || 'Error inesperado');
      setCargando(false);
    } finally {
      // Importante: No llamar a setCargando(false) aquí si vamos a cerrar todo el modal 
      // porque puede causar errores de "update on unmounted component".
      // Pero para seguridad lo ponemos
      setTimeout(() => setCargando(false), 500);
    }
  };

  const handleCrearEmpleado = async () => {
    if (!empEmail.trim() || !empPassword.trim() || !empNombre.trim()) {
      setMensajeError('Completa todos los campos');
      return;
    }
    if (empPassword.length < 6) {
      setMensajeError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    try {
      setCargando(true);
      setMensajeError(null);
      const res = await empleadosService.crearEmpleado(
        empEmail.trim(),
        empPassword.trim(),
        empNombre.trim(),
        usuario.tienda_id
      );
      if (res.success) {
        setMensaje(`Empleado "${empNombre}" creado exitosamente`);
        setEmpEmail('');
        setEmpPassword('');
        setEmpNombre('');
        // No cerramos el modal para que pueda crear otro, pero quitamos el cargando
        setCargando(false);
        setTimeout(() => setMensaje(null), 3000);
      } else {
        setMensajeError(res.error || 'Error al crear empleado');
        Alert.alert('Error', res.error || 'No se pudo crear el empleado');
        setCargando(false);
      }
    } catch (err: any) {
      setMensajeError(err.message || 'Error inesperado');
      Alert.alert('Error', err.message || 'Ocurrió un error inesperado');
      setCargando(false);
    } finally {
      setCargando(false);
    }
  };

  const handleVerEmpleados = async () => {
    try {
      setCargando(true);
      const res = await empleadosService.obtenerEmpleados(usuario.tienda_id);
      if (res.success && res.data) {
        setEmpleados(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
    setModalActual('listaEmpleados');
  };

  const handleEliminarEmpleado = (emp: Usuario) => {
    Alert.alert(
      'Eliminar Empleado',
      `¿Estás seguro de que quieres eliminar a ${emp.nombre}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setCargando(true);
              const res = await empleadosService.eliminarEmpleado(emp.id);
              if (res.success) {
                setEmpleados(empleados.filter((e) => e.id !== emp.id));
                Alert.alert('Éxito', 'Empleado eliminado correctamente');
              } else {
                Alert.alert('Error', res.error || 'No se pudo eliminar');
              }
            } catch (err) {
              Alert.alert('Error', 'Ocurrió un error inesperado');
            } finally {
              setCargando(false);
            }
          },
        },
      ]
    );
  };

  const prepararEdicion = (emp: Usuario) => {
    setEmpleadoSeleccionado(emp);
    setEditEmpNombre(emp.nombre);
    setEditEmpEmail(emp.email);
    setModalActual('editarEmpleado');
  };

  const handleActualizarEmpleado = async () => {
    if (!empleadoSeleccionado) return;
    if (!editEmpNombre.trim() || !editEmpEmail.trim()) {
      setMensajeError('Completa los campos obligatorios');
      return;
    }

    try {
      setCargando(true);
      setMensajeError(null);
      setMensaje(null); // Limpiar éxito anterior
      
      const res = await empleadosService.actualizarEmpleado(empleadoSeleccionado.id, {
        nombre: editEmpNombre.trim(),
        email: editEmpEmail.trim(),
      });

      if (res.success) {
        setMensaje('¡Actualizado!');
        // Actualizar lista local
        setEmpleados(
          empleados.map((e) => (e.id === empleadoSeleccionado.id ? { ...e, nombre: editEmpNombre, email: editEmpEmail } : e))
        );
        // Desbloquear y volver rápido
        setCargando(false);
        setTimeout(() => {
          setModalActual('listaEmpleados');
          setMensaje(null);
        }, 800);
      } else {
        setMensajeError(res.error || 'Error al actualizar');
      }
    } catch (err: any) {
      setMensajeError(err.message || 'Error inesperado');
    } finally {
      setCargando(false);
    }
  };

  const handleCerrarSesion = async () => {
    try {
      // 1. Cerrar el modal primero para evitar que bloquee la UI
      cerrarTodo();
      
      // 2. Cerrar sesión en el contexto/Supabase
      await cerrarSesion();
      
      // 3. Navegar explícitamente al login (refuerzo)
      router.replace('/login');
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      // Si falla, al menos intentamos volver al login
      router.replace('/login');
    }
  };

  // ─── Contenido de cada modal ───
  const renderContenido = () => {
    switch (modalActual) {
      case 'menu':
        return (
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <View style={styles.menuAvatar}>
                <Text style={styles.menuAvatarText}>{iniciales}</Text>
              </View>
              <View style={styles.menuUserInfo}>
                <Text style={styles.menuNombre}>{usuario.nombre}</Text>
                <Text style={styles.menuEmail}>{usuario.email}</Text>
                <View style={styles.rolBadge}>
                  <Text style={styles.rolText}>
                    {usuario.rol === 'admin' ? '👑 Administrador' : '👤 Empleado'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setModalActual('perfil')}
            >
              <Text style={styles.menuItemIcon}>👤</Text>
              <Text style={styles.menuItemText}>Ver Perfil</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setNuevoNombre(usuario.nombre);
                setModalActual('editar');
              }}
            >
              <Text style={styles.menuItemIcon}>✏️</Text>
              <Text style={styles.menuItemText}>Editar Perfil</Text>
            </TouchableOpacity>

            {usuario.rol === 'admin' && (
              <>
                <View style={styles.menuDivider} />
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => setModalActual('empleado')}
                >
                  <Text style={styles.menuItemIcon}>➕</Text>
                  <Text style={styles.menuItemText}>Crear Empleado</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={handleVerEmpleados}>
                  <Text style={styles.menuItemIcon}>👥</Text>
                  <Text style={styles.menuItemText}>Ver Empleados</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemDanger]}
              onPress={handleCerrarSesion}
            >
              <Text style={styles.menuItemIcon}>🚪</Text>
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>
                Cerrar Sesión
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'perfil':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Mi Perfil</Text>
            <View style={styles.perfilAvatarGrande}>
              <Text style={styles.perfilAvatarTexto}>{iniciales}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nombre</Text>
              <Text style={styles.infoValue}>{usuario.nombre}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{usuario.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Rol</Text>
              <Text style={styles.infoValue}>
                {usuario.rol === 'admin' ? 'Administrador' : 'Empleado'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ID Tienda</Text>
              <Text style={[styles.infoValue, { fontSize: 11 }]}>{usuario.tienda_id}</Text>
            </View>
            <TouchableOpacity
              style={styles.btnSecundario}
              onPress={() => setModalActual('menu')}
            >
              <Text style={styles.btnSecundarioText}>← Volver</Text>
            </TouchableOpacity>
          </View>
        );

      case 'editar':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Perfil</Text>
            {mensajeError && <Text style={styles.errorText}>{mensajeError}</Text>}
            {mensaje && <Text style={styles.successText}>{mensaje}</Text>}
            <Text style={styles.inputLabel}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={nuevoNombre}
              onChangeText={setNuevoNombre}
              placeholder="Tu nombre"
              editable={!cargando}
            />
            <TouchableOpacity
              style={[styles.btnPrimario, cargando && styles.btnDisabled]}
              onPress={handleEditarPerfil}
              disabled={cargando}
            >
              {cargando ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnPrimarioText}>Guardar Cambios</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnSecundario}
              onPress={() => {
                setMensajeError(null);
                setModalActual('menu');
              }}
            >
              <Text style={styles.btnSecundarioText}>← Volver</Text>
            </TouchableOpacity>
          </View>
        );

      case 'empleado':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Crear Empleado</Text>
            <Text style={styles.modalSubtitle}>
              El empleado quedará vinculado a tu tienda automáticamente
            </Text>
            {mensajeError && <Text style={styles.errorText}>{mensajeError}</Text>}
            {mensaje && <Text style={styles.successText}>{mensaje}</Text>}

            <Text style={styles.inputLabel}>Nombre del empleado</Text>
            <TextInput
              style={styles.input}
              value={empNombre}
              onChangeText={setEmpNombre}
              placeholder="Nombre completo"
              editable={!cargando}
            />
            <Text style={styles.inputLabel}>Email del empleado</Text>
            <TextInput
              style={styles.input}
              value={empEmail}
              onChangeText={setEmpEmail}
              placeholder="empleado@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!cargando}
            />
            <Text style={styles.inputLabel}>Contraseña temporal</Text>
            <TextInput
              style={styles.input}
              value={empPassword}
              onChangeText={setEmpPassword}
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
              editable={!cargando}
            />

            <TouchableOpacity
              style={[styles.btnPrimario, cargando && styles.btnDisabled]}
              onPress={handleCrearEmpleado}
              disabled={cargando}
            >
              {cargando ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnPrimarioText}>Crear Empleado</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnSecundario}
              onPress={() => {
                setMensajeError(null);
                setMensaje(null);
                setModalActual('menu');
              }}
            >
              <Text style={styles.btnSecundarioText}>← Volver</Text>
            </TouchableOpacity>
          </View>
        );

      case 'listaEmpleados':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Empleados</Text>
            {cargando ? (
              <ActivityIndicator size="large" color="#007a99" style={{ marginVertical: 20 }} />
            ) : empleados.length === 0 ? (
              <Text style={styles.emptyText}>No hay empleados registrados</Text>
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {empleados.map((emp) => (
                  <View key={emp.id} style={styles.empleadoCard}>
                    <View style={styles.empleadoAvatar}>
                      <Text style={styles.empleadoAvatarText}>
                        {emp.nombre
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </Text>
                    </View>
                    <View style={styles.empleadoInfo}>
                      <Text style={styles.empleadoNombre}>{emp.nombre}</Text>
                      <Text style={styles.empleadoEmail}>{emp.email}</Text>
                    </View>
                    <View style={styles.empleadoAcciones}>
                      <TouchableOpacity
                        style={styles.accionBtn}
                        onPress={() => prepararEdicion(emp)}
                      >
                        <Text style={styles.accionIcon}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.accionBtn, styles.accionBtnDanger]}
                        onPress={() => handleEliminarEmpleado(emp)}
                      >
                        <Text style={styles.accionIcon}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={styles.btnSecundario}
              onPress={() => setModalActual('menu')}
            >
              <Text style={styles.btnSecundarioText}>← Volver</Text>
            </TouchableOpacity>
          </View>
        );

      case 'editarEmpleado':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Empleado</Text>
            {mensajeError && <Text style={styles.errorText}>{mensajeError}</Text>}
            {mensaje && <Text style={styles.successText}>{mensaje}</Text>}

            <Text style={styles.inputLabel}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={editEmpNombre}
              onChangeText={setEditEmpNombre}
              placeholder="Nombre"
              editable={!cargando}
            />
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={editEmpEmail}
              onChangeText={setEditEmpEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!cargando}
            />
            
            <TouchableOpacity
              style={[styles.btnPrimario, cargando && styles.btnDisabled]}
              onPress={handleActualizarEmpleado}
              disabled={cargando}
            >
              {cargando ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnPrimarioText}>Guardar Cambios</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.btnSecundario}
              onPress={() => {
                setMensajeError(null);
                setMensaje(null);
                setModalActual('listaEmpleados');
              }}
            >
              <Text style={styles.btnSecundarioText}>← Volver</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Ícono de perfil en la barra */}
      <TouchableOpacity
        style={styles.avatarBtn}
        onPress={() => setModalActual('menu')}
        activeOpacity={0.7}
      >
        <Text style={styles.avatarText}>{iniciales}</Text>
      </TouchableOpacity>

      {/* Modal principal */}
      <Modal
        visible={modalActual !== 'none'}
        transparent
        animationType="fade"
        onRequestClose={cerrarTodo}
      >
        <Pressable style={styles.overlay} onPress={cerrarTodo}>
          <Pressable
            style={[
              styles.modalBox,
              modalActual === 'menu' && styles.menuBox,
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {renderContenido()}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // ─── Avatar Button ───
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },

  // ─── Overlay ───
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: 16,
  },

  // ─── Modal ───
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: 320,
    maxWidth: '90%',
    ...Platform.select({
      web: { boxShadow: '0 8px 32px rgba(0,0,0,0.2)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  menuBox: {
    padding: 0,
    overflow: 'hidden',
  },

  // ─── Menu ───
  menuContainer: {
    paddingVertical: 8,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007a99',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  menuUserInfo: {
    flex: 1,
  },
  menuNombre: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  menuEmail: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  rolBadge: {
    backgroundColor: '#e0f2f7',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  rolText: {
    fontSize: 11,
    color: '#007a99',
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  menuItemText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  menuItemDanger: {},
  menuItemTextDanger: {
    color: '#dc3545',
  },

  // ─── Modal Content ───
  modalContent: {
    alignItems: 'stretch',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
    marginBottom: 16,
  },

  // ─── Perfil ───
  perfilAvatarGrande: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#007a99',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginVertical: 16,
  },
  perfilAvatarTexto: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 28,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 13,
    color: '#777',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },

  // ─── Inputs ───
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },

  // ─── Buttons ───
  btnPrimario: {
    backgroundColor: '#007a99',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 18,
  },
  btnPrimarioText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnSecundario: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  btnSecundarioText: {
    color: '#007a99',
    fontWeight: '600',
    fontSize: 14,
  },

  // ─── Messages ───
  errorText: {
    color: '#dc3545',
    fontSize: 13,
    textAlign: 'center',
    backgroundColor: '#fce4e4',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  successText: {
    color: '#155724',
    fontSize: 13,
    textAlign: 'center',
    backgroundColor: '#d4edda',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 20,
  },

  // ─── Empleados List ───
  empleadoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  empleadoAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0f2f7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  empleadoAvatarText: {
    color: '#007a99',
    fontWeight: 'bold',
    fontSize: 13,
  },
  empleadoInfo: {
    flex: 1,
  },
  empleadoNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  empleadoEmail: {
    fontSize: 12,
    color: '#888',
  },
  empleadoAcciones: {
    flexDirection: 'row',
    gap: 8,
  },
  accionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accionBtnDanger: {
    backgroundColor: '#fff0f0',
  },
  accionIcon: {
    fontSize: 14,
  },
});
