import React, { FC, useMemo } from 'react';
import { Box, Typography, Grid, CircularProgress, IconButton, Tooltip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CircleIcon from '@mui/icons-material/Circle';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { triggerVibration } from '@/lib/vibration';
import ShiftAssignmentList from './ShiftAssignmentList';
import { ShiftAssignment } from '@/store/api/shiftsApi';
import { CurrentUser, User } from '@/types/common';
import { addDays, startOfDay, isBefore, isEqual, parseISO } from 'date-fns';

interface ShiftRowProps {
  dayKey: string; // Formato 'yyyy-MM-dd'
  shiftKey: 'M' | 'T';
  shiftDisplayName: string;
  currentUser: CurrentUser | null;
  assignments: ShiftAssignment[];
  usersMap: { [uid: string]: User };
  isLoading: boolean;
  initiateShiftAction: (dateKey: string, shiftKey: 'M' | 'T') => Promise<void>;
  onAddUserClick: (dayKey: string, shiftKey: 'M' | 'T') => void;
  onRemoveUserClick: (assignment: ShiftAssignment, dayKey: string, shiftKey: 'M' | 'T') => void;
  onVolunteerClick: (volunteer: ShiftAssignment) => void;
}

const ShiftRow: FC<ShiftRowProps> = ({
  dayKey,
  shiftKey,
  shiftDisplayName,
  currentUser,
  assignments,
  usersMap,
  isLoading,
  initiateShiftAction,
  onAddUserClick,
  onRemoveUserClick,
  onVolunteerClick,
}) => {
  const isCurrentUserAssigned = assignments.some((a) => a.uid === currentUser?.uid);

  // Verificar si el turno es para el día actual o los próximos 2 días
  const isNearFutureShift = useMemo(() => {
    const today = startOfDay(new Date());
    const twoDaysLater = addDays(today, 2);
    const shiftDate = parseISO(dayKey);

    return (
      (isEqual(shiftDate, today) || isBefore(today, shiftDate)) &&
      (isEqual(shiftDate, twoDaysLater) || isBefore(shiftDate, twoDaysLater))
    );
  }, [dayKey]);

  // Obtener el estatus visual del turno
  const getShiftStatus = () => {
    // Solo mostrar advertencias para turnos cercanos
    if (isNearFutureShift) {
      // Verificar si no hay un responsable asignado
      const hasResponsable = assignments.some((assignment) => assignment.roles?.includes(2));

      const hasEnoughVolunteers = assignments.length > 2;

      if (!hasEnoughVolunteers || !hasResponsable) return 'warning';

      return 'ok';
    }

    return 'empty';
  };

  const shiftStatus = getShiftStatus();

  // Renderizar el icono apropiado según el estatus
  const renderStatusIcon = () => {
    switch (shiftStatus) {
      case 'ok':
        return <CheckCircleIcon color="success" fontSize="small" />;
      case 'warning':
        return <ErrorIcon color="warning" fontSize="small" />;
      case 'empty':
        return <CircleIcon color="disabled" fontSize="small" />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Grid container alignItems="center" spacing={1}>
        {/* Columna de la izquierda: Título del turno y estatus */}
        <Grid item xs={2} sm={2} md={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {renderStatusIcon()}
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {shiftDisplayName}
            </Typography>
          </Box>
        </Grid>

        {/* Columna del centro: Lista de asignaciones */}
        <Grid item xs={9} sm={8} md={8}>
          <ShiftAssignmentList
            assignments={assignments}
            currentUser={currentUser}
            usersMap={usersMap}
            dayKey={dayKey}
            shiftKey={shiftKey}
            onAddUserClick={onAddUserClick}
            onRemoveUserClick={onRemoveUserClick}
            onVolunteerClick={onVolunteerClick}
          />
        </Grid>

        {/* Columna de la derecha: Botón de acción */}
        <Grid item xs={1} sm={2} md={2}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            {isLoading ? (
              <CircularProgress size={24} />
            ) : (
              currentUser && (
                <Tooltip
                  title={
                    isCurrentUserAssigned ? 'Eliminarme de este turno' : 'Añadirme a este turno'
                  }
                >
                  <IconButton
                    onClick={() => {
                      triggerVibration(40);
                      initiateShiftAction(dayKey, shiftKey);
                    }}
                    color={isCurrentUserAssigned ? 'error' : 'primary'}
                    size="small"
                    data-testid={isCurrentUserAssigned ? 'RemoveMyTurn' : 'AddMyTurn'}
                  >
                    {isCurrentUserAssigned ? <RemoveCircleOutlineIcon /> : <AddCircleOutlineIcon />}
                  </IconButton>
                </Tooltip>
              )
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ShiftRow;
