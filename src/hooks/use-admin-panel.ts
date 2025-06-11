import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  createElement,
  Fragment,
  ChangeEvent,
  SetStateAction,
  ReactNode,
} from 'react';

import { User, UserInfoForForm } from '../types/common';
import { db } from '@/lib/firebase';
import { triggerVibration } from '@/lib/vibration';
import { doc, deleteDoc, getDocs, collection, updateDoc } from 'firebase/firestore';
import { UserRoles } from '@/lib/constants';

// Función para validar formato de número de teléfono español
const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^(\+34|0034)?[ -]*(6|7|8|9)[ -]*([0-9][ -]*){8}$/;
  return phoneRegex.test(phone);
};

// Tipo extendido para el formulario con propiedades adicionales
interface ExtendedUserFormData extends UserInfoForForm {
  passwordConfirm?: string;
  isEnabled?: boolean;
}

export const useAdminPanel = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<ReactNode>('');
  const [addSubmitAttempted, setAddSubmitAttempted] = useState(false);
  const [editSubmitAttempted, setEditSubmitAttempted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Estados del formulario usando el tipo correcto
  const [newUserInfo, setNewUserInfo] = useState<ExtendedUserFormData>({
    username: '',
    roles: [],
    name: '',
    lastname: '',
    birthdate: '',
    email: '',
    phone: '',
    job: '',
    location: '',
    password: '',
    isEnabled: true,
  });

  const [editUserInfo, setEditUserInfo] = useState<ExtendedUserFormData>({
    username: '',
    roles: [],
    name: '',
    lastname: '',
    birthdate: '',
    email: '',
    phone: '',
    job: '',
    location: '',
    isEnabled: true,
  });

  // Estados para contacto y detalles
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetailDialogOpen, setUserDetailDialogOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<User | null>(null);

  // Estados de paginación y búsqueda
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [prioritizeResponsables, setPrioritizeResponsables] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = querySnapshot.docs.map((document) => ({
        uid: document.id,
        ...document.data(),
      })) as User[];
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar usuarios
  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtrado de usuarios
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        !searchTerm ||
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole =
        !prioritizeResponsables ||
        (Array.isArray(user.roles) && user.roles.includes(UserRoles.RESPONSABLE));

      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, prioritizeResponsables]);

  // Manejadores de eventos del formulario
  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setNewUserInfo((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleEditInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setEditUserInfo((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const memoizedSetNewUserInfo = useCallback((value: SetStateAction<ExtendedUserFormData>) => {
    setNewUserInfo(value);
  }, []);

  const memoizedSetEditUserInfo = useCallback((value: SetStateAction<ExtendedUserFormData>) => {
    setEditUserInfo(value);
  }, []);

  const handleEnabledSwitchChange = useCallback((checked: boolean) => {
    setNewUserInfo((prev) => ({ ...prev, isEnabled: checked }));
  }, []);

  const handleEditEnabledSwitchChange = useCallback((checked: boolean) => {
    setEditUserInfo((prev) => ({ ...prev, isEnabled: checked }));
  }, []);

  // Handlers memoizados para roles
  const handleAddRoleChange = useCallback((roles: number[]) => {
    setNewUserInfo((prev) => ({
      ...prev,
      roles: roles,
    }));
  }, []);

  const handleEditRoleChange = useCallback((roles: number[]) => {
    setEditUserInfo((prev) => ({
      ...prev,
      roles: roles,
    }));
  }, []);

  // Validaciones
  const validateUserInfo = useCallback((userInfo: ExtendedUserFormData): string | null => {
    const { email, name, username, phone, password } = userInfo;

    // Validaciones básicas requeridas
    if (!email?.trim() || !name?.trim() || !username?.trim() || !phone?.trim()) {
      return 'Todos los campos obligatorios deben estar completos';
    }

    // Validación de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'El formato del email no es válido';
    }

    // Validación de teléfono
    if (!isValidPhone(phone)) {
      return 'El formato del teléfono no es válido';
    }

    // Validación de contraseña para nuevos usuarios
    if (password !== undefined && password.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres';
    }

    return null;
  }, []);

  // Agregar usuario
  const handleAddUser = async () => {
    // PRIMERO: Mostrar spinner inmediatamente al hacer clic
    setIsAddingUser(true);

    // Pequeño delay para asegurar que el spinner se muestre antes de las validaciones
    await new Promise((resolve) => setTimeout(resolve, 50));

    setFormError(null);
    setAddSubmitAttempted(true);

    const validationError = validateUserInfo(newUserInfo);
    if (validationError) {
      setFormError(validationError);
      setIsAddingUser(false);
      return;
    }

    // Validar confirmación de contraseña
    if (newUserInfo.password !== newUserInfo.passwordConfirm) {
      setFormError('Las contraseñas no coinciden');
      setIsAddingUser(false);
      return;
    }

    try {
      // Usar la API del servidor para crear el usuario
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newUserInfo.email,
          password: newUserInfo.password,
          username: newUserInfo.username,
          name: newUserInfo.name,
          lastname: newUserInfo.lastname,
          birthdate: newUserInfo.birthdate,
          phone: newUserInfo.phone,
          job: newUserInfo.job,
          location: newUserInfo.location,
          roles: newUserInfo.roles,
          isEnabled: newUserInfo.isEnabled,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear usuario');
      }

      const userData = await response.json();

      // Actualizar el estado local
      setUsers((prev) => [...prev, userData] as User[]);
      setIsAddDialogOpen(false);
      setNewUserInfo({
        username: '',
        roles: [],
        name: '',
        lastname: '',
        birthdate: '',
        email: '',
        phone: '',
        job: '',
        location: '',
        password: '',
        isEnabled: true,
      });
      setAddSubmitAttempted(false);

      // Mensaje personalizado con nombre y apellidos en negrita
      const fullName = `${newUserInfo.name} ${newUserInfo.lastname}`.trim();
      setSnackbarMessage(
        createElement(
          Fragment,
          null,
          'El usuario ',
          createElement('strong', null, fullName),
          ' se agregó correctamente'
        )
      );
      setSnackbarOpen(true);
      triggerVibration(100);
    } catch (error: Error | unknown) {
      console.error('Error adding user:', error);

      // Mapear errores comunes
      let errorMessage = 'Error al agregar usuario';
      if (
        (error as Error).message?.includes('email-already-in-use') ||
        (error as Error).message?.includes('already exists')
      ) {
        errorMessage = 'Este email ya está registrado';
      } else if ((error as Error).message?.includes('weak-password')) {
        errorMessage = 'La contraseña es muy débil';
      } else if ((error as Error).message?.includes('invalid-email')) {
        errorMessage = 'El formato del email no es válido';
      } else if ((error as Error).message) {
        errorMessage = (error as Error).message;
      }

      setFormError(errorMessage);
    } finally {
      setIsAddingUser(false);
    }
  };

  // Editar usuario
  const openEditDialog = (user: User) => {
    setUserToEdit(user);
    setEditUserInfo({
      username: user.username || '',
      roles: Array.isArray(user.roles)
        ? user.roles.filter((role) => role !== UserRoles.VOLUNTARIO)
        : [],
      name: user.name || '',
      lastname: user.lastname || '',
      birthdate: user.birthdate || '',
      email: user.email || '',
      phone: user.phone || '',
      job: user.job || '',
      location: user.location || '',
      isEnabled: user.isEnabled !== false,
    });
    setIsEditDialogOpen(true);
    setEditSubmitAttempted(false);
    setFormError(null);
  };

  const handleEditUser = async () => {
    if (!userToEdit) return;

    setEditSubmitAttempted(true);
    const validationError = validateUserInfo(editUserInfo);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsEditingUser(true);
    setFormError(null);

    try {
      const finalRoles = [UserRoles.VOLUNTARIO, ...editUserInfo.roles];
      const currentTimestamp = new Date().toISOString();
      const userData = {
        ...editUserInfo,
        roles: [...new Set(finalRoles)],
        updatedAt: currentTimestamp,
      };

      await updateDoc(doc(db, 'users', userToEdit.uid), userData);

      setUsers((prev) =>
        prev.map((user) => (user.uid === userToEdit.uid ? { ...user, ...userData } : user))
      );

      setIsEditDialogOpen(false);
      setUserToEdit(null);
      setEditSubmitAttempted(false);

      // Mensaje personalizado con nombre y apellidos en negrita
      const fullName = `${editUserInfo.name} ${editUserInfo.lastname}`.trim();
      setSnackbarMessage(
        createElement(
          Fragment,
          null,
          'El usuario ',
          createElement('strong', null, fullName),
          ' se actualizó correctamente'
        )
      );
      setSnackbarOpen(true);
      triggerVibration(100);
    } catch (error: Error | unknown) {
      console.error('Error updating user:', error);
      setFormError((error as Error).message || 'Error al actualizar usuario');
    } finally {
      setIsEditingUser(false);
    }
  };

  // Eliminar usuario
  const openDeleteDialog = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
    setDeleteError(null);
  };

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setUserToDelete(null);
    setDeleteError(null);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeletingUser(true);
    setDeleteError(null);

    try {
      await deleteDoc(doc(db, 'users', userToDelete.uid));
      setUsers((prev) => prev.filter((user) => user.uid !== userToDelete.uid));
      closeDeleteDialog();

      // Mensaje personalizado con nombre y apellidos en negrita
      const fullName = `${userToDelete.name} ${userToDelete.lastname}`.trim();
      setSnackbarMessage(
        createElement(
          Fragment,
          null,
          'El usuario ',
          createElement('strong', null, fullName),
          ' se eliminó correctamente'
        )
      );
      setSnackbarOpen(true);
      triggerVibration(100);
    } catch (error: Error | unknown) {
      console.error('Error deleting user:', error);
      setDeleteError((error as Error).message || 'Error al eliminar usuario');
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Paginación
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Búsqueda
  const handleSearchIconClick = () => {
    setShowSearchInput(true);
  };

  const handleClickAwaySearch = () => {
    if (!searchTerm) {
      setShowSearchInput(false);
    }
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handlePrioritizeResponsablesChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPrioritizeResponsables(event.target.checked);
    setPage(0);
  };

  // Contacto
  const handleOpenContactDialog = (user: User) => {
    setSelectedUser(user);
    setContactDialogOpen(true);
  };

  const handleCloseContactDialog = () => {
    setContactDialogOpen(false);
    setSelectedUser(null);
  };

  // Detalles de usuario
  const handleOpenUserDetailDialog = (user: User) => {
    setDetailUser(user);
    setUserDetailDialogOpen(true);
  };

  const handleCloseUserDetailDialog = () => {
    setUserDetailDialogOpen(false);
    setDetailUser(null);
  };

  return {
    users,
    loading,
    isAddDialogOpen,
    setIsAddDialogOpen,
    snackbarOpen,
    setSnackbarOpen,
    snackbarMessage,
    newUserInfo,
    setNewUserInfo,
    formError,
    deleteError,
    isDeleteDialogOpen,
    isEditDialogOpen,
    isAddingUser,
    isEditingUser,
    isDeletingUser,
    setIsEditDialogOpen,
    editUserInfo,
    setEditUserInfo,
    handleInputChange,
    handleAddUser,
    openDeleteDialog,
    closeDeleteDialog,
    openEditDialog,
    handleEditInputChange,
    handleEditUser,
    handleDeleteUser,
    contactDialogOpen,
    selectedUser,
    userDetailDialogOpen,
    detailUser,
    page,
    rowsPerPage,
    searchTerm,
    showSearchInput,
    handleSearchIconClick,
    handleClickAwaySearch,
    handleChangePage,
    handleChangeRowsPerPage,
    handleOpenContactDialog,
    handleCloseContactDialog,
    handleOpenUserDetailDialog,
    handleCloseUserDetailDialog,
    handleSearchChange,
    filteredUsers,
    prioritizeResponsables,
    handlePrioritizeResponsablesChange,
    handleEnabledSwitchChange,
    handleEditEnabledSwitchChange,
    addSubmitAttempted,
    editSubmitAttempted,
    handleAddRoleChange,
    handleEditRoleChange,
    memoizedSetNewUserInfo,
    memoizedSetEditUserInfo,
  };
};
