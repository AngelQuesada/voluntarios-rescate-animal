'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { UserAction } from '@/types/common';

const ACTIONS_LIMIT = 60;

export const useUserActions = () => {
  const [actions, setActions] = useState<UserAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // totalActions se refiere al número de acciones recuperadas (máximo ACTIONS_LIMIT)
  // para la paginación del lado del cliente de este conjunto de datos.
  const [totalActions, setTotalActions] = useState(0);

  const fetchActions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const actionsRef = collection(db, 'userActions');
      const q = query(actionsRef, orderBy('timestamp', 'desc'), limit(ACTIONS_LIMIT));
      const querySnapshot = await getDocs(q);

      const fetchedActions: UserAction[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        // Asegurarse de que el timestamp se convierte correctamente si es necesario
        // Firestore Timestamps se manejan bien, pero es bueno ser explícito.
        const data = doc.data() as Omit<UserAction, 'id'>;
        fetchedActions.push({ id: doc.id, ...data });
      });

      setActions(fetchedActions);
      setTotalActions(fetchedActions.length); // El total para la paginación local
    } catch (err: any) {
      console.error('Error fetching user actions:', err);
      setError(err.message || 'Ocurrió un error al obtener las acciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  return { actions, loading, error, totalActions, fetchActions };
};
