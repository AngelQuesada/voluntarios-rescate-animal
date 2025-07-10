# Tests

Este directorio contiene todos los tests del proyecto, incluyendo tests unitarios con Jest y tests end-to-end (E2E) con Playwright.

### 📁 Nuevos Archivos

- `helpers/vscode-setup.ts` - Configuración específica para VSCode
- `VSCODE_TESTING.md` - Guía detallada para testing con VSCode
- `../docs/testing/firebase-mocking.md` - Documentación sobre mocking de Firebase en tests
- `../docs/testing/importancia-mocks.md` - Explicación sobre la importancia de los mocks en tests unitarios
- `../docs/testing/manejo-timeouts-jest.md` - Guía para manejar timeouts en tests de Jest
- `../docs/testing/configuracion-jest.md` - Configuración de Jest en el proyecto
- `../docs/testing/README.md` - Índice de la documentación de testing

## Estructura de Directorios

```
tests/
├── .env.test.example          # Variables de entorno para pruebas
├── README.md                  # Esta documentación
├── VSCODE_TESTING.md          # Guía para VSCode y Playwright
├── e2e/                       # Tests E2E con Playwright
│   ├── admin-permissions-and-features.spec.ts # Tests de permisos de admin y funcionalidades
│   ├── history-view.spec.ts   # Tests de visualización de historial
│   ├── login.spec.ts          # Tests de autenticación
│   ├── shift-assignment-by-role.spec.ts # Tests de asignación por rol
│   └── user-history.spec.ts   # Tests de historial de usuario
├── helpers/                   # Utilidades para configuración de tests
│   ├── global-setup.ts        # Configuración global (con limpieza)
│   ├── global-teardown.ts     # Limpieza global de Playwright
│   ├── setup-test-environment.ts # Configuración del entorno
│   ├── test-db-setup.ts       # Configuración de base de datos (mejorada)
│   ├── test-utils.ts          # Utilidades para tests
│   └── vscode-setup.ts        # 🆕 Configuración para VSCode
└── scripts/
    └── run-tests.js           # Script para ejecutar tests
```

## Configuración del Entorno de Prueba

### Variables de Entorno

1. Crea un archivo `.env.test` en la raíz del proyecto basado en `.env.test.example`:

```bash
cp tests/.env.test.example .env.test
```

2. Edita el archivo `.env.test` con tus credenciales de Firebase y otras configuraciones necesarias.

### Configuración Importante

- `DISABLE_PWA=true`: Desactiva la funcionalidad PWA durante los tests para evitar problemas.
- `AUTO_CLEANUP_TEST_DATA=true`: Limpia automáticamente los datos de prueba después de ejecutar los tests.
- `IS_TESTING_ENVIRONMENT=true`: Indica que estamos en un entorno de prueba.

## Tests Implementados

### Tests de Permisos de Administración y Funcionalidades

El archivo `admin-permissions-and-features.spec.ts` contiene tests críticos para verificar la seguridad y funcionalidad del sistema:

#### Permisos del botón de asignar usuarios a turnos

- **Voluntario NO puede ver el botón**: Verifica que los usuarios con rol "VOLUNTARIO" no pueden ver ni acceder al botón para asignar usuarios a turnos
- **Responsable NO puede ver el botón**: Verifica que los usuarios con rol "RESPONSABLE" no pueden ver ni acceder al botón para asignar usuarios a turnos
- **Administrador SÍ puede ver el botón**: Confirma que solo los usuarios con rol "ADMINISTRADOR" pueden ver y usar el botón para asignar usuarios a turnos

#### Acceso al panel de administración

- **Voluntario NO puede acceder**: Verifica que los voluntarios no pueden ver el botón del panel de administración ni acceder a `/admin`
- **Responsable NO puede acceder**: Verifica que los responsables no pueden ver el botón del panel de administración ni acceder a `/admin`
- **Administrador SÍ puede acceder**: Confirma que solo los administradores pueden acceder al panel de administración

#### Funcionalidad del historial de turnos

- **Historial funciona correctamente**: Verifica que la pestaña de historial en el panel de administración carga correctamente y muestra el componente `HistoryCalendar`

Estos tests son fundamentales para la seguridad del sistema, asegurando que solo los usuarios autorizados puedan realizar acciones administrativas.

## Ejecución de Tests

### Tests Unitarios y de Integración (Jest)

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests con watch mode
npm test -- --watch

# Ejecutar tests con coverage
npm test -- --coverage
```

### Tests End-to-End (Playwright)

```bash
# Instalar navegadores de Playwright (solo la primera vez)
npx playwright install

# Ejecutar todos los tests E2E
npm run test:e2e

# Ejecutar tests E2E en un navegador específico
npm run test:e2e -- --project=chrome

# Ejecutar un test específico
npm run test:e2e -- tests/e2e/login.spec.ts

# Ejecutar tests en modo UI
npm run test:e2e -- --ui
```

## Inicialización de Datos de Prueba

Los tests utilizan una configuración automática que inicializa la base de datos con los datos necesarios para cada test:

- **Usuarios**: Se crean automáticamente usuarios de prueba (administrador, responsable, voluntario).
- **Turnos**: Se generan turnos pasados y futuros según sea necesario para cada test.

Puedes configurar qué datos se inicializan para cada test:

```typescript
// Test con usuario administrador y turnos
test(
  'Ver historial como administrador',
  async ({ page }) => {
    // El test aquí...
  },
  { userType: 'ADMIN', requireShifts: true, pastDays: 14, futureDays: 7 }
);

// Test solo con usuario voluntario sin turnos
test(
  'Perfil de usuario',
  async ({ page }) => {
    // El test aquí...
  },
  { userType: 'VOLUNTARIO', requireShifts: false }
);
```

## Utilidades para Tests

El sistema proporciona varias utilidades para facilitar la escritura de tests:

### Autenticación

```typescript
import { login } from '../helpers/test-utils';

// Iniciar sesión manualmente
await login(page, { userType: 'ADMIN' });
```

### Navegación

```typescript
import { navigateToAdminPanel, navigateToHistoryTab } from '../helpers/test-utils';

// Navegar al panel de administración
await navigateToAdminPanel(page);

// Navegar a la pestaña de historial
await navigateToHistoryTab(page);
```

### Interacción con Elementos

```typescript
import { waitAndClick, waitAndFill, isElementVisible } from '../helpers/test-utils';

// Esperar y hacer clic en un elemento
await waitAndClick(page, 'button:has-text("Asignar")');

// Esperar y rellenar un campo
await waitAndFill(page, 'input[name="email"]', 'usuario@example.com');

// Verificar si un elemento está visible
const isVisible = await isElementVisible(page, '.success-message');
```

## Depuración

Los tests incluyen capturas de pantalla automáticas cuando ocurren errores, que se guardan en la carpeta `test-results/`.

Para una depuración más interactiva, puedes usar el modo UI de Playwright:

```bash
npm run test:e2e -- --ui
```

## Buenas Prácticas

1. **Aislamiento**: Cada test debe ser independiente y no depender del estado dejado por otros tests.
2. **Limpieza**: Utiliza `AUTO_CLEANUP_TEST_DATA=true` para limpiar automáticamente los datos después de los tests.
3. **Optimización**: Configura cada test para que solo inicialice los datos que necesita.
4. **Logging**: Los tests incluyen logging detallado con emojis para facilitar la depuración.
5. **Capturas de pantalla**: Se generan automáticamente capturas de pantalla en caso de error.
6. **Mocking adecuado**: Mockea correctamente las dependencias externas como Firebase para evitar timeouts y hacer los tests más rápidos y confiables. Ver [Importancia de los Mocks en Tests Unitarios](../docs/testing/importancia-mocks.md).
7. **Manejo de timeouts**: Implementa estrategias para evitar timeouts en tests asíncronos. Ver [Manejo de Timeouts en Tests de Jest](../docs/testing/manejo-timeouts-jest.md).
8. **Configuración de Jest**: Sigue las convenciones establecidas en la configuración de Jest del proyecto. Ver [Configuración de Jest](../docs/testing/configuracion-jest.md).