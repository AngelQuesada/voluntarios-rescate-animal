// Niveles de roles de usuario
export const UserRoles = {
  VOLUNTARIO: 1,
  RESPONSABLE: 2,
  ADMINISTRADOR: 3,
} as const;

// Mapeo de niveles a nombres de roles
const RoleNames = {
  [UserRoles.VOLUNTARIO]: 'voluntario',
  [UserRoles.RESPONSABLE]: 'responsable',
  [UserRoles.ADMINISTRADOR]: 'administrador',
} as const;

// Función para obtener el nombre del rol a partir del nivel
export function getRoleName(level: number): string {
  return RoleNames[level as keyof typeof RoleNames] || 'voluntario';
}
