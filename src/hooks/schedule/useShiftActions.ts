import { createElement, Dispatch, Fragment, ReactNode, SetStateAction, useState } from 'react';
import { useModifyShiftMutation, ShiftAssignment } from '@/store/api/shiftsApi';
import { triggerVibration } from '@/lib/vibration';
import { UserRoles } from '@/lib/constants';
import { CurrentUser, User } from '@/types/common';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ProcessedAssignments } from './useShiftsData';

interface ShiftActions {
  isUpdatingShift: { [key: string]: boolean };
  confirmDialogOpen: boolean;
  shiftToAction: { dateKey: string; shiftKey: 'M' | 'T' } | null;
  removeUserConfirmOpen: boolean;
  userToRemoveDetails: { uid: string; name: string; dateKey: string; shiftKey: 'M' | 'T' } | null;
  addUserDialogOpen: boolean;
  shiftForUserAssignment: { dateKey: string; shiftKey: 'M' | 'T' } | null;
  isRemovingUser: boolean;
  executeModifyShift: (
    dateKey: string,
    shiftKey: 'M' | 'T',
    targetUserId: string,
    targetUserName: string,
    actionType?: 'add' | 'remove'
  ) => Promise<void>;
  initiateShiftAction: (dateKey: string, shiftKey: 'M' | 'T') => Promise<void>;
  confirmShiftAction: () => Promise<void>;
  cancelShiftAction: () => void;
  handleRemoveUserClick: (
    assignment: ShiftAssignment,
    dateKey: string,
    shiftKey: 'M' | 'T'
  ) => void;
  confirmRemoveUser: () => Promise<void>;
  cancelRemoveUser: () => void;
  handleAddUserButtonClick: (dateKey: string, shiftKey: 'M' | 'T') => void;
  confirmAddUserToShift: (userId: string) => Promise<void>;
  cancelAddUser: () => void;
  setIsUpdatingShift: Dispatch<SetStateAction<{ [key: string]: boolean }>>;
}

interface UseShiftActionsProps {
  currentUser: CurrentUser | null;
  usersMap: { [uid: string]: User };
  processedAssignments: ProcessedAssignments;
  showSnackbar: (message: ReactNode, severity?: 'success' | 'error' | 'info' | 'warning') => void;
  authLoading: boolean;
}

export function useShiftActions({
  currentUser,
  usersMap,
  processedAssignments,
  showSnackbar,
  authLoading,
}: UseShiftActionsProps): ShiftActions {
  const [modifyShift] = useModifyShiftMutation();
  const [isUpdatingShift, setIsUpdatingShift] = useState<{ [key: string]: boolean }>({});
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [shiftToAction, setShiftToAction] = useState<{
    dateKey: string;
    shiftKey: 'M' | 'T';
  } | null>(null);
  const [removeUserConfirmOpen, setRemoveUserConfirmOpen] = useState(false);
  const [userToRemoveDetails, setUserToRemoveDetails] = useState<{
    uid: string;
    name: string;
    dateKey: string;
    shiftKey: 'M' | 'T';
  } | null>(null);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [shiftForUserAssignment, setShiftForUserAssignment] = useState<{
    dateKey: string;
    shiftKey: 'M' | 'T';
  } | null>(null);
  const [isRemovingUser, setIsRemovingUser] = useState(false);

  const executeModifyShift = async (
    dateKey: string,
    shiftKey: 'M' | 'T',
    targetUserId: string,
    targetUserName: string,
    actionType: 'add' | 'remove' = 'add'
  ) => {
    if (targetUserId === currentUser?.uid && (!currentUser?.name || !currentUser?.lastname)) {
      showSnackbar('Perfil incompleto (nombre/apellido).', 'warning');
      return;
    }
    if (!currentUser || !currentUser.uid) {
      showSnackbar('Usuario no autenticado.', 'warning');
      return;
    }

    const loadingIndicatorKey = `${dateKey}_${shiftKey}_${targetUserId}`;
    setIsUpdatingShift((prev) => ({ ...prev, [loadingIndicatorKey]: true }));

    try {
      await modifyShift({
        dateKey,
        shiftKey,
        uid: targetUserId,
        name: '',
        action: actionType,
      }).unwrap();

      let formattedDate = format(parseISO(dateKey), "EEEE d 'de' MMMM", { locale: es });
      const dateParts = formattedDate.split(' ');
      if (dateParts.length > 3) {
        const dayName = dateParts[0];
        const monthName = dateParts[3];

        dateParts[0] = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        dateParts[3] = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        formattedDate = dateParts.join(' ');
      }

      const shiftTimeName = shiftKey === 'M' ? 'mañana' : 'tarde';

      if (actionType === 'add') {
        const message = createElement(
          Fragment,
          null,
          createElement('strong', null, targetUserName),
          ' asignado al turno del ',
          createElement('strong', null, formattedDate),
          ' por la ',
          shiftTimeName,
          '.'
        );
        showSnackbar(message, 'success');
      } else {
        const message = createElement(
          Fragment,
          null,
          createElement('strong', null, targetUserName),
          ' eliminado del turno del ',
          createElement('strong', null, formattedDate),
          ' por la ',
          shiftTimeName,
          '.'
        );
        showSnackbar(message, 'info');
      }
    } catch (err) {
      console.error('Error updating shift:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      const message = createElement(
        Fragment,
        null,
        'Error al actualizar el turno para ',
        createElement('strong', null, targetUserName),
        ': ',
        errorMessage
      );
      showSnackbar(message, 'error');
    } finally {
      setIsUpdatingShift((prev) => ({ ...prev, [loadingIndicatorKey]: false }));
    }
  };

  const initiateShiftAction = async (dateKey: string, shiftKey: 'M' | 'T') => {
    if (authLoading || !currentUser || !currentUser.uid) {
      showSnackbar('Usuario no disponible o no autenticado.', 'warning');
      return;
    }
    if (!currentUser.name || !currentUser.lastname) {
      showSnackbar('Perfil incompleto (nombre/apellido).', 'warning');
      return;
    }

    const currentShiftAssignments = processedAssignments[dateKey]?.[shiftKey] ?? [];
    const isUserAlreadyAssigned = currentShiftAssignments.some((a) => a.uid === currentUser.uid);

    if (!isUserAlreadyAssigned && currentShiftAssignments.length >= 3) {
      setShiftToAction({ dateKey, shiftKey });
      setConfirmDialogOpen(true);
      return;
    }

    const currentUserName = `${currentUser.name} ${currentUser.lastname}`;
    await executeModifyShift(
      dateKey,
      shiftKey,
      currentUser.uid,
      currentUserName,
      isUserAlreadyAssigned ? 'remove' : 'add'
    );
  };

  const confirmShiftAction = async () => {
    triggerVibration(50);
    if (shiftToAction && currentUser && currentUser.uid) {
      if (!currentUser.name || !currentUser.lastname) {
        showSnackbar(
          'No se puede realizar la acción, falta información del usuario (nombre/apellido).',
          'warning'
        );
        setConfirmDialogOpen(false);
        setShiftToAction(null);
        return;
      }
      await executeModifyShift(
        shiftToAction.dateKey,
        shiftToAction.shiftKey,
        currentUser.uid,
        `${currentUser.name} ${currentUser.lastname}`,
        'add'
      );
      setConfirmDialogOpen(false);
      setShiftToAction(null);
    } else {
      showSnackbar(
        'No se puede realizar la acción, usuario no válido o acción no definida.',
        'warning'
      );
      setConfirmDialogOpen(false);
      setShiftToAction(null);
    }
  };

  const cancelShiftAction = () => {
    setConfirmDialogOpen(false);
    setShiftToAction(null);
  };

  const handleRemoveUserClick = (
    assignment: ShiftAssignment,
    dateKey: string,
    shiftKey: 'M' | 'T'
  ) => {
    // Buscar información completa del usuario en usersMap
    const userDetails = usersMap[assignment.uid];
    let displayName = assignment.name || 'Usuario desconocido';

    if (userDetails) {
      displayName =
        `${userDetails.name || ''} ${userDetails.lastname || ''}`.trim() || 'Usuario desconocido';
    }

    setUserToRemoveDetails({ uid: assignment.uid, name: displayName, dateKey, shiftKey });
    setRemoveUserConfirmOpen(true);
  };

  const confirmRemoveUser = async () => {
    triggerVibration(50);
    if (userToRemoveDetails && currentUser?.roles?.includes(UserRoles.ADMINISTRADOR)) {
      const { uid, name, dateKey, shiftKey } = userToRemoveDetails;
      setIsRemovingUser(true);
      try {
        await executeModifyShift(dateKey, shiftKey, uid, name, 'remove');
      } finally {
        setIsRemovingUser(false);
        setRemoveUserConfirmOpen(false);
        setUserToRemoveDetails(null);
      }
    }
  };

  const cancelRemoveUser = () => {
    setRemoveUserConfirmOpen(false);
    setUserToRemoveDetails(null);
  };

  const handleAddUserButtonClick = (dateKey: string, shiftKey: 'M' | 'T') => {
    if (currentUser?.roles?.includes(UserRoles.ADMINISTRADOR)) {
      setShiftForUserAssignment({ dateKey, shiftKey });
      setAddUserDialogOpen(true);
    }
  };

  const confirmAddUserToShift = async (userId: string) => {
    triggerVibration(50);
    if (shiftForUserAssignment && currentUser?.roles?.includes(UserRoles.ADMINISTRADOR)) {
      const userToAdd = usersMap[userId];
      if (!userToAdd) {
        showSnackbar('Usuario no encontrado.', 'error');
        return;
      }
      const { dateKey, shiftKey } = shiftForUserAssignment;
      await executeModifyShift(
        dateKey,
        shiftKey,
        userId,
        `${userToAdd.name || ''} ${userToAdd.lastname || ''}`.trim() || 'Usuario sin nombre',
        'add'
      );
      setAddUserDialogOpen(false);
      setShiftForUserAssignment(null);
    }
  };

  const cancelAddUser = () => {
    setAddUserDialogOpen(false);
    setShiftForUserAssignment(null);
  };

  return {
    isUpdatingShift,
    confirmDialogOpen,
    shiftToAction,
    removeUserConfirmOpen,
    userToRemoveDetails,
    addUserDialogOpen,
    shiftForUserAssignment,
    isRemovingUser,
    executeModifyShift,
    initiateShiftAction,
    confirmShiftAction,
    cancelShiftAction,
    handleRemoveUserClick,
    confirmRemoveUser,
    cancelRemoveUser,
    handleAddUserButtonClick,
    confirmAddUserToShift,
    cancelAddUser,
    setIsUpdatingShift,
  };
}
