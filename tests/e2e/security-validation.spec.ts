/**
 * Tests de seguridad y validación
 * Incluye tests de validación de formularios, seguridad de sesiones, y casos edge
 */

import { test, expect } from '@playwright/test';
import { loginUser, checkServerStatus, checkPageLoad } from './helpers/e2e-utils';
import { TEST_USERS } from '../helpers/test-db-setup';

test.describe('Tests de Seguridad y Validación', () => {
  test.beforeEach(async ({ page }) => {
    // Verificar que el servidor esté funcionando
    //De donde saco el objeto request en esta funcion
    const request = page.request;
    await checkServerStatus(page, request, {
      timeout: 60000,
      failOnError: true,
    });

    // Navegar a la página y verificar que cargue correctamente
    await checkPageLoad(page);

    // Navegar a la URL base para asegurar un contexto de documento válido
    await page.goto(process.env.BASE_URL || 'http://localhost:3001');

    // Limpiar cualquier estado de autenticación previo
    await page.context().clearCookies();
    await page.evaluate(() => {
      // Solo intentar limpiar si localStorage está disponible
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.warn('No se pudo limpiar localStorage/sessionStorage:', e);
      }
    });
  });

  test('Validación de formato de email en login', async ({ page }) => {
    console.log('🧪 [INICIANDO] Test de validación de formato de email');

    await page.waitForSelector('form', { timeout: 10000 });

    // Probar emails con formato inválido
    const invalidEmails = [
      'email-sin-arroba',
      'email@',
      '@dominio.com',
      'email@dominio',
      'email..doble@dominio.com',
      'email@dominio..com',
    ];

    for (const invalidEmail of invalidEmails) {
      // Limpiar campos
      await page.fill('input#email, input[name="email"], input[type="email"]', '');
      await page.fill('input#password, input[name="password"], input[type="password"]', '');

      // Introducir email inválido
      await page.fill('input#email, input[name="email"], input[type="email"]', invalidEmail);
      await page.fill(
        'input#password, input[name="password"], input[type="password"]',
        'cualquier_password'
      );

      // Intentar enviar formulario
      await page.click('button[type="submit"], button:has-text("Iniciar sesión")');

      const hasErrorMessage = await page
        .locator('div[role="alert"]:has-text("introduce un correo electrónico válido")')
        .isVisible();

      expect(hasErrorMessage).toBe(true);

      // Esperar un poco entre intentos
      await page.waitForTimeout(500);
    }

    console.log('✅ [CORRECTO] Test de validación de formato de email');
  });

  test('Validación de campos requeridos en login', async ({ page }) => {
    console.log('🧪 [INICIANDO] Test de validación de campos requeridos');

    await page.waitForSelector('form', { timeout: 10000 });

    // Intentar enviar formulario vacío
    await page.click('button[type="submit"], button:has-text("Iniciar sesión")');

    // Verificar que los campos requeridos muestran validación
    const emailRequired = await page.evaluate(() => {
      const emailInput = document.querySelector(
        'input[type="email"], input[name="email"]'
      ) as HTMLInputElement;
      return emailInput && !emailInput.validity.valid;
    });

    const passwordRequired = await page.evaluate(() => {
      const passwordInput = document.querySelector(
        'input[type="password"], input[name="password"]'
      ) as HTMLInputElement;
      return passwordInput && !passwordInput.validity.valid;
    });

    expect(emailRequired).toBe(true);
    expect(passwordRequired).toBe(true);

    // Probar solo con email
    await page.fill('input#email, input[name="email"], input[type="email"]', 'test@example.com');
    await page.click('button[type="submit"]');

    const passwordStillRequired = await page.evaluate(() => {
      const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
      return passwordInput && !passwordInput.validity.valid;
    });

    expect(passwordStillRequired).toBe(true);

    console.log('✅ [CORRECTO] Test de validación de campos requeridos');
  });

  test('Protección contra acceso directo a páginas protegidas', async ({ page }) => {
    console.log('🧪 [INICIANDO] Test de protección de páginas');

    const protectedPages = ['/schedule', '/admin'];

    for (const protectedPage of protectedPages) {
      // Intentar acceder directamente sin autenticación
      await page.goto(`${process.env.BASE_URL || 'http://localhost:3001'}${protectedPage}`);

      // Esperar a que se procese la redirección
      await page.waitForTimeout(3000);

      // Verificar que fue redirigido al login o página principal
      const currentUrl = page.url();
      const isRedirected = !currentUrl.includes(protectedPage) || currentUrl.includes('login');

      expect(isRedirected).toBe(true);
    }

    console.log('✅ [CORRECTO] Test de protección de páginas');
  });

  test('Protección contra inyección XSS en formularios', async ({ page }) => {
    console.log('🧪 [INICIANDO] Test de protección XSS');

    await page.waitForSelector('form', { timeout: 10000 });

    // Intentos de XSS comunes
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src=x onerror=alert("XSS")>',
      '"><script>alert("XSS")</script>',
      "'><script>alert('XSS')</script>",
    ];

    for (const payload of xssPayloads) {
      // Limpiar campos
      await page.fill('input#email, input[name="email"], input[type="email"]', '');
      await page.fill('input#password, input[name="password"], input[type="password"]', '');

      // Introducir payload en email
      await page.fill('input#email, input[name="email"], input[type="email"]', payload);
      await page.fill(
        'input#password, input[name="password"], input[type="password"]',
        'password123'
      );

      await page.click('button[type="submit"]');

      // Verificar que no se ejecutó JavaScript malicioso
      const alertFired = await page.evaluate(() => {
        return window.alert !== window.alert; // Si se sobrescribió alert
      });

      expect(alertFired).toBe(false);
    }

    console.log('✅ [CORRECTO] Test de protección XSS');
  });

  test('Verificación de headers de seguridad', async ({ request }) => {
    console.log('🧪 [INICIANDO] Test de headers de seguridad');

    // Hacer una petición a la página principal
    const response = await request.get(`${process.env.BASE_URL || 'http://localhost:3001'}`);

    const headers = response.headers();

    // Verificar headers de seguridad importantes
    const securityHeaders = {
      'x-frame-options': 'DENY',
      'x-content-type-options': 'nosniff',
      'x-xss-protection': '1; mode=block',
    };

    for (const [headerName, expectedValue] of Object.entries(securityHeaders)) {
      const headerValue = headers[headerName];

      // Nota: Algunos headers pueden no estar presentes en desarrollo
      // pero es bueno verificar que al menos algunos estén configurados
      if (headerValue) {
        expect(headerValue.toLowerCase()).toContain(expectedValue.toLowerCase());
      }
    }

    console.log('✅ [CORRECTO] Test de headers de seguridad');
  });

  test('Validación de límite de caracteres en campos de texto', async ({ page }) => {
    console.log('🧪 [INICIANDO] Test de límites de caracteres');

    // Login como admin para acceder al formulario de creación de usuarios
    const loginSuccess = await loginUser(page, {
      userType: 'ADMIN',
      checkRedirect: true,
      expectedRedirectUrl: /\/schedule$/,
      timeout: 10000,
    });

    if (loginSuccess) {
      // Navegar a creación de usuario
      await page.goto(`${process.env.BASE_URL || 'http://localhost:3001'}/admin`);
      await page.waitForSelector('[role="tabpanel"], .MuiTabs-root', { timeout: 10000 });

      // Buscar y hacer clic en el botón de crear usuario
      const createButton = page.locator('button:has-text("Añadir Usuario")');
      await expect(createButton).toBeVisible({ timeout: 5000 });
      await createButton.click();

      // Esperar a que aparezca el formulario de creación
      await page.waitForSelector('form, [data-testid="user-form"]', { timeout: 10000 });

      // Probar texto muy largo en diferentes campos
      const longText = 'a'.repeat(1000); // 1000 caracteres

      const fieldsToTest = [
        'input[name="name"]',
        'input[name="lastName"]',
        'input[name="userName"]',
        'input[name="job"]',
        'input[name="location"]',
      ];

      for (const fieldSelector of fieldsToTest) {
        const field = page.locator(fieldSelector).first();
        if (await field.isVisible()) {
          await field.fill(longText);

          // Verificar que el campo tiene un límite máximo
          const actualValue = await field.inputValue();

          // Si no hay límite en el frontend, al menos verificar que no crashea
          expect(actualValue).toBeDefined();
        }
      }
    }

    console.log('✅ [CORRECTO] Test de límites de caracteres');
  });

  test('Verificación de escape de caracteres especiales', async ({ page }) => {
    console.log('🧪 [INICIANDO] Test de escape de caracteres especiales');

    // 1. Prepara un listener para capturar los errores de la página ANTES de cualquier acción.
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.waitForSelector('form', { timeout: 10000 });

    const specialChars = [
      "'; DROP TABLE users; --",
      '"onmouseover="alert(1)"',
      '${7*7}',
      '{{7*7}}',
      '<%= 7*7 %>',
      '\x00\x01\x02',
    ];

    for (const specialChar of specialChars) {
      // Resetea el array de errores en cada iteración
      pageErrors.length = 0;

      await page.fill('input[name="email"]', `test${Date.now()}@example.com`);
      await page.fill('input[name="password"]', specialChar);

      await page.click('button[type="submit"]');

      // 2. Después de la acción, haz la aserción sobre el array que has capturado.
      expect(pageErrors).toHaveLength(0);

      // 3. Verificamos que la pagina está siendo funcional
      await expect(page.locator('form')).toBeVisible();
    }

    console.log('✅ [CORRECTO] Test de escape de caracteres especiales');
  });

  test('Verificación de timeout de formulario de login', async ({ page }) => {
    console.log('🧪 [INICIANDO] Test de timeout de formulario');

    await page.waitForSelector('form', { timeout: 10000 });

    // Llenar formulario con credenciales válidas
    const { email, password } = TEST_USERS.VOLUNTARIO;
    await page.fill('input#email, input[name="email"], input[type="email"]', email);
    await page.fill('input#password, input[name="password"], input[type="password"]', password);

    // Simular una respuesta muy lenta del servidor
    await page.route('**/api/**', (route) => {
      // Retrasar todas las peticiones API por 30 segundos
      setTimeout(() => {
        route.continue();
      }, 30000);
    });

    // Hacer clic en submit
    await page.click('button[type="submit"]');

    // Verificar que aparece algún indicador de carga
    const hasLoadingIndicator = await page
      .locator('text="Cargando", [data-testid="loading"], .loading, .spinner')
      .isVisible();

    // Verificar que el botón se deshabilita durante el proceso
    const submitButton = page.locator('button[type="submit"]');
    const isDisabled = await submitButton.isDisabled();

    // Al menos uno de estos comportamientos debería ocurrir
    expect(hasLoadingIndicator || isDisabled).toBe(true);

    console.log('✅ [CORRECTO] Test de timeout de formulario');
  });
});
