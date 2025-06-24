import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { api } from './baseApi';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { UserRoles } from '@/lib/constants';
import { User } from '@/types/common';

// Definición de tipos
export interface ShiftAssignment {
  uid: string;
  name?: string; // Opcional, no se guardará en la BD
  roles?: number[]; // Opcional, no se guardará en la BD
  phone?: string; // Opcional, no se guardará en la BD
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
  name: string; // Usado solo para la UI, no se guardará en la BD
  roles?: number[]; // Usado solo para la UI, no se guardará en la BD
  action: 'add' | 'remove';
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
                  (assignment: ShiftAssignment) => {
                    const user = users[assignment.uid];

                    // Si el usuario existe en nuestro mapa cargado, usar esos datos
                    if (user) {
                      return {
                        uid: assignment.uid,
                        name: assignment.name || `${user.name} ${user.lastname}`,
                        roles: user.roles,
                        phone: user.phone,
                      };
                    }

                    // Si no tenemos el usuario, usar los datos que ya tiene la asignación
                    return {
                      uid: assignment.uid,
                      name: assignment.name || 'Usuario',
                      roles: assignment.roles || [UserRoles.VOLUNTARIO],
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
          // Convertir strings ISO a objetos Date
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
                (assignment: ShiftAssignment) => assignment.uid === userId
              );

              if (userAssignments.length > 0) {
                if (!processedData[dateKey]) {
                  processedData[dateKey] = {};
                }

                // Procesar las asignaciones utilizando el mapa de usuarios
                const assignmentsWithUserData = userAssignments.map(
                  (assignment: ShiftAssignment) => {
                    const user = users[assignment.uid];

                    // Si el usuario existe en nuestro mapa cargado, usar esos datos
                    if (user) {
                      return {
                        uid: assignment.uid,
                        name: assignment.name || `${user.name} ${user.lastname}`,
                        roles: user.roles,
                        phone: user.phone,
                      };
                    }

                    // Si no tenemos el usuario, usar los datos que ya tiene la asignación
                    return {
                      uid: assignment.uid,
                      name: assignment.name || 'Usuario',
                      roles: assignment.roles || [UserRoles.VOLUNTARIO],
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
      queryFn: async ({ dateKey, shiftKey, uid, action }) => {
        try {
          const shiftId = `${dateKey}_${shiftKey}`;
          const shiftRef = doc(db, 'shifts', shiftId);
          const shiftDoc = await getDoc(shiftRef);

          // Solo guardamos el uid en la BD
          const userAssignment = { uid };

          if (action === 'remove' && shiftDoc.exists()) {
            // Remover el usuario del turno
            await updateDoc(shiftRef, {
              assignments: arrayRemove(
                // Necesitamos encontrar el objeto exacto para removerlo
                ...shiftDoc.data().assignments.filter((a: ShiftAssignment) => a.uid === uid)
              ),
              lastUpdated: Timestamp.now(),
            });
          } else if (action === 'add') {
            // Añadir el usuario al turno
            await setDoc(
              shiftRef,
              {
                assignments: shiftDoc.exists() ? arrayUnion(userAssignment) : [userAssignment],
                date: dateKey,
                shift: shiftKey,
                day: format(parseISO(dateKey), 'EEEE', { locale: es }),
                lastUpdated: Timestamp.now(),
              },
              { merge: true }
            );
          }

          // Devolver un objeto con una propiedad específica en lugar de undefined
          return { data: { success: true } };
        } catch (error) {
          console.error('Error modifying shift:', error);
          return { error: { message: 'Error al modificar el turno.' } };
        }
      },
      // Invalidar la caché para que se actualice la UI
      invalidatesTags: (result, error, { uid }) => ['Shifts', { type: 'Shifts', id: uid }],
    }),
  }),
});

// Export hooks para usar en componentes funcionales
export const { useGetShiftsQuery, useGetUserShiftsQuery, useModifyShiftMutation } = shiftsApi;
