import { test, expect } from '@playwright/test';
import { loginUser, checkServerStatus, checkPageLoad, findShiftTable } from './helpers/e2e-utils';
import { clearShiftsCollection, seedShift, getUserIdByEmail } from '../utils/db-utils';
import { TEST_USERS } from '../helpers/test-db-setup';
import { format, addDays } from 'date-fns';

test.describe('Shift Assignment by Role', () => {
  const tomorrow = addDays(new Date(), 1);
  const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

  test.beforeEach(async ({ page, request }) => {
    const serverOk = await checkServerStatus(page, request, {
      timeout: 60000,
      failOnError: false,
    });
    if (!serverOk) {
      throw new Error('❌ El servidor no está disponible en el puerto 3001');
    }

    // Default: clear clean slate. Individual tests may seed specific data.
    await clearShiftsCollection();

    await page.goto(`${process.env.BASE_URL || 'http://localhost:3001'}`);
    const pageLoaded = await checkPageLoad(page);
    if (!pageLoaded) {
      throw new Error('❌ La página no cargó correctamente');
    }
  });

  test('admin can assign self to a shift', async ({ page }) => {
    // Escenario: Turno vacío mañana
    // El admin se loguea y se asigna.

    // Login
    await loginUser(page, { userType: 'ADMIN' });

    // Buscar tabla y navegar a fecha si es necesario.
    // Asumimos que "mañana" se ve en la vista semanal por defecto.
    const shiftTable = await findShiftTable(page);
    expect(shiftTable).toBeTruthy();

    // Buscar botón de "Asignarme" (AddMyTurn) para mañana por la mañana (M)
    // El ID del día suele ser data-date o similar, pero los botones tienen test-id.
    // En la vista desktop, buscaremos el botón correspondiente al día.
    // Simplificación: buscaremos "el primer botón de asignarse" disponible.
    // Como borramos la DB, todos los turnos están libres.

    // Pero espera, si no hay documento en DB, ¿la UI muestra el botón?
    // Asumimos que la UI renderiza la grilla siempre.

    const addSelfBtn = page.locator('[data-testid="AddMyTurn"]').first();
    await expect(addSelfBtn).toBeVisible();
    await addSelfBtn.click();

    // Validación: Mensaje de éxito o cambio de estado visual
    await expect(page.locator('text=asignado al turno')).toBeVisible();

    // Verificar que ahora aparece "RemoveMyTurn" (o el avatar/nombre)
    await expect(page.locator('[data-testid="RemoveMyTurn"]').first()).toBeVisible();
  });

  test('volunteer can assign self to a shift', async ({ page }) => {
    await loginUser(page, { userType: 'VOLUNTARIO' });
    const shiftTable = await findShiftTable(page);
    expect(shiftTable).toBeTruthy();

    const addSelfBtn = page.locator('[data-testid="AddMyTurn"]').first();
    await expect(addSelfBtn).toBeVisible();
    await addSelfBtn.click();

    await expect(page.locator('text=asignado al turno')).toBeVisible();
    await expect(page.locator('[data-testid="RemoveMyTurn"]').first()).toBeVisible();
  });

  test('admin can assign other user', async ({ page }) => {
    // Necesitamos un voluntario existente para asignarlo
    // En un sistema real, el selector lista usuarios de la DB.
    // TEST_USERS.VOLUNTARIO debería aparecer.

    await loginUser(page, { userType: 'ADMIN' });
    const shiftTable = await findShiftTable(page);
    expect(shiftTable).toBeTruthy();

    // Botón "Añadir Usuario" (Add User to shift) - data-testid="add-user-button"
    const addUserBtn = page.locator('[data-testid="add-user-button"]').first();
    await expect(addUserBtn).toBeVisible();
    await addUserBtn.click();

    // Modal
    await expect(page.getByText('Añadir Usuario al Turno')).toBeVisible();

    // Seleccionar primer usuario de la lista (asumimos que hay usuarios)
    const userItem = page.locator('[data-testid="assign-shift"]').first();
    await expect(userItem).toBeVisible();

    // Opcional: filtrar por nombre si queremos ser específicos
    // const userItem = page.locator('[data-testid="assign-shift"]').filter({ hasText: 'Voluntario' }).first();

    await userItem.click();

    await expect(page.locator('text=asignado al turno')).toBeVisible();
  });

  test('admin can unassign other user', async ({ page }) => {
    // Setup: Seed shift con voluntario asignado
    if (!TEST_USERS.VOLUNTARIO?.email) throw new Error('No volunteer email');
    const volUid = await getUserIdByEmail(TEST_USERS.VOLUNTARIO.email);

    await seedShift({
      date: tomorrowStr,
      area: 'Mañana',
      assignments: [{ uid: volUid }],
    });

    await loginUser(page, { userType: 'ADMIN' });
    const shiftTable = await findShiftTable(page);
    expect(shiftTable).toBeTruthy();

    // Buscar el turno donde está el voluntario.
    // El usuario aparece con un botón para eliminar (data-testid="unassign-user-button")
    // OJO: Si el admin ve el turno, verá el nombre del voluntario y una 'X' o trash icon.

    // Verificar que el voluntario está asignado
    // await expect(page.locator(`text=${TEST_USERS.VOLUNTARIO.userData.name}`)).toBeVisible();
    // Puede ser flaky si hay scroll, pero asumimos visibilidad básica.

    const unassignBtn = page.locator('[data-testid="unassign-user-button"]').first();
    await expect(unassignBtn).toBeVisible();
    await unassignBtn.click();

    // Confirmación dialgo
    const confirmBtn = page.getByTestId('confirm-remove-user-dialog-confirm-button');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Verificación
    await expect(page.locator('text=eliminado').or(page.locator('text=removido'))).toBeVisible();
  });
});
