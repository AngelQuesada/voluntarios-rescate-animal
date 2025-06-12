import React from 'react';
import { Button, Box, CircularProgress } from '@mui/material';
import { buttonStyles } from '@/styles/formStyles';

interface SubmitButtonProps {
  isLoading: boolean;
}

const LoadingIndicator = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <CircularProgress size={24} sx={{ marginRight: 1 }} />
    <span>Iniciando sesión...</span>
  </Box>
);

const SubmitButton = ({ isLoading }: SubmitButtonProps) => {
  return (
    <Button type="submit" fullWidth variant="contained" sx={buttonStyles} disabled={isLoading}>
      {isLoading ? <LoadingIndicator /> : 'Iniciar Sesión'}
    </Button>
  );
};

export default SubmitButton;
