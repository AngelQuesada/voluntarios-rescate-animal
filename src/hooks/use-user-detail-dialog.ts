import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { ShiftAssignment } from '@/store/api/shiftsApi';

interface ShiftData {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  area: string;
  assignments: ShiftAssignment[];
}

export interface UserData {
  uid: string;
  name?: string;
  lastName?: string;
  userName?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  job?: string;
  location?: string;
  roles?: number[];
  [key: string]: string | number[] | undefined;
}

interface UseUserDetailDialogProps {
  open: boolean;
  userId?: string;
  user?: UserData;
  shiftsPerPage?: number;
}

export function useUserDetailDialog({
  open,
  userId,
  user: userProp,
  shiftsPerPage = 15,
}: UseUserDetailDialogProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [allShifts, setAllShifts] = useState<ShiftData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  // Estados para la paginación
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [pastPage, setPastPage] = useState(1);

  // Estados para los turnos paginados que se mostrarán
  const [paginatedUpcomingShifts, setPaginatedUpcomingShifts] = useState<ShiftData[]>([]);
  const [paginatedPastShifts, setPaginatedPastShifts] = useState<ShiftData[]>([]);

  // Información sobre los turnos totales
  const [upcomingShiftsCount, setUpcomingShiftsCount] = useState(0);
  const [pastShiftsCount, setPastShiftsCount] = useState(0);
  const [totalUpcomingPages, setTotalUpcomingPages] = useState(0);
  const [totalPastPages, setTotalPastPages] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Función para cargar la página de turnos solicitada
  const loadShiftsPage = useCallback(
    (type: 'upcoming' | 'past', page: number) => {
      const startIndex = (page - 1) * shiftsPerPage;
      const endIndex = startIndex + shiftsPerPage;

      // Obtener los turnos filtrados por fecha actual
      const now = new Date();
      const filteredShifts = allShifts.filter((shift) => {
        const shiftDate = new Date(shift.date);
        return type === 'upcoming' ? shiftDate >= now : shiftDate < now;
      });

      // Obtener solo los turnos para la página solicitada
      const pageShifts = filteredShifts.slice(startIndex, endIndex);

      // Actualizar el estado según el tipo de turnos
      if (type === 'upcoming') {
        setPaginatedUpcomingShifts(pageShifts);
      } else {
        setPaginatedPastShifts(pageShifts);
      }
    },
    [allShifts, shiftsPerPage]
  );

  // Manejadores para la paginación
  const handleUpcomingPageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setUpcomingPage(value);
    loadShiftsPage('upcoming', value);
  };

  const handlePastPageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPastPage(value);
    loadShiftsPage('past', value);
  };

  // Efecto para cargar los datos del usuario si se proporciona un userId
  useEffect(() => {
    const fetchUserData = async () => {
      // Obtener el ID del usuario independientemente de la forma en que se proporcionó
      let uid: string | null = null;

      if (userProp && typeof userProp === 'object' && userProp.uid) {
        uid = userProp.uid;
        // Establecer datos provisionales mientras se carga la información completa
        setUserData(userProp);
      } else if (typeof userProp === 'string') {
        uid = userProp;
      } else if (typeof userId === 'string') {
        uid = userId;
      }

      if (!uid) {
        console.error('No se proporcionó un ID de usuario válido');
        return;
      }

      setUserLoading(true);

      try {
        const userDocRef = doc(db, 'users', uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserData({
            uid,
            ...data,
          });
        } else {
          console.error('No se encontró el documento del usuario');
          if (userProp && typeof userProp === 'object') {
            setUserData({
              ...userProp,
            });
          }
        }
      } catch (error) {
        console.error('Error al obtener datos del usuario:', error);
        // Si ocurre un error pero tenemos datos parciales, mantenerlos
        if (userProp && typeof userProp === 'object') {
          setUserData({
            ...userProp,
          });
        }
      } finally {
        setUserLoading(false);
      }
    };

    if (open) {
      fetchUserData();
      // Reiniciar las páginas cuando se abre el diálogo
      setUpcomingPage(1);
      setPastPage(1);
    }
  }, [open, userId, userProp]);

  // Efecto para cargar los turnos del usuario
  useEffect(() => {
    const fetchUserShifts = async () => {
      if (!userData?.uid) return;

      setLoading(true);
      try {
        const shiftsRef = collection(db, 'shifts');
        const shiftsSnapshot = await getDocs(shiftsRef);

        // Procesar los resultados para encontrar los turnos donde está asignado el usuario
        const shiftsData: ShiftData[] = [];

        for (const shiftDoc of shiftsSnapshot.docs) {
          const data = shiftDoc.data();
          // Si el documento tiene asignaciones, buscar al usuario actual
          if (data.assignments && Array.isArray(data.assignments)) {
            const userAssigned = data.assignments.some(
              (assignment) => assignment.uid === userData.uid
            );
            // Si el usuario está asignado a este turno, agregar a la lista
            if (userAssigned) {
              // El ID del documento tiene el formato "YYYY-MM-DD_M" o "YYYY-MM-DD_T"
              const [dateStr, shiftType] = shiftDoc.id.split('_');

              shiftsData.push({
                id: shiftDoc.id,
                date: dateStr,
                startTime: shiftType === 'M' ? '09:00' : '16:00',
                endTime: shiftType === 'M' ? '13:00' : '20:00',
                area: shiftType === 'M' ? 'Mañana' : 'Tarde',
                assignments: data.assignments,
              });
            }
          }
        }

        // Ordenar los turnos por fecha (más recientes primero)
        shiftsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Guardar todos los turnos
        setAllShifts(shiftsData);

        // Separar turnos pendientes (futuros) y pasados
        const now = new Date();
        const upcoming = shiftsData.filter((shift) => new Date(shift.date) >= now);
        const past = shiftsData.filter((shift) => new Date(shift.date) < now);

        // Guardar la cuenta total de turnos
        setUpcomingShiftsCount(upcoming.length);
        setPastShiftsCount(past.length);

        // Calcular el número total de páginas
        setTotalUpcomingPages(Math.ceil(upcoming.length / shiftsPerPage));
        setTotalPastPages(Math.ceil(past.length / shiftsPerPage));

        // Solo cargar los primeros turnos de la primera página
        setPaginatedUpcomingShifts(upcoming.slice(0, shiftsPerPage));
        setPaginatedPastShifts(past.slice(0, shiftsPerPage));
      } catch (error) {
        console.error('Error fetching user shifts:', error);
      } finally {
        setLoading(false);
      }
    };

    if (open && userData) {
      fetchUserShifts();
    }
  }, [open, userData, shiftsPerPage]);

  // Cargar la página correspondiente cuando cambia la pestaña activa
  useEffect(() => {
    if (tabValue === 0 && allShifts.length > 0) {
      loadShiftsPage('upcoming', upcomingPage);
    } else if (tabValue === 1 && allShifts.length > 0) {
      loadShiftsPage('past', pastPage);
    }
  }, [tabValue, allShifts, loadShiftsPage, upcomingPage, pastPage]);

  return {
    userData,
    loading,
    userLoading,
    tabValue,
    handleTabChange,
    // Datos de turnos
    allShifts,
    upcomingShiftsCount,
    pastShiftsCount,
    // Datos para paginación
    paginatedUpcomingShifts,
    paginatedPastShifts,
    upcomingPage,
    pastPage,
    totalUpcomingPages,
    totalPastPages,
    // Manejadores de paginación
    handleUpcomingPageChange,
    handlePastPageChange,
  };
}
