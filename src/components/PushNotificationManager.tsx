'use client';

import { useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

const PushNotificationManager = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const messaging = getMessaging(app);

      const requestPermission = async () => {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted' && user) {
            const swRegistration = await navigator.serviceWorker.register('/api/firebase-sw');
            const currentToken = await getToken(messaging, {
              vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
              serviceWorkerRegistration: swRegistration,
            });
            if (currentToken) {
              // Enviar token al backend
              await fetch('/api/notifications', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: currentToken, userId: user.uid }),
              });
            } else {
              console.log('No registration token available. Request permission to generate one.');
            }
          }
        } catch (error) {
          console.error('An error occurred while retrieving token. ', error);
        }
      };

      requestPermission();

      onMessage(messaging, (payload) => {
        console.log('Message received. ', payload);

        // Mostrar notificación del navegador cuando la app está en primer plano
        if (payload.notification) {
          const { title, body } = payload.notification;

          // Verificar si tenemos permisos para mostrar notificaciones
          if (Notification.permission === 'granted') {
            // Crear y mostrar la notificación
            const notification = new Notification(title || 'Nueva notificación', {
              body: body || 'Tienes una nueva notificación',
              icon: '/icons/android-chrome-192x192.png',
              badge: '/icons/android-chrome-192x192.png',
              tag: 'shift-notification',
              requireInteraction: true,
              silent: false,
            });

            // Opcional: manejar clics en la notificación
            notification.onclick = () => {
              window.focus();
              notification.close();
            };

            setTimeout(() => {
              notification.close();
            }, 10000);
          } else {
            console.warn('No se pueden mostrar notificaciones: permisos no concedidos');
          }
        }
      });
    }
  }, [user]);

  return null;
};

export default PushNotificationManager;
