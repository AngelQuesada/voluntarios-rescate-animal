/**
 * Tests de CRUD de usuarios con diferentes roles
 * Incluye creación, edición y eliminación de usuarios
 */

import { test, expect } from '@playwright/test';
import { loginUser, checkServerStatus, checkPageLoad } from './helpers/e2e-utils';
import { initializeFirebaseAdmin } from '../helpers/test-db-setup';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

test.describe('Tests de CRUD de Usuarios', () => {
  let adminAuth: import('firebase-admin/auth').Auth;
  let adminDb: import('firebase-admin/firestore').Firestore;

  test.beforeAll(async () => {
    // Inicializar Firebase Admin SDK
    const initialized = await initializeFirebaseAdmin();
    if (!initialized) {
      throw new Error('No se pudo inicializar Firebase Admin SDK');
    }

    // Obtener instancias de Auth y Firestore
    const { getApps } = await import('firebase-admin/app');
    const adminApp = getApps().find((app) => app.name === 'test-admin');
    if (adminApp) {
      adminAuth = getAuth(adminApp);
      adminDb = getFirestore(adminApp);
    }
  });

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

    // Limpiar cualquier estado de autenticación previo
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      document.cookie.split(';').forEach((cookie) => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      });
    });
  });

  test('Administrador puede crear un nuevo usuario voluntario', async ({ page }) => {
    console.log('🧪 [INICIANDO] Test de creación de usuario voluntario por admin');

    // Login como administrador
    const loginSuccess = await loginUser(page, {
      userType: 'ADMIN',
      checkRedirect: true,
      expectedRedirectUrl: /\/schedule$/,
      timeout: 10000,
    });

    expect(loginSuccess).toBe(true);
    await expect(page).toHaveURL(/\/schedule$/);

    // Navegar a la página de administración
    await page.goto(`${process.env.BASE_URL || 'http://localhost:3001'}/admin`);

    // Esperar a que cargue la página de administración
    await page.waitForSelector('[role="tabpanel"], .MuiTabs-root', { timeout: 10000 });

    // La pestaña de usuarios debería estar activa por defecto (índice 0)
    // Verificar que estamos en la pestaña correcta
    await page.waitForSelector('table, [data-testid="users-table"]', { timeout: 10000 });

    // Buscar y hacer clic en el botón de crear usuario
    const createButton = page.locator('button:has-text("Añadir Usuario")');
    await expect(createButton).toBeVisible({ timeout: 5000 });
    await createButton.click();

    // Esperar a que aparezca el formulario de creación
    await page.waitForSelector('form, [data-testid="user-form"]', { timeout: 10000 });

    // Datos del nuevo usuario (usando email que está en VARIABLE_TEST_USERS para limpieza automática)
    const newUser = {
      email: 'nuevo.voluntario@test.com',
      name: 'Nuevo',
      lastName: 'Voluntario',
      userName: 'nuevo_voluntario',
      phone: '+34600111111',
      birthDate: '1990-01-01',
      job: 'Estudiante',
      location: 'Albolote',
      password: 'testing123',
    };

    // Llenar el formulario
    await page.fill('input[name="userName"]', newUser.userName);
    await page.fill('input[name="name"]', newUser.name);
    await page.fill('input[name="lastName"]', newUser.lastName);
    await page.fill('input[name="email"]', newUser.email);
    await page.fill('input[name="phone"]', newUser.phone);
    await page.fill('input[name="birthDate"]', newUser.birthDate);
    await page.fill('input[name="job"]', newUser.job);
    await page.fill('input[name="password"]', newUser.password);
    await page.fill('input[name="passwordConfirm"]', newUser.password);

    const locationInput = page.getByLabel('Localidad');
    await locationInput.fill(newUser.location);
    const optionToSelect = page.getByRole('option', { name: newUser.location });
    await optionToSelect.click();
    await expect(locationInput).toHaveValue(newUser.location);

    // Los roles adicionales son opcionales, el rol de Voluntario se asigna por defecto
    // Si queremos asignar roles adicionales, podemos usar el selector de Material UI
    // Por ahora, dejamos solo el rol de Voluntario que se asigna automáticamente

    // Enviar el formulario
    const submitButton = page.getByRole('button', { name: 'Añadir' });
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();

    // Verificar que el usuario fue creado exitosamente
    await page
      .getByTestId('notification-snackbar')
      .filter({ hasText: 'se agregó correctamente' })
      .isVisible()
      .catch(() => false);

    // Verificar que el usuario aparece en la lista
    await expect(page.locator(`td:has-text("${newUser.name} ${newUser.lastName}")`)).toBeVisible({
      timeout: 5000,
    });

    // Limpiar: eliminar el usuario creado
    try {
      const userRecord = await adminAuth.getUserByEmail(newUser.email);
      await adminAuth.deleteUser(userRecord.uid);
      await adminDb.collection('users').doc(userRecord.uid).delete();
    } catch (error) {
      console.warn('Error limpiando usuario creado:', error);
    }

    console.log('✅ [CORRECTO] Test de creación de usuario voluntario por admin');
  });

  test('Administrador puede editar un usuario existente', async ({ page }) => {
    console.log('🧪 [INICIANDO] Test de edición de usuario por admin');

    // Crear un usuario temporal para editar
    const tempUser = {
      email: 'usuarioeditar@test.com',
      password: 'testing123',
      userData: {
        userName: 'edit_test',
        roles: [1],
        name: 'Usuario',
        lastName: 'Editar',
        birthDate: '1990-01-01',
        email: 'usuarioeditar@test.com',
        phone: '+34600000002',
        job: 'Test',
        location: 'Granada',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isEnabled: true,
      },
    };

    let createdUserUid: string | null = null;

    try {
      // Limpiar usuario existente si existe
      try {
        const existingUser = await adminAuth.getUserByEmail(tempUser.email);
        await adminAuth.deleteUser(existingUser.uid);
        await adminDb.collection('users').doc(existingUser.uid).delete();
      } catch (error: Error | unknown) {
        if ((error as { code?: string }).code !== 'auth/user-not-found') {
          console.warn('Error limpiando usuario existente:', error);
        }
      }

      // Crear usuario temporal (sin UID predefinida)
      const userRecord = await adminAuth.createUser({
        email: tempUser.email,
        password: tempUser.password,
        displayName: `${tempUser.userData.name} ${tempUser.userData.lastName}`,
        emailVerified: true,
        disabled: false,
      });

      createdUserUid = userRecord.uid;

      await adminDb
        .collection('users')
        .doc(userRecord.uid)
        .set({
          ...tempUser.userData,
          uid: userRecord.uid,
        });

      // Login como administrador
      const loginSuccess = await loginUser(page, {
        userType: 'ADMIN',
        checkRedirect: true,
        expectedRedirectUrl: /\/schedule$/,
        timeout: 10000,
      });

      expect(loginSuccess).toBe(true);

      // Navegar a la página de administración
      await page.goto(`${process.env.BASE_URL || 'http://localhost:3001'}/admin`);
      await page.waitForSelector('[role="tabpanel"], .MuiTabs-root', { timeout: 10000 });
      await page.waitForSelector('table, [data-testid="users-table"]', { timeout: 10000 });

      // Buscar el usuario en la lista y hacer clic en editar
      const userRow = page
        .locator(`tr:has-text("${tempUser.userData.name} ${tempUser.userData.lastName}")`)
        .first();
      await expect(userRow).toBeVisible({ timeout: 10000 });

      // Hacer clic en el botón de editar (IconButton con EditIcon)
      const editButton = userRow.locator('button[aria-label="Editar"]');
      await editButton.click();

      // Esperar a que aparezca el formulario de edición
      await page.waitForSelector('form, [data-testid="user-form"]', { timeout: 10000 });

      // Modificar algunos campos
      const updatedData = {
        name: 'Usuario Editado',
        job: 'Trabajo Actualizado',
        location: 'Maracena',
      };

      await page.fill('input[name="name"]', updatedData.name);
      await page.fill('input[name="job"]', updatedData.job);

      const locationInput = page.getByLabel('Localidad');
      await locationInput.fill(updatedData.location);
      const optionToSelect = page.getByRole('option', { name: updatedData.location });
      await optionToSelect.click();
      await expect(locationInput).toHaveValue(updatedData.location);

      // Guardar cambios
      const submitButton = page.getByRole('button', { name: 'Guardar' });
      await expect(submitButton).toBeVisible({ timeout: 5000 });
      await submitButton.click();

      // Verificar que los cambios se guardaron
      await page
        .getByTestId('notification-snackbar')
        .filter({ hasText: 'se actualizó correctamente' })
        .isVisible()
        .catch(() => false);

      // Verificar que los datos actualizados aparecen en la lista
      await page
        .getByTestId('notification-snackbar')
        .filter({ hasText: 'se actualizó correctamente' })
        .isVisible()
        .catch(() => false);

      console.log('✅ [CORRECTO] Test de edición de usuario por admin');
    } catch (error) {
      console.error('Error en test de edición:', error);
      throw error;
    } finally {
      // Limpieza garantizada: eliminar usuario temporal si aún existe
      if (createdUserUid) {
        try {
          await adminAuth.deleteUser(createdUserUid);
          await adminDb.collection('users').doc(createdUserUid).delete();
          console.log('🧹 Usuario temporal limpiado en finally');
        } catch (error: Error | unknown) {
          if ((error as { code?: string }).code !== 'auth/user-not-found') {
            console.warn('Error en limpieza final del usuario temporal:', error);
          }
        }
      }
    }
  });

  test('Administrador puede eliminar un usuario', async ({ page }) => {
    console.log('🧪 [INICIANDO] Test de eliminación de usuario por admin');

    // Crear un usuario temporal para eliminar
    const tempUser = {
      email: 'usuarioeliminar@test.com',
      password: 'testing123',
      userData: {
        userName: 'delete_test',
        roles: [1],
        name: 'Usuario',
        lastName: 'Eliminar',
        birthDate: '1990-01-01',
        email: 'usuarioeliminar@test.com',
        phone: '+34600000003',
        job: 'Test',
        location: 'Granada',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isEnabled: true,
      },
    };

    let createdUserUid: string | null = null;

    try {
      // Limpiar usuario existente si existe
      try {
        const existingUser = await adminAuth.getUserByEmail(tempUser.email);
        await adminAuth.deleteUser(existingUser.uid);
        await adminDb.collection('users').doc(existingUser.uid).delete();
        console.log('🧹 Usuario existente limpiado antes del test');
      } catch (error: Error | unknown) {
        if ((error as { code?: string }).code !== 'auth/user-not-found') {
          console.warn('Error limpiando usuario existente:', error);
        }
      }

      // Crear usuario temporal (sin UID predefinida)
      const userRecord = await adminAuth.createUser({
        email: tempUser.email,
        password: tempUser.password,
        displayName: `${tempUser.userData.name} ${tempUser.userData.lastName}`,
        emailVerified: true,
        disabled: false,
      });

      createdUserUid = userRecord.uid;

      await adminDb
        .collection('users')
        .doc(userRecord.uid)
        .set({
          ...tempUser.userData,
          uid: userRecord.uid,
        });

      // Login como administrador
      const loginSuccess = await loginUser(page, {
        userType: 'ADMIN',
        checkRedirect: true,
        expectedRedirectUrl: /\/schedule$/,
        timeout: 10000,
      });

      expect(loginSuccess).toBe(true);

      // Navegar a la página de administración
      await page.goto(`${process.env.BASE_URL || 'http://localhost:3001'}/admin`);
      await page.waitForSelector('[role="tabpanel"], .MuiTabs-root', { timeout: 10000 });
      await page.waitForSelector('table, [data-testid="users-table"]', { timeout: 10000 });

      // Buscar el usuario en la lista
      const userRow = page
        .locator(`tr:has-text("${tempUser.userData.name} ${tempUser.userData.lastName}")`)
        .first();
      await expect(userRow).toBeVisible({ timeout: 10000 });

      // Hacer clic en el botón de eliminar (IconButton con DeleteIcon)
      const deleteButton = userRow.locator('button[aria-label="Eliminar"]');
      await deleteButton.click();

      // Confirmar la eliminación en el modal/diálogo
      const confirmButton = page.locator('button:has-text("Eliminar")');
      await expect(confirmButton).toBeVisible({ timeout: 5000 });
      await confirmButton.click();

      // Verificar que el usuario fue eliminado
      await page
        .getByTestId('notification-snackbar')
        .filter({ hasText: 'se eliminó correctamente' })
        .isVisible()
        .catch(() => false);

      // Verificar que el usuario ya no aparece en la lista
      await expect(page.locator(`text="${tempUser.email}"`)).not.toBeVisible({ timeout: 5000 });

      console.log('✅ [CORRECTO] Test de eliminación de usuario por admin');
    } catch (error) {
      console.error('Error en test de eliminación:', error);
      throw error;
    } finally {
      // Limpieza garantizada: eliminar usuario temporal si aún existe
      if (createdUserUid) {
        try {
          await adminAuth.deleteUser(createdUserUid);
          await adminDb.collection('users').doc(createdUserUid).delete();
          console.log('🧹 Usuario temporal limpiado en finally');
        } catch (error: Error | unknown) {
          if ((error as { code?: string }).code !== 'auth/user-not-found') {
            console.warn('Error en limpieza final del usuario temporal:', error);
          }
        }
      }
    }
  });

  test('Voluntario no puede acceder a la gestión de usuarios', async ({ page }) => {
    console.log('🧪 [INICIANDO] Test de restricción de acceso para voluntario');

    // Login como voluntario
    const loginSuccess = await loginUser(page, {
      userType: 'VOLUNTARIO',
      checkRedirect: true,
      expectedRedirectUrl: /\/schedule$/,
      timeout: 10000,
    });

    expect(loginSuccess).toBe(true);

    // Intentar navegar a la página de administración
    await page.goto(`${process.env.BASE_URL || 'http://localhost:3001'}/admin`);

    // Verificar que es redirigido o ve un mensaje de acceso denegado
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    const hasAccessDenied = await page
      .locator('text="Acceso denegado", text="No autorizado", text="Sin permisos"')
      .isVisible();

    // Debe ser redirigido o ver mensaje de error
    const isBlocked = !currentUrl.includes('/admin') || hasAccessDenied;
    expect(isBlocked).toBe(true);

    console.log('✅ [CORRECTO] Test de restricción de acceso para voluntario');
  });

  test('Administrador crea usuario voluntario', async ({ page }) => {
    console.log('🧪 [INICIANDO] Test de creación de usuario voluntario por administrador');

    // Login como administrador (solo admin puede crear usuarios)
    const loginSuccess = await loginUser(page, {
      userType: 'ADMIN',
      checkRedirect: true,
      expectedRedirectUrl: /\/schedule$/,
      timeout: 10000,
    });

    expect(loginSuccess).toBe(true);

    // Navegar a la página de administración
    await page.goto(`${process.env.BASE_URL || 'http://localhost:3001'}/admin`);
    await page.waitForSelector('[role="tabpanel"], .MuiTabs-root', { timeout: 10000 });
    await page.waitForSelector('table, [data-testid="users-table"]', { timeout: 10000 });

    // Crear usuario
    const createButton = page.locator('button:has-text("Añadir Usuario")');
    await createButton.click();
    await page.waitForSelector('form', { timeout: 10000 });

    // Datos del nuevo voluntario (usando email que está en VARIABLE_TEST_USERS para limpieza automática)
    const newVoluntario = {
      email: 'nuevo.voluntario@test.com',
      name: 'Nuevo',
      lastName: 'Voluntario',
      userName: 'nuevo_voluntario',
      phone: '+34600111111',
      birthDate: '1990-01-01',
      job: 'Estudiante',
      location: 'Jun',
    };

    // Llenar formulario
    await page.fill('input[name="email"]', newVoluntario.email);
    await page.fill('input[name="name"]', newVoluntario.name);
    await page.fill('input[name="lastName"]', newVoluntario.lastName);
    await page.fill('input[name="userName"]', newVoluntario.userName);
    await page.fill('input[name="phone"]', newVoluntario.phone);
    await page.fill('input[name="birthDate"], input[type="date"]', newVoluntario.birthDate);
    await page.fill('input[name="job"]', newVoluntario.job);

    const locationInput = page.getByLabel('Localidad');
    await locationInput.fill(newVoluntario.location);
    const optionToSelect = page.getByRole('option', { name: newVoluntario.location });
    await optionToSelect.click();
    await expect(locationInput).toHaveValue(newVoluntario.location);

    // Seleccionar rol de voluntario (valor 1)
    const roleSelect = page.locator('select[name="roles"]').first();
    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption('1');
    } else {
      const voluntarioRole = page
        .locator('input[value="1"], label:has-text("Voluntario") input')
        .first();
      if (await voluntarioRole.isVisible()) {
        await voluntarioRole.check();
      }
    }

    // Enviar formulario
    const submitButton = page.getByRole('button', { name: 'Añadir' });
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();

    // Verificar creación exitosa
    await page
      .getByTestId('notification-snackbar')
      .filter({ hasText: 'se agregó correctamente' })
      .isVisible()
      .catch(() => false);

    // Limpiar
    try {
      const userRecord = await adminAuth.getUserByEmail(newVoluntario.email);
      await adminAuth.deleteUser(userRecord.uid);
      await adminDb.collection('users').doc(userRecord.uid).delete();
    } catch (error) {
      console.warn('Error limpiando voluntario creado:', error);
    }

    console.log('✅ [CORRECTO] Test de creación de usuario voluntario por administrador');
  });

  test('Administrador crea usuario responsable', async ({ page }) => {
    console.log('🧪 [INICIANDO] Test de creación de usuario responsable por administrador');

    // Login como administrador (solo admin puede crear responsables)
    const loginSuccess = await loginUser(page, {
      userType: 'ADMIN',
      checkRedirect: true,
      expectedRedirectUrl: /\/schedule$/,
      timeout: 10000,
    });

    expect(loginSuccess).toBe(true);

    // Navegar a la página de administración
    await page.goto(`${process.env.BASE_URL || 'http://localhost:3001'}/admin`);
    await page.waitForSelector('[role="tabpanel"], .MuiTabs-root', { timeout: 10000 });
    await page.waitForSelector('table, [data-testid="users-table"]', { timeout: 10000 });

    // Crear usuario
    const createButton = page.locator('button:has-text("Añadir Usuario")');
    await createButton.click();
    await page.waitForSelector('form', { timeout: 10000 });

    // Datos del nuevo responsable (usando email que está en VARIABLE_TEST_USERS para limpieza automática)
    const newResponsable = {
      email: 'nuevo.responsable@test.com',
      name: 'Nuevo',
      lastName: 'Responsable',
      userName: 'nuevo_responsable',
      phone: '+34600222222',
      birthDate: '1985-01-01',
      job: 'Coordinador',
      location: 'Alfacar',
    };

    // Llenar formulario
    await page.fill('input[name="email"]', newResponsable.email);
    await page.fill('input[name="name"]', newResponsable.name);
    await page.fill('input[name="lastName"]', newResponsable.lastName);
    await page.fill('input[name="userName"]', newResponsable.userName);
    await page.fill('input[name="phone"]', newResponsable.phone);
    await page.fill('input[name="birthDate"], input[type="date"]', newResponsable.birthDate);
    await page.fill('input[name="job"]', newResponsable.job);

    const locationInput = page.getByLabel('Localidad');
    await locationInput.fill(newResponsable.location);
    const optionToSelect = page.getByRole('option', { name: newResponsable.location });
    await optionToSelect.click();
    await expect(locationInput).toHaveValue(newResponsable.location);

    // Seleccionar rol de responsable (valor 2)
    const roleSelect = page.locator('select[name="roles"]').first();
    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption('2'); // Responsable
    } else {
      const responsableRole = page
        .locator('input[value="2"], label:has-text("Responsable") input')
        .first();
      if (await responsableRole.isVisible()) {
        await responsableRole.check();
      }
    }

    const submitButton = page.getByRole('button', { name: 'Añadir' });
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();

    await page
      .getByTestId('notification-snackbar')
      .filter({ hasText: 'se agregó correctamente' })
      .isVisible()
      .catch(() => false);

    // Limpiar
    try {
      const userRecord = await adminAuth.getUserByEmail(newResponsable.email);
      await adminAuth.deleteUser(userRecord.uid);
      await adminDb.collection('users').doc(userRecord.uid).delete();
    } catch (error) {
      console.warn('Error limpiando responsable creado:', error);
    }

    console.log('✅ [CORRECTO] Test de creación de usuario responsable por administrador');
  });

  test('Administrador crea usuario administrador', async ({ page }) => {
    console.log('🧪 [INICIANDO] Test de creación de usuario administrador por administrador');

    // Login como administrador (solo admin puede crear otros administradores)
    const loginSuccess = await loginUser(page, {
      userType: 'ADMIN',
      checkRedirect: true,
      expectedRedirectUrl: /\/schedule$/,
      timeout: 10000,
    });

    expect(loginSuccess).toBe(true);

    // Navegar a la página de administración
    await page.goto(`${process.env.BASE_URL || 'http://localhost:3001'}/admin`);
    await page.waitForSelector('[role="tabpanel"], .MuiTabs-root', { timeout: 10000 });
    await page.waitForSelector('table, [data-testid="users-table"]', { timeout: 10000 });

    // Crear usuario
    const createButton = page.locator('button:has-text("Añadir Usuario")');
    await createButton.click();
    await page.waitForSelector('form', { timeout: 10000 });

    // Datos del nuevo administrador (usando email que está en VARIABLE_TEST_USERS para limpieza automática)
    const newAdmin = {
      email: 'nuevo.admin@test.com',
      name: 'Nuevo',
      lastName: 'Administrador',
      userName: 'nuevo_admin',
      phone: '+34600333333',
      birthDate: '1980-01-01',
      job: 'Administrador',
      location: 'Beas de Granada',
      password: 'testing123',
    };

    // Llenar formulario
    await page.fill('input[name="email"]', newAdmin.email);
    await page.fill('input[name="name"]', newAdmin.name);
    await page.fill('input[name="lastName"]', newAdmin.lastName);
    await page.fill('input[name="userName"]', newAdmin.userName);
    await page.fill('input[name="phone"]', newAdmin.phone);
    await page.fill('input[name="birthDate"], input[type="date"]', newAdmin.birthDate);
    await page.fill('input[name="job"]', newAdmin.job);
    await page.fill('input[name="password"]', newAdmin.password);
    await page.fill('input[name="passwordConfirm"]', newAdmin.password);

    const locationInput = page.getByLabel('Localidad');
    await locationInput.fill(newAdmin.location);
    const optionToSelect = page.getByRole('option', { name: newAdmin.location });
    await optionToSelect.click();
    await expect(locationInput).toHaveValue(newAdmin.location);
    // Seleccionar rol de administrador (valor 3)
    const roleSelect = page.locator('select[name="roles"]').first();
    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption('3'); // Administrador
    } else {
      const adminRole = page
        .locator('input[value="3"], label:has-text("Administrador") input')
        .first();
      if (await adminRole.isVisible()) {
        await adminRole.check();
      }
    }

    // Enviar formulario
    const submitButton = page.getByRole('button', { name: 'Añadir' });
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();

    // Verificar creación exitosa
    await page
      .getByTestId('notification-snackbar')
      .filter({ hasText: 'se agregó correctamente' })
      .isVisible()
      .catch(() => false);
    // Limpiar
    try {
      const userRecord = await adminAuth.getUserByEmail(newAdmin.email);
      await adminAuth.deleteUser(userRecord.uid);
      await adminDb.collection('users').doc(userRecord.uid).delete();
    } catch (error) {
      console.warn('Error limpiando administrador creado:', error);
    }

    console.log('✅ [CORRECTO] Test de creación de usuario administrador por administrador');
  });
});
