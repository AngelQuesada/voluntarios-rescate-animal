import React from 'react';
import { Button, Box, CircularProgress } from '@mui/material';
import { buttonStyles } from '@/styles/formStyles';

interface SubmitButtonProps {
  isLoading: boolean;
  isBlocked?: boolean;
}

const LoadingIndicator = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <CircularProgress size={24} sx={{ marginRight: 1 }} />
    <span>Iniciando sesión...</span>
  </Box>
);

const SubmitButton = ({ isLoading, isBlocked = false }: SubmitButtonProps) => {
  const isDisabled = isLoading || isBlocked;
  
  const getButtonText = () => {
    if (isLoading) return <LoadingIndicator />;
    if (isBlocked) return 'Cuenta Bloqueada';
    return 'Iniciar Sesión';
  };

  return (
    <Button 
      type="submit" 
      fullWidth 
      variant="contained" 
      sx={{
        ...buttonStyles,
        ...(isBlocked && {
          backgroundColor: '#ff9800',
          '&:hover': {
            backgroundColor: '#f57c00',
          },
          '&.Mui-disabled': {
            backgroundColor: '#ffcc80',
            color: 'rgba(0, 0, 0, 0.6)',
          },
        }),
      }} 
      disabled={isDisabled}
    >
      {getButtonText()}
    </Button>
  );
};

export default SubmitButton;
