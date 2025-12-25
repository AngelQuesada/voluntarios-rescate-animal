import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { sendNotification } from '@/lib/notifications';
import { verifyAuth } from '@/lib/auth-api';
import { UserRoles } from '@/lib/constants';

interface ShiftAssignmentRequest {
  dateKey: string;
  shiftKey: 'M' | 'T';
  uid: string;
  action: 'add' | 'remove';
}

// Inicializar Firebase Admin si no está inicializado
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
}

export async function POST(request: Request) {
  try {
    // 1. Verificar Autenticación
    const authData = await verifyAuth(request);
    if (!authData) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { user: actor, userData: actorData } = authData;
    const actorRoles = (actorData.roles as number[]) || [];

    const {
      dateKey,
      shiftKey,
      uid,
      action,
    }: ShiftAssignmentRequest = await request.json();

    // Validar parámetros básicos
    if (!dateKey || typeof dateKey !== 'string' || dateKey.trim() === '') {
      return new NextResponse('dateKey es requerido y debe ser una cadena no vacía', {
        status: 400,
      });
    }

    if (!shiftKey || !['M', 'T'].includes(shiftKey)) {
      return new NextResponse('shiftKey debe ser "M" o "T"', { status: 400 });
    }

    if (!uid || typeof uid !== 'string' || uid.trim() === '') {
      return new NextResponse('uid es requerido y debe ser una cadena no vacía', { status: 400 });
    }

    if (!action || !['add', 'remove'].includes(action)) {
      return new NextResponse('action debe ser "add" o "remove"', { status: 400 });
    }

    // 2. Control de Acceso (RBAC) Simplificado
    // Regla: 
    // - Si el actor intenta modificarse a sí mismo -> Permitido.
    // - Si el actor intenta modificar a otro -> Requiere ser ADMIN o RESPONSABLE.
    
    const isSelfModification = actor.uid === uid;
    const hasElevatedPrivileges = actorRoles.includes(UserRoles.ADMINISTRADOR) || actorRoles.includes(UserRoles.RESPONSABLE);

    if (!isSelfModification && !hasElevatedPrivileges) {
      return new NextResponse('Forbidden: No tienes permisos para modificar los turnos de otros usuarios.', { status: 403 });
    }

    const isAdminAssignment = !isSelfModification && hasElevatedPrivileges;
    const performedByUid = actor.uid;

    // Construir el shiftId a partir de dateKey y shiftKey
    const shiftId = `${dateKey.trim()}_${shiftKey}`;
    const userId = uid.trim();

    const db = admin.firestore();

    const shiftRef = db.collection('shifts').doc(shiftId);
    const userRef = db.collection('users').doc(userId);

    if (action === 'add') {
      // Usar set con merge para crear el documento si no existe
      await shiftRef.set(
        {
          date: dateKey,
          shift: shiftKey,
          assignments: admin.firestore.FieldValue.arrayUnion({ uid: userId }),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await userRef.set(
        {
          shifts: admin.firestore.FieldValue.arrayUnion(shiftId),
        },
        { merge: true }
      );

      // Enviar notificación solo si es un administrador asignando a otro usuario
      if (isAdminAssignment && performedByUid !== userId) {
        const userSnap = await userRef.get();
        const userData = userSnap.data();
        if (userData && userData.fcmToken) {
          const shiftSnap = await shiftRef.get();
          const shiftData = shiftSnap.data();
          if (shiftData) {
            let shiftDate: Date;
            if (shiftData.date) {
              shiftDate = new Date(shiftData.date);
            } else {
              shiftDate = new Date(dateKey);
            }

            const formattedDate = new Intl.DateTimeFormat('es-ES', {
              dateStyle: 'full',
            }).format(shiftDate);

            await sendNotification(
              userData.fcmToken,
              'Se te ha asignado un turno nuevo',
              `Tu nuevo turno es el ${formattedDate}`
            );
          }
        }
      }
    } else if (action === 'remove') {
      const shiftDoc = await shiftRef.get();
      if (shiftDoc.exists) {
        await shiftRef.update({
          assignments: admin.firestore.FieldValue.arrayRemove({ uid: userId }),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      const userDoc = await userRef.get();
      if (userDoc.exists) {
        await userRef.update({
          shifts: admin.firestore.FieldValue.arrayRemove(shiftId),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error assigning shift:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
