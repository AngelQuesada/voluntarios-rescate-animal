import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { TextField, Box, Alert, FormControlLabel, Checkbox } from '@mui/material';
import SubmitButton from './SubmitButton';
import { triggerVibration } from '@/lib/vibration';
import { textFieldStyles } from '@/styles/formStyles';

interface SignInFormProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  error: string | null;
  isLoading: boolean;
  isBlocked: boolean;
  blockTimeRemaining: number;
  formatBlockTime: (seconds: number) => string;
  handleSignIn: (e: FormEvent, rememberMe?: boolean) => Promise<void>;
  resetForm: () => void;
  onSilentReset?: () => void;
}

const SignInForm = ({
  email,
  setEmail,
  password,
  setPassword,
  error,
  isLoading,
  isBlocked,
  blockTimeRemaining,
  formatBlockTime,
  handleSignIn,
}: SignInFormProps) => {
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formErrors, setFormErrors] = useState({
    email: '',
    password: '',
  });

  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
        submitTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isLoading && submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
      submitTimeoutRef.current = null;
    }
  }, [isLoading]);

  const validateField = (field: 'email' | 'password') => {
    if (field === 'email' && !email.trim()) {
      setFormErrors((prev) => ({
        ...prev,
        email: 'El correo electrónico es obligatorio',
      }));
      return false;
    } else if (field === 'email') {
      setFormErrors((prev) => ({ ...prev, email: '' }));
    }

    if (field === 'password' && !password) {
      setFormErrors((prev) => ({
        ...prev,
        password: 'La contraseña es obligatoria',
      }));
      return false;
    } else if (field === 'password' && password.length < 6) {
      setFormErrors((prev) => ({
        ...prev,
        password: 'La contraseña debe tener al menos 6 caracteres',
      }));
      return false;
    } else if (field === 'password') {
      setFormErrors((prev) => ({ ...prev, password: '' }));
    }

    return true;
  };

  const validateForm = () => {
    const emailValid = validateField('email');
    const passwordValid = validateField('password');
    return emailValid && passwordValid;
  };

  const handleSubmit = async (e: FormEvent) => {
    triggerVibration(50);
    e.preventDefault();
    setSubmitAttempted(true);

    if (!validateForm()) {
      return;
    }

    // Limpiar timeout previo si existe
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
      submitTimeoutRef.current = null;
    }

    try {
      await handleSignIn(e, rememberMe);
    } catch (_error) {
      console.error('Error en login:', _error);
    }
  };

  return (
    <Box
      component="form"
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      sx={{ mt: 1, width: '100%' }}
    >
      <TextField
        margin="normal"
        required
        fullWidth
        id="email"
        label="Correo Electrónico"
        name="email"
        autoComplete="email"
        autoFocus
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (submitAttempted) validateField('email');
        }}
        error={!!error || (submitAttempted && !!formErrors.email)}
        disabled={isLoading}
        helperText={submitAttempted && formErrors.email ? formErrors.email : ''}
        sx={textFieldStyles}
      />
      <TextField
        margin="normal"
        required
        fullWidth
        name="password"
        label="Contraseña"
        type="password"
        id="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          if (submitAttempted) validateField('password');
        }}
        error={!!error || (submitAttempted && !!formErrors.password)}
        disabled={isLoading}
        helperText={submitAttempted && formErrors.password ? formErrors.password : ''}
        sx={textFieldStyles}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            color="primary"
            disabled={isLoading}
            data-testid="remember-me-checkbox"
          />
        }
        label="Recordarme"
        sx={{ mt: 1, mb: 1 }}
      />
      {error && (
        <Alert severity="error" sx={{ width: '100%', mt: 2, mb: 1 }}>
          {error}
        </Alert>
      )}
      {isBlocked && (
        <Alert severity="warning" sx={{ width: '100%', mt: 2, mb: 1 }}>
          Cuenta temporalmente bloqueada. Tiempo restante: {formatBlockTime(blockTimeRemaining)}
        </Alert>
      )}
      <SubmitButton isLoading={isLoading} isBlocked={isBlocked} />
    </Box>
  );
};

export default SignInForm;
