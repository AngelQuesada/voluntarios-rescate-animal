# Testing End-to-End (E2E) - Guía Completa

Esta guía detalla la implementación y uso del sistema de testing E2E utilizando Playwright en el proyecto de Rescate Animal Voluntariado.

## Configuración General

### Estructura de Tests

Los tests E2E están organizados en la carpeta `tests/e2e/` con la siguiente estructura:

```
tests/
├── e2e/
│   ├── helpers/
│   │   ├── e2e-utils.ts          # Utilidades comunes para tests
│   │   └── ...
│   ├── login.spec.ts             # Tests de autenticación básica
│   ├── advanced-auth.spec.ts     # Tests de autenticación avanzada
│   ├── security-validation.spec.ts # Tests de validación y seguridad
│   ├── user-crud.spec.ts         # Tests CRUD de usuarios
│   ├── shift-assignment-by-role.spec.ts # Tests de asignación de turnos
│   ├── history-view.spec.ts      # Tests de visualización de historial
│   ├── user-history.spec.ts      # Tests de historial de usuarios
│   └── admin-permissions-and-features.spec.ts # Tests de funcionalidades admin
└── helpers/
    ├── global-setup.ts           # Configuración global de tests
    ├── global-teardown.ts        # Limpieza global de tests
    ├── setup-test-environment.ts # Setup optimizado del entorno
    ├── test-db-setup.ts          # Configuración de base de datos de test
    ├── server-utils.ts           # Utilidades de servidor
    └── vscode-setup.ts           # Configuración para VS Code
```

### Configuración de Playwright

La configuración está optimizada para testing eficiente:

- **Workers**: Limitado a 2 para evitar sobrecarga del sistema
- **Timeouts**: 10 segundos para acciones y navegación
- **Retries**: 2 reintentos en CI, 0 en desarrollo local
- **Screenshots**: Solo en fallos
- **Videos**: Solo se conservan en fallos
- **Trazas**: Activadas en primer reintento

## Proyectos de Testing

Los tests están organizados en proyectos específicos para ejecución selectiva:

### 1. Login Tests (`login-tests`)
**Archivo**: `login.spec.ts`
**Propósito**: Tests básicos de autenticación
- Login con credenciales válidas
- Manejo de credenciales inválidas
- Redirección después del login
- Persistencia de sesión

### 2. Advanced Auth Tests (`advanced-auth-tests`)
**Archivo**: `advanced-auth.spec.ts`
**Propósito**: Tests avanzados de autenticación y seguridad
- Validación de usuarios deshabilitados
- Manejo de intentos fallidos consecutivos
- Tests de seguridad de tokens
- Validación de permisos por rol
- Limpieza de sesión en logout

### 3. Security Validation Tests (`security-validation-tests`)
**Archivo**: `security-validation.spec.ts`
**Propósito**: Tests de validación y seguridad
- Validación de formato de email
- Tests de inyección SQL y XSS
- Validación de campos obligatorios
- Tests de límites y casos edge
- Validación de entrada de datos

### 4. User CRUD Tests (`user-crud-tests`)
**Archivo**: `user-crud.spec.ts`
**Propósito**: Tests de operaciones CRUD de usuarios
- Creación de usuarios
- Lectura y visualización de datos
- Actualización de información
- Eliminación de usuarios
- Validación de permisos por rol

### 5. Role Assignment Tests (`role-assignment-tests`)
**Archivo**: `shift-assignment-by-role.spec.ts`
**Propósito**: Tests de asignación de turnos y roles
- Asignación de turnos por rol
- Validación de permisos de asignación
- Tests de conflictos de horarios
- Validación de capacidad máxima

### 6. History View Tests (`history-view-tests`)
**Archivo**: `history-view.spec.ts`
**Propósito**: Tests de visualización de historial
- Visualización de historial de turnos
- Filtros y búsquedas
- Paginación de resultados
- Exportación de datos

### 7. User History Tests (`user-history-tests`)
**Archivo**: `user-history.spec.ts`
**Propósito**: Tests específicos de historial de usuarios
- Historial personal de turnos
- Estadísticas de participación
- Validación de datos históricos

### 8. Admin Features Tests (`admin-features-tests`)
**Archivo**: `admin-permissions-and-features.spec.ts`
**Propósito**: Tests de funcionalidades administrativas
- Panel de administración
- Gestión de usuarios
- Configuraciones del sistema
- Reportes y estadísticas

## Utilidades de Testing

### e2e-utils.ts

Contiene funciones helper comunes para todos los tests:

#### `loginUser(page, options)`
Función mejorada para login con opciones avanzadas:
```typescript
interface LoginOptions {
  email?: string;
  password?: string;
  expectedRedirectUrl?: string | RegExp;
  timeout?: number;
  skipServerCheck?: boolean;
  rememberMe?: boolean; // Nueva opción
}
```

#### `checkServerStatus(page, request, options)`
Verificación optimizada del estado del servidor:
```typescript
interface ServerCheckOptions {
  timeout?: number; // Default: 60000ms
  failOnError?: boolean; // Default: true
}
```

#### `checkPageLoad(page)`
Verificación de carga correcta de páginas con timeouts configurables.

### server-utils.ts (Nuevo)

Utilidades específicas para manejo de servidor en tests:
- Funciones de verificación de conectividad
- Helpers para setup y teardown
- Utilidades de monitoreo de estado

## Ejecución de Tests

### Comandos Básicos

```bash
# Ejecutar todos los tests E2E
npm run test:e2e

# Ejecutar tests en modo headed (con interfaz gráfica)
npm run test:e2e -- --headed

# Ejecutar tests en modo debug
npm run test:e2e -- --debug
```

### Ejecución por Proyecto

```bash
# Tests de login básico
npm run test:e2e -- --project=login-tests

# Tests de autenticación avanzada
npm run test:e2e -- --project=advanced-auth-tests

# Tests de validación de seguridad
npm run test:e2e -- --project=security-validation-tests

# Tests CRUD de usuarios
npm run test:e2e -- --project=user-crud-tests

# Tests de asignación de roles
npm run test:e2e -- --project=role-assignment-tests

# Tests de visualización de historial
npm run test:e2e -- --project=history-view-tests

# Tests de historial de usuarios
npm run test:e2e -- --project=user-history-tests

# Tests de funcionalidades admin
npm run test:e2e -- --project=admin-features-tests
```

### Ejecución de Tests Específicos

```bash
# Ejecutar un archivo específico
npm run test:e2e -- tests/e2e/login.spec.ts

# Ejecutar un test específico por nombre
npm run test:e2e -- --grep "should login successfully"
```

## Configuración de Entorno

### Variables de Entorno

Los tests requieren las siguientes variables de entorno en `.env.test`:

```bash
# URL base para tests
BASE_URL=http://localhost:3001

# Configuraciones de Firebase (pueden ser las mismas que desarrollo)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
# ... resto de configuraciones Firebase

# Configuraciones específicas para testing
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123
ADMIN_TEST_EMAIL=admin@example.com
ADMIN_TEST_PASSWORD=adminpassword123
```

### Setup Global

El sistema incluye setup y teardown globales:

- **global-setup.ts**: Inicializa el entorno de testing
- **global-teardown.ts**: Limpia el entorno después de los tests
- **setup-test-environment.ts**: Optimización de compilación para tests

## Mejores Prácticas

### 1. Organización de Tests
- Agrupa tests relacionados en el mismo archivo
- Usa `describe` blocks para organizar funcionalidades
- Nombra los tests de forma descriptiva

### 2. Manejo de Estado
- Limpia el estado entre tests usando `beforeEach`
- Usa datos de test independientes
- Evita dependencias entre tests

### 3. Timeouts y Esperas
- Usa `waitForSelector` en lugar de `setTimeout`
- Configura timeouts apropiados para operaciones lentas
- Usa `waitForLoadState` para navegación

### 4. Datos de Test
- Usa datos de test consistentes y predecibles
- Implementa factories para crear datos de test
- Limpia datos de test después de cada ejecución

### 5. Debugging
- Usa `--headed` para ver la ejecución en tiempo real
- Usa `--debug` para pausar en breakpoints
- Revisa screenshots y videos en caso de fallos

## Troubleshooting

### Problemas Comunes

#### 1. Timeouts
```bash
# Aumentar timeout global
npm run test:e2e -- --timeout=60000
```

#### 2. Servidor no disponible
```bash
# Verificar que el servidor esté ejecutándose
npm run dev
# En otra terminal
npm run test:e2e
```

#### 3. Tests flaky
- Aumentar timeouts específicos
- Mejorar selectores de elementos
- Agregar esperas explícitas

#### 4. Problemas de autenticación
- Verificar variables de entorno
- Limpiar cookies y localStorage
- Verificar configuración de Firebase

### Logs y Debugging

```bash
# Ejecutar con logs detallados
DEBUG=pw:api npm run test:e2e

# Generar reporte HTML
npm run test:e2e -- --reporter=html
```

## Integración Continua

Los tests están configurados para CI/CD:

- **Retries**: 2 reintentos automáticos en CI
- **Reporters**: GitHub Actions y HTML
- **Artifacts**: Screenshots y videos se guardan en fallos
- **Paralelización**: Optimizada para entornos CI

### GitHub Actions

```yaml
# Ejemplo de configuración para GitHub Actions
- name: Run E2E tests
  run: |
    npm run build
    npm run test:e2e
  env:
    BASE_URL: http://localhost:3001
    # ... variables de entorno necesarias
```

## Métricas y Reportes

Playwright genera reportes detallados:

- **HTML Report**: Reporte interactivo con detalles de ejecución
- **JUnit XML**: Para integración con sistemas CI/CD
- **JSON**: Para procesamiento automatizado

Los reportes incluyen:
- Tiempo de ejecución por test
- Screenshots de fallos
- Videos de ejecución
- Trazas de debugging
- Logs de consola

## Mantenimiento

### Actualización de Tests
- Revisar tests después de cambios en la UI
- Actualizar selectores cuando cambien elementos
- Mantener datos de test actualizados
- Revisar y optimizar timeouts regularmente

### Monitoreo
- Revisar reportes de ejecución regularmente
- Identificar tests flaky y mejorarlos
- Monitorear tiempos de ejecución
- Actualizar configuraciones según necesidades