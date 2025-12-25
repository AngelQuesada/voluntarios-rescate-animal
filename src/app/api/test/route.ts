import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-api';
import { UserRoles } from '@/lib/constants';

export async function GET(request: Request) {
  const auth = await requireRole(request, [UserRoles.ADMINISTRADOR]);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }
  
  return NextResponse.json({ message: 'Test route' }, { status: 200 });
}
