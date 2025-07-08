# Optimización de Tests - Sistema de Detección de Cambios

## Descripción

Este sistema implementa detección inteligente de cambios para evitar recompilaciones innecesarias durante la ejecución de tests, reduciendo significativamente el tiempo de inicio de las pruebas. Incluye mejoras en la configuración de Jest y Playwright para un testing más eficiente.

## Funcionamiento

### Detección de Cambios

El sistema monitorea archivos clave del proyecto y calcula hashes MD5 para detectar modificaciones:

- **Archivos de configuración**: `package.json`, `next.config.ts`, `tsconfig.json`, etc.
- **Archivos principales**: `layout.tsx`, `page.tsx`, `globals.css`
- **Archivos de infraestructura**: `auth.ts`, `db.ts`, `middleware.ts`
- **Variables de entorno**: `.env.local`, `.env.test`

### Caché de Compilación

- **Ubicación**: `.next/compilation-cache.json`
- **Contenido**: Hash MD5 y timestamp de modificación de cada archivo monitoreado
- **Actualización**: Se actualiza después de cada compilación exitosa

### Lógica de Optimización

1. **Servidor no ejecutándose**:
   - Inicia el servidor normalmente
   - Guarda el caché después del inicio

2. **Servidor ya ejecutándose**:
   - **Sin cambios detectados**: Omite compilación forzada, solo verifica conectividad
   - **Con cambios detectados**: Ejecuta compilación forzada completa

## Beneficios

- **Reducción de tiempo**: Evita compilaciones innecesarias cuando no hay cambios
- **Detección precisa**: Monitorea archivos críticos que afectan la compilación
- **Fallback seguro**: En caso de error, asume que hay cambios (comportamiento conservador)
- **Verificación de conectividad**: Siempre verifica que el servidor responda correctamente
- **Testing paralelo optimizado**: Configuración mejorada de Jest y Playwright para ejecución eficiente
- **Proyectos específicos**: Tests organizados por funcionalidad para ejecución selectiva

## Archivos Monitoreados

```typescript
const keyFiles = [
  'package.json',
  'package-lock.json',
  'next.config.ts',
  'tsconfig.json',
  'tailwind.config.ts',
  'src/app/layout.tsx',
  'src/app/page.tsx',
  'src/app/globals.css',
  'src/lib/auth.ts',
  'src/lib/db.ts',
  'src/middleware.ts',
  '.env.local',
  '.env.test'
];
```

## Configuración

### Agregar Nuevos Archivos

Para monitorear archivos adicionales, modifica el array `keyFiles` en `global-setup.ts`:

```typescript
const keyFiles = [
  // ... archivos existentes
  'nuevo-archivo.ts',
  'src/config/nuevo-config.json'
];
```

### Limpiar Caché

Para forzar una recompilación completa, elimina el archivo de caché:

```bash
# Windows
del .next\compilation-cache.json

# Linux/Mac
rm .next/compilation-cache.json
```

## Logs y Debugging

El sistema proporciona logs detallados:

- `📝 No se encontró caché de compilación`: Primera ejecución o caché eliminado
- `📝 Cambios detectados en: archivo.ts`: Archivo específico modificado
- `✅ No se detectaron cambios significativos`: Optimización aplicada
- `🚀 No se detectaron cambios, omitiendo compilación forzada`: Compilación omitida
- `💾 Caché de compilación guardado`: Caché actualizado exitosamente

## Uso en Tests E2E

La función `setupTestEnvironment()` se integra automáticamente en el setup global de Playwright, optimizando el tiempo de inicio de todos los tests E2E.

```typescript
// En global-setup.ts
import { setupTestEnvironment } from './setup-test-environment';

export default async function globalSetup() {
  await setupTestEnvironment();
}
```

## Configuraciones de Testing Mejoradas

### Jest Configuration

- **Configuración simplificada**: Eliminación de comentarios redundantes y configuración más limpia
- **Mapeo de módulos optimizado**: Alias `@/` para importaciones más claras
- **Setup mejorado**: Configuración de mocks globales para dependencias comunes

Para una documentación detallada sobre la configuración de Jest en el proyecto, consulta [Configuración de Jest](./testing/configuracion-jest.md).

### Playwright Configuration

- **Proyectos específicos**: Tests organizados por funcionalidad:
  - `login-tests`: Tests de autenticación básica
  - `advanced-auth-tests`: Tests de autenticación avanzada
  - `user-crud-tests`: Tests de operaciones CRUD de usuarios
  - `security-validation-tests`: Tests de validación y seguridad
  - `role-assignment-tests`: Tests de asignación de roles
  - `history-view-tests`: Tests de visualización de historial
  - `user-history-tests`: Tests de historial de usuarios
  - `admin-features-tests`: Tests de funcionalidades administrativas

- **Configuración optimizada**:
  - Workers limitados a 2 para evitar sobrecarga
  - Timeouts ajustados (10s para acciones y navegación)
  - Screenshots y videos solo en fallos
  - Trazas en primer reintento

### Nuevos Tests Implementados

#### Tests de Autenticación Avanzada (`advanced-auth.spec.ts`)
- Validación de usuarios deshabilitados
- Manejo de intentos fallidos de login
- Tests de seguridad de sesiones
- Validación de tokens y permisos

#### Tests de Validación de Seguridad (`security-validation.spec.ts`)
- Validación de formatos de email
- Tests de inyección y XSS
- Validación de campos obligatorios
- Tests de límites y casos edge

#### Tests CRUD de Usuarios (`user-crud.spec.ts`)
- Creación, lectura, actualización y eliminación de usuarios
- Validación de permisos por rol
- Tests de integridad de datos

### Utilidades de Testing Mejoradas

#### `e2e-utils.ts`
- **Función `loginUser` mejorada**: Soporte para opción "Recordarme"
- **Verificación de servidor optimizada**: Timeouts configurables y mejor manejo de errores
- **Utilidades de navegación**: Funciones helper para operaciones comunes

#### `server-utils.ts` (Nuevo)
- Utilidades específicas para manejo de servidor en tests
- Funciones de verificación de estado y conectividad
- Helpers para setup y teardown de entorno de testing

## Consideraciones

- El sistema es conservador: ante cualquier duda, ejecuta la compilación completa
- Los archivos que no existen se ignoran sin generar errores
- El caché se regenera automáticamente si se corrompe
- La verificación de conectividad siempre se ejecuta, independientemente del caché