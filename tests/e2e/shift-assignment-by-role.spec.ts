import { test } from '@playwright/test';
import { loginUser, checkServerStatus, checkPageLoad, findShiftTable } from './helpers/e2e-utils';

test.describe('Shift Assignment by Role', () => {
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

  test('admin can assign and unassign shifts own shifts', async ({ page }) => {
    console.log('🧪 [INICIANDO] Administrador asigna y desasigna turnos');

    // Iniciar sesión como administrador
    const loginSuccess = await loginUser(page, {
      userType: 'ADMIN',
      checkRedirect: true,
      expectedRedirectUrl: /\/schedule$/,
      timeout: 10000,
    });

    if (!loginSuccess) {
      console.log(
        '❌ [FALLÓ] Administrador asigna y desasigna turnos | Error: No se pudo completar el login'
      );
      throw new Error('Login como administrador falló');
    }

    // Buscar la tabla de turnos
    const shiftTable = await findShiftTable(page, { timeout: 10000 });
    if (!shiftTable) {
      console.log(
        '❌ [FALLÓ] Responsable asigna y desasigna turnos | Error: No se encontró la tabla de turnos'
      );
      throw new Error('No se encontró la tabla de turnos');
    }

    // Esperar a que se carguen todos los elementos
    await page.waitForTimeout(2000);

    // Verificar si ya hay algún turno asignado
    const alreadyAssigned = (await page.locator('[data-testid="RemoveMyTurn"]').count()) > 0;

    if (alreadyAssigned) {
      // Si ya está asignado, buscar botón de eliminar
      const deleteButtons = page.locator('[data-testid="RemoveMyTurn"]');
      const deleteCount = await deleteButtons.count();

      if (deleteCount > 0) {
        await deleteButtons.first().click();
        await page.waitForTimeout(3000);
      }
    }

    // Buscar botones de autoasignación
    const selfAssignButtons = page.locator('[data-testid="AddMyTurn"]');
    const selfAssignCount = await selfAssignButtons.count();

    if (selfAssignCount > 0) {
      // Hacer click para autoasignarse
      await selfAssignButtons.first().click();

      // Esperar a que se complete la asignación
      await page.waitForTimeout(3000);

      // Verificar que aparece el mensaje de confirmación
      const userNameVisible = await page
        .getByTestId('notification-snackbar')
        .filter({ hasText: 'asignado al turno' })
        .isVisible()
        .catch(() => false);

      if (userNameVisible) {
        // Ahora desasignar el turno
        const deleteButtons = page.locator('[data-testid="RemoveMyTurn"]');
        const deleteCount = await deleteButtons.count();

        if (deleteCount > 0) {
          await deleteButtons.first().click();
          await page.waitForTimeout(3000);

          // Verificar que ya no aparece el nombre
          const userNameStillVisible = await page
            .getByTestId('assignment-user-box')
            .filter({ hasText: '(Tú)' })
            .isVisible()
            .catch(() => false);

          if (!userNameStillVisible) {
            console.log('✅ [CORRECTO] Administrador asigna y desasigna sus propios turnos');
          } else {
            console.log(
              '❌ [FALLÓ] Administrador asigna y desasigna turnos | Error: No se pudo desasignar el turno'
            );
            throw new Error('No se pudo desasignar el turno');
          }
        } else {
          console.log(
            '❌ [FALLÓ] Administrador asigna y desasigna turnos | Error: No se encontró botón de eliminar después de asignar'
          );
          throw new Error('No se encontró botón de eliminar después de asignar');
        }
      } else {
        console.log(
          '❌ [FALLÓ] Administrador asigna y desasigna turnos | Error: No se pudo verificar la asignación del turno'
        );
        throw new Error('No se pudo verificar la asignación del turno');
      }
    } else {
      console.log(
        '❌ [FALLÓ] Administrador asigna y desasigna turnos | Error: No se encontraron botones de autoasignación'
      );
      throw new Error('No se encontraron botones de autoasignación');
    }
  });

  test('responsible can assign and unassign own shifts', async ({ page }) => {
    console.log('🧪 [INICIANDO] Responsable asigna y desasigna sus propios turnos');

    // Iniciar sesión como responsable
    const loginSuccess = await loginUser(page, {
      userType: 'RESPONSABLE',
      checkRedirect: true,
      expectedRedirectUrl: /\/schedule$/,
      timeout: 10000,
    });

    if (!loginSuccess) {
      console.log(
        '❌ [FALLÓ] Responsable asigna y desasigna turnos | Error: No se pudo completar el login'
      );
      throw new Error('Login como responsable falló');
    }

    // Buscar la tabla de turnos
    const shiftTable = await findShiftTable(page, { timeout: 10000 });
    if (!shiftTable) {
      console.log(
        '❌ [FALLÓ] Responsable asigna y desasigna turnos | Error: No se encontró la tabla de turnos'
      );
      throw new Error('No se encontró la tabla de turnos');
    }

    // Esperar a que se carguen todos los elementos
    await page.waitForTimeout(2000);

    // Verificar si ya hay algún turno asignado
    const alreadyAssigned = (await page.locator('[data-testid="RemoveMyTurn"]').count()) > 0;

    if (alreadyAssigned) {
      // Si ya está asignado, buscar botón de eliminar
      const deleteButtons = page.locator('[data-testid="RemoveMyTurn"]');
      const deleteCount = await deleteButtons.count();

      if (deleteCount > 0) {
        await deleteButtons.first().click();
        await page.waitForTimeout(3000);
      }
    }

    // Buscar botones de autoasignación (AddIcon)
    const selfAssignButtons = page.locator('[data-testid="AddMyTurn"]');
    const selfAssignCount = await selfAssignButtons.count();

    if (selfAssignCount > 0) {
      // Hacer click para autoasignarse
      await selfAssignButtons.first().click();

      // Esperar a que se complete la asignación
      await page.waitForTimeout(3000);

      // Verificar que aparece el mensaje de confirmación
      const userNameVisible = await page
        .getByTestId('notification-snackbar')
        .filter({ hasText: 'asignado al turno' })
        .isVisible()
        .catch(() => false);

      if (userNameVisible) {
        // Ahora desasignar el turno
        const deleteButtons = page.locator('[data-testid="RemoveMyTurn"]');
        const deleteCount = await deleteButtons.count();

        if (deleteCount > 0) {
          await deleteButtons.first().click();
          await page.waitForTimeout(3000);

          // Verificar que ya no aparece el nombre
          const userNameStillVisible = await page
            .getByTestId('assignment-user-box')
            .filter({ hasText: '(Tú)' })
            .isVisible()
            .catch(() => false);

          if (!userNameStillVisible) {
            console.log('✅ [CORRECTO] Responsable asigna y desasigna sus propios turnos');
          } else {
            console.log(
              '❌ [FALLÓ] Responsable asigna y desasigna turnos | Error: No se pudo desasignar el turno'
            );
            throw new Error('No se pudo desasignar el turno');
          }
        } else {
          console.log(
            '❌ [FALLÓ] Responsable asigna y desasigna turnos | Error: No se encontró botón de eliminar después de asignar'
          );
          throw new Error('No se encontró botón de eliminar después de asignar');
        }
      } else {
        console.log(
          '❌ [FALLÓ] Responsable asigna y desasigna turnos | Error: No se pudo verificar la asignación del turno'
        );
        throw new Error('No se pudo verificar la asignación del turno');
      }
    } else {
      console.log(
        '❌ [FALLÓ] Responsable asigna y desasigna turnos | Error: No se encontraron botones de autoasignación'
      );
      throw new Error('No se encontraron botones de autoasignación');
    }
  });

  test('volunteer can assign and unassign own shifts', async ({ page }) => {
    console.log('🧪 [INICIANDO] Voluntario asigna y desasigna sus propios turnos');

    // Iniciar sesión como voluntario
    const loginSuccess = await loginUser(page, {
      userType: 'VOLUNTARIO',
      checkRedirect: true,
      expectedRedirectUrl: /\/schedule$/,
      timeout: 10000,
    });

    if (!loginSuccess) {
      console.log(
        '❌ [FALLÓ] Voluntario asigna y desasigna turnos | Error: No se pudo completar el login'
      );
      throw new Error('Login como voluntario falló');
    }

    // Buscar la tabla de turnos
    const shiftTable = await findShiftTable(page, { timeout: 10000 });
    if (!shiftTable) {
      console.log(
        '❌ [FALLÓ] Voluntario asigna y desasigna turnos | Error: No se encontró la tabla de turnos'
      );
      throw new Error('No se encontró la tabla de turnos');
    }

    // Esperar a que se carguen todos los elementos
    await page.waitForTimeout(2000);

    // Verificar si ya hay algún turno asignado
    const alreadyAssigned = (await page.locator('[data-testid="RemoveMyTurn"]').count()) > 0;

    if (alreadyAssigned) {
      // Si ya está asignado, buscar botón de eliminar
      const deleteButtons = page.locator('[data-testid="RemoveMyTurn"]');
      const deleteCount = await deleteButtons.count();

      if (deleteCount > 0) {
        await deleteButtons.first().click();
        await page.waitForTimeout(3000);
      }
    }

    // Buscar botones de autoasignación (AddIcon)
    const selfAssignButtons = page.locator('[data-testid="AddMyTurn"]');
    const selfAssignCount = await selfAssignButtons.count();

    if (selfAssignCount > 0) {
      // Hacer click para autoasignarse
      await selfAssignButtons.first().click();

      // Esperar a que se complete la asignación
      await page.waitForTimeout(3000);

      // Verificar que aparece el nombre del voluntario
      const userNameVisible = await page
        .getByTestId('notification-snackbar')
        .filter({ hasText: 'asignado al turno' })
        .isVisible()
        .catch(() => false);

      if (userNameVisible) {
        // Ahora desasignar el turno
        const deleteButtons = page.locator('[data-testid="RemoveMyTurn"]');
        const deleteCount = await deleteButtons.count();

        if (deleteCount > 0) {
          await deleteButtons.first().click();
          await page.waitForTimeout(3000);

          // Verificar que ya no aparece el nombre
          const userNameStillVisible = await page
            .getByTestId('assignment-user-box')
            .filter({ hasText: '(Tú)' })
            .isVisible()
            .catch(() => false);

          if (!userNameStillVisible) {
            console.log('✅ [CORRECTO] Voluntario asigna y desasigna sus propios turnos');
          } else {
            console.log(
              '❌ [FALLÓ] Voluntario asigna y desasigna turnos | Error: No se pudo desasignar el turno'
            );
            throw new Error('No se pudo desasignar el turno');
          }
        } else {
          console.log(
            '❌ [FALLÓ] Voluntario asigna y desasigna turnos | Error: No se encontró botón de eliminar después de asignar'
          );
          throw new Error('No se encontró botón de eliminar después de asignar');
        }
      } else {
        console.log(
          '❌ [FALLÓ] Voluntario asigna y desasigna turnos | Error: No se pudo verificar la asignación del turno'
        );
        throw new Error('No se pudo verificar la asignación del turno');
      }
    } else {
      console.log(
        '❌ [FALLÓ] Voluntario asigna y desasigna turnos | Error: No se encontraron botones de autoasignación'
      );
      throw new Error('No se encontraron botones de autoasignación');
    }
  });
});
