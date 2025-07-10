import { renderHook, act } from '@testing-library/react';
import { useShiftActions } from '../../schedule/useShiftActions';
import { UserRoles } from '@/lib/constants';

// Mock de Firebase Firestore
const mockAddDoc = jest.fn().mockResolvedValue({ id: 'mock-doc-id' });
const mockCollection = jest.fn().mockReturnValue('mocked-collection');

// Mock de Firebase
jest.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  initializeFirestore: jest.fn(),
  Timestamp: {
    now: jest.fn().mockReturnValue({
      toDate: jest.fn().mockReturnValue(new Date()),
    }),
  },
}));

// Mock de RTK Query
const mockModifyShift = jest.fn();
jest.mock('@/store/api/shiftsApi', () => ({
  useModifyShiftMutation: () => [mockModifyShift],
}));

// Mock vibration
jest.mock('@/lib/vibration', () => ({
  triggerVibration: jest.fn(),
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn(() => 'lunes 26 de mayo'),
  parseISO: jest.fn(),
}));

jest.mock('date-fns/locale', () => ({
  es: {},
}));

describe('useShiftActions Hook', () => {
  const mockCurrentUser = {
    uid: 'current-user-id',
    name: 'Juan',
    lastname: 'Pérez',
    email: 'juan@example.com',
    roles: [UserRoles.VOLUNTARIO],
    username: 'juan.perez',
    birthdate: '1990-01-01',
    phone: '123456789',
    isEnabled: true,
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    createdAt: new Date().toISOString(),
    providerId: 'firebase',
    providerData: [],
    refreshToken: '',
    tenantId: null,
    displayName: 'Juan Pérez',
    phoneNumber: '123456789',
    photoURL: null,
    delete: jest.fn(),
    getIdToken: jest.fn(),
    getIdTokenResult: jest.fn(),
    reload: jest.fn(),
    toJSON: jest.fn(),
  };

  const mockAdminUser = {
    ...mockCurrentUser,
    roles: [UserRoles.ADMINISTRADOR],
  };

  const mockUsersMap = {
    user1: {
      uid: 'user1',
      name: 'Ana',
      lastname: 'García',
      email: 'ana@example.com',
      username: 'ana.garcia',
      roles: [UserRoles.VOLUNTARIO],
      birthdate: '1990-01-01',
      phone: '123456789',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    user2: {
      uid: 'user2',
      name: 'Carlos',
      lastname: 'Ruiz',
      email: 'carlos@example.com',
      username: 'carlos.ruiz',
      roles: [UserRoles.RESPONSABLE],
      birthdate: '1990-01-01',
      phone: '123456789',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  const mockProcessedAssignments = {
    '2025-05-26': {
      M: [{ uid: 'user1', name: 'Ana García' }],
      T: [],
    },
  };

  const mockShowSnackbar = jest.fn();

  const defaultProps = {
    currentUser: mockCurrentUser,
    usersMap: mockUsersMap,
    processedAssignments: mockProcessedAssignments,
    showSnackbar: mockShowSnackbar,
    authLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockModifyShift.mockReturnValue({
      unwrap: jest.fn().mockResolvedValue({}),
    });

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  test('should initialize with default state', () => {
    const { result } = renderHook(() => useShiftActions(defaultProps));

    expect(result.current.isUpdatingShift).toEqual({});
    expect(result.current.confirmDialogOpen).toBe(false);
    expect(result.current.shiftToAction).toBeNull();
    expect(result.current.removeUserConfirmOpen).toBe(false);
    expect(result.current.userToRemoveDetails).toBeNull();
    expect(result.current.addUserDialogOpen).toBe(false);
    expect(result.current.shiftForUserAssignment).toBeNull();
    expect(result.current.isRemovingUser).toBe(false);
  });

  test('should show warning for incomplete profile', async () => {
    const incompleteUser = { ...mockCurrentUser, name: '', lastname: '' };
    const { result } = renderHook(() =>
      useShiftActions({ ...defaultProps, currentUser: incompleteUser })
    );

    await act(async () => {
      await result.current.executeModifyShift('2025-05-26', 'M', incompleteUser.uid, 'Test User');
    });

    expect(mockShowSnackbar).toHaveBeenCalledWith(
      'Perfil incompleto (nombre/apellido).',
      'warning'
    );
  });

  test('should show warning for unauthenticated user', async () => {
    const { result } = renderHook(() => useShiftActions({ ...defaultProps, currentUser: null }));

    await act(async () => {
      await result.current.executeModifyShift('2025-05-26', 'M', 'test-uid', 'Test User');
    });

    expect(mockShowSnackbar).toHaveBeenCalledWith('Usuario no autenticado.', 'warning');
  });

  test('should execute modify shift successfully for add action', async () => {
    const { result } = renderHook(() => useShiftActions(defaultProps));

    await act(async () => {
      await result.current.executeModifyShift('2025-05-26', 'M', 'user2', 'Carlos Ruiz', 'add');
    });

    expect(mockModifyShift).toHaveBeenCalledWith({
      dateKey: '2025-05-26',
      shiftKey: 'M',
      uid: 'user2',
      name: '',
      performedByUid: 'current-user-id',
      action: 'add',
      isAdminAssignment: false,
    });

    expect(mockShowSnackbar).toHaveBeenCalledWith(expect.anything(), 'success');
  });

  test('should execute modify shift successfully for remove action', async () => {
    const { result } = renderHook(() => useShiftActions(defaultProps));

    await act(async () => {
      await result.current.executeModifyShift('2025-05-26', 'M', 'user1', 'Ana García', 'remove');
    });

    expect(mockModifyShift).toHaveBeenCalledWith({
      dateKey: '2025-05-26',
      shiftKey: 'M',
      uid: 'user1',
      name: '',
      action: 'remove',
      performedByUid: 'current-user-id',
      isAdminAssignment: false,
    });

    expect(mockShowSnackbar).toHaveBeenCalledWith(expect.anything(), 'info');
  });

  test('should handle modify shift error', async () => {
    mockModifyShift.mockReturnValue({
      unwrap: jest.fn().mockRejectedValue(new Error('Network error')),
    });

    const { result } = renderHook(() => useShiftActions(defaultProps));

    await act(async () => {
      await result.current.executeModifyShift('2025-05-26', 'M', 'user2', 'Carlos Ruiz', 'add');
    });

    expect(mockShowSnackbar).toHaveBeenCalledWith(expect.anything(), 'error');
  });

  test('should initiate shift action for user not assigned', async () => {
    const { result } = renderHook(() => useShiftActions(defaultProps));

    await act(async () => {
      await result.current.initiateShiftAction('2025-05-26', 'T'); // Turno tarde vacío
    });

    expect(mockModifyShift).toHaveBeenCalledWith({
      dateKey: '2025-05-26',
      shiftKey: 'T',
      uid: mockCurrentUser.uid,
      name: '',
      action: 'add',
      performedByUid: 'current-user-id',
      isAdminAssignment: false,
    });
  });

  test('should initiate shift action for user already assigned', async () => {
    // Usuario ya asignado al turno de mañana
    const assignmentsWithCurrentUser = {
      '2025-05-26': {
        M: [
          { uid: 'user1', name: 'Ana García' },
          { uid: mockCurrentUser.uid, name: 'Juan Pérez' },
        ],
        T: [],
      },
    };

    const { result } = renderHook(() =>
      useShiftActions({ ...defaultProps, processedAssignments: assignmentsWithCurrentUser })
    );

    await act(async () => {
      await result.current.initiateShiftAction('2025-05-26', 'M');
    });

    expect(mockModifyShift).toHaveBeenCalledWith({
      dateKey: '2025-05-26',
      shiftKey: 'M',
      uid: mockCurrentUser.uid,
      name: '',
      action: 'remove',
      performedByUid: 'current-user-id',
      isAdminAssignment: false,
    });
  });

  test('should open confirmation dialog when shift is full', async () => {
    // Turno con 3 usuarios (máximo)
    const fullShiftAssignments = {
      '2025-05-26': {
        M: [
          { uid: 'user1', name: 'Ana García' },
          { uid: 'user2', name: 'Carlos Ruiz' },
          { uid: 'user3', name: 'María López' },
        ],
        T: [],
      },
    };

    const { result } = renderHook(() =>
      useShiftActions({ ...defaultProps, processedAssignments: fullShiftAssignments })
    );

    await act(async () => {
      await result.current.initiateShiftAction('2025-05-26', 'M');
    });

    expect(result.current.confirmDialogOpen).toBe(true);
    expect(result.current.shiftToAction).toEqual({
      dateKey: '2025-05-26',
      shiftKey: 'M',
    });
  });

  test('should confirm shift action and add user to full shift', async () => {
    const { result } = renderHook(() => useShiftActions(defaultProps));

    // Simular que el diálogo de confirmación está abierto
    act(() => {
      result.current.setIsUpdatingShift({});
    });

    // Simular estado interno del hook
    await act(async () => {
      await result.current.initiateShiftAction('2025-05-26', 'T');
    });

    await act(async () => {
      await result.current.confirmShiftAction();
    });

    expect(mockModifyShift).toHaveBeenCalled();
  });

  test('should cancel shift action', () => {
    const { result } = renderHook(() => useShiftActions(defaultProps));

    act(() => {
      result.current.cancelShiftAction();
    });

    expect(result.current.confirmDialogOpen).toBe(false);
    expect(result.current.shiftToAction).toBeNull();
  });

  test('should handle remove user click (admin only)', () => {
    const { result } = renderHook(() =>
      useShiftActions({ ...defaultProps, currentUser: mockAdminUser })
    );

    const assignment = { uid: 'user1', name: 'Ana García' };

    act(() => {
      result.current.handleRemoveUserClick(assignment, '2025-05-26', 'M');
    });

    expect(result.current.removeUserConfirmOpen).toBe(true);
    expect(result.current.userToRemoveDetails).toEqual({
      uid: 'user1',
      name: 'Ana García',
      dateKey: '2025-05-26',
      shiftKey: 'M',
    });
  });

  test('should handle add user button click (admin only)', () => {
    const { result } = renderHook(() =>
      useShiftActions({ ...defaultProps, currentUser: mockAdminUser })
    );

    act(() => {
      result.current.handleAddUserButtonClick('2025-05-26', 'M');
    });

    expect(result.current.addUserDialogOpen).toBe(true);
    expect(result.current.shiftForUserAssignment).toEqual({
      dateKey: '2025-05-26',
      shiftKey: 'M',
    });
  });

  test('should not handle admin actions for non-admin users', () => {
    const { result } = renderHook(() => useShiftActions(defaultProps));

    act(() => {
      result.current.handleAddUserButtonClick('2025-05-26', 'M');
    });

    expect(result.current.addUserDialogOpen).toBe(false);
    expect(result.current.shiftForUserAssignment).toBeNull();
  });

  test('should handle auth loading state', async () => {
    const { result } = renderHook(() => useShiftActions({ ...defaultProps, authLoading: true }));

    await act(async () => {
      await result.current.initiateShiftAction('2025-05-26', 'M');
    });

    expect(mockShowSnackbar).toHaveBeenCalledWith(
      'Usuario no disponible o no autenticado.',
      'warning'
    );
  });

  test('should confirm add user to shift (admin only)', async () => {
    const { result } = renderHook(() =>
      useShiftActions({ ...defaultProps, currentUser: mockAdminUser })
    );

    // Simular que el diálogo está abierto
    act(() => {
      result.current.handleAddUserButtonClick('2025-05-26', 'M');
    });

    await act(async () => {
      await result.current.confirmAddUserToShift('user2');
    });

    expect(mockModifyShift).toHaveBeenCalledWith({
      dateKey: '2025-05-26',
      shiftKey: 'M',
      uid: 'user2',
      name: '',
      action: 'add',
      performedByUid: 'current-user-id',
      isAdminAssignment: true,
    });
  });

  test('should handle user not found in add user action', async () => {
    const { result } = renderHook(() =>
      useShiftActions({ ...defaultProps, currentUser: mockAdminUser })
    );

    // Simular que el diálogo está abierto
    act(() => {
      result.current.handleAddUserButtonClick('2025-05-26', 'M');
    });

    await act(async () => {
      await result.current.confirmAddUserToShift('non-existent-user');
    });

    expect(mockShowSnackbar).toHaveBeenCalledWith('Usuario no encontrado.', 'error');
  });
});
