import { renderHook, act } from '@testing-library/react';
import { useUserActions } from '@/hooks/admin/useUserActions';
import { db } from '@/lib/firebase'; // Necesitaremos mockear esto
import { collection, orderBy, limit, getDocs } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';

// Mockear Firestore
jest.mock('@/lib/firebase', () => ({
  db: {}, // Mock de la instancia db
}));

jest.mock('firebase/firestore', () => {
  const originalModule = jest.requireActual('firebase/firestore');
  return {
    ...originalModule,
    collection: jest.fn(),
    query: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    getDocs: jest.fn(),
  };
});

const mockGetDocs = getDocs as jest.Mock;

describe('useUserActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and set actions correctly', async () => {
    const mockActions = [
      {
        id: '1',
        data: () => ({
          userId: 'user1',
          userName: 'Test User 1',
          shiftId: 's1',
          shiftDate: '2023-01-01',
          shiftPeriod: 'morning',
          actionType: 'assign',
          timestamp: Timestamp.fromDate(new Date('2023-01-01T10:00:00Z')),
        }),
      },
      {
        id: '2',
        data: () => ({
          userId: 'user2',
          userName: 'Test User 2',
          shiftId: 's2',
          shiftDate: '2023-01-02',
          shiftPeriod: 'afternoon',
          actionType: 'unassign',
          timestamp: Timestamp.fromDate(new Date('2023-01-02T12:00:00Z')),
        }),
      },
    ];
    mockGetDocs.mockResolvedValue({
      forEach: (callback: (doc: any) => void) => mockActions.forEach(callback),
      docs: mockActions, // Añadido para que coincida con algunos usos de querySnapshot
      empty: false, // Añadido
      size: mockActions.length, // Añadido
    });

    let hookResult;
    await act(async () => {
      hookResult = renderHook(() => useUserActions());
    });

    // @ts-ignore
    const { result } = hookResult;

    // Esperar a que se resuelva la promesa de fetchActions
    // @ts-ignore
    await act(async () => {
      await hookResult.rerender();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.actions.length).toBe(2);
    expect(result.current.actions[0].userName).toBe('Test User 1');
    expect(result.current.totalActions).toBe(2);
    expect(result.current.error).toBeNull();

    expect(collection).toHaveBeenCalledWith(db, 'userActions');
    expect(orderBy).toHaveBeenCalledWith('timestamp', 'desc');
    expect(limit).toHaveBeenCalledWith(60);
    expect(getDocs).toHaveBeenCalled();
  });

  it('should handle errors from Firestore', async () => {
    const errorMessage = 'Firestore error';
    mockGetDocs.mockRejectedValue(new Error(errorMessage));

    let hookResult;
    await act(async () => {
      hookResult = renderHook(() => useUserActions());
    });
    // @ts-ignore
    await act(async () => {
      await hookResult.rerender();
    });
    // @ts-ignore
    const { result } = hookResult;

    expect(result.current.loading).toBe(false);
    expect(result.current.actions.length).toBe(0);
    expect(result.current.error).toBe(errorMessage);
  });

  it('should return empty actions if Firestore returns no data', async () => {
    mockGetDocs.mockResolvedValue({ forEach: jest.fn(), docs: [], empty: true, size: 0 });

    let hookResult;
    await act(async () => {
      hookResult = renderHook(() => useUserActions());
    });
    // @ts-ignore
    await act(async () => {
      await hookResult.rerender();
    });
    // @ts-ignore
    const { result } = hookResult;

    expect(result.current.loading).toBe(false);
    expect(result.current.actions.length).toBe(0);
    expect(result.current.totalActions).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('should call fetchActions on mount', async () => {
    mockGetDocs.mockResolvedValue({ forEach: jest.fn(), docs: [], empty: true, size: 0 });
    await act(async () => {
      renderHook(() => useUserActions());
    });
    expect(getDocs).toHaveBeenCalledTimes(1);
  });

  it('should provide a fetchActions function to refetch data', async () => {
    mockGetDocs.mockResolvedValueOnce({ forEach: jest.fn(), docs: [], empty: true, size: 0 }); // Primera llamada

    const mockActionsTwo = [
      {
        id: '3',
        data: () => ({
          userId: 'user3',
          userName: 'Test User 3',
          shiftId: 's3',
          shiftDate: '2023-01-03',
          shiftPeriod: 'morning',
          actionType: 'assign',
          timestamp: Timestamp.fromDate(new Date('2023-01-03T10:00:00Z')),
        }),
      },
    ];
    mockGetDocs.mockResolvedValueOnce({
      // Segunda llamada
      forEach: (callback: (doc: any) => void) => mockActionsTwo.forEach(callback),
      docs: mockActionsTwo,
      empty: false,
      size: mockActionsTwo.length,
    });

    let hookResult;
    await act(async () => {
      hookResult = renderHook(() => useUserActions());
    });
    // @ts-ignore
    await act(async () => {
      // Esperar a la primera carga
      await hookResult.rerender();
    });

    // @ts-ignore
    expect(hookResult.result.current.actions.length).toBe(0);

    await act(async () => {
      // @ts-ignore
      hookResult.result.current.fetchActions();
    });
    // @ts-ignore
    await act(async () => {
      // Esperar a la segunda carga
      await hookResult.rerender();
    });

    // @ts-ignore
    expect(hookResult.result.current.actions.length).toBe(1);
    // @ts-ignore
    expect(hookResult.result.current.actions[0].userName).toBe('Test User 3');
    expect(getDocs).toHaveBeenCalledTimes(2); // fetchActions fue llamado dos veces
  });
});
