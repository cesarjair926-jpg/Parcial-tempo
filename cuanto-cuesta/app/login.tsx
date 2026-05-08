import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import LoginScreen from '../components/screens/LoginScreen';
import { useAuth } from '../src/hooks/useAuth';

export default function LoginRoute() {
  const { usuario, cargando } = useAuth();
  const router = useRouter();

  // Cuando el usuario inicia sesión exitosamente, navegar al catálogo
  useEffect(() => {
    if (!cargando && usuario) {
      router.replace('/(tabs)');
    }
  }, [usuario, cargando]);

  return <LoginScreen />;
}