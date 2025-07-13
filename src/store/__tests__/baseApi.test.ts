import { configureStore } from '@reduxjs/toolkit';
import { api } from '@/store/api/baseApi';

describe('Base API Configuration', () => {
  test('should create API slice with correct configuration', () => {
    expect(api.reducerPath).toBe('api');
    // tagTypes no es accesible directamente, verificamos que la API se crea correctamente
    expect(api.endpoints).toBeDefined();
    expect(typeof api.endpoints).toBe('object');
  });

  test('should work with store configuration', () => {
    const store = configureStore({
      reducer: {
        [api.reducerPath]: api.reducer,
      },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
    });

    expect(store.getState()).toHaveProperty('api');
  });

  test('should have correct reducer path in state', () => {
    const store = configureStore({
      reducer: {
        [api.reducerPath]: api.reducer,
      },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
    });

    const state = store.getState();
    expect(state.api).toBeDefined();
    expect(state.api.queries).toBeDefined();
    expect(state.api.mutations).toBeDefined();
  });
});
