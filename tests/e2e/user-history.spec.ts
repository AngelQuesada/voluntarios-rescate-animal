import { test, expect, Page } from '@playwright/test';
import { loginUser, checkServerStatus, checkPageLoad } from './helpers/e2e-utils';
import { UserHistoryShift } from '../../src/hooks/history/useUserHistory';
import { format, subMonths, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

// Configuración de datos mock para simular turnos en diferentes fechas
const today = new Date();
const yesterday = subDays(today, 1);
const tomorrow = addDays(today, 1);
const oneMonthAgo = subMonths(today, 1);
const twoMonthsAgo = subMonths(today, 2);
const fourMonthsAgo = subMonths(today, 4);

// Configuración de turnos mock con diferentes escenarios temporales
const MOCK_SHIFTS_CONFIG = {
  yesterdayShift: {
    id: `${format(yesterday, 'yyyy-MM-dd')}_M`,
    date: format(yesterday, 'yyyy-MM-dd'),
    area: 'Mañana',
    startTime: '09:00',
    endTime: '13:00',
  },
  oneMonthAgoShift: {
    id: `${format(oneMonthAgo, 'yyyy-MM-dd')}_M`,
    date: format(oneMonthAgo, 'yyyy-MM-dd'),
    area: 'Mañana',
    startTime: '09:00',
    endTime: '13:00',
  },
  twoMonthsAgoShift: {
    id: `${format(twoMonthsAgo, 'yyyy-MM-dd')}_T`,
    date: format(twoMonthsAgo, 'yyyy-MM-dd'),
    area: 'Tarde',
    startTime: '16:00',
    endTime: '20:00',
  },
  todayShift: {
    id: `${format(today, 'yyyy-MM-dd')}_T`,
    date: format(today, 'yyyy-MM-dd'),
    area: 'Tarde',
    startTime: '16:00',
    endTime: '20:00',
  },
  tomorrowShift: {
    id: `${format(tomorrow, 'yyyy-MM-dd')}_M`,
    date: format(tomorrow, 'yyyy-MM-dd'),
    area: 'Mañana',
    startTime: '09:00',
    endTime: '13:00',
  },
  fourMonthsAgoShift: {
    id: `${format(fourMonthsAgo, 'yyyy-MM-dd')}_M`,
    date: format(fourMonthsAgo, 'yyyy-MM-dd'),
    area: 'Mañana',
    startTime: '09:00',
    endTime: '13:00',
  },
};

const ALL_MOCK_SHIFTS: UserHistoryShift[] = Object.values(MOCK_SHIFTS_CONFIG);

// Función para inyectar datos mock en el navegador durante las pruebas
async function mockUserHistoryData(
  page: Page,
  data: UserHistoryShift[] | null,
  isLoading: boolean = false
) {
  await page.evaluate(
    (mockData) => {
      window.__E2E_MOCK_USER_HISTORY__ = mockData;
    },
    { data, isLoading, error: null }
  );
}

// Función auxiliar para parsear fechas en formato ISO
function parseISO(dateString: string): Date {
  return new Date(dateString);
}

test.describe('User Shift History Tab', () => {
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

  test('tab visibility and navigation', async ({ page }) => {
    console.log('🧪 [INICIANDO] Visibilidad y navegación de pestaña de historial');

    // Iniciar sesión como voluntario
    const loginSuccess = await loginUser(page, {
      userType: 'VOLUNTARIO',
      checkRedirect: true,
      expectedRedirectUrl: /\/schedule$/,
      timeout: 10000,
    });

    if (!loginSuccess) {
      console.log(
        '❌ [FALLÓ] Visibilidad y navegación de pestaña de historial | Error: No se pudo completar el login'
      );
      throw new Error('Login como voluntario falló');
    }

    try {
      // Buscar la pestaña de historial
      const historyTab = page.locator('button[aria-controls="tabpanel-2"]');
      await expect(historyTab).toBeVisible({ timeout: 10000 });
      await expect(historyTab).toHaveText('Mi historial');

      // Hacer click en la pestaña
      await historyTab.click();

      // Verificar que se muestra el título del historial
      const historyTabTitle = page.locator('h6:has-text("Mi historial de turnos")');
      await expect(historyTabTitle).toBeVisible({ timeout: 5000 });

      // Verificar mensaje cuando no hay turnos
      const noShiftsMessage = page.locator('text="No hay turnos para mostrar."');
      await expect(noShiftsMessage).toBeVisible({ timeout: 5000 });

      console.log('✅ [CORRECTO] Visibilidad y navegación de pestaña de historial');
    } catch (error: Error | unknown) {
      console.log(
        error instanceof Error
          ? `❌ [FALLÓ] Visibilidad y navegación de pestaña de historial | Error: ${error.message}`
          : 'Error desconocido'
      );
      throw error;
    }
  });

  test('data fetching and display with mocked data', async ({ page }) => {
    console.log('🧪 [INICIANDO] Obtención y visualización de datos con datos simulados');

    // Iniciar sesión como voluntario
    const loginSuccess = await loginUser(page, {
      userType: 'VOLUNTARIO',
      checkRedirect: true,
      expectedRedirectUrl: /\/schedule$/,
      timeout: 10000,
    });

    if (!loginSuccess) {
      console.log(
        '❌ [FALLÓ] Obtención y visualización de datos | Error: No se pudo completar el login'
      );
      throw new Error('Login como voluntario falló');
    }

    try {
      // Solo incluye turnos pasados dentro de los últimos 3 meses
      const shiftsForTest = [
        MOCK_SHIFTS_CONFIG.oneMonthAgoShift,
        MOCK_SHIFTS_CONFIG.twoMonthsAgoShift,
      ];
      await mockUserHistoryData(page, shiftsForTest);

      // Navegar a la pestaña de historial
      const historyTab = page.locator('button[aria-controls="tabpanel-2"]');
      await historyTab.click();
      await expect(page.locator('h6:has-text("Mi historial de turnos")')).toBeVisible({
        timeout: 5000,
      });

      // Verificar que los turnos esperados se muestren en la tabla
      for (const shift of shiftsForTest) {
        const shiftDateFormatted = format(parseISO(shift.date), 'dd MMM yyyy', { locale: es });
        const shiftEntryDate = page.locator(`td:has-text("${shiftDateFormatted}")`);
        const shiftEntryArea = page.locator(`td:has-text("${shift.area}")`);
        await expect(shiftEntryDate.first()).toBeVisible({ timeout: 5000 });
        await expect(shiftEntryArea.first()).toBeVisible({ timeout: 5000 });
      }

      // Verificar que turnos anteriores a 3 meses NO se muestren
      const olderShiftDateFormatted = format(
        parseISO(MOCK_SHIFTS_CONFIG.fourMonthsAgoShift.date),
        'dd MMM yyyy',
        { locale: es }
      );
      const olderShiftEntry = page.locator(`td:has-text("${olderShiftDateFormatted}")`);
      await expect(olderShiftEntry).not.toBeVisible();

      console.log('✅ [CORRECTO] Obtención y visualización de datos con datos simulados');
    } catch (error: Error | unknown) {
      console.log(
        error instanceof Error
          ? `❌ [FALLÓ] Obtención y visualización de datos | Error: ${error.message}`
          : 'Error desconocido'
      );
      throw error;
    }
  });

  test('empty state with mocked data', async ({ page }) => {
    console.log('🧪 [INICIANDO] Estado vacío con datos simulados');

    // Iniciar sesión como voluntario
    const loginSuccess = await loginUser(page, {
      userType: 'VOLUNTARIO',
      checkRedirect: true,
      expectedRedirectUrl: /\/schedule$/,
      timeout: 10000,
    });

    if (!loginSuccess) {
      console.log('❌ [FALLÓ] Estado vacío | Error: No se pudo completar el login');
      throw new Error('Login como voluntario falló');
    }

    try {
      // Mockear datos vacíos
      await mockUserHistoryData(page, []);

      // Navegar a la pestaña de historial
      const historyTab = page.locator('button[aria-controls="tabpanel-2"]');
      await historyTab.click();
      await expect(page.locator('h6:has-text("Mi historial de turnos")')).toBeVisible({
        timeout: 5000,
      });

      // Verificar que se muestre el mensaje de estado vacío
      const noShiftsMessage = page.locator('text="No hay turnos para mostrar."');
      await expect(noShiftsMessage).toBeVisible({ timeout: 5000 });

      console.log('✅ [CORRECTO] Estado vacío con datos simulados');
    } catch (error: Error | unknown) {
      console.log(
        error instanceof Error
          ? `❌ [FALLÓ] Estado vacío | Error: ${error.message}`
          : 'Error desconocido'
      );
      throw error;
    }
  });

  test('displays only past shifts excluding today and future', async ({ page }) => {
    console.log('🧪 [INICIANDO] Muestra solo turnos pasados excluyendo hoy y futuros');

    // Iniciar sesión como voluntario
    const loginSuccess = await loginUser(page, {
      userType: 'VOLUNTARIO',
      checkRedirect: true,
      expectedRedirectUrl: /\/schedule$/,
      timeout: 10000,
    });

    if (!loginSuccess) {
      console.log('❌ [FALLÓ] Filtrado de turnos pasados | Error: No se pudo completar el login');
      throw new Error('Login como voluntario falló');
    }

    try {
      // Usar el conjunto completo de datos para probar el filtrado del hook
      await mockUserHistoryData(page, ALL_MOCK_SHIFTS);

      // Navegar a la pestaña de historial
      const historyTab = page.locator('button[aria-controls="tabpanel-2"]');
      await historyTab.click();
      await expect(page.locator('h6:has-text("Mi historial de turnos")')).toBeVisible({
        timeout: 5000,
      });

      // Turnos que deben ser visibles (pasados, últimos 3 meses)
      const expectedVisibleShifts = [
        MOCK_SHIFTS_CONFIG.yesterdayShift,
        MOCK_SHIFTS_CONFIG.oneMonthAgoShift,
        MOCK_SHIFTS_CONFIG.twoMonthsAgoShift,
      ];

      // Turnos que NO deben ser visibles (hoy, futuros, o muy antiguos)
      const expectedHiddenShifts = [
        MOCK_SHIFTS_CONFIG.todayShift,
        MOCK_SHIFTS_CONFIG.tomorrowShift,
        MOCK_SHIFTS_CONFIG.fourMonthsAgoShift,
      ];

      // Verificar que los turnos esperados sean visibles
      for (const shift of expectedVisibleShifts) {
        const shiftDateFormatted = format(parseISO(shift.date), 'dd MMM yyyy', { locale: es });
        const shiftEntry = page.locator(
          `tr:has(td:text-is("${shiftDateFormatted}")):has(td:text-is("${shift.area}"))`
        );
        await expect(shiftEntry).toBeVisible({ timeout: 5000 });
      }

      // Verificar que los turnos no esperados NO sean visibles
      for (const shift of expectedHiddenShifts) {
        const shiftDateFormatted = format(parseISO(shift.date), 'dd MMM yyyy', { locale: es });
        const shiftEntry = page.locator(
          `tr:has(td:text-is("${shiftDateFormatted}")):has(td:text-is("${shift.area}"))`
        );
        await expect(shiftEntry).not.toBeVisible();
      }

      console.log('✅ [CORRECTO] Muestra solo turnos pasados excluyendo hoy y futuros');
    } catch (error: Error | unknown) {
      console.log(
        error instanceof Error
          ? `❌ [FALLÓ] Filtrado de turnos pasados | Error: ${error.message}`
          : 'Error desconocido'
      );
      throw error;
    }
  });
});
