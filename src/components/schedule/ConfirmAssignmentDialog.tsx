import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material';
import { ConfirmAssignmentDialogProps } from './types';

const ConfirmAssignmentDialog: React.FC<ConfirmAssignmentDialogProps> = ({
  open,
  onClose,
  onConfirm,
  isLoading,
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Confirmar Asignación</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Este turno ya tiene 3 voluntarios asignados. ¿Estás seguro de que quieres asignarte
          también? (Máximo recomendado: 3)
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary" disabled={isLoading}>
          Cancelar
        </Button>
        <Button onClick={onConfirm} color="primary" disabled={isLoading} variant="contained">
          {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Confirmar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmAssignmentDialog;
