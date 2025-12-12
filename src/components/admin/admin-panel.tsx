'use client';

import React, { useState, Suspense, lazy, useMemo } from 'react';
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Box,
  Container,
  Tooltip,
  TablePagination,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import { Header } from '@/components/schedule/header';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import PeopleIcon from '@mui/icons-material/People';
import CalendarViewWeekIcon from '@mui/icons-material/CalendarViewWeek';
import HistoryIcon from '@mui/icons-material/History';
import ListAltIcon from '@mui/icons-material/ListAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import { useAdminPanel } from '@/hooks/use-admin-panel';
import NotificationSnackbar from '../schedule/NotificationSnackbar';
import { UserRoles, getRoleName } from '@/lib/constants';
import DialogComponent from './DialogComponent';
import UserDetailDialog from './UserDetailDialog';
import ContactDialog from '../schedule/ContactDialog';
import UserForm from './UserForm';
import SearchInput from './SearchInput';
import WeekViewPanel from './WeekViewPanel';
import { useIsMobile } from '@/hooks/use-mobile';

const HistoryCalendar = lazy(() => import('../history/HistoryCalendar'));
const UserActionsPanel = lazy(() => import('./UserActionsPanel'));
const SettingsPanel = lazy(() => import('./SettingsPanel'));

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState(0);
  const {
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
    handleEditEnabledSwitchChange,
    handleEnabledSwitchChange,
    addSubmitAttempted,
    editSubmitAttempted,
    handleAddRoleChange,
    handleEditRoleChange,
    isAddingUser,
    isEditingUser,
    isDeletingUser,
  } = useAdminPanel();

  const isMobile = useIsMobile();

  const sortedFilteredUsers = useMemo(() => {
    return filteredUsers.sort((a, b) => {
      if (a.isEnabled !== false && b.isEnabled === false) return -1;
      if (a.isEnabled === false && b.isEnabled !== false) return 1;
      return `${a.name} ${a.lastName}`.localeCompare(`${b.name} ${b.lastName}`);
    });
  }, [filteredUsers]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const UsersTable = () => (
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          mb: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <SearchInput
            searchTerm={searchTerm}
            showSearchInput={showSearchInput}
            handleSearchChange={handleSearchChange}
            handleSearchIconClick={handleSearchIconClick}
            handleClickAwaySearch={handleClickAwaySearch}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsAddDialogOpen(true)}
            sx={{ flexShrink: 0 }}
          >
            Añadir Usuario
          </Button>
        </Box>
      </Box>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer>
          <Table stickyHeader aria-label="user table">
            <TableHead>
              <TableRow>
                <TableCell>Nombre Completo</TableCell>
                <TableCell align="center">Contactar</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from(new Array(rowsPerPage)).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          height: '24px',
                          width: '70%',
                          bgcolor: 'rgba(0, 0, 0, 0.08)',
                          borderRadius: 1,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          height: '24px',
                          width: '50%',
                          bgcolor: 'rgba(0, 0, 0, 0.08)',
                          borderRadius: 1,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          height: '24px',
                          width: '40%',
                          bgcolor: 'rgba(0, 0, 0, 0.08)',
                          borderRadius: 1,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No hay usuarios que coincidan con la búsqueda.
                  </TableCell>
                </TableRow>
              ) : (
                sortedFilteredUsers
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((user) => (
                    <TableRow
                      hover
                      role="checkbox"
                      tabIndex={-1}
                      key={user.uid}
                      sx={{
                        opacity: user.isEnabled === false ? 0.5 : 1,
                        '& .MuiTableCell-root': {
                          color: user.isEnabled === false ? 'text.disabled' : 'text.primary',
                        },
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography
                            variant="body1"
                            sx={{
                              cursor: 'pointer',
                              '&:hover': {
                                textDecoration: 'underline',
                                color: 'primary.main',
                              },
                              mr: 0.5,
                            }}
                            onClick={() => handleOpenUserDetailDialog(user)}
                          >
                            {`${user.name} ${user.lastName}`}
                          </Typography>
                          {Array.isArray(user.roles) &&
                            user.roles.includes(UserRoles.ADMINISTRADOR) && (
                              <Tooltip title={getRoleName(UserRoles.ADMINISTRADOR)} arrow>
                                <Box
                                  sx={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    backgroundColor: 'red',
                                    ml: 0.5,
                                  }}
                                />
                              </Tooltip>
                            )}
                          {Array.isArray(user.roles) &&
                            user.roles.includes(UserRoles.RESPONSABLE) && (
                              <Tooltip title={getRoleName(UserRoles.RESPONSABLE)} arrow>
                                <Box
                                  sx={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    backgroundColor: 'green',
                                    ml: 0.5,
                                  }}
                                />
                              </Tooltip>
                            )}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Contactar" arrow>
                          <IconButton
                            onClick={() => handleOpenContactDialog(user)}
                            size="small"
                            sx={{
                              color: 'primary.main',
                              '&:hover': {
                                backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                color: 'primary.dark',
                              },
                            }}
                          >
                            <ContactPhoneIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                          <Tooltip title="Editar" arrow>
                            <IconButton
                              onClick={() => openEditDialog(user)}
                              size="small"
                              sx={{
                                color: 'primary.main',
                                '&:hover': {
                                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                  color: 'primary.dark',
                                },
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar" arrow>
                            <IconButton
                              onClick={() => openDeleteDialog(user)}
                              size="small"
                              sx={{
                                color: 'error.main',
                                '&:hover': {
                                  backgroundColor: 'rgba(211, 47, 47, 0.08)',
                                  color: 'error.dark',
                                },
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[12, 25, 50]}
          component="div"
          count={filteredUsers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
        />
      </Paper>
    </>
  );

  return (
    <>
      <Header />

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant={isMobile ? 'standard' : 'fullWidth'}
              centered={isMobile}
              indicatorColor="primary"
              textColor="primary"
              aria-label="admin panel tabs"
            >
              <Tab label={isMobile ? '' : 'Usuarios'} icon={<PeopleIcon />} />
              <Tab label={isMobile ? '' : 'Vista Semanal'} icon={<CalendarViewWeekIcon />} />
              <Tab label={isMobile ? '' : 'Historial Voluntario'} icon={<HistoryIcon />} />
              <Tab label={isMobile ? '' : 'Últimas Acciones'} icon={<ListAltIcon />} />
              <Tab label={isMobile ? '' : 'Ajustes'} icon={<SettingsIcon />} />
            </Tabs>
          </Box>

          <TabPanel value={activeTab} index={0}>
            <UsersTable />
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <WeekViewPanel onUserClick={handleOpenUserDetailDialog} />
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <Suspense
              fallback={<CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />}
            >
              <HistoryCalendar />
            </Suspense>
          </TabPanel>

          <TabPanel value={activeTab} index={3}>
            <Suspense
              fallback={<CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />}
            >
              <UserActionsPanel />
            </Suspense>
          </TabPanel>

          <TabPanel value={activeTab} index={4}>
            <Suspense
              fallback={<CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />}
            >
              <SettingsPanel />
            </Suspense>
          </TabPanel>
        </Box>
      </Container>

      <NotificationSnackbar
        open={snackbarOpen}
        message={snackbarMessage}
        onClose={() => setSnackbarOpen(false)}
      />

      {contactDialogOpen && selectedUser && (
        <ContactDialog
          user={selectedUser}
          open={contactDialogOpen}
          onClose={handleCloseContactDialog}
        />
      )}

      {userDetailDialogOpen && detailUser && (
        <UserDetailDialog
          user={detailUser}
          open={userDetailDialogOpen}
          onClose={handleCloseUserDetailDialog}
        />
      )}

      <DialogComponent
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        title="Añadir nuevo usuario"
        content={
          <UserForm
            userData={newUserInfo}
            handleChange={handleInputChange}
            setUserData={setNewUserInfo}
            isAddMode={true}
            onRoleChange={handleAddRoleChange}
            submitAttempted={addSubmitAttempted}
            handleEnabledSwitchChange={handleEnabledSwitchChange}
          />
        }
        error={formError}
        actions={[
          { label: 'Cancelar', onClick: () => setIsAddDialogOpen(false) },
          {
            label: 'Añadir',
            onClick: handleAddUser,
            variant: 'contained',
            loading: isAddingUser,
          },
        ]}
      />

      <DialogComponent
        open={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        title="Editar Usuario"
        maxWidth="sm"
        error={formError}
        content={
          <UserForm
            userData={editUserInfo}
            handleChange={handleEditInputChange}
            setUserData={setEditUserInfo}
            isAddMode={false}
            handleEnabledSwitchChange={handleEditEnabledSwitchChange}
            onRoleChange={handleEditRoleChange}
            submitAttempted={editSubmitAttempted}
          />
        }
        actions={[
          { label: 'Cancelar', onClick: () => setIsEditDialogOpen(false) },
          {
            label: 'Guardar',
            onClick: handleEditUser,
            variant: 'contained',
            loading: isEditingUser,
          },
        ]}
      />

      <DialogComponent
        open={isDeleteDialogOpen}
        onClose={closeDeleteDialog}
        title="¿Eliminar usuario?"
        contentText="Esta acción no se puede deshacer. ¿Estás seguro de que deseas eliminar este usuario?"
        error={deleteError}
        actions={[
          { label: 'Cancelar', onClick: closeDeleteDialog },
          {
            label: 'Eliminar',
            onClick: handleDeleteUser,
            color: 'error',
            variant: 'contained',
            loading: isDeletingUser,
          },
        ]}
      />
    </>
  );
}
