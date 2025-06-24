# Consideraciones de Seguridad

Este documento detalla las medidas de seguridad implementadas en el Sistema de Gestión de Voluntariado para Rescate Animal, así como recomendaciones para mantener la aplicación segura.

## Gestión de credenciales

### Firebase Admin SDK

El sistema utiliza **exclusivamente variables de entorno** para las credenciales de Firebase Admin, eliminando completamente el uso de archivos de credenciales:

**✅ Configuración segura actual:**
- Variables de entorno para todas las credenciales
- Sin archivos de credenciales en el repositorio
- Configuración diferente para desarrollo y producción

**❌ Evitado:**
- Archivos `serviceAccountKey.json` en el repositorio
- Credenciales hardcodeadas en el código
- Exposición accidental de claves privadas

### Variables de entorno sensibles

Las siguientes variables contienen información crítica y deben protegerse:

```bash
# Variables sensibles - NUNCA incluir en Git
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@proyecto.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY_ID="..."
FIREBASE_CLIENT_ID="..."
```

## Autenticación y autorización

### Autenticación

El sistema utiliza Firebase Authentication para gestionar la autenticación de usuarios, proporcionando:

- Autenticación segura mediante email/contraseña
- Opción de autenticación con proveedores externos (Google)
- Gestión de tokens JWT
- Sesiones seguras con caducidad configurada

### Autorización

El control de acceso se implementa mediante:

- Sistema de roles (Admin, Responsable, Voluntario)
- Verificación de permisos en el frontend
- Validación de permisos en el backend (API routes)
- Validación de usuarios habilitados/deshabilitados
- Control de intentos fallidos de autenticación

### Mejoras en Seguridad de Sesiones

#### Limpieza Robusta de Sesión
El sistema ahora implementa una limpieza completa del estado de sesión durante el logout:

**Datos de SessionStorage Limpiados:**
- `loginFormState`: Estado del formulario de login
- `authRedirectPending`: Estado de redirección pendiente
- `loginTimeout`: Timeouts de login activos
- `firebaseAuthState`: Estado de autenticación de Firebase
- `loginStart`: Timestamp de inicio de sesión

**Beneficios de Seguridad:**
- Previene reutilización de tokens de sesión
- Elimina datos sensibles del navegador
- Reduce riesgo de ataques de sesión
- Mejora la privacidad del usuario

#### Validación de Usuarios Deshabilitados
El sistema incluye validación para usuarios deshabilitados:
- Verificación en tiempo real del estado del usuario
- Bloqueo automático de acceso para usuarios deshabilitados
- Mensajes de error apropiados sin revelar información sensible
- Reglas de seguridad en Firestore

## Protección de datos

### Datos sensibles

La aplicación maneja información que puede ser considerada sensible:

- Información personal de voluntarios
- Credenciales de acceso
- Asignaciones de turnos

### Medidas implementadas

1. **Almacenamiento seguro de contraseñas**:
   - Firebase Authentication gestiona este aspecto, utilizando hashing y salting
   - No se almacenan contraseñas en texto plano

2. **Cifrado en tránsito**:
   - Todas las comunicaciones utilizan HTTPS
   - Firebase proporciona cifrado SSL/TLS por defecto

3. **Control de acceso a datos**:
   - Reglas de seguridad en Firestore que restringen el acceso según el rol
   - Validación de permisos en API routes

4. **Principio de privilegio mínimo**:
   - Cada rol tiene solo los permisos necesarios para sus funciones
   - Separación clara de responsabilidades

## Reglas de seguridad de Firestore

Las reglas de seguridad de Firestore son fundamentales para proteger los datos. Ejemplo de reglas implementadas:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Verificación de autenticación
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Verificación de rol administrador
    function isAdmin() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny([3]);
    }
    
    // Reglas para colección users
    match /users/{userId} {
      allow read: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      allow write: if isAdmin() || (isAuthenticated() && request.auth.uid == userId && 
                    (!("roles" in request.resource.data) || request.resource.data.roles == resource.data.roles));
    }
    
    // Reglas para colección shifts
    match /shifts/{shiftId} {
      allow read: if isAuthenticated();
      allow create, update: if isAdmin() || 
        (isAuthenticated() && exists(/databases/$(database)/documents/users/$(request.auth.uid)) && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny([2, 3]));
      allow delete: if isAdmin();
    }
  }
}
```

## Vulnerabilidades comunes y mitigación

### 1. Inyección de código

**Mitigación**:
- Uso de Firebase Firestore que evita inyecciones SQL
- Validación y sanitización de entradas de usuario
- Uso de TypeScript para garantizar tipos correctos

### 2. Cross-Site Scripting (XSS)

**Mitigación**:
- Next.js incluye protecciones contra XSS por defecto
- Material-UI escapa el contenido dinámico automáticamente
- Validación de datos de entrada

### 3. Suplantación de identidad (CSRF)

**Mitigación**:
- Tokens JWT validados en cada solicitud
- Firebase Authentication maneja la seguridad de sesiones

### 4. Exposición de datos sensibles

**Mitigación**:
- No se envían datos sensibles al cliente
- Reglas de Firestore que restringen el acceso a documentos
- Uso de variables de entorno para credenciales

## Recomendaciones para producción

### Configuración

1. **Variables de entorno**:
   - Nunca incluir credenciales en el código fuente
   - Utilizar variables de entorno en la plataforma de despliegue
   - Mantener diferentes conjuntos de variables para desarrollo y producción

2. **Dominios autorizados**:
   - Configurar Firebase para aceptar solo los dominios específicos de la aplicación
   - Restringir el acceso desde dominios no autorizados

### Monitoreo y auditoría

1. **Logs de seguridad**:
   - Habilitar logging de Firebase Authentication
   - Registrar intentos de acceso fallidos
   - Monitorear actividad inusual

2. **Auditorías periódicas**:
   - Revisar regularmente los permisos de usuarios
   - Verificar accesos y cambios en la base de datos
   - Actualizar reglas de seguridad según sea necesario

### Actualizaciones

1. **Dependencias**:
   - Mantener todas las dependencias actualizadas
   - Utilizar `npm audit` regularmente para identificar vulnerabilidades
   - Suscribirse a alertas de seguridad de Firebase

## Plan de respuesta a incidentes

En caso de detectar una brecha de seguridad:

1. **Contención**:
   - Desactivar temporalmente cuentas comprometidas
   - Restringir acceso al sistema si es necesario

2. **Evaluación**:
   - Determinar el alcance del incidente
   - Identificar información potencialmente comprometida

3. **Remediación**:
   - Corregir las vulnerabilidades identificadas
   - Restablecer contraseñas si es necesario
   - Actualizar configuraciones de seguridad

4. **Comunicación**:
   - Notificar a los usuarios afectados
   - Documentar el incidente y las medidas tomadas

## Testing de Seguridad

### Tests de Validación Implementados

El sistema incluye tests automatizados de seguridad:

#### Tests de Autenticación Avanzada (`advanced-auth.spec.ts`)
- Validación de usuarios deshabilitados
- Tests de intentos fallidos de login
- Verificación de limpieza de sesión
- Validación de tokens y permisos

#### Tests de Validación de Seguridad (`security-validation.spec.ts`)
- Validación de formato de email
- Tests de inyección y XSS
- Validación de campos obligatorios
- Tests de límites y casos edge
- Validación de entrada de datos maliciosos

#### Cobertura de Tests de Seguridad
- Autenticación y autorización
- Validación de entrada
- Manejo de sesiones
- Protección contra ataques comunes
- Validación de permisos por rol

## Mejores prácticas de desarrollo

### Validación de entrada

- Validación tanto en frontend como backend
- Sanitización de datos de usuario
- Validación de tipos de datos
- Límites en tamaños de entrada
- Tests automatizados de validación

## Recursos adicionales

- [Documentación de seguridad de Firebase](https://firebase.google.com/docs/security)
- [Guía de seguridad de Next.js](https://nextjs.org/docs/advanced-features/security-headers)
- [Mejores prácticas de seguridad para aplicaciones web](https://owasp.org/www-project-top-ten/)