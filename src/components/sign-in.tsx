'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Paper, Avatar, Typography, CssBaseline } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import SignInForm from './sign-in/SignInForm';
import Copyright from './Copyright';
import { containerStyles, paperStyles } from '@/styles/formStyles';
import Image from 'next/image';

const SignIn = () => {
  const [isMounted, setIsMounted] = useState(false);
  const needsResetRef = useRef(false);
  const auth = useAuth();

  // Reinicio silencioso
  const handleSilentReset = useCallback(() => {
    if (needsResetRef.current) return;
    needsResetRef.current = true;
    try {
      // Solo limpiar claves específicas de timeout, no todo el estado de auth
      sessionStorage.removeItem('loginTimeout');
    } catch {}
    // No resetear el formulario automáticamente
    setTimeout(() => {
      needsResetRef.current = false;
    }, 1000);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        const scrollPosition = window.scrollY;
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollPosition + 1);
          window.scrollTo(0, scrollPosition);
        });
      }
    }
  }, []);

  if (!isMounted) return null;

  return (
    <Container component="main" maxWidth="xs" sx={containerStyles}>
      <CssBaseline />
      <Paper sx={paperStyles}>
        <Avatar sx={{ m: 1, bgcolor: 'transparent', width: 75, height: 75 }}>
          <Image
            src="/logo.png"
            alt="Logo Rescate Animal Granada"
            style={{ width: '100%', height: '100%' }}
          />
        </Avatar>

        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1, mb: 2 }}>
          Rescate Animal Granada
        </Typography>

        <SignInForm {...auth} onSilentReset={handleSilentReset} />

        <Copyright />
      </Paper>
    </Container>
  );
};

export default SignIn;
