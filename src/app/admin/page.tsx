'use client';

import { useEffect } from 'react';
import { AdminPanel } from '@/components/admin/admin-panel';
import { UserRoles } from '@/lib/constants';
import RoleProtected from '@/components/auth/RoleProtected';
import { triggerVibration } from '@/lib/vibration';

export default function AdminPage() {
  useEffect(() => {
    triggerVibration(60);
  }, []);

  return (
    <RoleProtected requiredRoles={[UserRoles.ADMINISTRADOR]} fallbackUrl="/schedule">
      <main className="flex justify-center items-center h-screen bg-white">
        <AdminPanel />
      </main>
    </RoleProtected>
  );
}
