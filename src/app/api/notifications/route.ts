import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebaseAdmin';

// TODO: Añadir una validación más robusta de los datos de entrada

/**
 * Guarda el token de FCM de un usuario en Firestore.
 * @param request - La solicitud HTTP, que se espera que contenga el token de FCM.
 * @returns Una respuesta JSON indicando el éxito o el fracaso de la operación.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { token, userId } = await request.json();

    if (!token || !userId) {
      return NextResponse.json(
        { error: 'El token y el ID de usuario son obligatorios' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
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
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'El ID de usuario es obligatorio' }, { status: 400 });
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
