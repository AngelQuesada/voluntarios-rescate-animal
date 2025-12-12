# Cómo verificar si estás autenticado en la aplicación

## Usando el hook useAuth

La aplicación ya cuenta con un sistema de autenticación implementado con Firebase Authentication. Para verificar si estás autenticado, puedes utilizar el hook `useAuth` que está disponible en el contexto de autenticación.

### Ejemplo de uso

```tsx
import { useAuth } from '@/context/AuthContext';

function MiComponente() {
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Cargando...</p>;
  }

  if (!user) {
    return <p>No has iniciado sesión</p>;
  }

  return (
    <div>
      <p>Has iniciado sesión como: {user.email}</p>
      {/* Resto del contenido para usuarios autenticados */}
    </div>
  );
}
```

## Comportamiento automático de redirección

El sistema de autenticación está configurado para redirigir automáticamente:

1. Si no estás autenticado, serás redirigido a la página de inicio (`/`).
2. Si estás autenticado y te encuentras en la página de inicio, serás redirigido a la página de horarios (`/schedule`).
3. Si intentas acceder a páginas administrativas sin tener el rol necesario, serás redirigido a `/schedule`.

## Información disponible del usuario autenticado

Cuando un usuario está autenticado, el objeto `user` contiene información como:

- `user.email`: Correo electrónico del usuario
- `user.uid`: Identificador único del usuario
- `user.name`: Nombre del usuario
- `user.lastName`: Apellido del usuario
- `user.roles`: Array de roles asignados al usuario (valores numéricos)

## Sistema de roles de usuario

La aplicación implementa un sistema de roles para controlar el acceso a diferentes funcionalidades:

| ID  | Nombre        | Descripción                          |
| --- | ------------- | ------------------------------------ |
| 1   | Voluntario    | Participación en turnos programados  |
| 2   | Responsable   | Coordinación de turnos y voluntarios |
| 3   | Administrador | Control total del sistema            |

### Verificación de roles

Para verificar si un usuario tiene un rol específico:

```tsx
import { UserRoles } from '@/lib/constants';
import { useAuth } from '@/context/AuthContext';

function ComponenteProtegido() {
  const { user } = useAuth();

  const isAdmin = user && Array.isArray(user.roles) && user.roles.includes(UserRoles.ADMINISTRADOR);

  if (!isAdmin) {
    return <p>No tienes permisos de administrador</p>;
  }

  return <p>Contenido solo para administradores</p>;
}
```

## Control de acceso basado en roles

Para proteger componentes o páginas completas según el rol del usuario, puedes utilizar el componente `RoleProtected`:

```tsx
import RoleProtected from '@/components/auth/RoleProtected';
import { UserRoles } from '@/lib/constants';

export default function AdminPage() {
  return (
    <RoleProtected requiredRoles={[UserRoles.ADMINISTRADOR]} fallbackUrl="/schedule">
      <main>{/* Contenido solo para administradores */}</main>
    </RoleProtected>
  );
}
```

## Estado de habilitación de usuarios

Los usuarios pueden ser habilitados o deshabilitados por los administradores. Un usuario deshabilitado no podrá iniciar sesión en el sistema.

Para verificar si un usuario está habilitado:

```tsx
const isEnabled = user && user.isEnabled !== false;
```

## Verificación visual

Puedes saber que estás autenticado si:

1. Puedes ver tu nombre de usuario en la cabecera de la aplicación
2. Tienes acceso a las páginas protegidas como `/schedule`
3. Puedes ver el botón de cerrar sesión en la esquina superior derecha

## Cerrar sesión

Para cerrar sesión, puedes hacer clic en el botón con el icono de salida (LogoutIcon) ubicado en la cabecera de la aplicación.
