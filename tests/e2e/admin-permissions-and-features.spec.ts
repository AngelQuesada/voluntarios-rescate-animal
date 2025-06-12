import { test, expect } from '@playwright/test';
import { loginUser, checkServerStatus, checkPageLoad, findAssignButton } from './helpers/e2e-utils';

test.describe('Admin Permissions and Features', () => {
  test.beforeEach(async ({ page, request }) => {
    // Verificar estado del servidor antes de cada test
    const serverOk = await checkServerStatus(page, request, {
      timeout: 5000,
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

  test('volunteer should not see assign users to shifts button', async ({ page }) => {
    console.log('🧪 [INICIANDO] Verificar permisos de voluntario - botón asignar turnos');

    // Iniciar sesión como voluntario
    const loginSuccess = await loginUser(page, {
      userType: 'VOLUNTARIO',
      checkRedirect: true,
      expectedRedirectUrl: /\/schedule$/,
      timeout: 10000,
    });

    if (!loginSuccess) {
      console.log(
        '❌ [FALLÓ] Verificar permisos de voluntario | Error: No se pudo completar el login'
      );
      throw new Error('Login como voluntario falló');
    }

    // Esperar a que cargue el contenido de la programación
    await page.waitForSelector('text="Mis turnos"', { timeout: 10000, state: 'visible' });
    await page.waitForTimeout(2000); // Esperar a que se carguen todos los elementos

    // Verificar que el botón de asignar usuarios a turnos no está visible
    const hasAssignButton = await findAssignButton(page);

    if (hasAssignButton) {
      console.log(
        '❌ [FALLÓ] Verificar permisos de voluntario | Error: El voluntario puede ver el botón de asignar turnos'
      );
      throw new Error('El voluntario no debería ver el botón de asignar turnos');
    }

    // También verificar que no hay iconos PersonAdd
    const addUserButtons = page.locator(
      '[data-testid="PersonAddIcon"], svg[data-testid="PersonAddIcon"]'
    );
    await expect(addUserButtons).toHaveCount(0);

    // Verificar que no hay tooltips de "Añadir usuario a este turno"
    const addUserTooltips = page.locator('text="Añadir usuario a este turno"');
    await expect(addUserTooltips).toHaveCount(0);

    console.log('✅ [CORRECTO] Verificar permisos de voluntario - botón asignar turnos');
  });

  test('responsible should not see assign users to shifts button', async ({ page }) => {
    console.log('🧪 [INICIANDO] Verificar permisos de responsable - botón asignar turnos');

    // Iniciar sesión como responsable
    const loginSuccess = await loginUser(page, {
      userType: 'RESPONSABLE',
      checkRedirect: true,
      expectedRedirectUrl: /\/schedule$/,
      timeout: 10000,
    });

    if (!loginSuccess) {
      console.log(
        '❌ [FALLÓ] Verificar permisos de responsable | Error: No se pudo completar el login'
      );
      throw new Error('Login como responsable falló');
    }

    // Esperar a que cargue el contenido de la programación
    await page.waitForSelector('text="Mis turnos"', { timeout: 10000, state: 'visible' });
    await page.waitForTimeout(2000); // Esperar a que se carguen todos los elementos

    // Verificar que el botón de asignar usuarios a turnos no está visible
    const hasAssignButton = await findAssignButton(page);

    if (hasAssignButton) {
      console.log(
        '❌ [FALLÓ] Verificar permisos de responsable | Error: El responsable puede ver el botón de asignar turnos'
      );
      throw new Error('El responsable no debería ver el botón de asignar turnos');
    }

    // También verificar que no hay iconos PersonAdd
    const addUserButtons = page.locator(
      '[data-testid="PersonAddIcon"], svg[data-testid="PersonAddIcon"]'
    );
    await expect(addUserButtons).toHaveCount(0);

    // Verificar que no hay tooltips de "Añadir usuario a este turno"
    const addUserTooltips = page.locator('text="Añadir usuario a este turno"');
    await expect(addUserTooltips).toHaveCount(0);

    console.log('✅ [CORRECTO] Verificar permisos de responsable - botón asignar turnos');
  });
});
