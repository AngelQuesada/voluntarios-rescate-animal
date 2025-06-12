'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  AppBar,
  Toolbar,
  Typography,
  Tooltip,
  IconButton,
  Box,
  Dialog,
  CircularProgress,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export function Header() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();
  const isAdminPage = pathname === '/admin';
  const isMobile = useIsMobile();
  const router = useRouter();
  const [isLoggingOut] = useState(false);
  const [isNavigatingToAdmin, setIsNavigatingToAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(user?.roles?.includes(3) || false);
  }, [user]);

  const handleLogout = () => {
    router.push('/logout');
  };

  const handleAdminNavigation = () => {
    if (!isAdminPage) {
      setIsNavigatingToAdmin(true);
      router.push('/admin');
    } else {
      router.push('/schedule');
    }
  };

  return (
    <>
      <AppBar position="static" sx={{ bgcolor: 'white', color: 'text.primary', boxShadow: 1 }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Link href="/schedule">
              <Image
                src="/logo.png"
                alt="Logo"
                width={40}
                height={40}
                priority
                style={{
                  marginRight: '16px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                }}
              />
            </Link>
            {!isMobile && (
              <Typography
                variant="h6"
                component="div"
                sx={{ fontWeight: 'bold' }}
                color={'primary.main'}
              >
                Rescate Animal Granada
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {user?.name && user?.lastname && (
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 500,
                  color: 'primary.main',
                }}
              >
                {`${user.name} ${user.lastname}`}
              </Typography>
            )}
            {isAdmin && (
              <Tooltip title={isAdminPage ? 'Ir a Turnos' : 'Panel de Administración'} arrow>
                <IconButton
                  onClick={handleAdminNavigation}
                  size="small"
                  sx={{
                    color: 'primary.contrastText',
                    backgroundColor: 'primary.main',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                  }}
                >
                  {isAdminPage ? (
                    <ArrowBackIcon fontSize="small" />
                  ) : (
                    <AdminPanelSettingsIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Cerrar sesión" arrow>
              <IconButton
                size="small"
                onClick={handleLogout}
                sx={{
                  color: 'primary.contrastText',
                  backgroundColor: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                }}
              >
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>
      {/* Dialog Cerrando sesión */}
      <Dialog
        open={isLoggingOut}
        PaperProps={{
          sx: {
            padding: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          },
        }}
      >
        <CircularProgress />
        <Typography variant="body1">Cerrando sesión...</Typography>
      </Dialog>

      {/* Dialog Cargando panel de administracion */}
      <Dialog
        open={isNavigatingToAdmin}
        PaperProps={{
          sx: {
            padding: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          },
        }}
      >
        <CircularProgress />
        <Typography variant="body1">Cargando panel de administración...</Typography>
      </Dialog>
    </>
  );
}
