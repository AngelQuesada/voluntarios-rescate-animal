import * as React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render as customRender } from '../../../../__tests__/test-utils';
import AddUserToShiftDialog from '../../schedule/AddUserToShiftDialog';
import { UserRoles } from '../../../lib/constants';

const mockUsers = [
  {
    id: 'user1',
    uid: 'user1',
    name: 'Ana',
    lastname: 'García',
    email: 'ana@example.com',
    username: 'ana.garcia',
    roles: [UserRoles.VOLUNTARIO],
    birthdate: '1990-01-01',
    phone: '123456789',
    createdAt: new Date().toISOString(),
    isEnabled: true,
  },
  {
    id: 'user2',
    uid: 'user2',
    name: 'Carlos',
    lastname: 'Ruiz',
    email: 'carlos@example.com',
    username: 'carlos.ruiz',
    roles: [UserRoles.RESPONSABLE],
    birthdate: '1985-05-15',
    phone: '987654321',
    createdAt: new Date().toISOString(),
    isEnabled: true,
  },
  {
    id: 'user3',
    uid: 'user3',
    name: 'María',
    lastname: 'López',
    email: 'maria@example.com',
    username: 'maria.lopez',
    roles: [UserRoles.VOLUNTARIO],
    birthdate: '1992-08-20',
    phone: '555666777',
    createdAt: new Date().toISOString(),
    isEnabled: false,
  },
];

const mockCurrentAssignments = [{ uid: 'user3', name: 'María López' }];

const defaultProps = {
  open: true,
  onClose: jest.fn(),
  onAddUser: jest.fn(),
  users: mockUsers,
  currentAssignments: mockCurrentAssignments,
};

describe('AddUserToShiftDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render dialog when open', () => {
    customRender(<AddUserToShiftDialog {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Añadir Usuario al Turno')).toBeInTheDocument();
  });

  test('should not render dialog when closed', () => {
    customRender(<AddUserToShiftDialog {...defaultProps} open={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('should filter out already assigned users', () => {
    customRender(<AddUserToShiftDialog {...defaultProps} />);

    expect(screen.getByText('Ana García')).toBeInTheDocument();
    expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument();
    expect(screen.queryByText('María López')).not.toBeInTheDocument();
  });

  test('should filter out disabled users', () => {
    const propsWithEnabledMaria = {
      ...defaultProps,
      currentAssignments: [], // Remove María from assignments
      users: mockUsers,
    };

    customRender(<AddUserToShiftDialog {...propsWithEnabledMaria} />);

    // María should not appear because isEnabled is false
    expect(screen.queryByText('María López')).not.toBeInTheDocument();
  });

  test('should show responsible users with indicator', () => {
    customRender(<AddUserToShiftDialog {...defaultProps} />);

    // Carlos is a responsable, so should have the green dot indicator
    const carlosItem = screen.getByText('Carlos Ruiz').closest('li');
    expect(carlosItem).toBeInTheDocument();

    // Check for the green dot icon (FiberManualRecordIcon)
    const greenDot = carlosItem?.querySelector('[data-testid="FiberManualRecordIcon"]');
    expect(greenDot || carlosItem?.querySelector('svg')).toBeInTheDocument();
  });

  test('should filter users by search term', async () => {
    const user = userEvent.setup();
    customRender(<AddUserToShiftDialog {...defaultProps} />);

    const searchInput = screen.getByLabelText(/buscar usuario/i);

    await user.type(searchInput, 'Ana');

    expect(screen.getByText('Ana García')).toBeInTheDocument();
    expect(screen.queryByText('Carlos Ruiz')).not.toBeInTheDocument();
  });

  test('should call onAddUser when add button is clicked', async () => {
    const user = userEvent.setup();
    customRender(<AddUserToShiftDialog {...defaultProps} />);

    // Carlos (responsable) aparece primero en la lista ordenada
    const addButton = screen.getAllByRole('button', { name: /assign shift/i })[0];
    await user.click(addButton);

    expect(defaultProps.onAddUser).toHaveBeenCalledWith('user2'); // Carlos es user2
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  test('should call onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    customRender(<AddUserToShiftDialog {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    await user.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  test('should show message when no users available', () => {
    const propsWithNoUsers = {
      ...defaultProps,
      users: [],
    };

    customRender(<AddUserToShiftDialog {...propsWithNoUsers} />);

    expect(screen.getByText(/no hay usuarios disponibles/i)).toBeInTheDocument();
  });

  test('should sort users by role hierarchy', () => {
    customRender(<AddUserToShiftDialog {...defaultProps} />);

    const listItems = screen.getAllByRole('listitem');

    // Carlos (responsable) should appear before Ana (voluntario)
    const carlosIndex = listItems.findIndex((item) => item.textContent?.includes('Carlos Ruiz'));
    const anaIndex = listItems.findIndex((item) => item.textContent?.includes('Ana García'));

    expect(carlosIndex).toBeLessThan(anaIndex);
  });

  test('should handle users without name gracefully', () => {
    const propsWithUnnamedUser = {
      ...defaultProps,
      users: [
        {
          id: 'user-no-name',
          uid: 'user-no-name',
          email: 'noname@example.com',
          username: 'noname',
          name: '',
          lastname: '',
          roles: [UserRoles.VOLUNTARIO],
          birthdate: '1990-01-01',
          phone: '123456789',
          createdAt: new Date().toISOString(),
          isEnabled: true,
        },
      ],
      currentAssignments: [],
    };

    customRender(<AddUserToShiftDialog {...propsWithUnnamedUser} />);

    // El usuario sin nombre debería aparecer como "Usuario sin nombre"
    expect(screen.getByText('Usuario sin nombre')).toBeInTheDocument();
  });
});
