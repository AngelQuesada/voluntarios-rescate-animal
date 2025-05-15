import React, { useEffect, useMemo, useState } from "react";
import { Typography, Box, Tooltip, IconButton } from "@mui/material";
import { UserRoles } from "@/lib/constants";
import PersonAddIcon from '@mui/icons-material/PersonAdd';

import { useAuthUserStatus } from "./schedule/useAuthUserStatus";
import { useShiftsData, ProcessedAssignments } from "./schedule/useShiftsData";
import { useShiftActions } from "./schedule/useShiftActions";
import { useScheduleUI } from "./schedule/useScheduleUI";
import { ShiftAssignment } from "@/store/api/shiftsApi";
import { CurrentUser, User } from "@/types/common";

interface UseScheduleContentOptions {
  startDate?: Date;
  endDate?: Date;
}

export interface UseScheduleContentResult {
  // Desde useAuthUserStatus
  currentUser: CurrentUser | null;
  authLoading: boolean;
  authError: string | null; // Renombrado desde 'error' para evitar colisión

  // Desde useShiftsData
  processedAssignments: ProcessedAssignments;
  filteredAssignments: ProcessedAssignments;
  allUsersList: { id: string; name?: string; lastname?: string; roles?: number[] }[];
  usersMap: { [uid: string]: User }; // Añadido usersMap que faltaba
  shiftsLoading: boolean;
  userShiftsLoading: boolean;
  usersLoading: boolean;
  shiftsError: any;
  myShiftsCount: number;

  // Desde useShiftActions
  isUpdatingShift: { [key: string]: boolean };
  confirmDialogOpen: boolean;
  shiftToAction: { dateKey: string; shiftKey: "M" | "T" } | null;
  removeUserConfirmOpen: boolean;
  userToRemoveDetails: { uid: string; name: string; dateKey: string; shiftKey: "M" | "T" } | null;
  addUserDialogOpen: boolean;
  shiftForUserAssignment: { dateKey: string; shiftKey: "M" | "T" } | null;
  initiateShiftAction: (dateKey: string, shiftKey: "M" | "T") => Promise<void>;
  confirmShiftAction: () => Promise<void>;
  cancelShiftAction: () => void;
  handleRemoveUserClick: (assignment: ShiftAssignment, dateKey: string, shiftKey: "M" | "T") => void;
  confirmRemoveUser: () => Promise<void>;
  cancelRemoveUser: () => void;
  handleAddUserButtonClick: (dateKey: string, shiftKey: "M" | "T") => void;
  confirmAddUserToShift: (userId: string) => Promise<void>;
  cancelAddUser: () => void;

  // Desde useScheduleUI
  snackbarOpen: boolean;
  snackbarMessage: string;
  snackbarSeverity: "success" | "error" | "info" | "warning";
  showSnackbar: (message: string, severity?: "success" | "error" | "info" | "warning") => void;
  handleSnackbarClose: (event?: React.SyntheticEvent | Event, reason?: string) => void;
  selectedVolunteer: ShiftAssignment | null;
  contactDialogOpen: boolean;
  setContactDialogOpen: (open: boolean) => void;
  handleVolunteerClick: (volunteer: ShiftAssignment) => Promise<void>;
  activeTab: number;
  handleTabChange: (event: React.SyntheticEvent, newValue: number) => void;
  daysToDisplay: Date[];
  isLoadingMoreDays: boolean;
  shouldShowLoader: boolean;
  dateRange: Date[];
  endDate: Date;

  // Funciones y valores combinados o específicos de este hook
  isLoading: boolean; // Estado de carga combinado
  isContentLoading: boolean; // Alias para isLoading
  shiftsTimeKeys: ("M" | "T")[];
  getShiftDisplayName: (shiftKey: "M" | "T") => string;
  renderShiftAssignmentList: (dayKey: string, shiftKey: "M" | "T") => React.ReactNode;
}

export function useScheduleContent({
  startDate = new Date(),
  endDate: initialEndDate, // Renombrar para evitar confusión con la endDate calculada
}: UseScheduleContentOptions): UseScheduleContentResult {
  const [uiSnackbarOpen, setUiSnackbarOpen] = useState(false);
  const [uiSnackbarMessage, setUiSnackbarMessage] = useState("");
  const [uiSnackbarSeverity, setUiSnackbarSeverity] = useState<"success" | "error" | "info" | "warning">("info");

  const showSnackbar = React.useCallback((message: string, severity: "success" | "error" | "info" | "warning" = "info") => {
    setUiSnackbarMessage(message);
    setUiSnackbarSeverity(severity);
    setUiSnackbarOpen(true);
  }, []);
  
  // Hook de autenticación
  const { currentUser, authLoading, error: authError } = useAuthUserStatus({ showSnackbar });

  // Convertir fechas a formato ISO para RTK Query (solo una vez)
  const startDateISO = useMemo(() => startDate.toISOString(), [startDate]);
  const safeEndDate = useMemo(() =>
    initialEndDate && !isNaN(initialEndDate.getTime()) ? initialEndDate : new Date(new Date(startDate).setDate(startDate.getDate() + 6))
  , [startDate, initialEndDate]);
  const endDateISO = useMemo(() => safeEndDate.toISOString(), [safeEndDate]);

  // Hook para datos de turnos
  const {
    processedAssignments,
    filteredAssignments,
    usersMap,
    allUsersList,
    shiftsLoading,
    userShiftsLoading,
    usersLoading,
    shiftsError,
    myShiftsCount,
  } = useShiftsData({ startDateISO, endDateISO, currentUser });
  
  // Hook para acciones de turno
  const shiftActions = useShiftActions({
    currentUser,
    usersMap,
    processedAssignments,
    showSnackbar,
    authLoading,
  });

  // Hook para UI
  const scheduleUI = useScheduleUI({
    startDate,
    endDate: initialEndDate,
    currentUser,
    usersMap,
    processedAssignments,
    myShiftsCount,
    authLoading,
  });

  // Efecto para manejar errores de carga de turnos desde useShiftsData
  useEffect(() => {
    if (shiftsError) {
      console.error("Error cargando turnos (desde useScheduleContent):", shiftsError);
      scheduleUI.showSnackbar("Error al cargar los turnos.", "error");
    }
  }, [shiftsError, scheduleUI.showSnackbar]);


  // Helper Functions
  const getShiftDisplayName = (shiftKey: "M" | "T"): string => {
    return shiftKey === "M" ? "Mañana" : "Tarde";
  };

  // Estado loading combinado
  const isLoading = authLoading || shiftsLoading || userShiftsLoading || usersLoading;
  const isContentLoading = isLoading;

  const renderShiftAssignmentList = (dayKey: string, shiftKey: "M" | "T") => {
    const assignmentsToRender = processedAssignments[dayKey]?.[shiftKey] ?? [];
    const isAdmin = currentUser?.roles?.includes(UserRoles.ADMINISTRADOR);

    const AddUserButton = () => isAdmin ? (
      <Tooltip title="Añadir usuario a este turno" arrow>
        <Box
          onClick={() => shiftActions.handleAddUserButtonClick(dayKey, shiftKey)}
          sx={{
            borderRadius: "8px",
            padding: "4px 8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "grey.300",
            cursor: "pointer",
            transition: "all 0.2s ease",
            minHeight: '24px',
            minWidth: '24px',
            "&:hover": {
              backgroundColor: "grey.400",
              filter: "brightness(0.95)",
            },
          }}
        >
          <PersonAddIcon sx={{ color: "text.primary", fontSize: "1rem" }} />
        </Box>
      </Tooltip>
    ) : null;

    if (assignmentsToRender.length === 0) {
      return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Nadie asignado
            </Typography>
            {isAdmin && <AddUserButton />}
          </Box>
        </Box>
      );
    }

    const getRoleColor = (roles?: number[]) => {
      if (!roles) return "text.secondary";
      if (roles.includes(UserRoles.RESPONSABLE)) return "success.main";
      return "primary.light";
    };

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Box sx={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
          {assignmentsToRender.map((assignment) => {
            const isCurrentUser = currentUser?.uid === assignment.uid;
            const roleColor = getRoleColor(assignment.roles);
            const userDetails = usersMap[assignment.uid];

            let canContact = false;
            if (!isCurrentUser && currentUser) {
              if (currentUser.roles?.includes(UserRoles.RESPONSABLE) || currentUser.roles?.includes(UserRoles.ADMINISTRADOR)) {
                canContact = true;
              } else if (currentUser.roles?.includes(UserRoles.VOLUNTARIO) || !currentUser.roles) {
                const userInThisShift = (processedAssignments[dayKey]?.[shiftKey] ?? []).some(a => a.uid === currentUser.uid);
                const targetIsResponsible = (assignment.roles ?? []).includes(UserRoles.RESPONSABLE);
                canContact = userInThisShift && targetIsResponsible;
              }
            }
            
            const assignmentName = userDetails?.name || assignment.name || "Usuario";

            const Content = (
              <Box
                sx={{
                  borderRadius: "8px",
                  padding: "2px 6px",
                  display: "flex",
                  alignItems: "center",
                  width: "fit-content",
                  backgroundColor: roleColor,
                  cursor: canContact ? "pointer" : "default",
                  transition: "all 0.2s ease",
                  "&:hover": canContact ? { filter: "brightness(0.9)" } : undefined,
                }}
              >
                <Typography
                  variant="caption"
                  onClick={() => canContact && scheduleUI.handleVolunteerClick(assignment)}
                  sx={{
                    color: "white",
                    fontWeight: isCurrentUser ? 600 : 400,
                    fontSize: "0.7rem",
                    userSelect: "none",
                    cursor: canContact ? 'pointer' : 'default',
                    ...(isAdmin && userDetails?.isEnabled === false && {
                      textDecoration: 'line-through',
                      opacity: 0.7,
                    }),
                  }}
                >
                  {assignmentName}
                  {isCurrentUser && " (Tú)"}
                </Typography>
                {isAdmin && !isCurrentUser && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      shiftActions.handleRemoveUserClick(assignment, dayKey, shiftKey);
                    }}
                    sx={{
                      padding: "0px", marginLeft: "4px", color: "white", opacity: 0.8,
                      "&:hover": { opacity: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
                    }}
                    aria-label={`Eliminar a ${assignmentName} del turno`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                    </svg>
                  </IconButton>
                )}
              </Box>
            );

            return canContact && !isAdmin ? (
              <Tooltip key={assignment.uid} title={`Contactar con ${assignmentName}`} arrow>
                {Content}
              </Tooltip>
            ) : (
              <React.Fragment key={assignment.uid}>{Content}</React.Fragment>
            );
          })}
          {isAdmin && <AddUserButton />}
        </Box>
      </Box>
    );
  };


  return {
    // Auth
    currentUser,
    authLoading,
    authError,

    // Shifts Data
    processedAssignments,
    filteredAssignments,
    allUsersList,
    usersMap,
    shiftsLoading,
    userShiftsLoading,
    usersLoading,
    shiftsError,
    myShiftsCount,

    // Shift Actions
    ...shiftActions,

    // Schedule UI
    ...scheduleUI,
    endDate: scheduleUI.safeEndDate,

    isLoading,
    isContentLoading,
    shiftsTimeKeys: ["M", "T"],
    getShiftDisplayName,
    renderShiftAssignmentList,
  };
}