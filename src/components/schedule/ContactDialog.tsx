import React from 'react';
import { Dialog, DialogTitle, DialogContent, Button, Box, Alert } from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { ContactDialogProps } from './types';

const ContactDialog: React.FC<ContactDialogProps> = ({ open, onClose, user }) => {
  if (!user) return null;

  const hasPhone = user.phone && user.phone.trim() !== '';

  const handleCall = () => {
    if (!hasPhone) return;
    window.location.href = `tel:${user.phone}`;
  };

  const handleWhatsApp = () => {
    if (!hasPhone) return;
    const phoneNumber = user.phone.replace(/[^0-9]/g, '');
    window.location.href = `https://wa.me/${phoneNumber}`;
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Contactar con {user.name}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1 }}>
          {!hasPhone ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No hay número de teléfono disponible para este usuario.
            </Alert>
          ) : (
            <>
              <Button
                variant="contained"
                startIcon={<PhoneIcon />}
                onClick={handleCall}
                sx={{ justifyContent: 'flex-start' }}
              >
                Llamar
              </Button>
              <Button
                variant="contained"
                startIcon={<WhatsAppIcon />}
                onClick={handleWhatsApp}
                color="success"
                sx={{ justifyContent: 'flex-start' }}
              >
                Enviar WhatsApp
              </Button>
            </>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ContactDialog;
