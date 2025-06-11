import { User as FirebaseUser, UserInfo } from 'firebase/auth';

export interface User {
  id?: string;
  uid: string;
  username: string;
  roles: number[];
  name: string;
  lastname: string;
  birthdate: string;
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
  lastname?: string;
  roles?: number[];
  phone?: string;
  isEnabled: boolean;
}

export interface HeaderProps {
  userRoles: string[];
}

// Tipos para formularios de usuario
export interface UserInfoForForm {
  username: string;
  name: string;
  lastname: string;
  birthdate: string;
  email: string;
  phone: string;
  job?: string;
  location?: string;
  roles: number[];
  password?: string; // Solo para nuevos usuarios
}

// Estados para el panel de administración
export interface NewUserInfoState {
  username: string;
  name: string;
  lastname: string;
  birthdate: string;
  email: string;
  phone: string;
  job: string;
  location: string;
  roles: number[];
  password: string;
}

export interface EditUserInfoState {
  username: string;
  name: string;
  lastname: string;
  birthdate: string;
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
