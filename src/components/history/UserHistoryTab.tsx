import React, { useState, useMemo, FC, useEffect, ChangeEvent } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';
import { formatDate } from '@/lib/utils';
import { useUserHistory, UserHistoryShift } from '@/hooks/history/useUserHistory';

const renderShiftsTable = (
  shiftsData: UserHistoryShift[],
  currentPage: number,
  totalPages: number,
  handlePageChange: (event: ChangeEvent<unknown>, value: number) => void,
  itemsPerPage: number
) => {
  const paginatedShifts = shiftsData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Si no hay turnos...
  if (shiftsData.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: 2 }}>
        No hay turnos para mostrar.
      </Typography>
    );
  }

  if (paginatedShifts.length === 0 && shiftsData.length > 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: 2 }}>
        No hay más turnos para mostrar en esta página.
      </Typography>
    );
  }

  return (
    <>
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Turno</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedShifts.map((shift) => (
              <TableRow key={shift.id}>
                <TableCell>{formatDate(shift.date)}</TableCell>
                <TableCell>{shift.area}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {totalPages > 1 && (
        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2, mb: 2 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            size="small"
          />
        </Stack>
      )}
    </>
  );
};

interface UserHistoryTabProps {
  currentUser: { uid: string; email?: string; displayName?: string; photoURL?: string } | null;
}

const ITEMS_PER_PAGE = 10;

const UserHistoryTab: FC<UserHistoryTabProps> = ({ currentUser }) => {
  const { shifts, isLoading, isFetching, error } = useUserHistory({ userId: currentUser?.uid });

  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = useMemo(() => {
    return Math.ceil(shifts.length / ITEMS_PER_PAGE);
  }, [shifts]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    } else if (shifts.length === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [shifts, currentPage, totalPages]);

  const handlePageChange = (event: ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
  };

  if (isLoading || isFetching) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">
          Error al cargar el historial de turnos. Por favor, inténtelo de nuevo más tarde.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      {' '}
      {/* Responsive padding */}
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Mi historial de turnos
      </Typography>
      {renderShiftsTable(shifts, currentPage, totalPages, handlePageChange, ITEMS_PER_PAGE)}
    </Box>
  );
};

export default UserHistoryTab;
