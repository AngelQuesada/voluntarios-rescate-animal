# Documentación de API

Este documento detalla los endpoints de API disponibles en el Sistema de Gestión de Voluntariado para Rescate Animal.

## Información general

La API está construida utilizando las API Routes de Next.js y se comunica con Firebase para la persistencia de datos. Todos los endpoints requieren autenticación, a menos que se indique lo contrario.

### Configuración de Firebase Admin

La API utiliza Firebase Admin SDK con credenciales configuradas através de variables de entorno. Esto garantiza la seguridad tanto en desarrollo como en producción.

## Autenticación

La autenticación se implementa utilizando Firebase Authentication. Para acceder a los endpoints protegidos, se requiere incluir un token JWT válido en el encabezado de autorización:

```
Authorization: Bearer {token}
```

El token se puede obtener después de iniciar sesión a través de Firebase Authentication.

## Endpoints disponibles

### Usuarios

#### Obtener usuario actual

```
GET /api/users/me
```

Devuelve la información del usuario autenticado actualmente.

**Respuesta exitosa (200):**

```json
{
  "uid": "string",
  "displayName": "string",
  "email": "string",
  "photoURL": "string|null",
  "roles": "number[]",
  "isEnabled": "boolean",
  "name": "string",
  "lastName": "string",
  "userName": "string",
  "phone": "string",
  "location": "string|null",
  "occupation": "string|null",
  "birthDate": "string|null"
}
```

#### Obtener usuario por ID

```
GET /api/users/{uid}
```

Devuelve la información de un usuario específico. Requiere rol de administrador o ser el propio usuario.

**Respuesta exitosa (200):**

```json
{
  "uid": "string",
  "displayName": "string",
  "email": "string",
  "roles": "number[]",
  "isEnabled": "boolean",
  "name": "string",
  "lastName": "string",
  "userName": "string",
  "phone": "string",
  "location": "string|null",
  "occupation": "string|null",
  "birthDate": "string|null"
}
```

#### Crear usuario

```
POST /api/users
```

Crea un nuevo usuario. Requiere rol de administrador.

**Cuerpo de la solicitud:**

```json
{
  "email": "string",
  "password": "string",
  "name": "string",
  "lastName": "string",
  "userName": "string",
  "roles": "number[]",
  "phone": "string",
  "location": "string",
  "job": "string",
  "birthDate": "string",
  "isEnabled": "boolean"
}
```

**Respuesta exitosa (201):**

```json
{
  "uid": "string",
  "email": "string",
  "roles": "number[]",
  "isEnabled": "boolean"
}
```

#### Crear usuario (Firebase Auth y Firestore)

```
POST /api/create-user
```

Crea un nuevo usuario en Firebase Authentication y Firestore. Requiere rol de administrador.

**Cuerpo de la solicitud:**

```json
{
  "email": "string",
  "password": "string",
  "name": "string",
  "lastName": "string",
  "userName": "string",
  "phone": "string",
  "job": "string",
  "location": "string",
  "birthDate": "string",
  "roles": "number[]",
  "isEnabled": "boolean"
}
```

**Respuesta exitosa (200):**

```json
{
  "uid": "string",
  "email": "string",
  "userName": "string",
  "name": "string",
  "lastName": "string",
  "birthDate": "string",
  "phone": "string",
  "job": "string",
  "location": "string",
  "roles": "number[]",
  "isEnabled": "boolean",
  "createdAt": "string",
  "updatedAt": "string"
}
```

**Errores comunes:**

- **400**: Datos faltantes o inválidos
- **500**: Error al crear usuario en Firebase Auth o Firestore

#### Actualizar usuario

```
PUT /api/users/{uid}
```

Actualiza la información de un usuario existente. Requiere rol de administrador o ser el propio usuario. Los administradores pueden actualizar todos los campos, mientras que los usuarios normales solo pueden actualizar ciertos campos personales.

**Cuerpo de la solicitud:**

```json
{
  "name": "string",
  "lastName": "string",
  "userName": "string",
  "phone": "string",
  "location": "string",
  "job": "string",
  "birthDate": "string",
  "roles": "number[]",
  "isEnabled": "boolean"
}
```

**Respuesta exitosa (200):**

```json
{
  "uid": "string",
  "roles": "number[]",
  "isEnabled": "boolean",
  "message": "Usuario actualizado correctamente"
}
```

#### Eliminar usuario

```
DELETE /api/users/{uid}
```

Elimina un usuario. Requiere rol de administrador.

**Respuesta exitosa (200):**

```json
{
  "message": "Usuario eliminado correctamente"
}
```

#### Obtener todos los usuarios

```
GET /api/users
```

Obtiene la lista de todos los usuarios. Requiere rol de administrador.

**Parámetros de consulta opcionales:**

- `role`: Filtrar por rol específico (número)
- `enabled`: Filtrar por estado de habilitación (true/false)

**Respuesta exitosa (200):**

```json
[
  {
    "uid": "string",
    "displayName": "string",
    "email": "string",
    "roles": "number[]",
    "isEnabled": "boolean",
    "name": "string",
    "lastName": "string",
    "userName": "string"
  }
]
```

### Turnos

#### Obtener turnos por fecha

```
GET /api/shifts
```

Obtiene los turnos para un rango de fechas específico.

**Parámetros de consulta:**

- `startDate`: Fecha de inicio (formato YYYY-MM-DD)
- `endDate`: Fecha de fin (formato YYYY-MM-DD)

**Respuesta exitosa (200):**

```json
[
  {
    "id": "string",
    "date": "string",
    "period": "morning|afternoon",
    "capacity": "number",
    "assignments": [
      {
        "uid": "string",
        "name": "string",
        "timestamp": "number"
      }
    ],
    "notes": "string|null"
  }
]
```

#### Obtener turno específico

```
GET /api/shifts/{shiftId}
```

Obtiene información detallada de un turno específico.

**Respuesta exitosa (200):**

```json
{
  "id": "string",
  "date": "string",
  "period": "morning|afternoon",
  "capacity": "number",
  "assignments": [
    {
      "uid": "string",
      "name": "string",
      "timestamp": "number"
    }
  ],
  "notes": "string|null"
}
```

#### Crear o actualizar turno

```
POST /api/shifts
```

Crea un nuevo turno o actualiza uno existente. Requiere rol de responsable o administrador.

**Cuerpo de la solicitud:**

```json
{
  "date": "string",
  "period": "morning|afternoon",
  "capacity": "number",
  "notes": "string|null"
}
```

**Respuesta exitosa (201/200):**

```json
{
  "id": "string",
  "date": "string",
  "period": "morning|afternoon",
  "capacity": "number",
  "message": "Turno creado/actualizado correctamente"
}
```

#### Asignar voluntario a turno

```
POST /api/shifts/{shiftId}/assign
```

Asigna un usuario a un turno específico.

**Cuerpo de la solicitud:**

```json
{
  "uid": "string"
}
```

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "message": "Asignación realizada correctamente"
}
```

#### Desasignar voluntario de turno

```
POST /api/shifts/{shiftId}/unassign
```

Elimina la asignación de un usuario a un turno.

**Cuerpo de la solicitud:**

```json
{
  "uid": "string"
}
```

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "message": "Asignación eliminada correctamente"
}
```

### Historial

#### Obtener historial de turnos

```
GET /api/history
```

Obtiene el historial de turnos pasados. Requiere rol de administrador.

**Parámetros de consulta:**

- `startDate`: Fecha de inicio (formato YYYY-MM-DD)
- `endDate`: Fecha de fin (formato YYYY-MM-DD)

**Respuesta exitosa (200):**

```json
[
  {
    "id": "string",
    "date": "string",
    "period": "morning|afternoon",
    "capacity": "number",
    "assignments": [
      {
        "uid": "string",
        "name": "string",
        "timestamp": "number"
      }
    ]
  }
]
```

### Configuración

#### Obtener configuración de la aplicación

```
GET /api/settings
```

Obtiene la configuración general de la aplicación.

**Respuesta exitosa (200):**

```json
{
  "maxVolunteersPerShift": "number",
  "advanceBookingDays": "number",
  "cancelBeforeHours": "number",
  "shiftMorningStart": "string",
  "shiftMorningEnd": "string",
  "shiftAfternoonStart": "string",
  "shiftAfternoonEnd": "string"
}
```

#### Actualizar configuración de la aplicación

```
POST /api/settings
```

Actualiza la configuración de la aplicación. Requiere rol de administrador.

**Cuerpo de la solicitud:**

```json
{
  "maxVolunteersPerShift": "number",
  "advanceBookingDays": "number",
  "cancelBeforeHours": "number",
  "shiftMorningStart": "string",
  "shiftMorningEnd": "string",
  "shiftAfternoonStart": "string",
  "shiftAfternoonEnd": "string"
}
```

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "message": "Configuración actualizada correctamente"
}
```

## Códigos de error comunes

- **400 Bad Request**: La solicitud contiene datos incorrectos o mal formados
- **401 Unauthorized**: No autenticado o token inválido
- **403 Forbidden**: Autenticado pero sin permisos suficientes
- **404 Not Found**: El recurso solicitado no existe
- **409 Conflict**: Conflicto al procesar la solicitud (ej: email ya en uso)
- **500 Internal Server Error**: Error interno del servidor

## Limitaciones y consideraciones

1. Los tokens de autenticación tienen una duración limitada. Es recomendable refrescarlos periódicamente.
2. Las operaciones de administración (creación/eliminación de usuarios, etc.) solo están disponibles para usuarios con rol de administrador.
3. Las operaciones relacionadas con turnos pueden requerir diferentes niveles de permisos según la acción.
