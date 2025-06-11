import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { api } from '@/store/api/baseApi';
import { usersApi } from '@/store/api/usersApi';

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    [usersApi.reducerPath]: usersApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware, usersApi.middleware),
});

setupListeners(store.dispatch);
