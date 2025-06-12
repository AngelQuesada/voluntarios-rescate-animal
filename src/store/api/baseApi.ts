import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

// API base para RTK Query
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Users', 'Shifts', 'User', 'Shift'],
  endpoints: () => ({}),
});
