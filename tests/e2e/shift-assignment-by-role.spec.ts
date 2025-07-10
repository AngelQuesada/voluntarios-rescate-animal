import { test } from '@playwright/test';
import { loginUser, checkServerStatus, checkPageLoad, findShiftTable } from './helpers/e2e-utils';

test.describe('Shift Assignment by Role', () => {
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
      await selfAssignButtons.nth(5).click();

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

  test('admin can assign shift to other user', async ({ page }) => {
    console.log('🧪 [INICIANDO] Administrador asigna turno a otro usuario');

    try {
      // Iniciar sesión como administrador
      console.log('Intentando login como administrador...');
      const loginSuccess = await loginUser(page, {
        userType: 'ADMIN',
        checkRedirect: true,
        expectedRedirectUrl: /\/schedule$/,
        timeout: 15000,
      });

      if (!loginSuccess) {
        await page.screenshot({ path: './test-results/login-failed.png', fullPage: true });
        console.log(
          '❌ [FALLÓ] Administrador asigna turno a otro usuario | Error: No se pudo completar el login'
        );
        throw new Error('Login como administrador falló');
      }

      // Buscar la tabla de turnos
      const shiftTable = await findShiftTable(page, { timeout: 15000 });
      if (!shiftTable) {
        await page.screenshot({ path: './test-results/shift-table-not-found.png', fullPage: true });
        console.log(
          '❌ [FALLÓ] Administrador asigna turno a otro usuario | Error: No se encontró la tabla de turnos'
        );
        throw new Error('No se encontró la tabla de turnos');
      }

      await page.waitForTimeout(3000);

      const addUserButtons = page.locator('[data-testid="add-user-button"]');
      const addUserCount = await addUserButtons.count();

      if (addUserCount > 0) {
        // Hacer click en el primer botón de añadir usuario
        await addUserButtons.first().click();

        // Esperar a que aparezca el modal
        await page.waitForTimeout(1500);

        // Verificar que se abre el modal de añadir usuario
        const modalTitle = page.getByText('Añadir Usuario al Turno');
        const modalVisible = await modalTitle.isVisible().catch(() => false);

        if (modalVisible) {
          // Buscar el primer usuario disponible en la lista
          const userListItems = page.locator('[data-testid="assign-shift"]');
          const userCount = await userListItems.count();

          if (userCount > 0) {
            // Hacer click en el primer usuario disponible
            await userListItems.first().click();
            await page.waitForTimeout(3000);

            // Verificar que aparece el mensaje de confirmación
            const confirmationVisible = await page
              .getByTestId('notification-snackbar')
              .filter({ hasText: 'asignado al turno' })
              .isVisible()
              .catch(() => false);

            if (confirmationVisible) {
              console.log('✅ [CORRECTO] Administrador asigna turno a otro usuario');
            } else {
              console.log(
                '❌ [FALLÓ] Administrador asigna turno a otro usuario | Error: No se pudo verificar la asignación'
              );
              throw new Error('No se pudo verificar la asignación del turno');
            }
          } else {
            console.log(
              '❌ [FALLÓ] Administrador asigna turno a otro usuario | Error: No se encontraron usuarios disponibles'
            );
            throw new Error('No se encontraron usuarios disponibles en el modal');
          }
        } else {
          console.log(
            '❌ [FALLÓ] Administrador asigna turno a otro usuario | Error: No se abrió el modal de asignación'
          );
          throw new Error('No se abrió el modal de asignación de usuarios');
        }
      } else {
        // Capturar screenshot para depuración
        await page.screenshot({
          path: './test-results/admin-no-add-buttons-debug.png',
          fullPage: true,
        });

        // Log del HTML de la página para depuración
        const pageContent = await page.content();
        console.log(
          'HTML de la página (primeros 2000 caracteres):',
          pageContent.substring(0, 2000)
        );

        console.log(
          '❌ [FALLÓ] Administrador asigna turno a otro usuario | Error: No se encontraron botones de añadir usuario'
        );
        throw new Error('No se encontraron botones de añadir usuario');
      }
    } catch (error) {
      console.error('❌ Error inesperado en el test:', error);
      await page.screenshot({ path: './test-results/test-error-final.png', fullPage: true });
      throw error;
    }
  });

  test('admin can unassign shift from other user', async ({ page }) => {
    console.log('🧪 [INICIANDO] Administrador desasigna turno de otro usuario');

    // Iniciar sesión como administrador
    const loginSuccess = await loginUser(page, {
      userType: 'ADMIN',
      checkRedirect: true,
      expectedRedirectUrl: /\/schedule$/,
      timeout: 10000,
    });

    if (!loginSuccess) {
      console.log(
        '❌ [FALLÓ] Administrador desasigna turno de otro usuario | Error: No se pudo completar el login'
      );
      throw new Error('Login como administrador falló');
    }

    // Buscar la tabla de turnos
    const shiftTable = await findShiftTable(page, { timeout: 10000 });
    if (!shiftTable) {
      console.log(
        '❌ [FALLÓ] Administrador desasigna turno de otro usuario | Error: No se encontró la tabla de turnos'
      );
      throw new Error('No se encontró la tabla de turnos');
    }

    // Esperar a que se carguen todos los elementos
    await page.waitForTimeout(2000);

    // Buscar usuarios asignados que no sean el administrador actual
    const assignedUsers = page.getByTestId('unassign-user-button');
    const assignedCount = await assignedUsers.count();

    if (assignedCount > 0) {
      // Hacer click en el primer botón de desasignar usuario
      await assignedUsers.first().click();
      await page.waitForTimeout(1000);

      // Buscar y hacer click en el botón de confirmación del diálogo
      const confirmButton = page.getByTestId('confirm-remove-user-dialog-confirm-button');
      const confirmButtonVisible = await confirmButton.isVisible().catch(() => false);

      if (confirmButtonVisible) {
        // Hacer click en el botón de confirmar eliminación
        await confirmButton.click();
        await page.waitForTimeout(3000);

        // Verificar que aparece el mensaje de confirmación de eliminación
        const confirmationVisible = await page
          .getByTestId('notification-snackbar')
          .filter({ hasText: /eliminado|desasignado|removido/ })
          .isVisible()
          .catch(() => false);

        if (confirmationVisible) {
          console.log('✅ [CORRECTO] Administrador desasigna turno de otro usuario');
        } else {
          console.log(
            '❌ [FALLÓ] Administrador desasigna turno de otro usuario | Error: No se pudo verificar la desasignación'
          );
          throw new Error('No se pudo verificar la desasignación del turno');
        }
      } else {
        console.log(
          '❌ [FALLÓ] Administrador desasigna turno de otro usuario | Error: No se encontró botón de confirmación'
        );
        throw new Error('No se encontró botón de confirmación en el diálogo');
      }
    } else {
      console.log(
        '❌ [FALLÓ] Administrador desasigna turno de otro usuario | Error: No se encontraron usuarios asignados'
      );
      throw new Error('No se encontraron usuarios asignados para desasignar');
    }
  });
});
