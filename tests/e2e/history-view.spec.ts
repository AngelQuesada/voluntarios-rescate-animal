import { test, expect } from '@playwright/test';
import {
  loginUser,
  checkServerStatus,
  checkPageLoad,
  navigateToAdminPanel,
  navigateToHistoryTab,
} from './helpers/e2e-utils';

test.describe('History View', () => {
  test.beforeEach(async ({ page, request }) => {
    // Verificar estado del servidor antes de cada test
    const serverOk = await checkServerStatus(page, request, {
      timeout: 60000,
      failOnError: false,
    });

    if (!serverOk) {
      throw new Error('❌ El servidor no está disponible en el puerto 3001');
    }

    // Navegar a la página principal
    await page.goto(`${process.env.BASE_URL || 'http://localhost:3001'}`);

    // Verificar que la página cargó correctamente
    const pageLoaded = await checkPageLoad(page);
    if (!pageLoaded) {
      throw new Error('❌ La página no cargó correctamente');
    }
  });

  test('admin can access history and view volunteers', async ({ page }) => {
    console.log('🧪 [INICIANDO] Administrador accede al historial y visualiza voluntarios');

    // Iniciar sesión como administrador
    const loginSuccess = await loginUser(page, {
      userType: 'ADMIN',
      checkRedirect: true,
      expectedRedirectUrl: /\/schedule$/,
      timeout: 10000,
    });

    if (!loginSuccess) {
      console.log(
        '❌ [FALLÓ] Administrador accede al historial | Error: No se pudo completar el login'
      );
      throw new Error('Login como administrador falló');
    }

    // Navegar al panel de administración
    const adminPanelSuccess = await navigateToAdminPanel(page);
    if (!adminPanelSuccess) {
      console.log(
        '❌ [FALLÓ] Administrador accede al historial | Error: No se pudo acceder al panel de administración'
      );
      throw new Error('No se pudo acceder al panel de administración');
    }

    // Navegar a la pestaña de historial
    const historyTabSuccess = await navigateToHistoryTab(page);
    if (!historyTabSuccess) {
      console.log(
        '❌ [FALLÓ] Administrador accede al historial | Error: No se pudo acceder a la pestaña de historial'
      );
      throw new Error('No se pudo acceder a la pestaña de historial');
    }

    // Esperar a que cargue completamente el calendario
    await page.waitForTimeout(3000);

    // Intentar seleccionar una fecha disponible en el calendario
    const enabledDays = await page
      .locator('.MuiPickersDay-root:not(.Mui-disabled):not(.MuiPickersDay-hiddenDaySpacingFiller)')
      .count();

    if (enabledDays > 0) {
      await page
        .locator(
          '.MuiPickersDay-root:not(.Mui-disabled):not(.MuiPickersDay-hiddenDaySpacingFiller)'
        )
        .first()
        .click();
    } else {
      const visibleDays = await page
        .locator('.MuiPickersDay-root:not(.MuiPickersDay-hiddenDaySpacingFiller)')
        .count();
      if (visibleDays > 0) {
        await page
          .locator('.MuiPickersDay-root:not(.MuiPickersDay-hiddenDaySpacingFiller)')
          .first()
          .click({ force: true });
      }
    }

    // Esperar a que cargue la lista de voluntarios
    await page.waitForTimeout(3000);

    // Buscar nombres de voluntarios en el historial
    const volunteerNames = await page.locator('text=/[A-Z][a-z]+ [A-Z][a-z]+/').all();

    if (volunteerNames.length > 0) {
      await expect(volunteerNames[0]).toBeVisible();
      console.log('✅ [CORRECTO] Administrador accede al historial y visualiza voluntarios');
    } else {
      // Verificar si hay tabla con datos
      const anyTable = await page.locator('table').count();
      if (anyTable > 0) {
        const tableRows = await page.locator('table tr').count();
        expect(tableRows).toBeGreaterThan(0);
        console.log('✅ [CORRECTO] Administrador accede al historial y visualiza voluntarios');
      } else {
        console.log(
          '❌ [FALLÓ] Administrador accede al historial | Error: No se encontraron datos de voluntarios en el historial'
        );
        throw new Error('No se encontraron datos de voluntarios en el historial');
      }
    }
  });
});
