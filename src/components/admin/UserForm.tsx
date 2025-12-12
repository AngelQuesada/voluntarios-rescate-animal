import React, {
  useCallback,
  forwardRef,
  useImperativeHandle,
  useState,
  useMemo,
  SyntheticEvent,
} from 'react';
import {
  TextField,
  Box,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  SelectChangeEvent,
  Checkbox,
  ListItemText,
  Typography,
  useTheme,
  Autocomplete,
  Divider,
  Theme,
} from '@mui/material';
import { UserRoles, getRoleName } from '@/lib/constants';
import { UserInfoForForm } from '@/types/common';
import { GRANADA_LOCATIONS } from '@/lib/granada-locations';

// Tipo extendido para el formulario con propiedades adicionales
interface ExtendedUserFormData extends UserInfoForForm {
  passwordConfirm?: string;
  isEnabled?: boolean;
}

interface UserFormProps {
  userData: ExtendedUserFormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setUserData: React.Dispatch<React.SetStateAction<ExtendedUserFormData>>;
  isAddMode: boolean;
  handleEnabledSwitchChange: (checked: boolean) => void;
  onRoleChange: (roles: number[]) => void;
  submitAttempted: boolean;
}

// Interfaz para los métodos expuestos por el formulario
interface UserFormRef {
  getCurrentData: () => ExtendedUserFormData;
  resetForm: () => void;
}

// Función helper para asegurar que Voluntario siempre esté incluido
const ensureVoluntarioRole = (roles: number[] | undefined): number[] => {
  if (!roles) return [UserRoles.VOLUNTARIO];
  return roles.includes(UserRoles.VOLUNTARIO) ? roles : [UserRoles.VOLUNTARIO, ...roles];
};

// Función para obtener el color de cada rol
const getRoleColor = (roleNumber: number, theme: Theme) => {
  switch (roleNumber) {
    case UserRoles.ADMINISTRADOR:
      return {
        color: theme.palette.error.main,
        backgroundColor: theme.palette.error.light + '20',
        borderColor: theme.palette.error.main,
        chipColor: 'error' as const,
      };
    case UserRoles.RESPONSABLE:
      return {
        color: theme.palette.success.main,
        backgroundColor: theme.palette.success.light + '20',
        borderColor: theme.palette.success.main,
        chipColor: 'success' as const,
      };
    case UserRoles.VOLUNTARIO:
    default:
      return {
        color: theme.palette.primary.main,
        backgroundColor: theme.palette.primary.light + '20',
        borderColor: theme.palette.primary.main,
        chipColor: 'primary' as const,
      };
  }
};

// Componente para gestión de usuarios
const UserForm = forwardRef<UserFormRef, UserFormProps>(
  (
    {
      userData,
      handleChange,
      setUserData,
      isAddMode = false,
      handleEnabledSwitchChange,
      onRoleChange,
      submitAttempted = false,
    },
    ref
  ) => {
    const theme = useTheme();
    const [locationInputValue, setLocationInputValue] = useState('');

    const currentRoles = ensureVoluntarioRole(userData.roles);

    // Exponer métodos para acceso externo
    useImperativeHandle(
      ref,
      () => ({
        getCurrentData: () => userData,
        resetForm: () => {},
      }),
      [userData]
    );

    // Handler para el selector de roles
    const handleRoleChange = useCallback(
      (event: SelectChangeEvent<number[]>) => {
        const value = event.target.value as number[];

        const rolesWithVoluntario = ensureVoluntarioRole(value);

        onRoleChange(rolesWithVoluntario);
      },
      [onRoleChange]
    );

    const handleLocationChange = useCallback(
      (event: SyntheticEvent<Element, Event>, newValue: string | null) => {
        // No permitir seleccionar el separador
        if (newValue === '---') {
          return;
        }

        setUserData((prev) => ({
          ...prev,
          location: newValue || '',
        }));
      },
      [setUserData]
    );

    const locationOptions = useMemo(() => {
      return GRANADA_LOCATIONS.filter((location) => {
        if (location === '---') return true;
        if (!locationInputValue) return true;
        return location.toLowerCase().includes(locationInputValue.toLowerCase());
      });
    }, [locationInputValue]);

    const availableRoles = Object.values(UserRoles).filter(
      (role): role is (typeof UserRoles)[keyof typeof UserRoles] =>
        typeof role === 'number' && role !== UserRoles.VOLUNTARIO
    );

    const selectedRoles = currentRoles.filter((role) => role !== UserRoles.VOLUNTARIO);

    return (
      <Box
        component="form"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          width: '100%',
        }}
      >
        {/* Campo de usuario */}
        <TextField
          name="userName"
          label="Usuario"
          value={userData.userName || ''}
          onChange={handleChange}
          fullWidth
          required
          disabled={!isAddMode}
          error={submitAttempted && !userData.userName}
          helperText={submitAttempted && !userData.userName ? 'Campo requerido' : ''}
          sx={{ marginTop: 2 }}
        />

        {/* Campos de nombre */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            name="name"
            label="Nombre"
            value={userData.name || ''}
            onChange={handleChange}
            fullWidth
            required
            error={submitAttempted && !userData.name}
            helperText={submitAttempted && !userData.name ? 'Campo requerido' : ''}
          />
          <TextField
            name="lastName"
            label="Apellidos"
            value={userData.lastName || ''}
            onChange={handleChange}
            fullWidth
            required
            error={submitAttempted && !userData.lastName}
            helperText={submitAttempted && !userData.lastName ? 'Campo requerido' : ''}
          />
        </Box>

        {/* Selector de roles */}
        <FormControl fullWidth>
          <InputLabel>Roles adicionales</InputLabel>
          <Select
            multiple
            value={selectedRoles}
            onChange={handleRoleChange}
            input={<OutlinedInput label="Roles adicionales" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {/* Mostrar solo los roles adicionales seleccionados */}
                {(selected as number[]).map((value) => {
                  const roleColor = getRoleColor(value, theme);
                  return (
                    <Chip
                      key={value}
                      label={getRoleName(value)}
                      size="small"
                      color={roleColor.chipColor}
                    />
                  );
                })}
              </Box>
            )}
          >
            {availableRoles.map((role) => {
              const roleColor = getRoleColor(role, theme);
              return (
                <MenuItem
                  key={role}
                  value={role}
                  sx={{
                    color: roleColor.color,
                    backgroundColor: selectedRoles.includes(role)
                      ? roleColor.backgroundColor
                      : 'transparent',
                    border: selectedRoles.includes(role)
                      ? `1px solid ${roleColor.borderColor}`
                      : 'none',
                    '&:hover': {
                      backgroundColor: roleColor.backgroundColor,
                    },
                  }}
                >
                  <Checkbox
                    checked={selectedRoles.includes(role)}
                    sx={{ color: roleColor.color }}
                  />
                  <ListItemText primary={getRoleName(role)} />
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>

        {/* Información de rol base */}
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          * Todos los usuarios tienen el rol de Voluntario por defecto
        </Typography>

        {/* Campos de contacto */}
        <TextField
          name="email"
          label="Email"
          type="email"
          value={userData.email || ''}
          onChange={handleChange}
          fullWidth
          required
          error={submitAttempted && !userData.email}
          helperText={submitAttempted && !userData.email ? 'Campo requerido' : ''}
        />

        <TextField
          name="phone"
          label="Teléfono"
          value={userData.phone || ''}
          onChange={handleChange}
          fullWidth
          required
          error={submitAttempted && !userData.phone}
          helperText={submitAttempted && !userData.phone ? 'Campo requerido' : ''}
        />

        {/* Campos opcionales */}
        <TextField
          name="birthDate"
          label="Fecha de nacimiento"
          type="date"
          value={userData.birthDate || ''}
          onChange={handleChange}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          name="job"
          label="Profesión"
          value={userData.job || ''}
          onChange={handleChange}
          fullWidth
        />

        {/* Campo de localidad con Autocomplete filtrable */}
        <Autocomplete
          value={userData.location || null}
          onChange={handleLocationChange}
          inputValue={locationInputValue}
          onInputChange={(event, newInputValue) => {
            setLocationInputValue(newInputValue);
          }}
          options={locationOptions}
          getOptionDisabled={(option) => option === '---'}
          renderOption={(props, option) => {
            if (option === '---') {
              return (
                <Divider key="separator" sx={{ my: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Localidades de Granada
                  </Typography>
                </Divider>
              );
            }

            return (
              <MenuItem
                {...props}
                key={option}
                sx={{
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
              >
                {option}
              </MenuItem>
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Localidad"
              placeholder="Escriba para buscar..."
              fullWidth
            />
          )}
          freeSolo={false}
          clearOnBlur
          handleHomeEndKeys
          sx={{
            '& .MuiAutocomplete-listbox': {
              maxHeight: 300,
            },
          }}
        />

        {/* Campos de contraseña para modo agregar */}
        {isAddMode && (
          <>
            <TextField
              name="password"
              label="Contraseña"
              type="password"
              value={userData.password || ''}
              onChange={handleChange}
              fullWidth
              required
              error={submitAttempted && !userData.password}
              helperText={submitAttempted && !userData.password ? 'Campo requerido' : ''}
            />
            <TextField
              name="passwordConfirm"
              label="Confirmar contraseña"
              type="password"
              value={userData.passwordConfirm || ''}
              onChange={handleChange}
              fullWidth
              required
              error={
                submitAttempted &&
                (!userData.passwordConfirm || userData.password !== userData.passwordConfirm)
              }
              helperText={
                submitAttempted && !userData.passwordConfirm
                  ? 'Campo requerido'
                  : submitAttempted && userData.password !== userData.passwordConfirm
                    ? 'Las contraseñas no coinciden'
                    : ''
              }
            />
          </>
        )}

        {/* Switch de estado activo */}
        <FormControlLabel
          control={
            <Switch
              checked={userData.isEnabled !== false}
              onChange={(e) => handleEnabledSwitchChange(e.target.checked)}
            />
          }
          label="Usuario activo"
        />
      </Box>
    );
  }
);

UserForm.displayName = 'UserForm';

export default UserForm;
