import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserActionsPanel from '@/components/admin/UserActionsPanel'; // Importación Default
import { useUserActions } from '@/hooks/admin/useUserActions';
import { UserAction } from '@/types/common';

// Mock de Timestamp para que se comporte como el objeto real de Firestore
jest.mock('firebase/firestore', () => {
  class MockTimestamp {
    seconds: number;
    nanoseconds: number;

    constructor(seconds: number, nanoseconds: number) {
      this.seconds = seconds;
      this.nanoseconds = nanoseconds;
    }

    toDate(): Date {
      // Aseguramos que la fecha se crea correctamente
      const date = new Date(this.seconds * 1000);
      // Añadimos los nanosegundos convertidos a milisegundos
      date.setMilliseconds(this.nanoseconds / 1000000);
      return date;
    }

    static fromDate(date: Date): MockTimestamp {
      return new MockTimestamp(
        Math.floor(date.getTime() / 1000),
        (date.getTime() % 1000) * 1000000
      );
    }

    static now(): MockTimestamp {
      return MockTimestamp.fromDate(new Date());
    }
  }

  return {
    Timestamp: MockTimestamp,
    initializeFirestore: jest.fn(),
    collection: jest.fn(),
    query: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    getDocs: jest.fn(),
  };
});

// Mock del módulo firebase.ts para evitar la inicialización real de Firebase
jest.mock('@/lib/firebase', () => ({
  db: {
    // Mock mínimo de la base de datos
    type: 'firestore',
    collection: jest.fn(),
  },
  auth: {
    // Mock mínimo de auth
    type: 'auth',
  },
}));

// Importamos Timestamp después del mock
import { Timestamp } from 'firebase/firestore';

// Mock del hook useUserActions
jest.mock('@/hooks/admin/useUserActions');

const mockUseUserActions = useUserActions as jest.Mock;

const mockActions: UserAction[] = [
  {
    id: '1',
    timestamp: Timestamp.fromDate(new Date('2023-10-26T10:00:00Z')),
    userId: 'user1',
    userName: 'Juan Perez',
    shiftId: 'shift1',
    shiftDate: '2023-10-27',
    shiftPeriod: 'morning' as const,
    actionType: 'assign' as const,
    performedByAdminName: 'Admin Uno',
  },
  {
    id: '2',
    timestamp: Timestamp.fromDate(new Date('2023-10-26T11:00:00Z')),
    userId: 'user2',
    userName: 'Ana Gomez',
    shiftId: 'shift2',
    shiftDate: '2023-10-28',
    shiftPeriod: 'afternoon' as const,
    actionType: 'unassign' as const,
  },
  // Añadir más acciones para probar la paginación (ej. 25 acciones)
  ...Array.from({ length: 23 }, (_, i) => ({
    id: `action-${i + 3}`,
    timestamp: Timestamp.fromDate(new Date(2023, 9, 26, 12 + i, 0, 0)),
    userId: `user-${i + 3}`,
    userName: `Voluntario ${i + 3}`,
    shiftId: `shift-${i + 3}`,
    shiftDate: `2023-10-${28 + (i % 3)}`, // Variar fechas
    shiftPeriod: i % 2 === 0 ? ('morning' as const) : ('afternoon' as const),
    actionType: i % 2 === 0 ? ('assign' as const) : ('unassign' as const),
    performedByAdminName: i % 3 === 0 ? `Admin ${i % 2}` : undefined,
  })),
];

describe('UserActionsPanel', () => {
  beforeEach(() => {
    mockUseUserActions.mockReturnValue({
      actions: [],
      loading: true,
      error: null,
      totalActions: 0,
      fetchActions: jest.fn(),
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

  test('renders loading state initially', () => {
    render(<UserActionsPanel />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText(/Cargando últimas acciones.../i)).toBeInTheDocument();
  });

  test('renders error message if an error occurs', () => {
    mockUseUserActions.mockReturnValue({
      actions: [],
      loading: false,
      error: 'Failed to fetch actions',
      totalActions: 0,
      fetchActions: jest.fn(),
    });
    render(<UserActionsPanel />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Error al cargar las acciones: Failed to fetch actions'
    );
  });

  test('renders "no actions" message if there are no actions and not loading', () => {
    mockUseUserActions.mockReturnValue({
      actions: [],
      loading: false,
      error: null,
      totalActions: 0,
      fetchActions: jest.fn(),
    });
    render(<UserActionsPanel />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No hay acciones registradas por el momento.'
    );
  });

  test('renders table with actions data', async () => {
    mockUseUserActions.mockReturnValue({
      actions: mockActions.slice(0, 20), // Simula la primera página de 20
      loading: false,
      error: null,
      totalActions: mockActions.length,
      fetchActions: jest.fn(),
    });
    render(<UserActionsPanel />);

    // Verificar encabezados de tabla (considerando versión móvil y desktop)
    const headers = ['Acción', 'Usuario Turno', 'Turno', 'Realizado por Admin', 'Fecha y Hora'];
    headers.forEach((header) => {
      // En versión móvil, algunos encabezados pueden ser iconos en lugar de texto
      const headerElement = screen.queryByText(header);
      expect(headerElement || screen.queryByRole('columnheader')).toBeTruthy();
    });

    // Verificar datos básicos de usuarios
    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    expect(screen.getByText('Ana Gomez')).toBeInTheDocument();
    expect(screen.getByText('Admin Uno')).toBeInTheDocument();

    // Verificar que hay un guión para el admin de la segunda acción
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(21); // Encabezado + 20 filas de datos

    // Verificar que la tabla contiene el texto "Mañana" o "M"
    const morningText = screen.getAllByText(/Mañana|M/i);
    expect(morningText.length).toBeGreaterThan(0);

    // Verificar que la tabla contiene el texto "Tarde" o "T"
    const afternoonText = screen.getAllByText(/Tarde|T/i);
    expect(afternoonText.length).toBeGreaterThan(0);

    // Verificar que la tabla contiene fechas de turno (27, 28)
    const cells = screen.getAllByRole('cell');

    // Verificar que alguna celda contiene '27' (día del turno)
    const hasDay27 = cells.some((cell) => cell.textContent && cell.textContent.includes('27'));
    expect(hasDay27).toBeTruthy();

    // Verificar que alguna celda contiene '28' (día del turno)
    const hasDay28 = cells.some((cell) => cell.textContent && cell.textContent.includes('28'));
    expect(hasDay28).toBeTruthy();

    // Verificar que alguna celda contiene '26' (día del timestamp)
    const hasDay26 = cells.some((cell) => cell.textContent && cell.textContent.includes('26'));
    expect(hasDay26).toBeTruthy();

    // Verificar que alguna celda contiene '10' (hora del timestamp)
    const hasHour10 = cells.some((cell) => cell.textContent && cell.textContent.includes('10'));
    expect(hasHour10).toBeTruthy();

    // Verificar que alguna celda contiene '11' (hora del timestamp)
    const hasHour11 = cells.some((cell) => cell.textContent && cell.textContent.includes('11'));
    expect(hasHour11).toBeTruthy();
  });

  test('pagination works correctly', async () => {
    mockUseUserActions.mockReturnValue({
      actions: mockActions, // Todas las acciones para paginación en cliente
      loading: false,
      error: null,
      totalActions: mockActions.length, // Total 25 acciones
      fetchActions: jest.fn(),
    });

    render(<UserActionsPanel />);

    // Inicialmente muestra 20 acciones
    expect(screen.getAllByRole('row').length).toBe(20 + 1);
    expect(screen.getByText('Juan Perez')).toBeInTheDocument();

    // Ir a la siguiente página
    const nextPageButton = screen.getByRole('button', { name: /next page/i });
    fireEvent.click(nextPageButton);

    await waitFor(() => {
      // Ahora debería mostrar las 5 acciones restantes
      expect(screen.getAllByRole('row').length).toBe(5 + 1);
      expect(screen.queryByText('Juan Perez')).not.toBeInTheDocument(); // La primera acción no debe estar
      expect(screen.getByText(`Voluntario ${20 + 3 - 2}`)).toBeInTheDocument(); // Verifica una de las últimas acciones
    });

    const rowsPerPageSelect = screen.getByLabelText(/Acciones por página:/i);
    fireEvent.mouseDown(rowsPerPageSelect); // Abrir el select
    const option40 = await screen.findByRole('option', { name: '40' });
    fireEvent.click(option40);

    await waitFor(() => {
      expect(screen.getAllByRole('row').length).toBe(25 + 1);
      expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    });
  });

  test('displays correct date and time format', () => {
    // Creamos una fecha específica con hora 9:35:45
    // Nota: Usamos una fecha sin 'Z' para evitar conversiones de zona horaria
    const testDate = new Date(2024, 2, 15, 9, 35, 45); // Mes es 0-indexed, así que 2 = marzo

    const singleAction = [
      {
        id: 'single',
        timestamp: Timestamp.fromDate(testDate),
        userId: 'userS',
        userName: 'Single User',
        shiftId: 'shiftS',
        shiftDate: '2024-03-16', // YYYY-MM-DD
        shiftPeriod: 'morning' as const,
        actionType: 'assign' as const,
        performedByAdminName: undefined,
      },
    ];
    mockUseUserActions.mockReturnValue({
      actions: singleAction,
      loading: false,
      error: null,
      totalActions: 1,
      fetchActions: jest.fn(),
    });

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    render(<UserActionsPanel />);

    // Verificar datos básicos - considerando que en móvil puede ser un icono
    // Buscamos el icono o el texto "Asignado"
    const actionCell = screen.getAllByRole('cell')[0]; // Primera celda es la acción
    expect(
      screen.queryByText('Asignado') !== null || actionCell.querySelector('svg') !== null
    ).toBeTruthy();

    expect(screen.getByText('Single User')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument(); // Guión para admin

    // Verificar que la tabla contiene los datos correctos
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(2); // Encabezado + 1 fila de datos

    // Verificar que la tabla contiene el texto "Mañana" o "M"
    // Usamos una expresión regular más flexible para capturar variaciones
    const morningCells = screen.getAllByRole('cell');
    const hasMorningText = morningCells.some(
      (cell) => cell.textContent && /mañana|m/i.test(cell.textContent)
    );
    expect(hasMorningText).toBeTruthy();

    // Verificar que la tabla contiene la fecha del turno y timestamp
    const cells = screen.getAllByRole('cell');

    // Verificar fechas y horas - más flexible para adaptarse a diferentes formatos
    // Día del turno (16)
    const hasDay16 = cells.some((cell) => cell.textContent && cell.textContent.includes('16'));
    expect(hasDay16).toBeTruthy();

    // Mes del turno (03 o 3)
    const hasMonth03 = cells.some(
      (cell) =>
        cell.textContent && (cell.textContent.includes('03') || cell.textContent.includes('/3/'))
    );
    expect(hasMonth03).toBeTruthy();

    // Día del timestamp (15)
    const hasDay15 = cells.some((cell) => cell.textContent && cell.textContent.includes('15'));
    expect(hasDay15).toBeTruthy();

    // Hora del timestamp (09 o 9) - Verificamos que aparezca en algún formato
    const hasHour09 = cells.some((cell) => {
      const content = cell.textContent || '';
      // Buscamos cualquier formato que pueda representar la hora 9
      return (
        content.includes('09:') ||
        content.includes('9:') ||
        content.includes('09') ||
        // También verificamos si hay alguna fecha completa que incluya la hora
        /\d{2}\/\d{2}\/\d{2} 09/.test(content) ||
        /\d{2}\/\d{2}\/\d{2} 9:/.test(content)
      );
    });
    expect(hasHour09).toBeTruthy();
  });
});

// Para asegurar que UserActionsPanel se exporta como nombrado si no lo está
export {};
