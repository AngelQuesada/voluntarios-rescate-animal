'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { auth, db } from '@/lib/firebase';
import { User } from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { UserRoles } from '@/lib/constants';
import LoadingScreen from '@/components/schedule/LoadingScreen';

type AuthContextType = {
  user:
    | (User & {
        name?: string;
        lastName?: string;
        roles?: number[];
      })
    | null;
  loading: boolean;
  clearAuthState: () => void;
  refreshAuthState: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  clearAuthState: () => {},
  refreshAuthState: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextType['user']>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Referencias para controlar el estado y evitar condiciones de carrera
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isUnmountedRef = useRef(false);
  const lastAuthStateRef = useRef<string | null>(null);

  // Función para limpiar todos los timeouts y listeners
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  // Función para limpiar el estado de autenticación
  const clearAuthState = useCallback(() => {
    cleanup();
    setUser(null);
    setLoading(false);
    setIsInitialized(true);
    lastAuthStateRef.current = null;

    // Limpiar localStorage y sessionStorage relacionado con auth
    if (typeof window !== 'undefined') {
      try {
        // Limpiar cookies de auth
        document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';

        // Limpiar storage keys relacionados con auth
        const authKeys = ['firebaseAuthState', 'authRedirectPending', 'loginTimeout'];
        authKeys.forEach((key) => {
          sessionStorage.removeItem(key);
          localStorage.removeItem(key);
        });

        // Limpiar todas las claves de Firebase
        Object.keys(localStorage).forEach((key) => {
          if (key.includes('firebase') || key.includes('auth')) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.warn('Error limpiando storage:', error);
      }
    }
  }, [cleanup]);

  // Función para refrescar el estado de autenticación
  const refreshAuthState = useCallback(async () => {
    if (auth.currentUser) {
      try {
        await auth.currentUser.reload();
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser({
            ...auth.currentUser,
            name: userData.name,
            lastName: userData.lastName,
            roles: userData.roles === undefined ? [UserRoles.VOLUNTARIO] : userData.roles,
          });
        }
      } catch (error) {
        console.error('Error refreshing auth state:', error);
      }
    }
  }, []);

  // Limpiar al desmontar el componente
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      cleanup();
    };
  }, [cleanup]);

  // Control mejorado de navegación hacia atrás
  useEffect(() => {
    if (user && !loading && isInitialized && typeof window !== 'undefined') {
      const handlePopState = (event: PopStateEvent) => {
        if (window.location.pathname === '/' && user) {
          event.preventDefault();
          router.replace('/schedule');
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [user, loading, isInitialized, router]);

  // Verificar permisos para rutas de administración
  useEffect(() => {
    if (!loading && user && isInitialized && pathname?.startsWith('/admin')) {
      const isAdmin = user.roles?.includes(UserRoles.ADMINISTRADOR);
      if (!isAdmin) {
        console.log('Usuario sin permisos de administrador, redirigiendo a /schedule');
        router.replace('/schedule');
      }
    }
  }, [pathname, user, loading, isInitialized, router]);

  // Listener principal de autenticación con mejor manejo de estados
  useEffect(() => {
    // Limpiar listener anterior si existe
    cleanup();

    const handleAuthStateChange = async (firebaseUser: User | null) => {
      // Evitar procesar si el componente se ha desmontado
      if (isUnmountedRef.current) return;

      // Crear un identificador único para este estado de auth
      const authStateId = firebaseUser ? `${firebaseUser.uid}-${Date.now()}` : `null-${Date.now()}`;

      // Evitar procesar el mismo estado múltiples veces
      if (lastAuthStateRef.current === authStateId) return;
      lastAuthStateRef.current = authStateId;

      try {
        if (firebaseUser) {
          // Usuario autenticado
          try {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

            if (!isUnmountedRef.current) {
              if (userDoc.exists()) {
                const userData = userDoc.data();

                // Verificar si el usuario está habilitado
                if (userData.isEnabled === false) {
                  console.log('Usuario deshabilitado detectado, limpiando estado');
                  clearAuthState();
                  router.replace('/');
                  return;
                }

                setUser({
                  ...firebaseUser,
                  name: userData.name,
                  lastName: userData.lastName,
                  roles: userData.roles === undefined ? [UserRoles.VOLUNTARIO] : userData.roles,
                });
              } else {
                setUser(firebaseUser);
              }

              // Redirigir desde login si es necesario
              if (pathname === '/') {
                router.replace('/schedule');
              }
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
            if (!isUnmountedRef.current) {
              setUser(firebaseUser);
            }
          }
        } else {
          // Usuario no autenticado
          if (!isUnmountedRef.current) {
            setUser(null);

            // Solo redirigir si estamos en una ruta protegida
            const isProtectedRoute =
              pathname !== '/' &&
              (pathname?.startsWith('/schedule') || pathname?.startsWith('/admin'));

            if (isInitialized && isProtectedRoute) {
              router.replace('/');
            }
          }
        }
      } catch (error) {
        console.error('Error en handleAuthStateChange:', error);
        if (!isUnmountedRef.current) {
          setUser(null);
        }
      } finally {
        // Finalizar loading con un pequeño delay para móviles
        if (!isUnmountedRef.current) {
          const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
          const delay = isMobile ? 150 : 50;

          timeoutRef.current = setTimeout(() => {
            if (!isUnmountedRef.current) {
              setLoading(false);
              setIsInitialized(true);
            }
          }, delay);
        }
      }
    };

    // Configurar el listener
    unsubscribeRef.current = auth.onAuthStateChanged(handleAuthStateChange);

    return cleanup;
  }, [router, pathname, isInitialized, clearAuthState, cleanup]);

  // Timeout de seguridad para evitar loading infinito
  useEffect(() => {
    const maxLoadingTimeout = setTimeout(() => {
      if (loading && !isUnmountedRef.current) {
        console.warn('Timeout de loading alcanzado, finalizando loading state');
        setLoading(false);
        setIsInitialized(true);
      }
    }, 8000);

    return () => clearTimeout(maxLoadingTimeout);
  }, [loading]);

  // Detectar cambios de visibilidad para limpiar estados residuales
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isInitialized) {
        // Verificar inconsistencias cuando la página vuelve a estar visible
        const currentUser = auth.currentUser;
        if ((currentUser && !user) || (!currentUser && user)) {
          console.log('Detectada inconsistencia de estado al volver a la página visible');
          refreshAuthState();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, isInitialized, refreshAuthState]);

  // Mostrar pantalla de carga durante la verificación de autenticación
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <AuthContext.Provider value={{ user, loading, clearAuthState, refreshAuthState }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
