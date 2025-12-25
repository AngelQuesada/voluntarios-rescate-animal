import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { verifyAuth } from '@/lib/auth-api';
import { UserRoles } from '@/lib/constants';

// TODO: Añadir una validación más robusta de los datos de entrada

/**
 * Guarda el token de FCM de un usuario en Firestore.
 * @param request - La solicitud HTTP, que se espera que contenga el token de FCM.
 * @returns Una respuesta JSON indicando el éxito o el fracaso de la operación.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const authData = await verifyAuth(request);
    if (!authData) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No autenticado' },
        { status: 401 }
      );
    }

    const { token, userId } = await request.json();

    if (!token || !userId) {
      return NextResponse.json(
        { error: 'El token y el ID de usuario son obligatorios' },
        { status: 400 }
      );
    }

    // Validación de permisos: Solo el propio usuario o un admin pueden actualizar el token
    const isOwner = authData.user.uid === userId;
    const isAdmin = (authData.userData.roles as number[] || []).includes(UserRoles.ADMINISTRADOR);

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'No tienes permiso para modificar este usuario' },
        { status: 403 }
      );
    }

    // Borra la declaración de db que se declara más abajo
    const db = getAdminFirestore();
    
    // Validación del ID de usuario
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      return NextResponse.json({ error: 'ID de usuario inválido' }, { status: 400 });
    }

    await db.collection('users').doc(userId).set(
      {
        fcmToken: token,
      },
      { merge: true }
    );

    await db.collection('users').doc(userId).update({
      fcmToken: token,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al guardar el token de FCM:', error);
    // TODO: Implementar un registro de errores más detallado
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * Elimina el token de FCM de un usuario de Firestore.
 * @param request - La solicitud HTTP, que se espera que contenga el ID del usuario.
 * @returns Una respuesta JSON indicando el éxito o el fracaso de la operación.
 */
export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const authData = await verifyAuth(request);
    if (!authData) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No autenticado' },
        { status: 401 }
      );
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'El ID de usuario es obligatorio' }, { status: 400 });
    }

    // Validación de permisos
    const isOwner = authData.user.uid === userId;
    const isAdmin = (authData.userData.roles as number[] || []).includes(UserRoles.ADMINISTRADOR);

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'No tienes permiso para modificar este usuario' },
        { status: 403 }
      );
    }

    const db = getAdminFirestore();
    await db.collection('users').doc(userId).update({
      fcmToken: null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar el token de FCM:', error);
    // TODO: Implementar un registro de errores más detallado
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
