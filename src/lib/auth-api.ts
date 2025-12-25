import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from './firebaseAdmin';
import { DecodedIdToken } from 'firebase-admin/auth';
import { DocumentData } from 'firebase-admin/firestore';

export interface AuthenticatedRequest {
  user: DecodedIdToken;
  userData: DocumentData;
}

export async function verifyAuth(request: Request): Promise<AuthenticatedRequest | null> {
  const authHeader = request.headers.get('Authorization');
  let token: string | undefined;

  // 1. Check Authorization header
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split('Bearer ')[1];
  } else {
    // 2. Check cookies (for browser-based requests)
    // We need to parse cookies manually from the Request object if it's not a NextRequest
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      
      token = cookies['auth-token']; 
      // Note: 'auth-token' is the cookie name used in middleware.ts
    }
  }

  if (!token) {
    return null;
  }

  try {
    const auth = getAdminAuth();
    const db = getAdminFirestore();

    // Verify the ID token
    const decodedToken = await auth.verifyIdToken(token);
    
    // Fetch user data from Firestore to get the most up-to-date roles
    // We trust Firestore data more than the token for roles as they might have changed
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      console.warn(`User ${decodedToken.uid} found in Auth but not in Firestore`);
      return null;
    }

    return {
      user: decodedToken,
      userData: userDoc.data()!,
    };
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return null;
  }
}

/**
 * Verifica si el usuario tiene los roles permitidos.
 * @param request - La solicitud HTTP.
 * @param allowedRoles - Los roles permitidos.
 * @returns Un objeto con la autenticación del usuario si es exitoso, o una respuesta de error si no lo es.
 */
export async function requireRole(
  request: Request, 
  allowedRoles: number[]
): Promise<{ auth: AuthenticatedRequest } | { errorResponse: NextResponse }> {
  const auth = await verifyAuth(request);

  if (!auth) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Unauthorized', message: 'No se proporcionó un token válido' },
        { status: 401 }
      )
    };
  }

  const userRoles = (auth.userData.roles as number[]) || [];
  const hasRole = userRoles.some(role => allowedRoles.includes(role));

  if (!hasRole) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Forbidden', message: 'No tienes permisos para realizar esta acción' },
        { status: 403 }
      )
    };
  }

  return { auth };
}
