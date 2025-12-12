# Esquema de Base de Datos

Este documento describe la estructura de la base de datos utilizada en el Sistema de Gestión de Voluntariado para Rescate Animal.

## Visión general

La aplicación utiliza Firebase Firestore, una base de datos NoSQL orientada a documentos. La estructura de datos está diseñada para optimizar las consultas más frecuentes y mantener la integridad de los datos.

## Colección: `users`

### Estructura de documento

```
users/
  |-- {uid}/  # ID generado por Firebase Authentication
      |-- displayName: string         # Nombre completo del usuario
      |-- email: string               # Email del usuario
      |-- photoURL: string            # URL de foto de perfil (opcional)
      |-- roles: array<number>        # Array de roles del usuario (1: Voluntario, 2: Responsable, 3: Administrador)
      |-- role: number                # Rol principal del usuario (para compatibilidad - opcional)
      |-- createdAt: timestamp        # Fecha de creación de la cuenta
      |-- lastLogin: timestamp        # Última fecha de inicio de sesión
      |-- isEnabled: boolean          # Estado del usuario (habilitado/deshabilitado)
      |-- isActive: boolean           # Estado del usuario (activo/inactivo - deprecated)
      |-- location: string            # Ubicación/ciudad del usuario (opcional)
      |-- occupation: string          # Ocupación del usuario (opcional)
      |-- phone: string               # Teléfono del usuario
      |-- name: string                # Nombre del usuario
      |-- lastName: string            # Apellido del usuario
      |-- userName: string            # Nombre de usuario
      |-- birthDate: string           # Fecha de nacimiento (opcional, formato YYYY-MM-DD)
      |-- job: string                 # Trabajo/ocupación del usuario (opcional)
```

### Índices requeridos

- `roles`: Para consultas que filtran por rol
- `isEnabled`: Para filtrar usuarios habilitados/deshabilitados

## Colección: `shifts`

### Estructura de documento

```
shifts/
  |-- {shiftId}/  # ID generado automáticamente
      |-- date: string           # Fecha del turno (formato YYYY-MM-DD)
      |-- period: string         # Periodo del turno ('morning' o 'afternoon')
      |-- capacity: number       # Capacidad máxima de voluntarios
      |-- assignments: array     # Array de asignaciones
          |-- uid: string        # ID del usuario asignado
          |-- name: string       # Nombre del usuario
          |-- timestamp: number  # Fecha y hora de asignación (timestamp)
      |-- notes: string          # Notas adicionales sobre el turno (opcional)
```

### Índices requeridos

- `date`: Para consultas que filtran por fecha
- `assignments.uid`: Para consultas que buscan asignaciones de un usuario específico
- Compuesto `date,period`: Para consultas que filtran por fecha y periodo

## Colección: `settings`

### Estructura de documento

```
settings/
  |-- application/
      |-- maxVolunteersPerShift: number    # Número máximo de voluntarios por turno por defecto
      |-- advanceBookingDays: number       # Días de antelación permitidos para reserva
      |-- cancelBeforeHours: number        # Horas antes del turno permitidas para cancelación
      |-- shiftMorningStart: string        # Hora de inicio del turno de mañana (formato HH:MM)
      |-- shiftMorningEnd: string          # Hora de fin del turno de mañana (formato HH:MM)
      |-- shiftAfternoonStart: string      # Hora de inicio del turno de tarde (formato HH:MM)
      |-- shiftAfternoonEnd: string        # Hora de fin del turno de tarde (formato HH:MM)
```

## Consultas comunes

### Obtener todos los usuarios activos

```javascript
db.collection('users').where('isEnabled', '==', true).get();
```

### Obtener administradores

```javascript
db.collection('users').where('roles', 'array-contains', 3).get();
```

### Obtener usuarios responsables

```javascript
db.collection('users').where('roles', 'array-contains', 2).get();
```

### Obtener turnos para una semana específica

```javascript
const startDate = '2023-06-05';
const endDate = '2023-06-11';
db.collection('shifts').where('date', '>=', startDate).where('date', '<=', endDate).get();
```

### Obtener turnos asignados a un usuario específico

```javascript
db.collection('shifts').where('assignments', 'array-contains', { uid: 'user123' }).get();
```

### Obtener configuración de la aplicación

```javascript
db.collection('settings').doc('application').get();
```

## Relaciones entre colecciones

- La relación entre `users` y `shifts` se establece mediante el campo `assignments.uid` en los documentos de `shifts`, que hace referencia al ID del documento en `users`.
- Esta relación es de tipo muchos a muchos, ya que un usuario puede estar asignado a varios turnos, y un turno puede tener varios usuarios asignados.

## Consideraciones de diseño

1. **Desnormalización controlada**: Se han desnormalizado algunos datos (como el nombre del usuario en `assignments`) para reducir el número de lecturas necesarias para operaciones comunes.

2. **Restricciones de seguridad**: Las reglas de seguridad de Firestore controlan el acceso a los documentos según el rol del usuario.

3. **Evolución del esquema**: A medida que la aplicación evoluciona, se han añadido nuevos campos como `isEnabled` para mejorar la gestión de usuarios.

4. **Campos duplicados**: Algunos campos como `role` (singular) existen por compatibilidad con versiones anteriores, pero se recomienda usar `roles` (plural) para todas las nuevas funcionalidades.
