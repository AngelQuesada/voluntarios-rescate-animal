import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { api } from './baseApi';
import { UserRoles } from '@/lib/constants';
import { User } from '@/types/common';

// Definición de tipos
export interface ShiftAssignment {
  uid: string;
  name?: string;
  roles?: number[];
  phone?: string;
}

export interface ProcessedShift {
  [dateKey: string]: {
    M?: ShiftAssignment[];
    T?: ShiftAssignment[];
  };
}

export interface ShiftDocumentData {
  id: string;
  date: string;
  shift: 'M' | 'T';
  assignments: ShiftAssignment[];
  lastUpdated?: Timestamp;
}

// Interfaz para modificar un turno
export interface ModifyShiftParams {
  dateKey: string;
  shiftKey: 'M' | 'T';
  uid: string;
  name: string;
  roles?: number[];
  action: 'add' | 'remove';
  performedByUid?: string;
  isAdminAssignment?: boolean;
}

// Interfaz para las consultas de turnos con fechas serializables
export interface GetShiftsParams {
  startDate: string; // Fecha en formato ISO string
  endDate: string; // Fecha en formato ISO string
  users?: Record<string, User>; // Mapa de usuarios indexado por uid
}

export interface GetUserShiftsParams {
  userId: string;
  startDate: string; // Fecha en formato ISO string
  endDate: string; // Fecha en formato ISO string
  users?: Record<string, User>; // Mapa de usuarios indexado por uid
}

export const shiftsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Obtener todos los turnos en un rango de fechas
    getShifts: builder.query<ProcessedShift, GetShiftsParams>({
      queryFn: async ({ startDate, endDate, users = {} }) => {
        try {
          // Convertir strings ISO a objetos Date
          const startDateObj = new Date(startDate);
          const endDateObj = new Date(endDate);

          const shiftsCollection = collection(db, 'shifts');
          const shiftsSnapshot = await getDocs(shiftsCollection);

          // Objeto para almacenar los turnos procesados
          const processedData: ProcessedShift = {};

          // Procesar los datos de Firestore
          for (const shiftDoc of shiftsSnapshot.docs) {
            const data = shiftDoc.data();
            // Formato esperado del ID: YYYY-MM-DD_M o YYYY-MM-DD_T
            const [dateKey, shiftKey] = shiftDoc.id.split('_');

            // Verificar que la fecha está dentro del rango solicitado
            const docDate = new Date(dateKey);
            if (docDate >= startDateObj && docDate <= endDateObj) {
              if (!processedData[dateKey]) {
                processedData[dateKey] = {};
              }

              if (data.assignments && Array.isArray(data.assignments)) {
                // Procesar las asignaciones utilizando el mapa de usuarios
                const assignmentsWithUserData = data.assignments.map(
                  (assignment: { uid: string }) => {
                    const user = users[assignment.uid];

                    // Si el usuario existe en nuestro mapa cargado, usar esos datos
                    if (user) {
                      return {
                        uid: assignment.uid,
                        name: `${user.name} ${user.lastName}`,
                        roles: user.roles,
                        phone: user.phone,
                      };
                    }

                    // Si no tenemos el usuario, usar datos por defecto
                    return {
                      uid: assignment.uid,
                      name: 'Usuario',
                      roles: [UserRoles.VOLUNTARIO],
                    };
                  }
                );

                processedData[dateKey][shiftKey as 'M' | 'T'] = assignmentsWithUserData;
              }
            }
          }

          return { data: processedData };
        } catch (error) {
          console.error('Error fetching shifts:', error);
          return { error: { message: 'Error al cargar los turnos.' } };
        }
      },
      providesTags: ['Shifts'],
    }),

    // Obtener los turnos de un usuario específico
    getUserShifts: builder.query<ProcessedShift, GetUserShiftsParams>({
      queryFn: async ({ userId, startDate, endDate, users = {} }) => {
        try {
          const startDateObj = new Date(startDate);
          const endDateObj = new Date(endDate);

          // Nos aprovechamos del endpoint getShifts para obtener todos los turnos
          // y luego filtramos por usuario
          const shiftsCollection = collection(db, 'shifts');
          const shiftsSnapshot = await getDocs(shiftsCollection);

          const processedData: ProcessedShift = {};

          // Procesar y filtrar por usuario
          for (const shiftDoc of shiftsSnapshot.docs) {
            const data = shiftDoc.data();
            const [dateKey, shiftKey] = shiftDoc.id.split('_');

            // Verificar que la fecha está dentro del rango
            const docDate = new Date(dateKey);
            if (docDate >= startDateObj && docDate <= endDateObj) {
              // Filtrar asignaciones por el userId
              const userAssignments = (data.assignments || []).filter(
                (assignment: { uid: string }) => assignment.uid === userId
              );

              if (userAssignments.length > 0) {
                if (!processedData[dateKey]) {
                  processedData[dateKey] = {};
                }

                // Procesar las asignaciones utilizando el mapa de usuarios
                const assignmentsWithUserData = userAssignments.map(
                  (assignment: { uid: string }) => {
                    const user = users[assignment.uid];

                    // Si el usuario existe en nuestro mapa cargado, usar esos datos
                    if (user) {
                      return {
                        uid: assignment.uid,
                        name: `${user.name} ${user.lastName}`,
                        roles: user.roles,
                        phone: user.phone,
                      };
                    }

                    // Si no tenemos el usuario, usar datos por defecto
                    return {
                      uid: assignment.uid,
                      name: 'Usuario',
                      roles: [UserRoles.VOLUNTARIO],
                    };
                  }
                );

                processedData[dateKey][shiftKey as 'M' | 'T'] = assignmentsWithUserData;
              }
            }
          }

          return { data: processedData };
        } catch (error) {
          console.error('Error fetching user shifts:', error);
          return { error: { message: 'Error al cargar los turnos del usuario.' } };
        }
      },
      providesTags: (result, error, { userId }) => [{ type: 'Shifts', id: userId }],
    }),

    // Modificar un turno (añadir o quitar un voluntario)
    modifyShift: builder.mutation<{ success: boolean }, ModifyShiftParams>({
      queryFn: async ({ dateKey, shiftKey, uid, action, performedByUid, isAdminAssignment }) => {
        try {
          const response = await fetch('/api/shifts/assign', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              dateKey,
              shiftKey,
              uid,
              action,
              performedByUid,
              isAdminAssignment,
            }),
          });

          if (!response.ok) {
            const errorResult = await response.json().catch(() => ({}));
            throw new Error(errorResult.message || 'Error al modificar el turno.');
          }

          const data = await response.json();
          return { data };
        } catch (error: any) {
          console.error('Error modifying shift:', error);
          return { error: { message: error.message || 'Error al modificar el turno.' } };
        }
      },
      // Invalidar la caché para que se actualice la UI
      invalidatesTags: (result, error, { uid }) => ['Shifts', { type: 'Shifts', id: uid }],
    }),
  }),
});

// Export hooks para usar en componentes funcionales
export const { useGetShiftsQuery, useGetUserShiftsQuery, useModifyShiftMutation } = shiftsApi;
