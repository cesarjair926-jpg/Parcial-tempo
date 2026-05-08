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

export default function LoginScreen() {
  const { iniciarSesion, registrar, cargando, error, limpiarError } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [nombreTienda, setNombreTienda] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const handleSubmit = async () => {
    limpiarError();
    if (isLogin) {
      if (!email || !password) {
        Alert.alert('Error', 'Por favor completa todos los campos');
        return;
      }
      try {
        await iniciarSesion(email, password);
      } catch (err: any) {
        // El error ya queda guardado en el contexto (visible en la UI)
        // Alert adicional para móvil
        if (Platform.OS !== 'web') {
          Alert.alert('Error de inicio de sesión', err?.message || 'Verifica tus credenciales');
        }
      }
    } else {
      if (!email || !password || !nombre || !nombreTienda) {
        Alert.alert('Error', 'Por favor completa todos los campos');
        return;
      }
      try {
        await registrar(email, password, nombre, nombreTienda);
      } catch (err: any) {
        if (Platform.OS !== 'web') {
          Alert.alert('Error de registro', err?.message || 'No se pudo crear la cuenta');
        }
      }
    }
  };


  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>¿Cuánto cuesta?</Text>
          <Text style={styles.subtitle}>Gestión de precios</Text>
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, isLogin && styles.activeTab]} 
            onPress={() => { setIsLogin(true); limpiarError(); }}
          >
            <Text style={[styles.tabText, isLogin && styles.activeTabText]}>Iniciar Sesión</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, !isLogin && styles.activeTab]} 
            onPress={() => { setIsLogin(false); limpiarError(); }}
          >
            <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>Crear Cuenta</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={limpiarError}>
                <Text style={styles.errorDismiss}>×</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isLogin && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre completo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Tu nombre"
                  placeholderTextColor="#999"
                  value={nombre}
                  onChangeText={setNombre}
                  editable={!cargando}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre de tu Tienda</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Mi Tiendita"
                  placeholderTextColor="#999"
                  value={nombreTienda}
                  onChangeText={setNombreTienda}
                  editable={!cargando}
                />
              </View>
            </>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="tu@email.com"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!cargando}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!mostrarPassword}
                editable={!cargando}
              />
              <TouchableOpacity
                onPress={() => setMostrarPassword(!mostrarPassword)}
                style={styles.toggleButton}
              >
                <Text style={styles.toggleText}>{mostrarPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, cargando && styles.loginButtonDisabled]}
            onPress={handleSubmit}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>{isLogin ? 'Iniciar Sesión' : 'Registrarse'}</Text>
            )}
          </TouchableOpacity>

          {isLogin && (
            <TouchableOpacity style={styles.forgotButton}>
              <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007a99',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#007a99',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#c62828',
    padding: 12,
    marginBottom: 16,
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    flex: 1,
  },
  errorDismiss: {
    color: '#c62828',
    fontSize: 20,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  toggleButton: {
    padding: 8,
  },
  toggleText: {
    fontSize: 18,
  },
  loginButton: {
    backgroundColor: '#007a99',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotButton: {
    alignItems: 'center',
    marginTop: 12,
  },
  forgotText: {
    color: '#007a99',
    fontSize: 14,
  },
});
