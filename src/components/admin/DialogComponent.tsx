import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';

interface DialogComponentProps {
  open: boolean;
  onClose: () => void;
  title: string;
  content?: React.ReactNode;
  contentText?: string;
  error?: string | null;
  actions: {
    label: string;
    onClick: () => void;
    color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
    variant?: 'text' | 'outlined' | 'contained';
    autoFocus?: boolean;
    disabled?: boolean;
    loading?: boolean;
  }[];
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
}

const DialogComponent: React.FC<DialogComponentProps> = ({
  open,
  onClose,
  title,
  content,
  contentText,
  error,
  actions,
  maxWidth = 'sm',
  fullWidth = true,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
    >
      <DialogTitle id="dialog-title">{title}</DialogTitle>
      <DialogContent>
        {contentText && (
          <DialogContentText id="dialog-description">{contentText}</DialogContentText>
        )}
        {content}
        {error && (
          <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        {actions.map((action, index) => (
          <Button
            key={index}
            onClick={action.onClick}
            color={action.color || 'primary'}
            variant={action.variant || 'text'}
            autoFocus={action.autoFocus}
            disabled={action.disabled || action.loading}
            startIcon={action.loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {action.loading ? 'Procesando...' : action.label}
          </Button>
        ))}
      </DialogActions>
    </Dialog>
  );
};

export default DialogComponent;
