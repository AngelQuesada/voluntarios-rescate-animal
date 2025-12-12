import { User as FirebaseUser, UserInfo } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';

export interface User {
  id?: string;
  uid: string;
  userName: string;
  roles: number[];
  name: string;
  lastName: string;
  birthDate: string;
  email: string;
  phone: string;
  job?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
  isEnabled?: boolean;
}

export interface CurrentUser extends Omit<FirebaseUser, 'providerData'> {
  providerData?: UserInfo[];
  email: string;
  uid: string;
  name?: string;
  lastName?: string;
  roles?: number[];
  phone?: string;
  isEnabled: boolean;
}

export interface HeaderProps {
  userRoles: string[];
}

// Tipos para formularios de usuario
export interface UserInfoForForm {
  userName: string;
  name: string;
  lastName: string;
  birthDate: string;
  email: string;
  phone: string;
  job?: string;
  location?: string;
  roles: number[];
  password?: string; // Solo para nuevos usuarios
}

// Estados para el panel de administración
export interface NewUserInfoState {
  userName: string;
  name: string;
  lastName: string;
  birthDate: string;
  email: string;
  phone: string;
  job: string;
  location: string;
  roles: number[];
  password: string;
}

export interface EditUserInfoState {
  userName: string;
  name: string;
  lastName: string;
  birthDate: string;
  email: string;
  phone: string;
  job: string;
  location: string;
  roles: number[];
}

// Tipos para el componente de diálogo
export interface DialogAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

// Tipos para el historial de acciones de usuario
export interface UserAction {
  id?: string; // ID del documento en Firestore
  timestamp: Timestamp; // Fecha y hora de la acción
  userId: string; // ID del usuario que realizó la acción (voluntario)
  userName: string; // Nombre del voluntario
  shiftId: string; // ID del turno afectado
  shiftDate: string; // Fecha del turno (YYYY-MM-DD)
  shiftPeriod: 'morning' | 'afternoon'; // Mañana o tarde
  actionType: 'assign' | 'unassign'; // Tipo de acción ('assign' para añadir, 'unassign' para eliminar)
  performedByAdminId?: string; // ID del administrador si la acción fue hecha por un admin
  performedByAdminName?: string; // Nombre del administrador
}
