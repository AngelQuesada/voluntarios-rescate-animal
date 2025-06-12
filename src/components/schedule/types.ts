import React from 'react';
import { User } from '@/types/common';

export interface NotificationSnackbarProps {
  open: boolean;
  message: React.ReactNode;
  severity?: 'success' | 'error' | 'info' | 'warning';
  onClose?: (event?: React.SyntheticEvent | Event, reason?: string) => void;
}

export interface AddUserToShiftDialogProps {
  open: boolean;
  onClose: () => void;
  onAddUser: (userId: string) => void;
  users: Array<User & { id: string; isEnabled?: boolean }>;
  currentAssignments: Array<{ uid: string; name: string }>;
}

export interface ConfirmAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export interface ConfirmRemoveUserDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName?: string;
  isLoading?: boolean;
}

export interface ContactDialogProps {
  open: boolean;
  onClose: () => void;
  user: { name: string; phone: string } | null;
}
