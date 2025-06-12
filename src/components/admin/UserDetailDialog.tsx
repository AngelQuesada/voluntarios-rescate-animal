import React, { ChangeEvent, FC, ReactNode } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  Divider,
  Chip,
  Grid,
  IconButton,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Pagination,
  Stack,
  Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PhoneIcon from '@mui/icons-material/Phone';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { formatDate, calculateAge } from '@/lib/utils';
import { UserRoles, getRoleName } from '@/lib/constants';
import { UserData, useUserDetailDialog } from '@/hooks/use-user-detail-dialog';
import { User } from '@/types';
import { UserHistoryShift } from '@/hooks/history/useUserHistory';

interface TabPanelProps {
  children?: ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
      style={{ padding: '16px 0' }}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

interface UserDetailDialogProps {
  open: boolean;
  onClose: () => void;
  userId?: string;
  user?: User;
}

const UserDetailDialog: FC<UserDetailDialogProps> = ({ open, onClose, userId, user: userProp }) => {
  const {
    userData,
    loading,
    userLoading,
    tabValue,
    handleTabChange,
    upcomingShiftsCount,
    pastShiftsCount,
    paginatedUpcomingShifts,
    paginatedPastShifts,
    upcomingPage,
    pastPage,
    totalUpcomingPages,
    totalPastPages,
    handleUpcomingPageChange,
    handlePastPageChange,
  } = useUserDetailDialog({
    open,
    userId,
    user: userProp ? (userProp as unknown as UserData) : undefined,
    shiftsPerPage: 15,
  });

  const handleCall = () => {
    if (!userData?.phone) return;
    window.location.href = `tel:${userData.phone}`;
  };

  const handleWhatsApp = () => {
    if (!userData?.phone) return;
    const phoneNumber = userData.phone.replace(/[^0-9]/g, '');
    window.location.href = `https://wa.me/${phoneNumber}`;
  };

  if (userLoading) {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (!userData) return null;

  const renderRole = (roleId: number) => {
    let color = 'primary';
    if (roleId === UserRoles.ADMINISTRADOR) {
      color = 'error';
    } else if (roleId === UserRoles.RESPONSABLE) {
      color = 'success';
    }

    return (
      <Chip
        key={roleId}
        label={getRoleName(roleId)}
        color={color as 'primary' | 'error' | 'success'}
        size="small"
        sx={{ mr: 1, mb: 1 }}
      />
    );
  };

  const renderShiftsTable = (
    shiftsData: UserHistoryShift[],
    currentPage: number,
    totalPages: number,
    handlePageChange: (event: ChangeEvent<unknown>, value: number) => void
  ) => {
    if (shiftsData.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: 2 }}>
          No hay turnos para mostrar.
        </Typography>
      );
    }

    return (
      <>
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Turno</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shiftsData.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell>{formatDate(shift.date)}</TableCell>
                  <TableCell>{shift.area}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Control de paginación */}
        {totalPages > 1 && (
          <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              size="small"
            />
          </Stack>
        )}
      </>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography fontWeight={'bold'} variant="body1">
          Detalles del Usuario
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* Información del usuario */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" gutterBottom>
            {userData.name} {userData.lastname}
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', mb: 2 }}>
            {userData.roles?.map(renderRole)}
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Usuario: <strong>{userData.username || 'No disponible'}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Correo: <strong>{userData.email || 'No disponible'}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Teléfono: <strong>{userData.phone || 'No disponible'}</strong>
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Edad:{' '}
                <strong>
                  {userData.birthdate ? calculateAge(userData.birthdate) : 'No disponible'}
                </strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Profesión: <strong>{userData.job || 'No disponible'}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Localidad: <strong>{userData.location || 'No disponible'}</strong>
              </Typography>
            </Grid>
          </Grid>

          {/* Botones de contacto */}
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<PhoneIcon />}
              onClick={handleCall}
              sx={{
                width: '120px',
                minWidth: '120px',
                height: '36px',
              }}
            >
              Llamar
            </Button>
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={<WhatsAppIcon />}
              onClick={handleWhatsApp}
              sx={{
                width: '120px',
                minWidth: '120px',
                height: '36px',
              }}
            >
              WhatsApp
            </Button>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Historial de turnos */}
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <CalendarTodayIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
          Historial de Turnos
        </Typography>

        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label={`Turnos Pendientes (${upcomingShiftsCount})`} />
          <Tab label={`Turnos Pasados (${pastShiftsCount})`} />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <>
            <TabPanel value={tabValue} index={0}>
              {renderShiftsTable(
                paginatedUpcomingShifts,
                upcomingPage,
                totalUpcomingPages,
                handleUpcomingPageChange
              )}
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              {renderShiftsTable(
                paginatedPastShifts,
                pastPage,
                totalPastPages,
                handlePastPageChange
              )}
            </TabPanel>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailDialog;
