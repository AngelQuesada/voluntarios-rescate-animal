import React, { cloneElement, FC } from 'react';
import { Snackbar, Box, Typography, IconButton } from '@mui/material';
import {
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { NotificationSnackbarProps } from './types';
import theme from '@/theme/theme';

const NotificationSnackbar: FC<NotificationSnackbarProps> = ({
  open,
  message,
  severity = 'info',
  onClose,
}) => {
  const getSeverityStyles = () => {
    switch (severity) {
      case 'success':
        return {
          icon: <SuccessIcon sx={{ color: theme.palette.success.main }} />,
          color: theme.palette.success.main,
          title: 'Éxito',
        };
      case 'error':
        return {
          icon: <ErrorIcon sx={{ color: theme.palette.error.main }} />,
          color: theme.palette.error.main,
          title: 'Error',
        };
      case 'warning':
        return {
          icon: <WarningIcon sx={{ color: theme.palette.warning.main }} />,
          color: theme.palette.warning.main,
          title: 'Advertencia',
        };
      case 'info':
      default:
        return {
          icon: <InfoIcon sx={{ color: theme.palette.info.main }} />,
          color: theme.palette.info.main,
          title: 'Información',
        };
    }
  };

  const { icon, color, title } = getSeverityStyles();

  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{
        width: { xs: '95%', sm: 'auto' },
        minWidth: { sm: '380px' },
        maxWidth: { sm: '520px' },
        bottom: { xs: 20, sm: 30 },
      }}
      data-testid="notification-snackbar"
    >
      <Box
        sx={{
          backgroundColor: theme.palette.background.paper,
          borderRadius: '8px',
          boxShadow: theme.shadows[4],
          width: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Cabecera de color */}
        <Box
          sx={{
            backgroundColor: color,
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {cloneElement(icon, {
              sx: { color: theme.palette.common.white, marginRight: '8px' },
            })}
            <Typography
              variant="subtitle1"
              sx={{ color: theme.palette.common.white, fontWeight: 'medium' }}
            >
              {title}
            </Typography>
          </Box>
          {onClose && (
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={onClose}
              sx={{ color: theme.palette.common.white, opacity: 0.7, '&:hover': { opacity: 1 } }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        {/* Contenido del mensaje */}
        <Box sx={{ padding: '12px 16px' }}>
          {typeof message === 'string' ? (
            <Typography
              variant="body2"
              sx={{ color: theme.palette.text.primary, fontSize: '0.9rem' }}
            >
              {message}
            </Typography>
          ) : (
            <Typography
              variant="body2"
              component="div"
              sx={{ color: theme.palette.text.primary, fontSize: '0.9rem' }}
            >
              {message}
            </Typography>
          )}
        </Box>
      </Box>
    </Snackbar>
  );
};

export default NotificationSnackbar;
