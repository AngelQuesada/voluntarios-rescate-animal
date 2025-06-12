import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define todas las rutas protegidas y sus requisitos de roles
const protectedRoutes = {
  '/schedule': { requiresAuth: true, roles: [] },
  '/admin': { requiresAuth: true, roles: [3] },
  '/admin/history': { requiresAuth: true, roles: [3] },
};

export function middleware(request: NextRequest) {
  // Verificar si el usuario está autenticado revisando las cookies
  const authToken = request.cookies.get('auth-token');

  // Examinar todas las cookies para encontrar tokens relacionados con Firebase Auth
  const hasFirebaseAuthCookie = Array.from(request.cookies.getAll()).some(
    (cookie) =>
      cookie.name.includes('firebase') ||
      cookie.name.includes('auth') ||
      cookie.name === 'auth-token'
  );

  const isAuthenticated = !!(authToken || hasFirebaseAuthCookie);

  const pathname = request.nextUrl.pathname;

  // No aplicar restricciones en la ruta de logout
  if (pathname === '/logout') {
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const isProtectedRoute = Object.keys(protectedRoutes).some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    );

    if (isProtectedRoute) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  } else if (isAuthenticated && pathname === '/') {
    return NextResponse.redirect(new URL('/schedule', request.url));
  }

  return NextResponse.next();
}

// Definir las rutas en las que el middleware debe ejecutarse
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icon.png|manifest.json|images|public).*)',
  ],
};
