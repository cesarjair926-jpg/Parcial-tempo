import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Hook para usar el contexto de autenticación
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  return context;
};
