'use client';

import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';
import Image from 'next/image';

export default function LogoutPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Eliminar la cookie de autenticación
        document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';

        // Limpiar todas las cookies relacionadas con Firebase Auth
        document.cookie.split(';').forEach((cookie) => {
          const [name] = cookie.split('=').map((c) => c.trim());
          if (name.includes('firebase') || name.includes('auth')) {
            document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
          }
        });

        // Cerrar sesión en Firebase
        await signOut(auth);

        await new Promise((resolve) => setTimeout(resolve, 200));

        // Redirigir a la página de login
        router.replace('/');
      } catch (err) {
        console.error('Error al cerrar sesión:', err);
        setError('Ocurrió un error al cerrar la sesión. Intente de nuevo.');
      }
    };

    performLogout();
  }, [router]);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
        zIndex: 9999,
      }}
    >
      <Box
        sx={{
          width: 150,
          height: 150,
          position: 'relative',
        }}
      >
        <Image
          src="/logo.png"
          alt="Logo Rescate Animal Granada"
          fill
          sizes="150px"
          style={{ objectFit: 'contain' }}
          priority
        />
      </Box>
      <CircularProgress size={60} color="primary" />
      <Typography variant="h6" color="primary">
        Cerrando sesión...
      </Typography>
      {error && (
        <Typography variant="body1" color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
