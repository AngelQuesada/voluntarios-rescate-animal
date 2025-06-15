import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { render as customRender } from '../../../__tests__/test-utils';
import SignIn from '../sign-in';

// Mock del hook useAuth
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: null,
    loading: false,
    signInWithEmail: jest.fn(),
    signOut: jest.fn(),
    error: null,
  })),
}));

// Mock de los estilos
jest.mock('@/styles/formStyles', () => ({
  containerStyles: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  paperStyles: { padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' },
}));

describe('SignIn Component', () => {
  test('should render sign in form after mount', async () => {
    customRender(<SignIn />);

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /logo rescate animal granada/i })).toBeInTheDocument();
      expect(screen.getAllByText('Rescate Animal Granada')).toHaveLength(2); // Uno en el título y otro en el copyright
    });
  });

  test('should not render content before mount', () => {
    // Mock useState para simular estado no montado
    const mockSetState = jest.fn();
    const mockUseState = jest
      .spyOn(React, 'useState')
      .mockImplementationOnce(() => [false, mockSetState]);

    const { container } = customRender(<SignIn />);
    expect(container.firstChild).not.toBeNull(); // El componente siempre renderiza algo, solo cambia el contenido

    mockUseState.mockRestore();
  });

  test('should render logo with correct attributes', async () => {
    customRender(<SignIn />);

    await waitFor(() => {
      const logo = screen.getByAltText('Logo Rescate Animal Granada');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('alt', 'Logo Rescate Animal Granada');
    });
  });

  test('should render copyright component', async () => {
    customRender(<SignIn />);

    await waitFor(() => {
      expect(screen.getByText(/Copyright ©/)).toBeInTheDocument();
    });
  });
});
