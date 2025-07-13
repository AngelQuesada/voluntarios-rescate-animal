import { initAdmin } from './firebaseAdmin';

/**
 * Envía una notificación push a un usuario específico.
 * @param {string} fcmToken - El token de FCM del dispositivo del usuario.
 * @param {string} title - El título de la notificación.
 * @param {string} body - El cuerpo de la notificación.
 * @returns {Promise<void>}
 */
export const sendNotification = async (
  fcmToken: string,
  title: string,
  body: string
): Promise<void> => {
  const admin = initAdmin();
  const message = {
    token: fcmToken,
    notification: {
      title,
      body,
    },
  };

  try {
    await admin.messaging().send(message);
  } catch (error) {
    console.error('Error al enviar la notificación:', error);
    // TODO: Manejar el caso en que el token ya no sea válido
  }
};
