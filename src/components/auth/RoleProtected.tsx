'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';

interface RoleProtectedProps {
  children: React.ReactNode;
  requiredRoles?: number[];
  fallbackUrl?: string;
}

/**
 * Componente de protección basado en roles
 *
 * @param {React.ReactNode} children - Componentes hijos a renderizar si el usuario está autorizado
 * @param {number[]} requiredRoles - Roles necesarios para acceder al contenido
 * @param {string} fallbackUrl - URL a la que redirigir si el usuario no tiene los roles necesarios
 */
export default function RoleProtected({
  children,
  requiredRoles = [],
  fallbackUrl = '/schedule',
}: RoleProtectedProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Esperar a que termine la carga de autenticación
    if (!loading) {
      // Si no hay usuario, redirigir al login
      if (!user) {
        setShouldRedirect('/');
      }
      // Si hay roles requeridos, verificar si el usuario los tiene
      else if (requiredRoles.length > 0) {
        const hasRequiredRole = requiredRoles.some((role) => user.roles?.includes(role));

        if (!hasRequiredRole) {
          setShouldRedirect(fallbackUrl);
        }
      }

      // Finalizar la verificación
      setCheckingAuth(false);
    }
  }, [user, loading, requiredRoles, fallbackUrl]);

  // Efectuar la redirección si es necesario
  useEffect(() => {
    if (shouldRedirect) {
      router.push(shouldRedirect);
    }
  }, [shouldRedirect, router]);

  // Si está cargando o verificando, mostrar spinner
  if (loading || checkingAuth) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Si necesita redirección, mostrar mensaje mientras se redirige
  if (shouldRedirect) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Typography variant="h5" color="error">
          Acceso denegado
        </Typography>
        <Typography variant="body1">No tienes permisos para acceder a esta página</Typography>
        <Typography variant="body2" color="text.secondary">
          Redirigiendo...
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
}
