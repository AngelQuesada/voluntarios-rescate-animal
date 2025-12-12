import React from 'react';
import { Box, Typography, Tooltip, IconButton } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { UserRoles } from '@/lib/constants';
import { ShiftAssignment } from '@/store/api/shiftsApi';
import { CurrentUser, User } from '@/types/common';

interface ShiftAssignmentListProps {
  assignments: ShiftAssignment[];
  currentUser: CurrentUser | null;
  usersMap: { [uid: string]: User };
  dayKey: string;
  shiftKey: 'M' | 'T';
  onAddUserClick: (dayKey: string, shiftKey: 'M' | 'T') => void;
  onRemoveUserClick: (assignment: ShiftAssignment, dayKey: string, shiftKey: 'M' | 'T') => void;
  onVolunteerClick: (volunteer: ShiftAssignment) => void;
}

const ShiftAssignmentList: React.FC<ShiftAssignmentListProps> = ({
  assignments,
  currentUser,
  usersMap,
  dayKey,
  shiftKey,
  onAddUserClick,
  onRemoveUserClick,
  onVolunteerClick,
}) => {
  const isAdmin = currentUser?.roles?.includes(UserRoles.ADMINISTRADOR);

  const AddUserButton = () =>
    isAdmin ? (
      <Tooltip title="Añadir usuario a este turno" arrow>
        <Box
          data-testid="add-user-button"
          onClick={() => onAddUserClick(dayKey, shiftKey)}
          sx={{
            borderRadius: '8px',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'grey.300',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            minHeight: '24px',
            minWidth: '24px',
            '&:hover': {
              backgroundColor: 'grey.400',
              filter: 'brightness(0.95)',
            },
          }}
        >
          <PersonAddIcon sx={{ color: 'text.primary', fontSize: '1rem' }} />
        </Box>
      </Tooltip>
    ) : null;

  if (assignments.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Nadie asignado
          </Typography>
          {isAdmin && <AddUserButton />}
        </Box>
      </Box>
    );
  }

  const getRoleColor = (roles?: number[]) => {
    if (!roles) return 'text.secondary';
    if (roles.includes(UserRoles.RESPONSABLE)) return 'success.main';
    return 'primary.light';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 1,
          alignItems: 'center',
        }}
      >
        {assignments.map((assignment) => {
          const isCurrentUser = currentUser?.uid === assignment.uid;
          const roleColor = getRoleColor(assignment.roles);
          const userDetails = usersMap[assignment.uid];
          const assignmentName = userDetails?.name || assignment.name || 'Usuario';
          const assignmentLastname = userDetails?.lastName || '';
          const displayName = `${assignmentName}${assignmentLastname ? ' ' + assignmentLastname : ''}`;

          let canContact = false;
          if (!isCurrentUser && currentUser) {
            if (
              currentUser.roles?.includes(UserRoles.RESPONSABLE) ||
              currentUser.roles?.includes(UserRoles.ADMINISTRADOR)
            ) {
              canContact = true;
            } else if (currentUser.roles?.includes(UserRoles.VOLUNTARIO) || !currentUser.roles) {
              const userInThisShift = assignments.some((a) => a.uid === currentUser.uid);
              const targetIsResponsible = (assignment.roles ?? []).includes(UserRoles.RESPONSABLE);
              canContact = userInThisShift && targetIsResponsible;
            }
          }

          const Content = (
            <Box
              sx={{
                borderRadius: '8px',
                padding: '2px 6px',
                display: 'flex',
                alignItems: 'center',
                width: 'fit-content',
                backgroundColor: roleColor,
                cursor: canContact ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                '&:hover': canContact ? { filter: 'brightness(0.9)' } : undefined,
              }}
              data-testid="assignment-user-box"
            >
              <Typography
                variant="caption"
                onClick={() => canContact && onVolunteerClick(assignment)}
                sx={{
                  color: 'white',
                  fontWeight: isCurrentUser ? 600 : 400,
                  fontSize: '0.7rem',
                  userSelect: 'none',
                  cursor: canContact ? 'pointer' : 'default',
                  ...(isAdmin &&
                    userDetails?.isEnabled === false && {
                      textDecoration: 'line-through',
                      opacity: 0.7,
                    }),
                }}
              >
                {displayName}
                {isCurrentUser && ' (Tú)'}
              </Typography>
              {isAdmin && !isCurrentUser && (
                <IconButton
                  data-testid="unassign-user-button"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveUserClick(assignment, dayKey, shiftKey);
                  }}
                  sx={{
                    padding: '0px',
                    marginLeft: '4px',
                    color: 'white',
                    opacity: 0.8,
                    '&:hover': { opacity: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
                  }}
                  aria-label={`Eliminar a ${displayName} del turno`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z" />
                  </svg>
                </IconButton>
              )}
            </Box>
          );

          return canContact && !isAdmin ? (
            <Tooltip key={assignment.uid} title={`Contactar con ${displayName}`} arrow>
              {Content}
            </Tooltip>
          ) : (
            <React.Fragment key={assignment.uid}>{Content}</React.Fragment>
          );
        })}
        {isAdmin && <AddUserButton />}
      </Box>
    </Box>
  );
};

export default ShiftAssignmentList;
