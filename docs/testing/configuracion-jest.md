# Configuración de Jest en el Proyecto

## Archivos de Configuración

El proyecto utiliza Jest para los tests unitarios y de integración. La configuración de Jest se encuentra en varios archivos:

### 1. jest.config.js

Este es el archivo principal de configuración de Jest, ubicado en la raíz del proyecto:

```javascript
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/tests/e2e/',
    '<rootDir>/__tests__/',
  ],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/lib/firebase.ts',
    '!src/lib/firebaseAdmin.ts',
    '!src/middleware.ts',
    '!src/app/layout.tsx',
    '!src/app/globals.css',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
```

### 2. jest.setup.js

Este archivo contiene la configuración de setup para Jest, incluyendo mocks globales para dependencias comunes:

```javascript
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills para Node.js
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/test-path',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Material-UI useMediaQuery
jest.mock('@mui/material/useMediaQuery', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}));
```

### 3. src/types/jest.d.ts

Este archivo contiene las declaraciones de tipos para los matchers personalizados de Jest:

```typescript
/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />

// Declaraciones globales para Jest
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(className: string): R;
      toHaveStyle(style: Record<string, unknown>): R;
      toHaveAttribute(attr: string, value?: string): R;
      toBeVisible(): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toHaveValue(value: string | number | string[]): R;
      toBeChecked(): R;
      toHaveFocus(): R;
      toHaveTextContent(text: string | RegExp): R;
      toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): R;
    }
  }
}

export {};
```

## Configuración de TypeScript para Tests

El proyecto incluye configuraciones específicas de TypeScript para los tests:

### 1. __tests__/tsconfig.json

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "types": [
      "jest",
      "@testing-library/jest-dom",
      "@types/jest",
      "node"
    ],
    "allowJs": true,
    "noEmit": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  },
  "include": [
    "../src/**/*",
    "../__tests__/**/*"
  ]
}
```

### 2. src/hooks/__tests__/tsconfig.json y src/store/__tests__/tsconfig.json

```json
{
  "extends": "../../../tsconfig.json",
  "compilerOptions": {
    "types": [
      "jest",
      "@testing-library/jest-dom",
      "@types/jest",
      "node"
    ],
    "allowJs": true,
    "noEmit": true
  },
  "include": [
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts",
    "**/*.spec.tsx",
    "../../../jest.setup.js",
    "../../../src/types/jest.d.ts"
  ]
}
```

## Mocking de Firebase

Para el mocking de Firebase en los tests, consulta la [documentación específica sobre mocking de Firebase](./firebase-mocking.md).

## Manejo de Timeouts

Para información sobre cómo manejar timeouts en los tests de Jest, consulta la [documentación sobre manejo de timeouts](./manejo-timeouts-jest.md).

## Ejecución de Tests

Para ejecutar los tests unitarios y de integración con Jest:

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests con watch mode
npm test -- --watch

# Ejecutar tests con coverage
npm test -- --coverage
```

## Mejores Prácticas

1. **Organización de Tests**: Coloca los tests en directorios `__tests__` junto a los archivos que están siendo probados.
2. **Nombrado de Archivos**: Usa la convención `.test.ts` o `.test.tsx` para los archivos de test.
3. **Mocking**: Utiliza los mocks adecuados para dependencias externas como Firebase, Next.js router, etc.
4. **Cobertura de Código**: Mantén una cobertura de código de al menos 70% para branches, functions, lines y statements.
5. **Aislamiento**: Asegúrate de que cada test sea independiente y no dependa del estado dejado por otros tests.

Para más información sobre la importancia de los mocks en tests unitarios, consulta la [documentación sobre importancia de los mocks](./importancia-mocks.md).