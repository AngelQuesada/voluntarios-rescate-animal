'use client';

import React, { useEffect } from 'react';
import { Box, Typography, Container } from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { UserRoles } from '@/lib/constants';
import { Header } from '@/components/schedule/header';
import HistoryCalendar from '@/components/history/HistoryCalendar';

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const isAdmin = user && Array.isArray(user.roles) && user.roles.includes(UserRoles.ADMINISTRADOR);

  useEffect(() => {
    if (!loading && user) {
      if (!isAdmin) {
        router.push('/');
      }
    }
  }, [user, loading, router, isAdmin]);

  if (loading || !user) {
    return null;
  }

  return (
    <>
      <Header />
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Historial de Voluntarios
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" align="center" sx={{ mb: 4 }}>
            Selecciona una fecha pasada para ver los voluntarios que asistieron
          </Typography>
          <HistoryCalendar />
        </Box>
      </Container>
    </>
  );
}
