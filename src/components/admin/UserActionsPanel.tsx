'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  Typography,
  CircularProgress,
  Box,
  Alert,
} from '@mui/material';
import {
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
  Event as EventIcon,
  AddCircle as AddCircleIcon,
  RemoveCircle as RemoveCircleIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  GroupAdd as GroupAddIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useUserActions } from '@/hooks/admin/useUserActions';
import { useIsMobile } from '@/hooks/use-mobile';

const UserActionsPanel: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const { actions, loading, error, totalActions } = useUserActions();
  const [dataLoaded, setDataLoaded] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!loading && actions.length > 0) {
      setDataLoaded(true);
    }
  }, [loading, actions]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedActions = useMemo(() => {
    return actions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [actions, page, rowsPerPage]);

  if (loading && !dataLoaded) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando últimas acciones...</Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Error al cargar las acciones: {error}</Alert>;
  }

  if (!dataLoaded && actions.length === 0 && !loading) {
    return <Alert severity="info">No hay acciones registradas por el momento.</Alert>;
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer>
        <Table stickyHeader aria-label="user actions table" size={isMobile ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ padding: isMobile ? '8px 4px' : '16px', textAlign: 'center' }}>
                {isMobile ? (
                  <Box display="flex" justifyContent="center">
                    <GroupAddIcon fontSize="small" />
                  </Box>
                ) : (
                  'Acción'
                )}
              </TableCell>
              <TableCell
                sx={{
                  padding: isMobile ? '8px 4px' : '16px',
                  textAlign: isMobile ? 'center' : 'left',
                }}
              >
                {isMobile ? (
                  <Box display="flex" justifyContent="center">
                    <PersonIcon fontSize="small" />
                  </Box>
                ) : (
                  'Usuario Turno'
                )}
              </TableCell>
              <TableCell
                sx={{
                  padding: isMobile ? '8px 4px' : '16px',
                  textAlign: isMobile ? 'center' : 'left',
                }}
              >
                {isMobile ? (
                  <Box display="flex" justifyContent="center">
                    <EventIcon fontSize="small" />
                  </Box>
                ) : (
                  'Turno'
                )}
              </TableCell>
              <TableCell
                sx={{
                  padding: isMobile ? '8px 4px' : '16px',
                  textAlign: isMobile ? 'center' : 'left',
                }}
              >
                {isMobile ? (
                  <Box display="flex" justifyContent="center">
                    <AdminPanelSettingsIcon fontSize="small" />
                  </Box>
                ) : (
                  'Realizado por Admin'
                )}
              </TableCell>
              <TableCell
                sx={{
                  padding: isMobile ? '8px 4px' : '16px',
                  textAlign: isMobile ? 'center' : 'left',
                }}
              >
                {isMobile ? (
                  <Box display="flex" justifyContent="center">
                    <AccessTimeIcon fontSize="small" />
                  </Box>
                ) : (
                  'Fecha y Hora'
                )}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedActions.map((action) => (
              <TableRow hover key={action.id}>
                <TableCell
                  sx={{
                    padding: isMobile ? '8px 4px' : '16px',
                    fontSize: isMobile ? '0.75rem' : 'inherit',
                    textAlign: 'center',
                  }}
                >
                  {action.actionType === 'assign' ? (
                    <Box display="flex" alignItems="center" justifyContent="center">
                      {isMobile ? (
                        <GroupAddIcon color="success" fontSize="small" />
                      ) : (
                        <AddCircleIcon color="success" fontSize="small" />
                      )}
                      {!isMobile && (
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          Asignado
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Box display="flex" alignItems="center" justifyContent="center">
                      <RemoveCircleIcon color="error" fontSize="small" />
                      {!isMobile && (
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          Desasignado
                        </Typography>
                      )}
                    </Box>
                  )}
                </TableCell>
                <TableCell
                  sx={{
                    padding: isMobile ? '8px 4px' : '16px',
                    maxWidth: isMobile ? '60px' : 'none',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontSize: isMobile ? '0.75rem' : 'inherit',
                    textAlign: isMobile ? 'center' : 'left',
                  }}
                >
                  {action.userName}
                </TableCell>
                <TableCell
                  sx={{
                    padding: isMobile ? '8px 4px' : '16px',
                    whiteSpace: isMobile ? 'nowrap' : 'normal',
                    fontSize: isMobile ? '0.75rem' : 'inherit',
                    textAlign: isMobile ? 'center' : 'left',
                  }}
                >
                  {format(new Date(action.shiftDate), 'dd/MM/yy', { locale: es })}
                  {' - '}
                  {action.shiftPeriod === 'morning'
                    ? isMobile
                      ? 'M'
                      : 'Mañana'
                    : isMobile
                      ? 'T'
                      : 'Tarde'}
                </TableCell>
                <TableCell
                  sx={{
                    padding: isMobile ? '8px 4px' : '16px',
                    maxWidth: isMobile ? '60px' : 'none',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontSize: isMobile ? '0.75rem' : 'inherit',
                    textAlign: isMobile ? 'center' : 'left',
                  }}
                >
                  {action.performedByAdminName || '-'}
                </TableCell>
                <TableCell
                  sx={{
                    padding: isMobile ? '8px 4px' : '16px',
                    whiteSpace: isMobile ? 'nowrap' : 'normal',
                    fontSize: isMobile ? '0.75rem' : 'inherit',
                    textAlign: isMobile ? 'center' : 'left',
                  }}
                >
                  {action.timestamp ? (
                    isMobile ? (
                      <>
                        <div>{format(action.timestamp.toDate(), 'dd/MM/yy', { locale: es })}</div>
                        <div>{format(action.timestamp.toDate(), 'HH:mm:ss', { locale: es })}</div>
                      </>
                    ) : (
                      format(action.timestamp.toDate(), 'dd/MM/yy HH:mm:ss', { locale: es })
                    )
                  ) : (
                    'Fecha desconocida'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={isMobile ? [10, 20] : [20, 40, 60]}
        component="div"
        count={totalActions} // Usar el total de las (hasta) 60 acciones
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage={isMobile ? 'Por pág:' : 'Acciones por página:'}
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to}${isMobile ? '' : ` de ${count !== -1 ? count : `más de ${to}`}`}`
        }
        sx={{
          '.MuiTablePagination-selectLabel': {
            margin: isMobile ? 0 : undefined,
          },
          '.MuiTablePagination-displayedRows': {
            margin: isMobile ? 0 : undefined,
          },
        }}
      />
    </Paper>
  );
};

export default UserActionsPanel;
