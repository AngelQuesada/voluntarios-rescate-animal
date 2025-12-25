import { NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAuth } from 'firebase-admin/auth';
import { initAdmin } from '@/lib/firebaseAdmin';
import { verifyAuth, requireRole } from '@/lib/auth-api';
import { UserRoles } from '@/lib/constants';

interface RequestContext {
  params: {
    uid: string;
  };
}

export async function GET(request: Request, { params }: RequestContext) {
  try {
    // Verificar autenticación
    const authData = await verifyAuth(request);
    
    if (!authData) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No se proporcionó un token válido' }, 
        { status: 401 }
      );
    }

    const { user, userData } = authData;
    const isOwner = user.uid === params.uid;
    const isAdmin = (userData.roles || []).includes(UserRoles.ADMINISTRADOR);

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'No tienes permisos para ver este perfil' },
        { status: 403 }
      );
    }

    const userRef = doc(db, 'users', params.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json(userSnap.data());
  } catch (error: Error | unknown) {
    console.error('Error al obtener el usuario:', error);
    return NextResponse.json(
      error instanceof Error
        ? { error: 'Error al obtener el usuario', message: error.message }
        : { error: 'Error al obtener el usuario', message: 'Error desconocido' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RequestContext) {
  try {
    // Solo administradores pueden eliminar usuarios
    const validation = await requireRole(request, [UserRoles.ADMINISTRADOR]);
    
    if ('errorResponse' in validation) {
      return validation.errorResponse;
    }

    initAdmin();

    await getAuth().deleteUser(params.uid);

    return NextResponse.json({
      success: true,
      message: 'Usuario eliminado correctamente',
    });
  } catch (error: Error | unknown) {
    console.error('Error al eliminar el usuario:', error);

    // Verificar si el error es porque el usuario no existe
    if ((error as { code?: string }).code === 'auth/user-not-found') {
      return NextResponse.json(
        {
          error: 'Usuario no encontrado',
          message: 'El usuario no existe en Firebase Authentication',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'Error al eliminar el usuario',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
