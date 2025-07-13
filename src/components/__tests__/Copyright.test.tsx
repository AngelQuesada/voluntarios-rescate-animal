import { render, screen } from '@testing-library/react';
import Copyright from '@/components/Copyright';

describe('Copyright Component', () => {
  test('should render copyright text with current year', () => {
    render(<Copyright />);

    const currentYear = new Date().getFullYear();
    expect(screen.getByText(/Copyright ©/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(currentYear.toString()))).toBeInTheDocument();
  });

  test('should render link to Rescate Animal Granada', () => {
    render(<Copyright />);

    const link = screen.getByRole('link', { name: /rescate animal granada/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '#');
  });

  test('should have correct styling classes', () => {
    render(<Copyright />);

    const typography = screen.getByText(/Copyright ©/).closest('p');
    expect(typography).toHaveClass('MuiTypography-root');
  });
});
