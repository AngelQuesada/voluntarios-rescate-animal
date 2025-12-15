/**
 * Configuración del entorno de testing
 * Este archivo maneja la inicialización del servidor de testing y la base de datos
 */

import { spawn, ChildProcess } from 'child_process';
import {
  initializeFirebaseAdmin,
  createConstantUsers,
  createVariableUsers,
  createTestShifts,
  cleanupVariableData,
  cleanupAllTestData,
  TestEnvironmentOptions,
} from './test-db-setup';

let testServer: ChildProcess | null = null;
let serverStarted = false;

/**
 * Verifica si el servidor está ejecutándose en el puerto especificado
 */
export async function isServerRunning(port: number = 3001): Promise<boolean> {
  try {
    // AbortSignal para timeout rápido y evitar que la verificación se cuelgue
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000); // 1 segundo de timeout

    // Usar el método HEAD es más eficiente ya que solo queremos saber si el servidor responde, no necesitamos el body
    const response = await fetch(`http://localhost:${port}`, {
      signal: controller.signal,
      method: 'HEAD',
    });

    clearTimeout(timeoutId); // Limpiar el timeout si la respuesta fue rápida
    return response.ok;
  } catch (error) {
    // Si fetch falla (por timeout, conexión rechazada, etc.), el servidor no está corriendo.
    return false;
  }
}

/**
 * Inicia el servidor de desarrollo en modo testing
 */
export async function startTestServer(port: number = 3001): Promise<boolean> {
  try {
    // Verificar si el servidor ya está ejecutándose
    if (await isServerRunning(port)) {
      console.log(`✅ Servidor ya está ejecutándose en puerto ${port}`);
      serverStarted = true;
      return true;
    }

    console.log(`🚀 Iniciando servidor de testing en puerto ${port}...`);

    return new Promise((resolve, reject) => {
      // Iniciar el servidor usando npm run dev
      testServer = spawn('npm', ['run', 'dev'], {
        env: {
          ...process.env,
          NODE_ENV: 'test' as 'development' | 'production' | 'test',
          PORT: port.toString(),
          DISABLE_PWA: 'true',
          IS_TESTING_ENVIRONMENT: 'true',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
        cwd: process.cwd(),
      });

      let serverOutput = '';
      let errorOutput = '';
      let resolved = false;

      // Manejar salida del servidor
      if (testServer && testServer.stdout)
        testServer.stdout.on('data', (data) => {
          const output = data.toString();
          serverOutput += output;

          // Buscar indicadores de que el servidor está listo
          if (
            output.includes('Ready') ||
            output.includes('started server') ||
            output.includes(`localhost:${port}`)
          ) {
            if (!resolved) {
              resolved = true;
              serverStarted = true;
              console.log(`✅ Servidor de testing iniciado correctamente en puerto ${port}`);
              resolve(true);
            }
          }
        });

      // Manejar errores del servidor
      testServer.stderr?.on('data', (data) => {
        const error = data.toString();
        errorOutput += error;

        // Solo mostrar errores críticos, ignorar warnings comunes
        if (
          error.includes('Error:') &&
          !error.includes('Warning:') &&
          !error.includes('ExperimentalWarning')
        ) {
          console.error('❌ Error del servidor:', error);
        }
      });

      // Manejar cierre del proceso
      testServer.on('close', (code) => {
        if (!resolved) {
          resolved = true;
          console.error(`❌ El servidor se cerró con código ${code}`);
          // if (errorOutput) {
          //   console.error('Errores del servidor:', errorOutput);
          // }
          reject(new Error(`El servidor se cerró inesperadamente con código ${code}`));
        }
      });

      testServer.on('error', (error) => {
        if (!resolved) {
          resolved = true;
          console.error('❌ Error al iniciar el servidor:', error);
          reject(error);
        }
      });

      // Timeout para evitar esperas infinitas
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.error('❌ Timeout al iniciar el servidor');
          // console.log('Salida del servidor:', serverOutput);
          // console.log('Errores del servidor:', errorOutput);
          reject(new Error('Timeout al iniciar el servidor'));
        }
      }, 30000); // 30 segundos timeout
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor de testing:', error);
    return false;
  }
}

/**
 * Detiene el servidor de testing
 */
export async function stopTestServer(): Promise<boolean> {
  try {
    if (testServer && !testServer.killed) {
      console.log('🛑 Deteniendo servidor de testing...');

      // Intentar cerrar gracefully
      testServer.kill('SIGTERM');

      // Esperar un poco y forzar si es necesario
      setTimeout(() => {
        if (testServer && !testServer.killed) {
          testServer.kill('SIGKILL');
        }
      }, 5000);

      testServer = null;
      serverStarted = false;
      console.log('✅ Servidor de testing detenido');
    }
    return true;
  } catch (error) {
    console.error('❌ Error al detener el servidor de testing:', error);
    return false;
  }
}

/**
 * Configura el entorno completo de testing
 */
export async function setupTestEnvironment(options: TestEnvironmentOptions = {}): Promise<boolean> {
  try {
    const { requireUsers = true, requireShifts = false, pastDays = 7, futureDays = 14 } = options;

    console.log('🔧 Configurando entorno de testing...');

    // 1. Inicializar Firebase Admin
    const firebaseInitialized = await initializeFirebaseAdmin();
    if (!firebaseInitialized) {
      console.error('❌ Error al inicializar Firebase Admin');
      return false;
    }

    // 2. Crear usuarios si es necesario
    if (requireUsers) {
      const constantUsersCreated = await createConstantUsers();
      if (!constantUsersCreated) {
        console.error('❌ Error al crear usuarios constantes');
        return false;
      }

      const variableUsersCreated = await createVariableUsers();
      if (!variableUsersCreated) {
        console.error('❌ Error al crear usuarios variables');
        return false;
      }
    }

    // 3. Crear turnos si es necesario
    if (requireShifts) {
      const shiftsCreated = await createTestShifts({ pastDays, futureDays });
      if (!shiftsCreated) {
        console.error('❌ Error al crear turnos de prueba');
        return false;
      }
    }

    console.log('✅ Entorno de testing configurado correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error al configurar el entorno de testing:', error);
    return false;
  }
}

/**
 * Limpia el entorno de testing
 */
export async function cleanupTestEnvironment(): Promise<boolean> {
  try {
    console.log('🧹 Limpiando entorno de testing...');

    const cleanupSuccess = await cleanupVariableData();
    if (!cleanupSuccess) {
      console.error('❌ Error al limpiar datos variables');
      return false;
    }

    console.log('✅ Entorno de testing limpiado correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error al limpiar el entorno de testing:', error);
    return false;
  }
}

/**
 * Limpia completamente el entorno de testing (incluyendo datos constantes)
 */
export async function cleanupCompleteTestEnvironment(): Promise<boolean> {
  try {
    console.log('🧹 Limpieza completa del entorno de testing...');

    const cleanupSuccess = await cleanupAllTestData();
    if (!cleanupSuccess) {
      console.error('❌ Error al limpiar todos los datos de testing');
      return false;
    }

    console.log('✅ Entorno de testing limpiado completamente');
    return true;
  } catch (error) {
    console.error('❌ Error al limpiar completamente el entorno de testing:', error);
    return false;
  }
}

/**
 * Verifica que el entorno de testing esté listo
 */
export async function verifyTestEnvironment(): Promise<boolean> {
  try {
    // Verificar que el servidor esté ejecutándose
    const serverRunning = await isServerRunning(3001);
    if (!serverRunning) {
      console.error('❌ El servidor de testing no está ejecutándose');
      return false;
    }

    console.log('✅ Entorno de testing verificado correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error al verificar el entorno de testing:', error);
    return false;
  }
}

/**
 * Obtiene el estado del servidor de testing
 */
export function getServerStatus(): { running: boolean; process: ChildProcess | null } {
  return {
    running: serverStarted && testServer !== null && !testServer.killed,
    process: testServer,
  };
}
