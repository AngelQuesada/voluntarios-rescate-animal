import { test, expect } from '@playwright/test';
import {
  loginUser,
  checkServerStatus,
  checkPageLoad,
  navigateToAdminPanel,
  navigateToHistoryTab,
} from './helpers/e2e-utils';
import { format, subDays } from 'date-fns';
import { clearShiftsCollection, seedShift, getUserIdByEmail } from '../utils/db-utils';
import { TEST_USERS } from '../helpers/test-db-setup';

test.describe('History View', () => {
  let volunteerUid: string;
  // Usamos "ayer" como fecha fija para el test
  const targetDate = subDays(new Date(), 1);
  const targetDateStr = format(targetDate, 'yyyy-MM-dd');

  test.beforeEach(async ({ page, request }) => {
    // 1. Verificar servidor
    const serverOk = await checkServerStatus(page, request, {
      timeout: 60000,
      failOnError: false,
    });
    if (!serverOk) {
      throw new Error('❌ El servidor no está disponible en el puerto 3001');
    }

    // 2. Limpiar Turnos
    await clearShiftsCollection();

    // 3. Obtener ID del voluntario
    try {
      if (!TEST_USERS.VOLUNTARIO?.email)
        throw new Error('TEST_USERS.VOLUNTARIO.email is undefined');
      volunteerUid = await getUserIdByEmail(TEST_USERS.VOLUNTARIO.email);
    } catch (error) {
      console.error('Error getting volunteer UID:', error);
      throw new Error(
        'No se pudo obtener el UID del voluntario. Asegúrate de que los usuarios estén creados.'
      );
    }

    // 4. Seeding: Crear turno ayer asignado al voluntario
    await seedShift({
      date: targetDateStr,
      area: 'Mañana',
      assignments: [{ uid: volunteerUid }],
    });

    // Navegar a la home
    await page.goto(`${process.env.BASE_URL || 'http://localhost:3001'}`);
    const pageLoaded = await checkPageLoad(page);
    if (!pageLoaded) {
      throw new Error('❌ La página no cargó correctamente');
    }
  });

  test('admin can access history and view specific volunteer shift', async ({ page }) => {
    // Login Admin
    const loginSuccess = await loginUser(page, {
      userType: 'ADMIN',
      checkRedirect: true,
      expectedRedirectUrl: /\/schedule/,
    });
    if (!loginSuccess) throw new Error('Login Admin falló');

    // Ir a Admin Panel
    await navigateToAdminPanel(page);

    // Ir a Historial
    await navigateToHistoryTab(page);

    // Esperar a que el calendario sea interactivo
    await page.waitForTimeout(1000); // Pequeña espera para estabilidad UI

    // Seleccionar la fecha 'targetDate' en el calendario datetime picker
    // Buscamos el botón del día específico.
    // Estrategia alternativa: Buscar por texto del día
    const dayNumber = format(targetDate, 'd');

    const today = new Date();
    if (today.getMonth() !== targetDate.getMonth()) {
      const prevMonthBtn = page.locator('button[title="Previous month"]');
      if (await prevMonthBtn.isVisible()) {
        await prevMonthBtn.click();
      }
    }

    // Click en el día
    const dayBtn = page
      .locator('.MuiPickersDay-root')
      .getByText(dayNumber, { exact: true })
      .first();

    await expect(dayBtn).toBeVisible();
    await dayBtn.click();

    // Verificamos que aparece el voluntario en la lista
    // Nombre esperado: "Voluntario Test"
    const volunteerName = `${TEST_USERS.VOLUNTARIO.userData.name} ${TEST_USERS.VOLUNTARIO.userData.lastName}`;
    await expect(page.locator(`text=${volunteerName}`)).toBeVisible({ timeout: 5000 });
  });
});
