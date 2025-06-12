import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, eachDayOfInterval, addDays, startOfDay } from 'date-fns';
import { UserRoles } from '@/lib/constants';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ShiftAssignment } from '@/store/api/shiftsApi';
import { CurrentUser, User } from '@/types/common';
import { ProcessedAssignments } from './useShiftsData';

interface ScheduleUI {
  snackbarOpen: boolean;
  snackbarMessage: React.ReactNode; // Modificado
  snackbarSeverity: 'success' | 'error' | 'info' | 'warning';
  showSnackbar: (
    message: React.ReactNode,
    severity?: 'success' | 'error' | 'info' | 'warning'
  ) => void; // Modificado
  handleSnackbarClose: (event?: React.SyntheticEvent | Event, reason?: string) => void;
  selectedVolunteer: ShiftAssignment | null;
  contactDialogOpen: boolean;
  setContactDialogOpen: (open: boolean) => void;
  handleVolunteerClick: (volunteer: ShiftAssignment) => Promise<void>;
  activeTab: number;
  handleTabChange: (event: React.SyntheticEvent, newValue: number) => void;
  initialTabLogicApplied: boolean;
  setInitialTabLogicApplied: React.Dispatch<React.SetStateAction<boolean>>;
  setVisibleDaysCount: React.Dispatch<React.SetStateAction<number>>;
  visibleDaysCount: number;
  isLoadingMoreDays: boolean;
  allDaysToDisplay: Date[];
  daysToDisplay: Date[];
  shouldLoadMoreDays: () => boolean;
  shouldShowLoader: boolean;
  dateRange: Date[];
  safeEndDate: Date;
}

interface UseScheduleUIProps {
  startDate: Date;
  endDate?: Date;
  currentUser: CurrentUser | null;
  usersMap: { [uid: string]: User };
  processedAssignments: ProcessedAssignments;
  myShiftsCount: number;
  authLoading: boolean;
}

export function useScheduleUI({
  startDate,
  endDate,
  currentUser,
  usersMap,
  processedAssignments,
  myShiftsCount,
  authLoading,
}: UseScheduleUIProps): ScheduleUI {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<React.ReactNode>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    'success' | 'error' | 'info' | 'warning'
  >('info');
  const [selectedVolunteer, setSelectedVolunteer] = useState<ShiftAssignment | null>(null);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [initialTabLogicApplied, setInitialTabLogicApplied] = useState(false);

  const [visibleDaysCount, setVisibleDaysCount] = useState(7);
  const [isLoadingMoreDays, setIsLoadingMoreDays] = useState(false);

  const safeEndDate = useMemo(
    () => (endDate && !isNaN(endDate.getTime()) ? endDate : addDays(startDate, 6)),
    [startDate, endDate]
  );

  const dateRange = useMemo(
    () => eachDayOfInterval({ start: startDate, end: safeEndDate }),
    [startDate, safeEndDate]
  );

  const allDaysToDisplay = useMemo(() => {
    const start = startOfDay(startDate);
    const end = startOfDay(safeEndDate);
    return eachDayOfInterval({ start, end });
  }, [startDate, safeEndDate]);

  const daysToDisplay = useMemo(() => {
    return allDaysToDisplay.slice(0, visibleDaysCount);
  }, [allDaysToDisplay, visibleDaysCount]);

  const showSnackbar = (
    message: React.ReactNode,
    severity: 'success' | 'error' | 'info' | 'warning' = 'info'
  ) => {
    // Modificado
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const handleVolunteerClick = async (volunteer: ShiftAssignment) => {
    if (!currentUser) return;

    if (volunteer.phone) {
      setSelectedVolunteer(volunteer);
      setContactDialogOpen(true);
      return;
    }

    const canAdminOrResponsableContact =
      currentUser.roles?.includes(UserRoles.RESPONSABLE) ||
      currentUser.roles?.includes(UserRoles.ADMINISTRADOR);

    if (canAdminOrResponsableContact && volunteer.uid !== currentUser.uid) {
      const userFromCache = usersMap[volunteer.uid];
      if (userFromCache?.phone) {
        setSelectedVolunteer({ ...volunteer, phone: userFromCache.phone });
        setContactDialogOpen(true);
        return;
      }
      try {
        const volunteerDoc = await getDoc(doc(db, 'users', volunteer.uid));
        if (volunteerDoc.exists()) {
          const volunteerData = volunteerDoc.data();
          setSelectedVolunteer({ ...volunteer, phone: volunteerData.phone || '' });
          setContactDialogOpen(true);
        } else {
          showSnackbar('No se encontró información de contacto.', 'warning');
        }
      } catch (error) {
        console.error('Error al obtener datos del voluntario:', error);
        showSnackbar('Error al obtener datos de contacto.', 'error');
      }
      return;
    }

    const isVoluntario = currentUser.roles?.includes(UserRoles.VOLUNTARIO) || !currentUser.roles;
    if (isVoluntario) {
      const targetIsResponsibleInAnyOfUserShifts = Object.values(processedAssignments).some(
        (dayShifts) =>
          Object.values(dayShifts).some(
            (shiftAssignments) =>
              shiftAssignments &&
              shiftAssignments.some((a) => a.uid === currentUser.uid) &&
              shiftAssignments.some(
                (a) => a.uid === volunteer.uid && a.roles?.includes(UserRoles.RESPONSABLE)
              )
          )
      );

      if (targetIsResponsibleInAnyOfUserShifts) {
        const userFromCache = usersMap[volunteer.uid];
        if (userFromCache?.phone) {
          setSelectedVolunteer({ ...volunteer, phone: userFromCache.phone });
          setContactDialogOpen(true);
          return;
        }
        try {
          const responsableDoc = await getDoc(doc(db, 'users', volunteer.uid));
          if (responsableDoc.exists()) {
            const responsableData = responsableDoc.data();
            setSelectedVolunteer({ ...volunteer, phone: responsableData.phone || '' });
            setContactDialogOpen(true);
          } else {
            showSnackbar(
              'No se pudo obtener la información de contacto del responsable.',
              'warning'
            );
          }
        } catch (error) {
          console.error('Error al obtener datos del responsable:', error);
          showSnackbar('Error al obtener datos de contacto del responsable.', 'error');
        }
      } else {
        showSnackbar('Solo puedes contactar con el responsable de tu turno.', 'warning');
      }
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const shouldLoadMoreDays = useCallback(() => {
    if (visibleDaysCount >= allDaysToDisplay.length) return false;
    if (activeTab === 0) return true;
    if (activeTab === 1 && currentUser) {
      for (let i = visibleDaysCount; i < allDaysToDisplay.length; i++) {
        const date = allDaysToDisplay[i];
        const dateKey = format(date, 'yyyy-MM-dd');
        const dayAssignments = processedAssignments[dateKey];
        if (dayAssignments) {
          const hasMorningShift = dayAssignments.M?.some((a) => a.uid === currentUser.uid) ?? false;
          const hasAfternoonShift =
            dayAssignments.T?.some((a) => a.uid === currentUser.uid) ?? false;
          if (hasMorningShift || hasAfternoonShift) return true;
        }
      }
      return false;
    }
    return false;
  }, [visibleDaysCount, allDaysToDisplay, activeTab, currentUser, processedAssignments]);

  useEffect(() => {
    const handleScroll = () => {
      if (isLoadingMoreDays || !shouldLoadMoreDays()) return;

      const scrollPosition = window.innerHeight + window.scrollY;
      const bodyHeight = document.body.offsetHeight;
      const isPWA = document.documentElement.classList.contains('pwa-mode');
      const scrollThreshold = bodyHeight - (isPWA ? 300 : 200);

      if (scrollPosition >= scrollThreshold) {
        setIsLoadingMoreDays(true);
        setTimeout(() => {
          setVisibleDaysCount((prev) => Math.min(prev + 7, allDaysToDisplay.length));
          setIsLoadingMoreDays(false);
        }, 500);
      }
    };

    window.addEventListener('scroll', handleScroll);

    const pwaScrollContainers = document.querySelectorAll('.pwa-mode');
    pwaScrollContainers.forEach((container) => {
      container.addEventListener('scroll', handleScroll);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      pwaScrollContainers.forEach((container) => {
        container.removeEventListener('scroll', handleScroll);
      });
    };
  }, [isLoadingMoreDays, allDaysToDisplay.length, visibleDaysCount, shouldLoadMoreDays]);

  const shouldShowLoader = useMemo(() => {
    return (
      isLoadingMoreDays || (shouldLoadMoreDays() && visibleDaysCount < allDaysToDisplay.length)
    );
  }, [isLoadingMoreDays, shouldLoadMoreDays, visibleDaysCount, allDaysToDisplay.length]);

  useEffect(() => {
    if (!authLoading && currentUser && !initialTabLogicApplied) {
      const hasInitiallyAssignedShifts = myShiftsCount > 0;
      setActiveTab(hasInitiallyAssignedShifts ? 1 : 0);
      setInitialTabLogicApplied(true);
    }
  }, [authLoading, currentUser, myShiftsCount, initialTabLogicApplied, setInitialTabLogicApplied]);

  return {
    snackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    showSnackbar,
    handleSnackbarClose,
    selectedVolunteer,
    contactDialogOpen,
    setContactDialogOpen,
    setVisibleDaysCount,
    handleVolunteerClick,
    activeTab,
    handleTabChange,
    initialTabLogicApplied,
    setInitialTabLogicApplied,
    visibleDaysCount,
    isLoadingMoreDays,
    allDaysToDisplay,
    daysToDisplay,
    shouldLoadMoreDays,
    shouldShowLoader,
    dateRange,
    safeEndDate,
  };
}
