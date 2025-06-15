'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { es } from 'date-fns/locale';
import { isAfter, startOfDay, isSameDay, isBefore, parseISO } from 'date-fns';
import VolunteersList from './VolunteersList';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const HistoryCalendar = () => {
  // Memoizamos 'today' para que no se cree un nuevo objeto en cada render.
  const today = useMemo(() => startOfDay(new Date()), []);

  // Inicializar con ninguna fecha seleccionada (null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [firstShiftDate, setFirstShiftDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFirstShiftDate = async () => {
      // No es necesario setLoading(true) aquí si ya está inicializado a true.
      try {
        const shiftsRef = collection(db, 'shifts');
        // Consultar ordenando por fecha ascendente y limitando a 1 resultado
        const q = query(shiftsRef, orderBy('date', 'asc'), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const firstShift = querySnapshot.docs[0].data();
          if (firstShift.date) {
            const dateObj = parseISO(firstShift.date);
            setFirstShiftDate(startOfDay(dateObj));
          }
        } else {
          // Si no hay turnos, usar la fecha actual como límite
          setFirstShiftDate(today);
        }
      } catch (error) {
        console.error('Error al obtener la primera fecha de turno:', error);
        // En caso de error, establecer la fecha actual como límite
        setFirstShiftDate(today);
      } finally {
        setLoading(false);
      }
    };

    fetchFirstShiftDate();
    // El array vacío asegura que este efecto se ejecute solo una vez, al montar el componente.
  }, [today]); // Se mantiene 'today' como dependencia porque se usa dentro, pero ahora está memoizado.

  const handleDateChange = (date: Date | null) => {
    // Solo permitir fechas desde el primer turno hasta ayer
    if (date && !isAfter(startOfDay(date), today) && !isSameDay(date, today)) {
      if (firstShiftDate && !isBefore(startOfDay(date), firstShiftDate)) {
        setSelectedDate(date);
      }
    }
  };

  const shouldDisableDate = (date: Date) => {
    // Deshabilitar fechas futuras, el día actual y fechas anteriores al primer turno
    return (
      isAfter(startOfDay(date), today) ||
      isSameDay(startOfDay(date), today) ||
      (firstShiftDate ? isBefore(startOfDay(date), firstShiftDate) : false)
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
          <Box
            sx={{
              flex: 1,
              '& .MuiDateCalendar-root': {
                width: '100%',
              },
            }}
          >
            <Typography variant="h6" component="h2" gutterBottom>
              Selecciona una fecha para ver el historial de voluntarios
            </Typography>
            <DateCalendar
              value={selectedDate}
              onChange={handleDateChange}
              disableHighlightToday
              shouldDisableDate={shouldDisableDate}
              minDate={firstShiftDate || undefined}
              views={['day']}
              openTo="day"
              sx={{
                '& .MuiPickersDay-dayWithMargin': {
                  '&.Mui-disabled': {
                    opacity: 0.5,
                    color: 'text.secondary',
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                },
              }}
            />
          </Box>

          {selectedDate && (
            <Box sx={{ flex: 1 }}>
              <VolunteersList selectedDate={selectedDate} />
            </Box>
          )}
        </Box>
      </Paper>
    </LocalizationProvider>
  );
};

export default HistoryCalendar;
