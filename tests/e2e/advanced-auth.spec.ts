import { test, expect } from '@playwright/test';
import { checkPageLoad, checkServerStatus, loginUser } from './helpers/e2e-utils';
import { initializeFirebaseAdmin } from '../helpers/test-db-setup';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Configuración de usuarios para tests
const DISABLED_USER = {
  email: 'disabled@test.com',
  password: 'testing123',
  userData: {
    // NOTA: Las UIDs se generarán automáticamente por Firebase Auth
    username: 'disabled_test',
    roles: [1],
    name: 'Usuario',
    lastname: 'Deshabilitado',
    birthdate: '1990-01-01',
    email: 'disabled@test.com',
    phone: '+34600000001',
    job: 'Test',
    location: 'Granada',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnabled: false,
  },
};

const FAILED_ATTEMPTS_USER = {
  email: 'failedattemptsss@test.com',
  password: 'testing123',
  userData: {
    // NOTA: Las UIDs se generarán automáticamente por Firebase Auth
    username: 'failed_test',
    roles: [1],
    name: 'Usuario',
    lastname: 'Intentos',
    birthdate: '1990-01-01',
    email: 'failedattempts@test.com',
    phone: '+34600000002',
    job: 'Test',
    location: 'Granada',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnabled: true,
  },
};

test.describe('Autenticación Avanzada', () => {
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

  test('Intento de inicio de sesión con cuenta deshabilitada', async ({ page }) => {
    console.log('🧪 [INICIANDO] Test de cuenta deshabilitada');

    let disabledUserUid: string | null = null;

    try {
      // Limpiar usuario existente si existe
      try {
        const existingUser = await adminAuth.getUserByEmail(DISABLED_USER.email);
        await adminAuth.deleteUser(existingUser.uid);
        await adminDb.collection('users').doc(existingUser.uid).delete();
        console.log('🧹 Usuario deshabilitado existente limpiado');
      } catch (error: any) {
        if (error.code !== 'auth/user-not-found') {
          console.warn('Error limpiando usuario deshabilitado existente:', error);
        }
      }

      // Crear usuario deshabilitado (sin UID predefinida)
      const userRecord = await adminAuth.createUser({
        email: DISABLED_USER.email,
        password: DISABLED_USER.password,
        displayName: `${DISABLED_USER.userData.name} ${DISABLED_USER.userData.lastname}`,
        emailVerified: true,
        disabled: false,
      });

      disabledUserUid = userRecord.uid;

      await adminDb
        .collection('users')
        .doc(userRecord.uid)
        .set({
          ...DISABLED_USER.userData,
          uid: userRecord.uid,
        });

      // Intentar hacer login con usuario deshabilitado
      await page.fill('input#email, input[name="email"], input[type="email"]', DISABLED_USER.email);
      await page.fill(
        'input#password, input[name="password"], input[type="password"]',
        DISABLED_USER.password
      );
      await page.click(
        'button[type="submit"], button:has-text("Iniciar sesión"), button:has-text("Entrar")'
      );

      // Verificar que aparece el mensaje de cuenta deshabilitada
      await expect(
        page.locator('text="Esta cuenta ha sido deshabilitada por el administrador."')
      ).toBeVisible({ timeout: 10000 });

      // Verificar que no se redirige a la página de schedule
      await page.waitForTimeout(2000);
      expect(page.url()).not.toMatch(/\/schedule$/);

      console.log('✅ [CORRECTO] Test de cuenta deshabilitada');
    } catch (error: any) {
      console.error('Error en test de cuenta deshabilitada:', error);
      throw error;
    } finally {
      // Limpieza garantizada: eliminar usuario deshabilitado
      if (disabledUserUid) {
        try {
          await adminAuth.deleteUser(disabledUserUid);
          await adminDb.collection('users').doc(disabledUserUid).delete();
          console.log('🧹 Usuario deshabilitado eliminado correctamente');
        } catch (error: any) {
          if (error.code !== 'auth/user-not-found') {
            console.warn('Error limpiando usuario deshabilitado:', error);
          }
        }
      }
    }
  });

  test('Manejo de múltiples intentos fallidos de inicio de sesión', async ({ page }) => {
    console.log('🧪 [INICIANDO] Test de múltiples intentos fallidos');

    let failedAttemptsUserUid: string | null = null;

    try {
      // Limpiar usuario existente si existe
      try {
        const existingUser = await adminAuth.getUserByEmail(FAILED_ATTEMPTS_USER.email);
        await adminAuth.deleteUser(existingUser.uid);
        await adminDb.collection('users').doc(existingUser.uid).delete();
        console.log('🧹 Usuario de intentos fallidos existente limpiado');
      } catch (error: any) {
        if (error.code !== 'auth/user-not-found') {
          console.warn('Error limpiando usuario de intentos fallidos existente:', error);
        }
      }

      // Crear usuario para tests de intentos fallidos (sin UID predefinida)
      const userRecord = await adminAuth.createUser({
        email: FAILED_ATTEMPTS_USER.email,
        password: FAILED_ATTEMPTS_USER.password,
        displayName: `${FAILED_ATTEMPTS_USER.userData.name} ${FAILED_ATTEMPTS_USER.userData.lastname}`,
        emailVerified: true,
        disabled: false,
      });

      failedAttemptsUserUid = userRecord.uid;

      await adminDb
        .collection('users')
        .doc(userRecord.uid)
        .set({
          ...FAILED_ATTEMPTS_USER.userData,
          uid: userRecord.uid,
        });

      // Realizar intentos fallidos hasta que Firebase bloquee

      let attemptCount = 0;
      let isBlocked = false;

      // Bucle para intentar el login hasta 5 veces
      while (attemptCount < 5 && !isBlocked) {
        attemptCount++;

        await page.fill('input#email, input[name="email"], input[type="email"]', '');
        await page.fill('input#password, input[name="password"], input[type="password"]', '');
        await page.fill(
          'input#email, input[name="email"], input[type="email"]',
          FAILED_ATTEMPTS_USER.email
        );
        await page.fill(
          'input#password, input[name="password"], input[type="password"]',
          'contraseña_incorrecta'
        );

        const loginButton = page.locator('button:has-text("Iniciar sesión")');
        await loginButton.click();

        const wrongPasswordMessage = page.locator(
          'div[role="alert"]:has-text("contraseña incorrectos")'
        );
        const blockedAccountButton = page.getByRole('button', { name: 'Cuenta Bloqueada' });
        try {
          await Promise.race([
            wrongPasswordMessage.waitFor({ state: 'visible', timeout: 5000 }),
            blockedAccountButton.waitFor({ state: 'visible', timeout: 5000 }),
          ]);

          if (await blockedAccountButton.isVisible()) {
            isBlocked = true;
          }
        } catch (error) {
          continue;
        }
      }
      console.log('✅ [CORRECTO] Test de múltiples intentos fallidos completado');
    } catch (error: any) {
      const blockedAccountButton = page.getByRole('button', { name: 'Cuenta Bloqueada' });
      await expect(blockedAccountButton).toBeVisible({ timeout: 5000 });
    } finally {
      // Limpieza garantizada: eliminar usuario de intentos fallidos
      if (failedAttemptsUserUid) {
        try {
          await adminAuth.deleteUser(failedAttemptsUserUid);
          await adminDb.collection('users').doc(failedAttemptsUserUid).delete();
        } catch (error: any) {
          if (error.code !== 'auth/user-not-found') {
            console.warn('Error limpiando usuario de intentos fallidos:', error);
          }
        }
      }
    }
  });

  test('Verificación del checkbox "Recordarme" y persistencia de sesión', async ({ page }) => {
    console.log('🧪 [INICIANDO] Test del checkbox recordarme');

    // Hacer login con el checkbox "recordarme" marcado
    const loginSuccess = await loginUser(page, {
      userType: 'VOLUNTARIO',
      checkRedirect: true,
      expectedRedirectUrl: /\/schedule$/,
      timeout: 10000,
      rememberMe: true,
    });

    expect(loginSuccess).toBe(true);
    await expect(page).toHaveURL(/\/schedule$/);

    // Verificar que se estableció una cookie de larga duración
    const cookies = await page.context().cookies();
    const authCookie = cookies.find((cookie) => cookie.name === 'auth-token');

    if (authCookie && authCookie.expires) {
      const now = new Date();
      const cookieExpires = new Date(authCookie.expires * 1000);
      // cookieExpires y now deben estar en unitarios
      const daysDifference = (cookieExpires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      // Verificar que la cookie expira en más de 80 días (considerando el checkbox "recordarme")
      expect(daysDifference).toBeGreaterThan(80);
    }

    console.log('✅ [CORRECTO] Test del checkbox recordarme');
  });

  test('Cierre de sesión y limpieza de estados', async ({ page }) => {
    console.log('🧪 [INICIANDO] Test de cierre de sesión y limpieza');

    // Primero hacer login
    const loginSuccess = await loginUser(page, {
      userType: 'VOLUNTARIO',
      checkRedirect: true,
      expectedRedirectUrl: /\/schedule$/,
      timeout: 10000,
    });

    expect(loginSuccess).toBe(true);
    await expect(page).toHaveURL(/\/schedule$/);

    // Verificar que hay cookies de autenticación
    let cookies = await page.context().cookies();
    let authCookie = cookies.find((cookie) => cookie.name === 'auth-token');
    expect(authCookie).toBeDefined();

    // Navegar a la página de logout
    await page.goto(`${process.env.BASE_URL || 'http://localhost:3001'}/logout`);

    // Esperar a que se complete el proceso de logout
    await expect(page).toHaveURL(/^http:\/\/localhost:3001\/?$/, { timeout: 15000 });

    // Verificar que las cookies de autenticación se han eliminado
    cookies = await page.context().cookies();
    authCookie = cookies.find((cookie) => cookie.name === 'auth-token');
    expect(authCookie).toBeUndefined();

    // Verificar que los datos de localStorage se han limpiado
    const hasAuthDataAfterLogout = await page.evaluate(() => {
      return Object.keys(localStorage).some(
        (key) => key.includes('firebase') || key.includes('auth')
      );
    });

    expect(hasAuthDataAfterLogout).toBe(false);

    console.log('✅ [CORRECTO] Test de cierre de sesión y limpieza');
  });

  test('Habilitación/deshabilitación de usuarios y su efecto inmediato', async ({ page }) => {
    console.log('🧪 [INICIANDO] Test de habilitación/deshabilitación de usuarios');

    // Crear un usuario temporal para este test
    const tempUser = {
      email: 'usuariotemporal@test.com',
      password: 'testing123',
      userData: {
        username: 'temp_test',
        roles: [1],
        name: 'Usuario',
        lastname: 'Temporal',
        birthdate: '1990-01-01',
        email: 'usuariotemporal@test.com',
        phone: '+34600000097',
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
      } catch (error: any) {
        if (error.code !== 'auth/user-not-found') {
          console.warn('Error limpiando usuario existente:', error);
        }
      }

      // Crear usuario habilitado (sin UID predefinida)
      const userRecord = await adminAuth.createUser({
        email: tempUser.email,
        password: tempUser.password,
        displayName: `${tempUser.userData.name} ${tempUser.userData.lastname}`,
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

      // Paso 1: Login exitoso con usuario habilitado
      await page.waitForSelector('form', { timeout: 10000 });
      await page.fill('input#email, input[name="email"], input[type="email"]', tempUser.email);
      await page.fill(
        'input#password, input[name="password"], input[type="password"]',
        tempUser.password
      );
      await page.click(
        'button[type="submit"], button:has-text("Iniciar sesión"), button:has-text("Entrar")'
      );

      await expect(page).toHaveURL(/\/schedule$/, { timeout: 15000 });

      // Paso 2: Deshabilitar usuario en la base de datos
      await adminDb.collection('users').doc(createdUserUid!).update({
        isEnabled: false,
        updatedAt: new Date().toISOString(),
      });

      // Paso 3: Hacer logout
      await page.goto(`${process.env.BASE_URL || 'http://localhost:3001'}/logout`);
      await expect(page).toHaveURL(/^http:\/\/localhost:3001\/?$/, { timeout: 15000 });

      // Paso 4: Intentar login nuevamente (debería fallar)
      await page.waitForSelector('form', { timeout: 10000 });
      await page.fill('input#email, input[name="email"], input[type="email"]', tempUser.email);
      await page.fill(
        'input#password, input[name="password"], input[type="password"]',
        tempUser.password
      );
      await page.click(
        'button[type="submit"], button:has-text("Iniciar sesión"), button:has-text("Entrar")'
      );

      // Verificar que aparece el mensaje de cuenta deshabilitada
      await expect(
        page.locator('text="Esta cuenta ha sido deshabilitada por el administrador."')
      ).toBeVisible({ timeout: 10000 });

      // Paso 5: Rehabilitar usuario
      await adminDb.collection('users').doc(createdUserUid!).update({
        isEnabled: true,
        updatedAt: new Date().toISOString(),
      });

      // Paso 6: Intentar login nuevamente (debería funcionar)
      await page.fill('input#email, input[name="email"], input[type="email"]', tempUser.email);
      await page.fill(
        'input#password, input[name="password"], input[type="password"]',
        tempUser.password
      );
      await page.click(
        'button[type="submit"], button:has-text("Iniciar sesión"), button:has-text("Entrar")'
      );

      await expect(page).toHaveURL(/\/schedule$/, { timeout: 15000 });

      console.log('✅ [CORRECTO] Test de habilitación/deshabilitación de usuarios');
    } catch (error: any) {
      console.error('Error en test de habilitación/deshabilitación:', error);
      throw error;
    } finally {
      // Limpieza garantizada: eliminar usuario temporal
      if (createdUserUid) {
        try {
          await adminAuth.deleteUser(createdUserUid);
          await adminDb.collection('users').doc(createdUserUid).delete();
          console.log('🧹 Usuario temporal eliminado correctamente');
        } catch (error: any) {
          if (error.code !== 'auth/user-not-found') {
            console.warn('Error limpiando usuario temporal:', error);
          }
        }
      }
    }
  });
});
