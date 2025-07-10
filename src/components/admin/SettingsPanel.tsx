'use client';

import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';

const SettingsPanel = () => {
  const [day, setDay] = useState('friday');
  const [time, setTime] = useState('19:00');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const docRef = doc(db, 'settings', 'notifications');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setDay(data.day || 'friday');
        setTime(data.time || '19:00');
      }
      setLoading(false);
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    const docRef = doc(db, 'settings', 'notifications');
    await setDoc(docRef, { day, time });
    setLoading(false);
  };

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Box>
      <Typography variant="h6">Ajustes de Notificaciones</Typography>
      <FormControl fullWidth margin="normal">
        <InputLabel>Día de la semana</InputLabel>
        <Select value={day} onChange={(e) => setDay(e.target.value)}>
          <MenuItem value="monday">Lunes</MenuItem>
          <MenuItem value="tuesday">Martes</MenuItem>
          <MenuItem value="wednesday">Miércoles</MenuItem>
          <MenuItem value="thursday">Jueves</MenuItem>
          <MenuItem value="friday">Viernes</MenuItem>
          <MenuItem value="saturday">Sábado</MenuItem>
          <MenuItem value="sunday">Domingo</MenuItem>
        </Select>
      </FormControl>
      <TextField
        label="Hora (HH:MM)"
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        fullWidth
        margin="normal"
      />
      <Button variant="contained" onClick={handleSave} disabled={loading}>
        Guardar
      </Button>
    </Box>
  );
};

export default SettingsPanel;