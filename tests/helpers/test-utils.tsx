import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { api } from '@/store/api/baseApi';
import theme from '@/theme/theme';

// Mock store para tests
const createMockStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      api: api.reducer,
    },
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }).concat(api.middleware),
  });
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: any;
  store?: ReturnType<typeof createMockStore>;
}

// Wrapper personalizado para tests
const AllTheProviders = ({ 
  children, 
  store = createMockStore() 
}: { 
  children: React.ReactNode;
  store?: ReturnType<typeof createMockStore>;
}) => {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </Provider>
  );
};

// Función de render personalizada
const customRender = (
  ui: ReactElement,
  {
    preloadedState = {},
    store = createMockStore(preloadedState),
    ...renderOptions
  }: CustomRenderOptions = {}
) => {
  return render(ui, {
    wrapper: (props) => <AllTheProviders {...props} store={store} />,
    ...renderOptions,
  });
};

// Mock data para tests
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'voluntario' as const,
  phone: '+34123456789',
  emergencyContact: '+34987654321',
  joinedAt: new Date().toISOString(),
};

export const mockAdmin = {
  id: 'admin-user-id',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'administrador' as const,
  phone: '+34123456789',
  emergencyContact: '+34987654321',
  joinedAt: new Date().toISOString(),
};

export const mockShift = {
  id: 'test-shift-id',
  date: '2025-05-25',
  startTime: '09:00',
  endTime: '17:00',
  type: 'mañana' as const,
  maxVolunteers: 5,
  assignedUsers: [],
  description: 'Test shift description',
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render, createMockStore };