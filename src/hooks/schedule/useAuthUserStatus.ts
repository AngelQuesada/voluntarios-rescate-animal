import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { CurrentUser } from '@/types/common';

interface UseAuthUserStatusProps {
  showSnackbar: (
    message: React.ReactNode,
    severity?: 'success' | 'error' | 'info' | 'warning'
  ) => void;
}

export function useAuthUserStatus({ showSnackbar }: UseAuthUserStatusProps) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      setAuthLoading(true);
      setError(null);
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const currentUserData: CurrentUser = {
              ...user,
              email: user.email || '',
              uid: user.uid,
              name: userData.name,
              lastname: userData.lastname,
              roles: userData.roles,
              phone: userData.phone,
              isEnabled: userData.isEnabled !== undefined ? userData.isEnabled : true,
            };
            setCurrentUser(currentUserData);
          }
        } catch (e) {
          console.error('Error al obtener datos del usuario de Firestore:', e);
          setError('Error al cargar datos del usuario.');
          showSnackbar('Error al cargar los datos del usuario.', 'error');
          const currentUserData: CurrentUser = {
            ...user,
            email: user.email || '',
            uid: user.uid,
            isEnabled: false,
          };
          setCurrentUser(currentUserData);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [showSnackbar]);

  return { currentUser, authLoading, error };
}
