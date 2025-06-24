import { defineConfig, devices } from '@playwright/test';
import { loadTestEnvironmentVariables } from './tests/helpers/vscode-setup';

// Cargar variables de entorno para tests
loadTestEnvironmentVariables();

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 2,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'on-failure' }]],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
    actionTimeout: 10000,
    navigationTimeout: 10000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    extraHTTPHeaders: {
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    },
  },
  projects: [
    {
      name: 'login-tests',
      testMatch: '**/login.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'advanced-auth-tests',
      testMatch: '**/advanced-auth.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'user-crud-tests',
      testMatch: '**/user-crud.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'security-validation-tests',
      testMatch: '**/security-validation.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'role-assignment-tests',
      testMatch: '**/shift-assignment-by-role.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'history-view-tests',
      testMatch: '**/history-view.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'user-history-tests',
      testMatch: '**/user-history.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'admin-features-tests',
      testMatch: '**/admin-permissions-and-features.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // Proyectos de navegadores de escritorio
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'safari',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // Proyectos para dispositivos móviles
    // {
    //   name: 'android',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'ios',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],
  // Configuración global para todos los tests
  globalSetup: './tests/helpers/global-setup.ts',
  globalTeardown: './tests/helpers/global-teardown.ts',
});
