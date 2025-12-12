'use client';

import React, { useState, useEffect, useCallback, FC } from 'react';
import { Box, Typography, Paper, CircularProgress, Tooltip } from '@mui/material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import UserDetailDialog from '../admin/UserDetailDialog';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserRoles } from '@/lib/constants';
import { useAuth } from '@/context/AuthContext';
import { useGetUsersQuery } from '@/store/api/usersApi';
import type { User } from '@/types/common';

// Tipo que extiende User con la propiedad shift para voluntarios asignados
type VolunteerWithShift = User & {
  shift: 'M' | 'T';
};

interface VolunteersListProps {
  selectedDate: Date;
}

const VolunteersList: FC<VolunteersListProps> = ({ selectedDate }) => {
  const [volunteers, setVolunteers] = useState<VolunteerWithShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVolunteer, setSelectedVolunteer] = useState<VolunteerWithShift | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const { user } = useAuth();

  // Obtener usuarios desde Redux
  const { data: usersMap, isLoading: usersLoading, error: usersError } = useGetUsersQuery();

  const getUserData = useCallback(
    (uid: string): User | undefined => {
      return usersMap ? usersMap[uid] : undefined;
    },
    [usersMap]
  );

  useEffect(() => {
    const fetchVolunteers = async () => {
      setLoading(true);
      try {
        // Convertir fecha al formato usado en tu base de datos
        const dateString = format(selectedDate, 'yyyy-MM-dd');

        // Consultar la colección de shifts para la fecha seleccionada
        const shiftsRef = collection(db, 'shifts');
        const q = query(shiftsRef, where('date', '==', dateString));

        const shiftsSnapshot = await getDocs(q);
        const volunteersData: VolunteerWithShift[] = [];

        // Procesar los datos de los turnos
        for (const docSnapshot of shiftsSnapshot.docs) {
          const shiftData = docSnapshot.data();

          // Determinar el tipo de turno (M o T)
          const shift = shiftData.shift || (docSnapshot.id.endsWith('_M') ? 'M' : 'T');

          // Función para procesar voluntarios por turno
          const processVolunteers = (
            volunteersArray: VolunteerWithShift[],
            shiftType: 'M' | 'T'
          ) => {
            if (!Array.isArray(volunteersArray)) return;

            for (const volunteerData of volunteersArray) {
              if (!volunteerData.uid) continue;

              // Obtener datos completos del usuario desde Redux
              const userData = getUserData(volunteerData.uid);

              // Si encontramos el usuario en Redux, usamos esos datos
              if (userData) {
                volunteersData.push({
                  id: volunteerData.uid,
                  uid: volunteerData.uid,
                  name: userData.name,
                  lastName: userData.lastName,
                  email: userData.email || volunteerData.email || '',
                  phone: userData.phone || volunteerData.phone || '',
                  roles: userData.roles || volunteerData.roles || [],
                  userName: userData.userName || volunteerData.userName || '',
                  birthDate: userData.birthDate || volunteerData.birthDate || '',
                  createdAt: userData.createdAt || volunteerData.createdAt || '',
                  updatedAt: userData.updatedAt || volunteerData.updatedAt || '',
                  shift: shiftType,
                });
              } else {
                // Si no está en Redux, usamos los datos parciales que tenemos
                volunteersData.push({
                  id: volunteerData.uid,
                  uid: volunteerData.uid,
                  name: volunteerData.name,
                  lastName: volunteerData.lastName || '',
                  email: volunteerData.email || '',
                  phone: volunteerData.phone || '',
                  roles: volunteerData.roles || [],
                  userName: volunteerData.userName || '',
                  birthDate: volunteerData.birthDate || '',
                  createdAt: volunteerData.createdAt || '',
                  updatedAt: volunteerData.updatedAt || '',
                  shift: shiftType,
                });
              }
            }
          };

          // Procesar asignaciones generales (si existen)
          if (shiftData.assignments && Array.isArray(shiftData.assignments)) {
            processVolunteers(shiftData.assignments, shift);
          }

          // Procesar turno de mañana
          if (shiftData.M && Array.isArray(shiftData.M)) {
            processVolunteers(shiftData.M, 'M');
          }

          // Procesar turno de tarde
          if (shiftData.T && Array.isArray(shiftData.T)) {
            processVolunteers(shiftData.T, 'T');
          }
        }

        // Filtrar posibles duplicados por ID y turno
        const uniqueVolunteers = Array.from(
          new Map(volunteersData.map((v) => [v.id + v.shift, v])).values()
        );

        setVolunteers(uniqueVolunteers);
      } catch (error) {
        console.error('Error al obtener voluntarios:', error);
      } finally {
        setLoading(false);
      }
    };

    // Solo cargamos los voluntarios si tenemos la fecha y los usuarios están cargados
    if (selectedDate && (!usersLoading || usersMap)) {
      fetchVolunteers();
    }
  }, [selectedDate, usersMap, usersLoading, getUserData]);

  const handleVolunteerClick = (volunteer: VolunteerWithShift) => {
    setSelectedVolunteer(volunteer);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedVolunteer(null);
  };

  const getRoleColor = (roles?: number[]) => {
    if (!roles) return 'text.secondary';
    if (roles.includes(UserRoles.RESPONSABLE)) return 'success.main';
    return 'primary.light';
  };

  // Mostrar loading si estamos cargando usuarios o voluntarios
  if (usersLoading || loading) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Mostrar error si hay un problema con la carga de usuarios
  if (usersError) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">Error al cargar los datos de usuarios</Typography>
      </Box>
    );
  }

  // Filtrar por turno de mañana y tarde
  const morningVolunteers = volunteers.filter((v) => v.shift === 'M');
  const afternoonVolunteers = volunteers.filter((v) => v.shift === 'T');

  const renderVolunteerChips = (volunteersList: VolunteerWithShift[]) => {
    if (volunteersList.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          Nadie asignado
        </Typography>
      );
    }

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 1,
          alignItems: 'center',
        }}
      >
        {volunteersList.map((volunteer) => {
          const isCurrentUser = user?.uid === volunteer.uid;
          const roleColor = getRoleColor(volunteer.roles);

          const Content = (
            <Box
              sx={{
                borderRadius: '8px',
                padding: '2px 6px',
                display: 'flex',
                alignItems: 'center',
                width: 'fit-content',
                backgroundColor: roleColor,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': { filter: 'brightness(0.9)' },
              }}
            >
              <Typography
                variant="caption"
                onClick={() => handleVolunteerClick(volunteer)}
                sx={{
                  color: 'white',
                  fontWeight: isCurrentUser ? 600 : 400,
                  fontSize: '0.7rem',
                  userSelect: 'none',
                  cursor: 'pointer',
                }}
              >
                {`${volunteer.name} ${volunteer.lastName}`.trim()}
                {isCurrentUser && ' (Tú)'}
              </Typography>
            </Box>
          );

          return (
            <Tooltip key={volunteer.id} title="Ver perfil" arrow>
              {Content}
            </Tooltip>
          );
        })}
      </Box>
    );
  };

  return (
    <Box>
      <Typography variant="h6" component="h3" gutterBottom>
        Voluntarios del {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: es })}
      </Typography>

      {volunteers.length === 0 ? (
        <Typography variant="body1">No se encontraron voluntarios para esta fecha.</Typography>
      ) : (
        <>
          {/* Voluntarios del turno de mañana */}
          <Paper elevation={2} sx={{ mb: 2, p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
              Turno de Mañana
            </Typography>
            {renderVolunteerChips(morningVolunteers)}
          </Paper>

          {/* Voluntarios del turno de tarde */}
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
              Turno de Tarde
            </Typography>
            {renderVolunteerChips(afternoonVolunteers)}
          </Paper>
        </>
      )}

      {/* Diálogo de detalles del usuario */}
      {selectedVolunteer && (
        <UserDetailDialog
          open={openDialog}
          onClose={handleCloseDialog}
          user={{
            id: selectedVolunteer.id,
            uid: selectedVolunteer.uid,
            name: selectedVolunteer.name,
            lastName: selectedVolunteer.lastName,
            email: selectedVolunteer.email,
            phone: selectedVolunteer.phone,
            roles: selectedVolunteer.roles,
            userName: selectedVolunteer.userName,
            birthDate: selectedVolunteer.birthDate,
            createdAt: selectedVolunteer.createdAt,
            updatedAt: selectedVolunteer.updatedAt,
          }}
        />
      )}
    </Box>
  );
};

export default VolunteersList;
