import { test, expect } from '@playwright/test';
import { loginUser, checkServerStatus, checkPageLoad } from './helpers/e2e-utils';
import { format, subMonths, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { clearShiftsCollection, seedShift, getUserIdByEmail } from '../utils/db-utils';
import { TEST_USERS } from '../helpers/test-db-setup';

test.describe('User Shift History Tab', () => {
  let volunteerUid: string;

  test.beforeEach(async ({ page, request }) => {
    // 1. Verificar servidor
    const serverOk = await checkServerStatus(page, request, {
      timeout: 60000,
      failOnError: false,
    });
    if (!serverOk) {
      throw new Error('❌ El servidor no está disponible en el puerto 3001');
    }

    // 2. Limpiar Base de Datos
    await clearShiftsCollection();

    // 3. Obtener UID del Voluntario
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

    // 4. Seeding inicial (Turnos base para pruebas generales)
    // Turno ayer (debe salir)
    const yesterday = subDays(new Date(), 1);
    await seedShift({
      date: format(yesterday, 'yyyy-MM-dd'),
      area: 'Mañana',
      assignments: [{ uid: volunteerUid }],
    });

    // Turno hace 2 meses (debe salir)
    const twoMonthsAgo = subMonths(new Date(), 2);
    await seedShift({
      date: format(twoMonthsAgo, 'yyyy-MM-dd'),
      area: 'Tarde',
      assignments: [{ uid: volunteerUid }],
    });

    // Navegar a la home
    await page.goto(`${process.env.BASE_URL || 'http://localhost:3001'}`);
    const pageLoaded = await checkPageLoad(page);
    if (!pageLoaded) {
      throw new Error('❌ La página no cargó correctamente');
    }
  });

  test('tab visibility and navigation', async ({ page }) => {
    // Iniciar sesión
    const loginSuccess = await loginUser(page, {
      userType: 'VOLUNTARIO',
      checkRedirect: true,
      expectedRedirectUrl: /\/schedule/,
    });
    if (!loginSuccess) throw new Error('Login falló');

    // Navegar a historial
    const historyTab = page.locator('button[aria-controls="tabpanel-2"]');
    await expect(historyTab).toBeVisible();
    await historyTab.click();

    // Verificar cabecera de la tabla
    await expect(page.locator('text="Fecha"')).toBeVisible();
    await expect(page.locator('text="Turno"')).toBeVisible();
  });

  test('data fetching and display with real data', async ({ page }) => {
    const loginSuccess = await loginUser(page, {
      userType: 'VOLUNTARIO',
      checkRedirect: true,
      expectedRedirectUrl: /\/schedule/,
    });
    if (!loginSuccess) throw new Error('Login falló');

    const historyTab = page.locator('button[aria-controls="tabpanel-2"]');
    await historyTab.click();

    await expect(page.locator('text="Fecha"')).toBeVisible();

    // Esperar a que la tabla cargue (puede tardar un poco en hacer fetch)
    // Buscamos los turnos creados en beforeEach
    const yesterdayStr = format(subDays(new Date(), 1), 'dd MMM yyyy', { locale: es });
    const twoMonthsAgoStr = format(subMonths(new Date(), 2), 'dd MMM yyyy', { locale: es });

    await expect(page.locator(`td:has-text("${yesterdayStr}")`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`td:has-text("${twoMonthsAgoStr}")`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('td:has-text("Mañana")')).toBeVisible();
    await expect(page.locator('td:has-text("Tarde")')).toBeVisible();
  });

  test('empty state', async ({ page }) => {
    // Limpiamos los turnos creados en beforeEach para probar estado vacío
    await clearShiftsCollection();

    const loginSuccess = await loginUser(page, {
      userType: 'VOLUNTARIO',
      checkRedirect: true,
      expectedRedirectUrl: /\/schedule/,
    });
    if (!loginSuccess) throw new Error('Login falló');

    const historyTab = page.locator('button[aria-controls="tabpanel-2"]');
    await historyTab.click();

    await expect(page.locator('text="No hay turnos para mostrar."')).toBeVisible({
      timeout: 10000,
    });
  });

  test('displays only past shifts (filtering)', async ({ page }) => {
    // Inyectamos un turno de "Mañana" (futuro)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await seedShift({
      date: format(tomorrow, 'yyyy-MM-dd'),
      area: 'Mañana',
      assignments: [{ uid: volunteerUid }],
    });

    const loginSuccess = await loginUser(page, {
      userType: 'VOLUNTARIO',
      checkRedirect: true,
      expectedRedirectUrl: /\/schedule/,
    });
    if (!loginSuccess) throw new Error('Login falló');

    const historyTab = page.locator('button[aria-controls="tabpanel-2"]');
    await historyTab.click();

    // El turno de ayer SÍ debe verse
    const yesterdayStr = format(subDays(new Date(), 1), 'dd MMM yyyy', { locale: es });
    await expect(page.locator(`td:has-text("${yesterdayStr}")`)).toBeVisible();

    // El turno de mañana NO debe verse
    const tomorrowStr = format(tomorrow, 'dd MMM yyyy', { locale: es });
    await expect(page.locator(`td:has-text("${tomorrowStr}")`)).not.toBeVisible();
  });
});
