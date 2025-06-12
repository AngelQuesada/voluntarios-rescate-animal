import { NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAuth } from 'firebase-admin/auth';
import { initAdmin } from '@/lib/firebaseAdmin';

interface RequestContext {
  params: {
    uid: string;
  };
}

// Modificamos la estructura para ser compatible con Next.js App Router
export async function GET(request: Request, { params }: RequestContext) {
  try {
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
