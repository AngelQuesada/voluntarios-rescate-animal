import { Page, expect } from '@playwright/test';
import { TEST_USERS } from '../../helpers/test-db-setup';

export interface LoginOptions {
  userType: 'ADMIN' | 'RESPONSABLE' | 'VOLUNTARIO';
  checkRedirect?: boolean;
  expectedRedirectUrl?: string | RegExp;
  timeout?: number;
  skipServerCheck?: boolean;
  rememberMe?: boolean;
}

export interface ShiftElementOptions {
  timeout?: number;
  waitForLoad?: boolean;
}

/**
 * Verifica si el servidor de testing está disponible
 */
export async function checkServerStatus(
  page: Page,
  request: any,
  options: { timeout?: number; failOnError?: boolean } = {}
): Promise<boolean> {
  const { timeout = 30000, failOnError = true } = options;
  const baseUrl = process.env.BASE_URL || 'http://localhost:3001';

  try {
    // Intentar conectar con fetch primero (más rápido)
    const response = await request.get(baseUrl, { timeout: 5000 }).catch(() => null);

    if (response && response.ok()) {
      return true;
    }

    // Si falla, intentar con page.goto
    await page.goto(baseUrl, { timeout, waitUntil: 'domcontentloaded' });
    return true;
  } catch (error) {
    if (failOnError) {
      console.error(`❌ Servidor no disponible en ${baseUrl}:`, error);
      throw error;
    }
    return false;
  }
}

/**
 * Verifica si la página ha cargado correctamente (no 404/500)
 */
export async function checkPageLoad(page: Page): Promise<boolean> {
  try {
    // Check for "Application error" but verify it's not a false positive
    // Using simple locator count can be misleading if text is hidden or part of valid content
    // However, for now we assume "Application error" shouldn't appear in normal usage

    const errorBody = await page.locator('body:has-text("Application error")').count();
    const runtimeError = await page.locator('body:has-text("Unhandled Runtime Error")').count();
    const notFound = await page.locator('h1:has-text("404")').count();

    if (errorBody > 0 || runtimeError > 0) {
      // Double check if it's REALLY an error page by checking if the main content is missing
      // or if nextjs error overlay specific classes are present

      // If we see the error but also normal content (like "Rescate Animal Granada"),
      // it might be a false positive or a background error that doesn't block usage.
      // But usually "Application error" replaces body content in production,
      // or Overlay covers it in dev.

      const bodyText = await page.locator('body').innerText();
      if (bodyText.includes('Application error') || bodyText.includes('Unhandled Runtime Error')) {
        console.error('❌ Error de aplicación detectado en la página');
        console.error('Page body text snippet:', bodyText.substring(0, 500));
        return false;
      }
    }

    if (notFound > 0) {
      console.error('❌ Página 404 detectada');
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Inicia sesión con un usuario específico (versión optimizada para E2E)
 */
export async function loginUser(page: Page, options: LoginOptions): Promise<boolean> {
  const {
    userType,
    checkRedirect = true,
    expectedRedirectUrl = /\/schedule$/,
    timeout = 10000,
    skipServerCheck = false,
    rememberMe = false,
  } = options;

  // Obtener credenciales del usuario
  const { email, password } = TEST_USERS[userType];

  try {
    // Verificar si la página cargó correctamente
    if (!skipServerCheck && !(await checkPageLoad(page))) {
      return false;
    }

    // Esperar a que la página de inicio de sesión se cargue completamente con timeouts extendidos
    await page.waitForSelector('form', {
      timeout: 10000,
      state: 'visible',
    });

    // Intentar múltiples selectores para el campo de email
    const emailSelector = await page.waitForSelector(
      'input#email, input[name="email"], input[type="email"]',
      {
        timeout: 20000,
        state: 'visible',
      }
    );

    if (!emailSelector) {
      console.error('❌ Could not find email input');
      return false;
    }

    // Intentar múltiples selectores para el campo de contraseña
    const passwordSelector = await page
      .waitForSelector('input#password, input[name="password"], input[type="password"]', {
        timeout: 20000,
        state: 'visible',
      })
      .catch(async () => {
        return null;
      });

    if (!passwordSelector) {
      console.error('❌ Could not find password input');
      return false;
    }

    // Limpiar campos antes de llenar (por si acaso)
    await emailSelector.fill('');
    await passwordSelector.fill('');

    // Rellenar el formulario de inicio de sesión con pausa entre acciones
    await emailSelector.fill(email);
    await page.waitForTimeout(500); // Pequeña pausa
    await passwordSelector.fill(password);
    await page.waitForTimeout(500); // Pequeña pausa

    // Verificar que los campos se rellenaron correctamente
    const emailValue = await emailSelector.inputValue();
    const passwordValue = await passwordSelector.inputValue();

    if (emailValue !== email) {
      console.error(
        `❌ El campo email no se llenó correctamente. Esperado: ${email}, Actual: ${emailValue}`
      );
      return false;
    }

    if (!passwordValue) {
      console.error('❌ El campo contraseña está vacío');
      return false;
    }

    if (rememberMe) await page.locator('[data-testid="remember-me-checkbox"]').check();

    // Buscar y hacer clic en el botón de submit
    const submitButton = await page.waitForSelector(
      'button[type="submit"], input[type="submit"], button:has-text("Iniciar"), button:has-text("Login")',
      { timeout: 10000, state: 'visible' }
    );

    await submitButton.click();

    // Verificar redirección si es necesario
    if (checkRedirect) {
      await page.waitForURL(expectedRedirectUrl, { timeout });
      await expect(page).toHaveURL(expectedRedirectUrl);
    }
    return true;
  } catch (error) {
    console.error(`❌ Error en loginUser (${userType}):`, error);
    try {
      console.error(`Current URL: ${page.url()}`);
      console.error(
        `Page text snippet:`,
        (await page.locator('body').innerText()).substring(0, 300)
      );
    } catch (e) {
      console.error('Error getting page state logging');
    }
    await page.screenshot({ path: `./test-results/${userType.toLowerCase()}-login-error.png` });
    return false;
  }
}

/**
 * Navega al panel de administración
 */
export async function navigateToAdminPanel(page: Page, timeout: number = 10000): Promise<boolean> {
  try {
    // Buscar el botón con el icono AdminPanelSettingsIcon
    await page.waitForSelector('button svg[data-testid="AdminPanelSettingsIcon"]', { timeout });
    await page.click('button svg[data-testid="AdminPanelSettingsIcon"]');

    // Esperar a que se complete la navegación al panel de administración
    await page.waitForURL(/\/admin/, { timeout });

    // Verificar que estamos en el panel de administración
    expect(page.url()).toContain('/admin');

    return true;
  } catch (error) {
    console.error('❌ Error al navegar al panel de administración:', error);
    await page.screenshot({ path: './test-results/admin-navigation-error.png' });
    return false;
  }
}

/**
 * Navega a la pestaña de historial en el panel de administración
 */
export async function navigateToHistoryTab(page: Page, timeout: number = 10000): Promise<boolean> {
  try {
    // Hacer clic en la pestaña de historial
    await page.waitForSelector('button:has-text("Historial")', { timeout });
    await page.click('button:has-text("Historial")');

    // Esperar a que cargue el componente del historial
    await page.waitForSelector('.MuiDateCalendar-root', { timeout });

    return true;
  } catch (error) {
    console.error('❌ Error al navegar a la pestaña de historial:', error);
    await page.screenshot({ path: './test-results/history-tab-navigation-error.png' });
    return false;
  }
}

/**
 * Localiza la tabla de turnos en la página de schedule
 */
export async function locateShiftTable(
  page: Page,
  options: ShiftElementOptions = {}
): Promise<boolean> {
  const { timeout = 10000, waitForLoad = true } = options;

  try {
    if (waitForLoad) {
      // Esperar a que la página se cargue completamente
      await page.waitForLoadState('networkidle', { timeout });
    }

    // Buscar elementos de días de turnos
    await page.waitForSelector('.shift-day', { timeout });

    // Verificar que hay al menos un día visible
    const shiftDays = await page.locator('.shift-day').count();

    if (shiftDays === 0) {
      console.error('❌ No se encontraron días de turnos en la página');
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Error al localizar la tabla de turnos:', error);
    await page.screenshot({ path: './test-results/shift-table-not-found.png' });
    return false;
  }
}

/**
 * Localiza un día específico de turnos
 */
export async function locateShiftDay(
  page: Page,
  dayIndex: number = 0,
  options: ShiftElementOptions = {}
): Promise<boolean> {
  const { timeout = 5000 } = options;

  try {
    // Esperar a que los días de turnos estén disponibles
    await page.waitForSelector('.shift-day', { timeout });

    // Verificar que el día específico existe
    const shiftDay = page.locator('.shift-day').nth(dayIndex);
    await expect(shiftDay).toBeVisible();

    return true;
  } catch (error) {
    console.error(`❌ Error al localizar el día de turno ${dayIndex}:`, error);
    return false;
  }
}

/**
 * Busca y hace clic en un botón de asignar turno
 */
export async function findAssignButton(page: Page): Promise<boolean> {
  try {
    // Buscar botones con texto "Asignar" o iconos de asignación
    const assignButtons = [
      'button:has-text("Asignar")',
      'button[aria-label*="asignar"]',
      'button[title*="asignar"]',
      'button:has(svg[data-testid="PersonAddIcon"])',
    ];

    for (const selector of assignButtons) {
      const isVisible = await page
        .locator(selector)
        .first()
        .isVisible()
        .catch(() => false);
      if (isVisible) {
        return true;
      }
    }

    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Verifica si un elemento está visible en la página
 */
export async function isElementVisible(
  page: Page,
  selector: string,
  timeout: number = 5000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout, state: 'visible' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Espera a que un elemento sea visible y luego hace clic en él
 */
export async function waitAndClick(
  page: Page,
  selector: string,
  timeout: number = 5000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout, state: 'visible' });
    await page.click(selector);
    return true;
  } catch (error) {
    console.error(`❌ Error al hacer clic en ${selector}:`, error);
    return false;
  }
}

/**
 * Espera a que un elemento sea visible y luego rellena un campo
 */
export async function waitAndFill(
  page: Page,
  selector: string,
  value: string,
  timeout: number = 5000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout, state: 'visible' });
    await page.fill(selector, value);
    return true;
  } catch (error) {
    console.error(`❌ Error al rellenar ${selector}:`, error);
    return false;
  }
}

/**
 * Captura una captura de pantalla con un nombre descriptivo
 */
export async function captureScreenshot(page: Page, name: string, context?: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = context
    ? `./test-results/${context}-${name}-${timestamp}.png`
    : `./test-results/${name}-${timestamp}.png`;

  await page.screenshot({ path: filename });
  console.log(`📸 Captura de pantalla guardada: ${filename}`);
}

/**
 * Espera a que la página se cargue completamente
 */
export async function waitForPageLoad(page: Page, timeout: number = 10000): Promise<boolean> {
  try {
    await page.waitForLoadState('networkidle', { timeout });
    await page.waitForLoadState('domcontentloaded', { timeout });
    return true;
  } catch (error) {
    await captureScreenshot(page, 'page-load-error');
    return false;
  }
}

export const userAlreadyInDB = async (email: string, adminAuth: any): Promise<boolean> => {
  try {
    await adminAuth.getUserByEmail(email);
    return true;
  } catch {
    return false;
  }
};

// Alias para compatibilidad con tests existentes
export const findShiftTable = locateShiftTable;
