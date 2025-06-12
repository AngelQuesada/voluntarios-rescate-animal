import React from 'react';
import Image from 'next/image';
import { Box, CircularProgress, Typography, useTheme } from '@mui/material';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Cargando...' }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.palette.background.paper,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
        zIndex: theme.zIndex.modal + 1,
      }}
    >
      <Box
        sx={{
          width: 200,
          height: 200,
          position: 'relative',
        }}
      >
        <Image
          src="/logo.png"
          alt="Logo"
          fill
          sizes="200px"
          style={{ objectFit: 'contain' }}
          priority
        />
      </Box>
      <CircularProgress size={60} color="primary" />
      <Typography variant="h6" color="primary">
        {message}
      </Typography>
    </Box>
  );
};

export default LoadingScreen;
