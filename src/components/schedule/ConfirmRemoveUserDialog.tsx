import React from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  CircularProgress,
} from '@mui/material';
import { ConfirmRemoveUserDialogProps } from './types';

const ConfirmRemoveUserDialog: React.FC<ConfirmRemoveUserDialogProps> = ({
  open,
  onClose,
  onConfirm,
  userName,
  isLoading = false,
}) => {
  return (
    <Dialog open={open} onClose={onClose} disableEscapeKeyDown={isLoading}>
      <DialogTitle>Confirmar Eliminación</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {userName
            ? `¿Estás seguro de que quieres eliminar a ${userName} de este turno?`
            : '¿Estás seguro de que quieres eliminar a este usuario de este turno?'}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" disabled={isLoading}>
          Cancelar
        </Button>
        <Button
          onClick={onConfirm}
          color="error"
          variant="contained"
          autoFocus
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isLoading ? 'Eliminando...' : 'Eliminar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmRemoveUserDialog;
