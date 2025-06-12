import { useState, useRef, useCallback, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { UserRoles } from '@/lib/constants';

// Configuración de duración de cookies de autenticación
const AUTH_COOKIE_CONFIG = {
  // Duraciones en segundos
  MOBILE: {
    STANDARD: 30 * 24 * 60 * 60, // 30 días para móviles (uso frecuente)
    ADMIN: 7 * 24 * 60 * 60, // 7 días para administradores en móvil
  },
  DESKTOP: {
    STANDARD: 14 * 24 * 60 * 60, // 14 días para escritorio
    ADMIN: 3 * 24 * 60 * 60, // 3 días para administradores en escritorio
  },
  REMEMBER_ME: 90 * 24 * 60 * 60, // 90 días si el usuario marca "Recordarme"
};

// Función para determinar la duración de cookie apropiada
const getCookieDuration = (isAdmin: boolean, isMobile: boolean, rememberMe: boolean = false) => {
  if (rememberMe) {
    return AUTH_COOKIE_CONFIG.REMEMBER_ME;
  }

  if (isMobile) {
    return isAdmin ? AUTH_COOKIE_CONFIG.MOBILE.ADMIN : AUTH_COOKIE_CONFIG.MOBILE.STANDARD;
  } else {
    return isAdmin ? AUTH_COOKIE_CONFIG.DESKTOP.ADMIN : AUTH_COOKIE_CONFIG.DESKTOP.STANDARD;
  }
};

// Función para validar formato de email
const isValidEmail = (email: string): boolean => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
};

// Función que configura la cookie de autenticación de forma segura
const setAuthCookie = (token: string, maxAge: number) => {
  const now = new Date();
  const expires = new Date(now.getTime() + maxAge * 1000);

  // Configurar la cookie con atributos más seguros
  document.cookie = `auth-token=${token}; path=/; expires=${expires.toUTCString()}; SameSite=Strict${window.location.protocol === 'https:' ? '; Secure' : ''}`;

  // Backup del token en localStorage (para Safari)
  try {
    localStorage.setItem(
      'auth-token-backup',
      JSON.stringify({
        token,
        expires: expires.getTime(),
      })
    );
  } catch (e) {
    console.warn('No se pudo guardar el backup del token:', e);
  }
};

// Función para limpiar estados residuales antes del login
const clearResidualStates = () => {
  if (typeof window === 'undefined') return;

  try {
    // Limpiar sessionStorage
    const keysToRemove = [
      'loginFormState',
      'authRedirectPending',
      'loginTimeout',
      'firebaseAuthState',
    ];

    keysToRemove.forEach((key) => {
      sessionStorage.removeItem(key);
    });

    // Limpiar localStorage relacionado con Firebase Auth
    Object.keys(localStorage).forEach((key) => {
      if (key.includes('firebase:authUser:') || key.includes('auth-token')) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const data = JSON.parse(value);
            // Si los datos están expirados o son inválidos, limpiarlos
            if (!data || (data.expires && Date.now() > data.expires)) {
              localStorage.removeItem(key);
            }
          }
        } catch {
          localStorage.removeItem(key);
        }
      }
    });

    // Limpiar cookies de auth de forma segura
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Strict';
  } catch (error) {
    console.warn('Error limpiando estados residuales:', error);
  }
};

// Historial de errores de autenticación para detectar patrones
interface AuthErrorHistory {
  timestamp: number;
  code: string;
  message: string;
}

export function useAuth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const router = useRouter();

  // Ref para evitar múltiples intentos de login simultáneos
  const isLoginInProgressRef = useRef(false);
  const loginTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Referencias para seguimiento de errores y recuperación automática
  const errorHistoryRef = useRef<AuthErrorHistory[]>([]);
  const recoveryAttemptsRef = useRef(0);

  // Establecer límites para intentos de recuperación
  const MAX_RECOVERY_ATTEMPTS = 3;

  // Función para comprobar problemas recurrentes en la autenticación
  const checkForRecurringProblems = useCallback(() => {
    const now = Date.now();
    // Limpiar historial antiguo (más de 10 minutos)
    errorHistoryRef.current = errorHistoryRef.current.filter(
      (entry) => now - entry.timestamp < 10 * 60 * 1000
    );

    // Contar errores por código en los últimos 2 minutos
    const recentErrors = errorHistoryRef.current.filter(
      (entry) => now - entry.timestamp < 2 * 60 * 1000
    );

    const errorCounts: Record<string, number> = {};
    recentErrors.forEach((entry) => {
      errorCounts[entry.code] = (errorCounts[entry.code] || 0) + 1;
    });

    // Si hay muchos errores del mismo tipo, intentar limpiar estado
    const hasRecurringErrors = Object.values(errorCounts).some((count) => count >= 3);

    return hasRecurringErrors;
  }, []);

  // Función para limpiar timeouts
  const clearLoginTimeout = useCallback(() => {
    if (loginTimeoutRef.current) {
      clearTimeout(loginTimeoutRef.current);
      loginTimeoutRef.current = null;
    }
  }, []);

  // Función para reiniciar todo el proceso de autenticación
  const resetAuthState = useCallback(() => {
    // Solo intentar reiniciar si estamos dentro del límite máximo
    if (recoveryAttemptsRef.current >= MAX_RECOVERY_ATTEMPTS) {
      console.warn('Máximo número de intentos de recuperación alcanzado');
      return;
    }

    console.log('Reiniciando estado de autenticación');
    recoveryAttemptsRef.current += 1;

    // Cancelar cualquier intento en curso
    clearLoginTimeout();
    isLoginInProgressRef.current = false;

    // Resetear estados
    setIsLoading(false);
    setError(null);

    // Limpiar residuos
    clearResidualStates();

    // En el tercer intento, realizar una limpieza más agresiva
    // de los tokens de Firebase
    if (recoveryAttemptsRef.current >= 3) {
      try {
        // Intentar cerrar la sesión para limpiar tokens
        auth.signOut().catch((e) => console.warn('Error en signOut de recuperación:', e));

        // Limpiar completamente localStorage y sessionStorage relacionado con auth
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('firebase') || key.includes('auth'))) {
            localStorage.removeItem(key);
          }
        }

        sessionStorage.clear();
      } catch (e) {
        console.warn('Error en limpieza agresiva:', e);
      }
    }
  }, [clearLoginTimeout]);

  // Effect para resetear el contador de intentos de recuperación después de un tiempo
  useEffect(() => {
    const resetTimer = setTimeout(
      () => {
        recoveryAttemptsRef.current = 0;
      },
      30 * 60 * 1000
    ); // 30 minutos

    return () => clearTimeout(resetTimer);
  }, []);

  const handleSignIn = async (_error: React.FormEvent, rememberMe: boolean = false) => {
    _error.preventDefault();

    // Evitar múltiples intentos simultáneos
    if (isLoginInProgressRef.current) {
      console.warn('Login ya en progreso, ignorando nuevo intento');
      return;
    }

    setError(null);
    clearLoginTimeout();

    // Validaciones previas al inicio de sesión
    if (!email.trim()) {
      setError('Por favor, introduce tu correo electrónico.');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Por favor, introduce un correo electrónico válido.');
      return;
    }

    if (!password) {
      setError('Por favor, introduce tu contraseña.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    // Limpiar estados residuales antes de iniciar sesión
    clearResidualStates();

    setIsLoading(true);
    isLoginInProgressRef.current = true;

    // Timeout de seguridad para el login
    loginTimeoutRef.current = setTimeout(() => {
      if (isLoginInProgressRef.current) {
        console.warn('Timeout de login alcanzado');
        setError('El inicio de sesión está tardando demasiado. Por favor, inténtalo de nuevo.');
        setIsLoading(false);
        setIsAuthenticating(false);
        isLoginInProgressRef.current = false;

        // Comprobar si necesitamos reiniciar el estado de autenticación
        if (checkForRecurringProblems()) {
          resetAuthState();
        }
      }
    }, 15000);

    try {
      // Registrar el inicio del intento para diagnóstico
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('loginStart', Date.now().toString());
        } catch (e) {
          console.warn('Error guardando timestamp de inicio:', e);
        }
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      setIsAuthenticating(true);

      // Verificar si el usuario está habilitado en Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      let isAdmin = false;

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.isEnabled === false) {
          await auth.signOut();
          setError('Esta cuenta ha sido deshabilitada por el administrador.');
          setIsAuthenticating(false);
          return;
        }

        // Verificar si es administrador
        isAdmin = userData.roles?.includes(UserRoles.ADMINISTRADOR) || false;
      }

      // Obtener el token del usuario
      const token = await user.getIdToken();

      // Configurar duración de la cookie de forma inteligente
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const cookieMaxAge = getCookieDuration(isAdmin, isMobile, rememberMe);

      // Establecer la cookie de forma segura
      setAuthCookie(token, cookieMaxAge);

      // Resetear el contador de intentos de recuperación si el login es exitoso
      recoveryAttemptsRef.current = 0;

      // Limpiar los campos del formulario
      setEmail('');
      setPassword('');

      router.replace('/schedule');
    } catch (e: Error | unknown) {
      console.error('Error Iniciando Sesión:', e);

      // En caso de error, desactivar el estado de autenticación
      setIsAuthenticating(false);

      // Guardar el error en el historial
      if ((e as { code?: string }).code) {
        errorHistoryRef.current.push({
          timestamp: Date.now(),
          code: (e as { code?: string }).code || 'unknown-error',
          message: (e as Error)?.message || '',
        });
      }

      // Mapear errores específicos de Firebase a mensajes más amigables
      switch ((e as { code?: string }).code) {
        case 'auth/user-not-found':
        case 'auth/invalid-email':
        case 'auth/invalid-credential':
          setError('Correo electrónico o contraseña incorrectos.');
          break;
        case 'auth/wrong-password':
          setError('Correo electrónico o contraseña incorrectos.');
          break;
        case 'auth/too-many-requests':
          setError(
            'Demasiados intentos fallidos. Por favor, espera unos minutos antes de intentarlo de nuevo.'
          );
          break;
        case 'auth/network-request-failed':
          setError('Error de conexión. Verifica tu conexión a internet e inténtalo de nuevo.');
          // En caso de error de red, intentar limpiar tokens potencialmente expirados
          resetAuthState();
          break;
        case 'auth/user-disabled':
          setError('Esta cuenta ha sido deshabilitada.');
          break;
        default:
          setError('Ocurrió un error inesperado. Por favor, inténtalo de nuevo.');
      }
    } finally {
      clearLoginTimeout();
      setIsLoading(false);
      isLoginInProgressRef.current = false;
      // Se desactivará isAuthenticating cuando el AuthContext tome el control
      // Comprobar problemas recurrentes después de finalizar
      if (checkForRecurringProblems()) {
        // Programar un reinicio para el próximo ciclo de eventos
        setTimeout(() => resetAuthState(), 100);
      }
    }
  };

  // Función para resetear el formulario
  const resetForm = useCallback(() => {
    setEmail('');
    setPassword('');
    setError(null);
    setIsLoading(false);
    setIsAuthenticating(false); // Resetear también el estado de autenticación
    isLoginInProgressRef.current = false;
    clearLoginTimeout();

    // También reiniciar el contador de recuperaciones
    recoveryAttemptsRef.current = 0;

    // Limpiar historial de errores
    errorHistoryRef.current = [];
  }, [clearLoginTimeout]);

  return {
    email,
    setEmail,
    password,
    setPassword,
    error,
    isLoading: isLoading || isAuthenticating,
    handleSignIn,
    resetForm,
  };
}
