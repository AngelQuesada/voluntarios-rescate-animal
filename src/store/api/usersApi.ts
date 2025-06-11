import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from '@/types/common';

// API para usuarios
export const usersApi = createApi({
  reducerPath: 'usersApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Users'],
  endpoints: (builder) => ({
    // Obtener todos los usuarios
    getUsers: builder.query<Record<string, User>, void>({
      queryFn: async () => {
        try {
          const usersCollection = collection(db, 'users');
          const usersSnapshot = await getDocs(usersCollection);

          // Crear objeto indexado por uid para búsquedas eficientes
          const usersMap: Record<string, User> = {};
          usersSnapshot.docs.forEach((doc) => {
            const userData = doc.data() as User;
            usersMap[doc.id] = {
              ...userData,
              uid: doc.id,
            };
          });

          return { data: usersMap };
        } catch (error) {
          console.error('Error fetching users:', error);
          return { error: { message: 'Error al cargar los usuarios.' } };
        }
      },
      providesTags: ['Users'],
    }),
  }),
});

// Exportar los hooks
export const { useGetUsersQuery } = usersApi;
