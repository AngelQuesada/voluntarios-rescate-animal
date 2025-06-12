'use client';

import React, { useCallback } from 'react';
import { format, isValid } from 'date-fns';
import { ScheduleContentProps } from '@/app/schedule/page';
import { useScheduleContent } from '@/hooks/use-schedule-content';
import { Box, Alert, Paper, Typography, Divider } from '@mui/material';
import ConfirmAssignmentDialog from './ConfirmAssignmentDialog';
import NotificationSnackbar from './NotificationSnackbar';
import ContactDialog from './ContactDialog';
import ConfirmRemoveUserDialog from './ConfirmRemoveUserDialog';
import AddUserToShiftDialog from './AddUserToShiftDialog';
import ScheduleTabsComponent from './ScheduleTabsComponent';
import LoadingScreen from './LoadingScreen';
import InfiniteScrollLoader from './InfiniteScrollLoader';
import ShiftRow from './ShiftRow';
import UserHistoryTab from '../history/UserHistoryTab'; // Added import
import { es } from 'date-fns/locale';

export default function ScheduleContent({ startDate, endDate }: ScheduleContentProps) {
  const {
    // Auth
    currentUser,
    authError,

    // Shifts Data
    processedAssignments,
    allUsersList,
    shiftsError,
    myShiftsCount,
    usersMap,

    // Shift Actions
    isUpdatingShift,
    confirmDialogOpen,
    removeUserConfirmOpen,
    userToRemoveDetails,
    addUserDialogOpen,
    shiftForUserAssignment,
    isRemovingUser,
    initiateShiftAction,
    confirmShiftAction,
    cancelShiftAction,
    handleRemoveUserClick,
    confirmRemoveUser,
    cancelRemoveUser,
    handleAddUserButtonClick,
    confirmAddUserToShift,
    cancelAddUser,

    // UI
    snackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    handleSnackbarClose,
    selectedVolunteer,
    contactDialogOpen,
    setContactDialogOpen,
    handleVolunteerClick,
    activeTab,
    handleTabChange,
    daysToDisplay,
    shouldShowLoader,
    isLoadingMoreDays,
    shouldLoadMoreDays,
    setVisibleDaysCount,
    allDaysToDisplay,

    // Helpers
    isContentLoading,
    getShiftDisplayName,
  } = useScheduleContent({
    startDate,
    endDate,
  });

  // Función para manejar la intersección visible del loader
  const handleLoaderIntersection = useCallback(() => {
    if (!isLoadingMoreDays && shouldLoadMoreDays()) {
      // Añadir 7 días más o hasta el máximo disponible
      setTimeout(() => {
        setVisibleDaysCount((prev) => Math.min(prev + 7, allDaysToDisplay.length));
      }, 400);
    }
  }, [isLoadingMoreDays, shouldLoadMoreDays, setVisibleDaysCount, allDaysToDisplay.length]);

  const formattedUsersForDialog = allUsersList.map((user) => {
    const fullUser = usersMap[user.id];
    return {
      ...fullUser,
      id: user.id,
      isEnabled: fullUser?.isEnabled,
    };
  });

  // Manejo de errores
  if (authError || shiftsError) {
    return <Alert severity="error">{authError || 'Error al cargar los turnos'}</Alert>;
  }

  // Pantalla de carga
  if (isContentLoading) {
    return <LoadingScreen />;
  }

  // Validación de fecha
  if (!isValid(endDate)) {
    return <Alert severity="error">Fechas de inicio o fin inválidas.</Alert>;
  }

  // Renderizar un día para la pestaña "Todos los turnos"
  const renderAllShiftsDay = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayAssignments = processedAssignments[dateKey] || { M: [], T: [] };
    const dayOfWeek = format(date, 'EEEE', { locale: es });
    const formattedDate = format(date, 'd MMMM', { locale: es });

    return (
      <Paper
        key={dateKey}
        elevation={1}
        className="shift-day"
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ mb: 1 }}>
          <Typography
            variant="h6"
            component="h3"
            sx={{
              textTransform: 'capitalize',
              fontWeight: 'bold',
            }}
          >
            {dayOfWeek}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
            {formattedDate}
          </Typography>
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Turno de Mañana */}
        <ShiftRow
          key={`${dateKey}_M`}
          dayKey={dateKey}
          shiftKey="M"
          shiftDisplayName={getShiftDisplayName('M')}
          currentUser={currentUser}
          assignments={dayAssignments.M || []}
          usersMap={usersMap}
          isLoading={isUpdatingShift[`${dateKey}_M_${currentUser?.uid || ''}`] || false}
          initiateShiftAction={initiateShiftAction}
          onAddUserClick={handleAddUserButtonClick}
          onRemoveUserClick={handleRemoveUserClick}
          onVolunteerClick={handleVolunteerClick}
        />

        {/* Turno de Tarde */}
        <ShiftRow
          key={`${dateKey}_T`}
          dayKey={dateKey}
          shiftKey="T"
          shiftDisplayName={getShiftDisplayName('T')}
          currentUser={currentUser}
          assignments={dayAssignments.T || []}
          usersMap={usersMap}
          isLoading={isUpdatingShift[`${dateKey}_T_${currentUser?.uid || ''}`] || false}
          initiateShiftAction={initiateShiftAction}
          onAddUserClick={handleAddUserButtonClick}
          onRemoveUserClick={handleRemoveUserClick}
          onVolunteerClick={handleVolunteerClick}
        />
      </Paper>
    );
  };

  // Renderizar un día para la pestaña "Mis Turnos"
  const renderMyShiftsDay = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayAssignments = processedAssignments[dateKey] || { M: [], T: [] };
    const dayOfWeek = format(date, 'EEEE', { locale: es });
    const formattedDate = format(date, 'd MMMM', { locale: es });

    // Solo procesar si el usuario está asignado a algún turno de este día
    const userInMorningShift = dayAssignments.M?.some((a) => a.uid === currentUser?.uid) || false;
    const userInAfternoonShift = dayAssignments.T?.some((a) => a.uid === currentUser?.uid) || false;

    if (!userInMorningShift && !userInAfternoonShift) {
      return null;
    }

    return (
      <Paper
        key={dateKey}
        elevation={1}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ mb: 1 }}>
          <Typography
            variant="h6"
            component="h3"
            sx={{
              textTransform: 'capitalize',
              fontWeight: 'bold',
            }}
          >
            {dayOfWeek}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
            {formattedDate}
          </Typography>
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Solo mostrar turno de mañana si el usuario está asignado */}
        {userInMorningShift && (
          <ShiftRow
            key={`${dateKey}_M`}
            dayKey={dateKey}
            shiftKey="M"
            shiftDisplayName={getShiftDisplayName('M')}
            currentUser={currentUser}
            assignments={dayAssignments.M || []}
            usersMap={usersMap}
            isLoading={isUpdatingShift[`${dateKey}_M_${currentUser?.uid || ''}`] || false}
            initiateShiftAction={initiateShiftAction}
            onAddUserClick={handleAddUserButtonClick}
            onRemoveUserClick={handleRemoveUserClick}
            onVolunteerClick={handleVolunteerClick}
          />
        )}

        {/* Solo mostrar turno de tarde si el usuario está asignado */}
        {userInAfternoonShift && (
          <ShiftRow
            key={`${dateKey}_T`}
            dayKey={dateKey}
            shiftKey="T"
            shiftDisplayName={getShiftDisplayName('T')}
            currentUser={currentUser}
            assignments={dayAssignments.T || []}
            usersMap={usersMap}
            isLoading={isUpdatingShift[`${dateKey}_T_${currentUser?.uid || ''}`] || false}
            initiateShiftAction={initiateShiftAction}
            onAddUserClick={handleAddUserButtonClick}
            onRemoveUserClick={handleRemoveUserClick}
            onVolunteerClick={handleVolunteerClick}
          />
        )}
      </Paper>
    );
  };

  return (
    <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
      <Box sx={{ maxWidth: '800px', width: '100%' }}>
        {/* Pestañas de navegación */}
        <ScheduleTabsComponent
          activeTab={activeTab}
          myShiftsCount={myShiftsCount}
          handleTabChange={handleTabChange}
        />

        {/* Contenido de las pestañas */}
        {activeTab === 0 && (
          <>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {daysToDisplay.map((date) => renderAllShiftsDay(date))}
            </Box>
            <InfiniteScrollLoader
              isVisible={shouldShowLoader}
              onIntersect={handleLoaderIntersection}
            />
            <Box sx={{ height: '100px' }} /> {/* Espacio PWA */}
          </>
        )}

        {activeTab === 1 && (
          <>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {daysToDisplay.map((date) => renderMyShiftsDay(date)).filter(Boolean)}
            </Box>
            <InfiniteScrollLoader
              isVisible={shouldShowLoader}
              onIntersect={handleLoaderIntersection}
            />
            <Box sx={{ height: '100px' }} /> {/* Espacio PWA */}
          </>
        )}

        {activeTab === 2 && <UserHistoryTab currentUser={currentUser} />}
      </Box>

      {/* Diálogos */}
      <NotificationSnackbar
        open={snackbarOpen}
        message={snackbarMessage}
        severity={snackbarSeverity}
        onClose={handleSnackbarClose}
      />

      <ConfirmAssignmentDialog
        open={confirmDialogOpen}
        onClose={cancelShiftAction}
        onConfirm={confirmShiftAction}
        isLoading={Object.values(isUpdatingShift).some(Boolean)}
      />

      <ConfirmRemoveUserDialog
        open={removeUserConfirmOpen}
        onClose={cancelRemoveUser}
        onConfirm={confirmRemoveUser}
        userName={userToRemoveDetails?.name}
        isLoading={isRemovingUser}
      />

      <AddUserToShiftDialog
        open={addUserDialogOpen}
        onClose={cancelAddUser}
        onAddUser={confirmAddUserToShift}
        users={formattedUsersForDialog}
        currentAssignments={
          shiftForUserAssignment &&
          processedAssignments[shiftForUserAssignment.dateKey]?.[shiftForUserAssignment.shiftKey]
            ? (processedAssignments[shiftForUserAssignment.dateKey]![
                shiftForUserAssignment.shiftKey
              ]! as { uid: string; name: string }[])
            : []
        }
      />

      <ContactDialog
        open={contactDialogOpen}
        onClose={() => setContactDialogOpen(false)}
        user={
          selectedVolunteer
            ? {
                name: selectedVolunteer.name || 'Desconocido',
                phone: selectedVolunteer.phone || '',
              }
            : null
        }
      />
    </Box>
  );
}
