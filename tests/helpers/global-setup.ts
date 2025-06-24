/**
 * Configuración global para Playwright
 * Este archivo se ejecuta una vez antes de todos los tests
 */

import { FullConfig } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { createHash } from 'crypto';
import { readFileSync, statSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  setupTestEnvironment,
  cleanupTestEnvironment,
  isServerRunning,
} from './setup-test-environment';
import { loadTestEnvironmentVariables } from './vscode-setup';
import { setGlobalTestServer, getGlobalTestServer } from './server-utils';

// Variable local para mantener referencia al servidor durante la inicialización
let localTestServer: ChildProcess | null = null;

// Archivo para almacenar el hash de la última compilación
const COMPILATION_CACHE_FILE = join(process.cwd(), '.next', 'compilation-cache.json');

/**
 * Calcula el hash de un archivo
 */
function getFileHash(filePath: string): string {
  try {
    if (!existsSync(filePath)) return '';
    const content = readFileSync(filePath, 'utf8');
    return createHash('md5').update(content).digest('hex');
  } catch {
    return '';
  }
}

/**
 * Obtiene información de modificación de archivos clave
 */
function getProjectFilesInfo(): Record<string, { hash: string; mtime: number }> {
  const keyFiles = [
    'package.json',
    'package-lock.json',
    'next.config.ts',
    'tsconfig.json',
    'tailwind.config.ts',
    'playwright.config.ts',
    'src/app/layout.tsx',
    'src/app/page.tsx',
    'src/app/globals.css',
    'src/lib/auth.ts',
    'src/lib/db.ts',
    'src/middleware.ts',
    '.env.local',
    '.env.test',
    // Archivos de configuración de tests
    'tests/helpers/global-setup.ts',
    'tests/helpers/global-teardown.ts',
    'tests/helpers/test-db-setup.ts',
    'tests/helpers/setup-test-environment.ts',
    'tests/helpers/server-utils.ts',
    'tests/helpers/vscode-setup.ts',
    // Agregar más archivos clave según sea necesario
  ];

  const filesInfo: Record<string, { hash: string; mtime: number }> = {};

  for (const file of keyFiles) {
    const fullPath = join(process.cwd(), file);
    if (existsSync(fullPath)) {
      try {
        const stats = statSync(fullPath);
        filesInfo[file] = {
          hash: getFileHash(fullPath),
          mtime: stats.mtime.getTime(),
        };
      } catch (error) {
        console.warn(`⚠️ Error al leer archivo ${file}:`, error);
      }
    }
  }

  return filesInfo;
}

/**
 * Verifica si han habido cambios significativos desde la última compilación
 */
function hasSignificantChanges(): boolean {
  try {
    // Si no existe el archivo de caché, asumir que hay cambios
    if (!existsSync(COMPILATION_CACHE_FILE)) {
      console.log('📝 No se encontró caché de compilación, se requiere compilación completa');
      return true;
    }

    const cachedInfo = JSON.parse(readFileSync(COMPILATION_CACHE_FILE, 'utf8'));
    const currentInfo = getProjectFilesInfo();

    // Comparar archivos clave
    for (const [file, info] of Object.entries(currentInfo)) {
      const cachedFileInfo = cachedInfo[file];

      if (!cachedFileInfo) {
        console.log(`📝 Archivo nuevo detectado: ${file}`);
        return true;
      }

      if (cachedFileInfo.hash !== info.hash || cachedFileInfo.mtime !== info.mtime) {
        console.log(`📝 Cambios detectados en: ${file}`);
        return true;
      }
    }

    // Verificar si se eliminaron archivos
    for (const file of Object.keys(cachedInfo)) {
      if (!currentInfo[file]) {
        console.log(`📝 Archivo eliminado detectado: ${file}`);
        return true;
      }
    }

    console.log('✅ No se detectaron cambios significativos en archivos clave');
    return false;
  } catch (error) {
    console.warn('⚠️ Error al verificar cambios, asumiendo que hay cambios:', error);
    return true;
  }
}

/**
 * Guarda la información actual de archivos en el caché
 */
function saveCompilationCache(): void {
  try {
    const currentInfo = getProjectFilesInfo();
    const cacheDir = join(process.cwd(), '.next');

    // Crear directorio .next si no existe
    if (!existsSync(cacheDir)) {
      require('fs').mkdirSync(cacheDir, { recursive: true });
    }

    writeFileSync(COMPILATION_CACHE_FILE, JSON.stringify(currentInfo, null, 2));
    console.log('💾 Caché de compilación guardado');
  } catch (error) {
    console.warn('⚠️ Error al guardar caché de compilación:', error);
  }
}

/**
 * Verifica si un puerto está disponible
 */
async function isPortAvailable(port: number): Promise<boolean> {
  try {
    const net = require('net');
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(port);
    });
  } catch {
    return false;
  }
}

/**
 * Encuentra un puerto disponible comenzando desde el puerto especificado
 */
async function findAvailablePort(startPort: number = 3001): Promise<number> {
  for (let port = startPort; port <= startPort + 10; port++) {
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
  }
  throw new Error(`No se pudo encontrar un puerto disponible desde ${startPort}`);
}

/**
 * Inicia el servidor de desarrollo para testing
 */
async function startGlobalTestServer(port: number): Promise<boolean> {
  try {
    // Verificar si ya hay un servidor en ejecución
    if (getGlobalTestServer()) {
      console.log('ℹ️ Ya hay un servidor de testing en ejecución');
      return true;
    }

    return new Promise((resolve, reject) => {
      // Timeout de startup: solo durante el inicio del servidor
      let startupTimeoutId: NodeJS.Timeout | null = null;
      const STARTUP_TIMEOUT = 60000; // 60 segundos para el startup

      const clearStartupTimeout = () => {
        if (startupTimeoutId) {
          clearTimeout(startupTimeoutId);
          startupTimeoutId = null;
        }
      };

      // Timeout solo para el startup del servidor
      startupTimeoutId = setTimeout(() => {
        console.error('⏰ Timeout: El servidor no se inició en 60 segundos');

        // Intentar detener el servidor si existe
        if (localTestServer && !localTestServer.killed) {
          console.log('🛑 Deteniendo servidor por timeout de startup...');
          try {
            if (process.platform === 'win32') {
              // En Windows, usar taskkill si tenemos el PID
              if (localTestServer.pid) {
                const { execSync } = require('child_process');
                try {
                  execSync(`taskkill /pid ${localTestServer.pid} /T /F`, { stdio: 'ignore' });
                  console.log(`✅ Servidor con PID ${localTestServer.pid} terminado por timeout`);
                } catch (killError) {
                  console.warn(`⚠️ Error al terminar servidor por timeout: ${killError}`);
                }
              }
            } else {
              localTestServer.kill('SIGTERM');
            }
          } catch (killError) {
            console.warn(`⚠️ Error al intentar detener el servidor por timeout: ${killError}`);
          }
        }

        // Limpiar la referencia global
        setGlobalTestServer(null);
        localTestServer = null;

        reject(
          new Error(
            'Timeout: El servidor de testing no se inició en el tiempo esperado (60 segundos)'
          )
        );
      }, STARTUP_TIMEOUT);

      // Función para limpiar el timeout y resolver/rechazar
      const cleanupAndResolve = (success: boolean, error?: Error) => {
        clearStartupTimeout();
        if (success) {
          resolve(true);
        } else {
          reject(error || new Error('Error desconocido al iniciar el servidor'));
        }
      };
      console.log(`🚀 Iniciando servidor de testing en puerto ${port}...`);

      // Configurar variables de entorno para el servidor
      const env = {
        ...process.env,
        NODE_ENV: 'test',
        PORT: port.toString(),
        DISABLE_PWA: 'true',
        IS_TESTING_ENVIRONMENT: 'true',
      };

      // Iniciar el servidor usando next dev (en Windows usamos un enfoque diferente)
      if (process.platform === 'win32') {
        // En lugar de usar 'start' con cmd /k, usamos spawn directamente para evitar la necesidad de interacción manual
        const command = `npx next dev --port ${port}`;

        // Usar spawn en lugar de execSync para evitar la necesidad de interacción manual
        const { spawn } = require('child_process');

        // Dividir el comando en nombre y argumentos para spawn
        const [cmd, ...args] = command.split(' ');

        // Ejecutar el comando directamente sin abrir una nueva ventana
        localTestServer = spawn(cmd, args, {
          env,
          cwd: process.cwd(),
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true,
        });

        // Guardar la referencia global al servidor
        setGlobalTestServer(localTestServer);

        // Ya no necesitamos buscar el PID ni simular un ChildProcess porque estamos usando spawn directamente
        console.log(`✅ Servidor iniciado con PID: ${localTestServer.pid}`);

        // Ahora podemos manejar los eventos de stdout y stderr directamente
        if (localTestServer && localTestServer.stdout) {
          localTestServer.stdout.on('data', (data) => {
            const output = data.toString();
            // El servidor está mostrando actividad

            // Buscar el mensaje que indica que el servidor está compilado y listo
            if (output.includes('Compiled /') && !resolved) {
              // Esperar un momento adicional para asegurar que el servidor esté completamente listo
              setTimeout(() => {
                if (!resolved) {
                  resolved = true;
                  console.log(`✅ Servidor de testing compilado y listo en puerto ${port}`);
                  cleanupAndResolve(true);
                }
              }, 8000); // Esperar 8 segundos adicionales después de detectar que está compilado
            }

            // Verificar mensaje de Ready como fallback secundario
            if (output.includes('✓ Ready in') && !resolved) {
              setTimeout(() => {
                if (!resolved) {
                  resolved = true;
                  cleanupAndResolve(true);
                }
              }, 5000); // Esperar 5 segundos adicionales después de detectar Ready
            }
          });
        }

        if (localTestServer && localTestServer.stderr) {
          localTestServer.stderr.on('data', (data) => {
            const error = data.toString();
            // console.log('📋 Server stderr:', error.trim());

            // El servidor está mostrando actividad (incluso errores)

            // Solo rechazar en errores críticos
            if (error.includes('EADDRINUSE') || error.includes('EACCES')) {
              if (!resolved) {
                resolved = true;
                cleanupAndResolve(false, new Error(`Error crítico del servidor: ${error}`));
              }
            }
          });
        }

        // Manejar cierre del proceso
        if (localTestServer) {
          localTestServer.on('close', (code) => {
            console.log(`📋 Servidor cerrado con código: ${code}`);
            // Solo rechazar si el servidor se cierra antes de estar listo
            if (!resolved) {
              resolved = true;
              console.error(`❌ El servidor se cerró con código ${code}`);
              cleanupAndResolve(
                false,
                new Error(`El servidor se cerró inesperadamente con código ${code}`)
              );
            }
          });

          localTestServer.on('error', (error) => {
            if (!resolved) {
              resolved = true;
              console.error('❌ Error al iniciar el servidor:', error);
              cleanupAndResolve(false, error);
            }
          });
        }
      } else {
        // En otros sistemas operativos, usar el método original
        localTestServer = spawn('npx', ['next', 'dev', '--port', port.toString()], {
          env,
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true,
          cwd: process.cwd(),
        });

        // Guardar la referencia global al servidor
        setGlobalTestServer(localTestServer);
      }

      let serverOutput = '';
      let errorOutput = '';
      let resolved = false;
      let serverReady = false;

      // Si estamos en Windows y usando la ventana separada, no tenemos acceso directo a stdout/stderr
      // Verificar periódicamente si el servidor está respondiendo (para todos los sistemas operativos)
      console.log('⏳ Esperando a que el servidor se inicie y compile...');

      // Verificar periódicamente si el servidor está respondiendo
      const checkServerInterval = setInterval(async () => {
        try {
          // Intentar hacer una petición al servidor
          const response = await fetch(`http://localhost:${port}`, { method: 'HEAD' });
          // El servidor está respondiendo correctamente

          if (response.status >= 200 && response.status < 500) {
            clearInterval(checkServerInterval);
            if (!resolved) {
              console.log('✅ Servidor detectado como funcionando correctamente');
              resolved = true;
              serverReady = true;
              cleanupAndResolve(true);
            }
          }
        } catch (error) {
          // El servidor aún no está listo, seguir esperando
          console.log('⏳ Servidor aún no responde, continuando espera...');
          // Continuamos intentando conectar
        }
      }, 5000); // Verificar cada 5 segundos

      // Timeout de seguridad para evitar esperar indefinidamente
      setTimeout(() => {
        clearInterval(checkServerInterval);
        if (!resolved) {
          console.log('⏳ Tiempo de espera agotado, asumiendo que el servidor está listo...');
          resolved = true;
          serverReady = true;
          cleanupAndResolve(true);
        }
      }, 90000); // 90 segundos máximo de espera para permitir compilación completa
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor de testing:', error);
    throw error;
  }
}

/**
 * Detiene el servidor global de testing
 */
export async function stopGlobalTestServer(): Promise<boolean> {
  try {
    if (globalTestServer && !globalTestServer.killed) {
      console.log('🛑 Deteniendo servidor de testing...');

      // Obtener el puerto del servidor (asumiendo que está en la variable de entorno o es 3001 por defecto)
      const port = process.env.PORT || '3001';
      let serverTerminated = false;

      // En Windows, usar taskkill para cerrar el proceso y sus hijos
      if (process.platform === 'win32') {
        try {
          const { execSync } = require('child_process');

          // Primero intentar terminar el proceso por PID si lo tenemos
          if (globalTestServer.pid) {
            try {
              // Verificar si el proceso sigue ejecutándose
              const checkProcessCommand = `powershell -Command "Get-Process -Id ${globalTestServer.pid} -ErrorAction SilentlyContinue"`;
              try {
                execSync(checkProcessCommand, { stdio: 'ignore' });
                console.log(
                  `🔍 Proceso con PID ${globalTestServer.pid} encontrado, procediendo a terminarlo...`
                );

                // Matar el proceso y todos sus hijos
                execSync(`taskkill /pid ${globalTestServer.pid} /T /F`, { stdio: 'ignore' });
                console.log(`✅ Comando taskkill ejecutado para PID ${globalTestServer.pid}`);
                serverTerminated = true;
              } catch (e) {
                // Si el comando falla, es posible que el proceso ya no exista
                console.log(
                  `ℹ️ El proceso con PID ${globalTestServer.pid} ya no está en ejecución`
                );
              }
            } catch (e) {
              console.error('⚠️ Error al intentar terminar el proceso por PID:', e);
            }
          }

          // Buscar y terminar cualquier proceso que esté usando el puerto
          try {
            console.log(`🔍 Buscando procesos que estén usando el puerto ${port}...`);
            // Usar un comando más robusto para encontrar procesos por puerto
            const findProcessCommand = `powershell -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Get-Process -Id $_.OwningProcess }"`;
            const processInfo = execSync(findProcessCommand, { encoding: 'utf8' });

            if (processInfo && processInfo.trim()) {
              // Extraer todos los PIDs encontrados
              const pidMatches = [...processInfo.matchAll(/\s+(\d+)\s+/g)];
              if (pidMatches && pidMatches.length > 0) {
                for (const match of pidMatches) {
                  if (match && match[1]) {
                    const pid = parseInt(match[1]);
                    console.log(
                      `🔍 Encontrado proceso en el puerto ${port} con PID: ${pid}, terminándolo...`
                    );
                    try {
                      execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
                      console.log(`✅ Proceso con PID ${pid} terminado correctamente`);
                      serverTerminated = true;
                    } catch (killError) {
                      console.error(`⚠️ Error al terminar proceso con PID ${pid}:`, killError);
                    }
                  }
                }
              }
            } else {
              console.log(`ℹ️ No se encontraron procesos usando el puerto ${port}`);
            }
          } catch (e) {
            console.error('⚠️ Error al buscar procesos por puerto:', e);
          }

          // Buscar procesos de Node.js que puedan ser nuestro servidor
          try {
            console.log('🔍 Buscando procesos de Node.js que puedan ser nuestro servidor...');
            const findNodeCommand = `powershell -Command "Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*next dev*' -or $_.CommandLine -like '*next start*' } | Select-Object Id"`;
            const nodeProcessInfo = execSync(findNodeCommand, { encoding: 'utf8' });

            if (nodeProcessInfo && nodeProcessInfo.trim()) {
              const pidMatches = [...nodeProcessInfo.matchAll(/\s+(\d+)\s+/g)];
              if (pidMatches && pidMatches.length > 0) {
                for (const match of pidMatches) {
                  if (match && match[1]) {
                    const pid = parseInt(match[1]);
                    console.log(
                      `🔍 Encontrado proceso Node.js que podría ser nuestro servidor con PID: ${pid}, terminándolo...`
                    );
                    try {
                      execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
                      console.log(`✅ Proceso Node.js con PID ${pid} terminado correctamente`);
                      serverTerminated = true;
                    } catch (killError) {
                      console.error(
                        `⚠️ Error al terminar proceso Node.js con PID ${pid}:`,
                        killError
                      );
                    }
                  }
                }
              }
            } else {
              console.log(
                'ℹ️ No se encontraron procesos de Node.js que coincidan con nuestro servidor'
              );
            }
          } catch (e) {
            console.error('⚠️ Error al buscar procesos de Node.js:', e);
          }
        } catch (e) {
          console.error('⚠️ Error general al intentar terminar procesos en Windows:', e);
        }

        // Si tenemos el objeto de proceso, intentar matarlo directamente
        if (!serverTerminated && typeof globalTestServer.kill === 'function') {
          try {
            console.log(
              '🔄 Intentando terminar el servidor usando el método kill() del proceso...'
            );
            globalTestServer.kill('SIGTERM');
            console.log('✅ Método kill() ejecutado en el proceso del servidor');
          } catch (e) {
            console.error('⚠️ Error al intentar usar kill() en el proceso:', e);
          }
        }
      } else {
        // En Unix, usar el grupo de proceso negativo para matar todo el árbol
        try {
          process.kill(-globalTestServer.pid!, 'SIGTERM');
        } catch (e) {
          globalTestServer.kill('SIGTERM');
        }
      }

      // Esperar un poco más para asegurar que los procesos tengan tiempo de cerrarse
      console.log('⏳ Esperando para verificar que los procesos se hayan cerrado...');
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Verificación final para asegurarse de que no queden procesos
      if (process.platform === 'win32') {
        try {
          const { execSync } = require('child_process');

          // Verificar si hay procesos en el puerto
          try {
            console.log(`🔍 Verificación final: buscando procesos en el puerto ${port}...`);
            const findProcessCommand = `powershell -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Get-Process -Id $_.OwningProcess }"`;
            const processInfo = execSync(findProcessCommand, { encoding: 'utf8' });

            if (processInfo && processInfo.trim()) {
              console.warn(
                `⚠️ Aún hay procesos usando el puerto ${port}, intentando terminarlos...`
              );
              const pidMatches = [...processInfo.matchAll(/\s+(\d+)\s+/g)];
              if (pidMatches && pidMatches.length > 0) {
                for (const match of pidMatches) {
                  if (match && match[1]) {
                    const pid = parseInt(match[1]);
                    console.log(`🔄 Terminando proceso persistente con PID ${pid}...`);
                    execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
                  }
                }
              }
            } else {
              console.log(`✅ Verificación final: No hay procesos usando el puerto ${port}`);
            }
          } catch (e) {
            console.error('⚠️ Error en verificación final de procesos por puerto:', e);
          }

          // Si tenemos el PID original, verificar que ya no exista
          if (globalTestServer.pid) {
            try {
              const checkProcessCommand = `powershell -Command "Get-Process -Id ${globalTestServer.pid} -ErrorAction SilentlyContinue"`;
              execSync(checkProcessCommand, { stdio: 'ignore' });
              console.warn(
                `⚠️ El proceso original con PID ${globalTestServer.pid} sigue ejecutándose, forzando cierre final...`
              );
              execSync(`taskkill /pid ${globalTestServer.pid} /T /F`, { stdio: 'ignore' });
            } catch (e) {
              // Si el comando falla, es porque el proceso ya no existe, lo cual es bueno
              console.log(
                `✅ Confirmado: el proceso con PID ${globalTestServer.pid} ha sido terminado`
              );
            }
          }
        } catch (e) {
          console.error('⚠️ Error en la verificación final del proceso:', e);
        }
      } else if (
        globalTestServer &&
        !globalTestServer.killed &&
        typeof globalTestServer.kill === 'function'
      ) {
        // En otros sistemas, intentar con SIGKILL como último recurso
        globalTestServer.kill('SIGKILL');
      }

      globalTestServer = null;
      console.log('✅ Servidor de testing detenido');
    } else {
      console.log('ℹ️ No hay servidor de testing en ejecución para detener');
    }
    return true;
  } catch (error) {
    console.error('❌ Error al detener el servidor de testing:', error);
    return false;
  }
}

async function globalSetup(config: FullConfig) {
  console.log('🚀 Iniciando configuración global para tests de Playwright...');

  // Cargar variables de entorno
  loadTestEnvironmentVariables();

  // Verificar si estamos en modo de prueba
  if (process.env.NODE_ENV !== 'test') {
    console.warn('⚠️ NODE_ENV no está configurado como "test"');
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'test',
      writable: true,
      enumerable: true,
      configurable: true,
    });
    console.log('✅ NODE_ENV configurado como "test"');
  }

  // Verificar si PWA está desactivado
  if (process.env.DISABLE_PWA !== 'true') {
    console.warn('⚠️ DISABLE_PWA no está configurado como "true"');
    process.env.DISABLE_PWA = 'true';
    console.log('✅ DISABLE_PWA configurado como "true"');
  }

  // Verificar que estamos en entorno de prueba
  if (process.env.IS_TESTING_ENVIRONMENT !== 'true') {
    console.warn('⚠️ IS_TESTING_ENVIRONMENT no está configurado como "true"');
    process.env.IS_TESTING_ENVIRONMENT = 'true';
    console.log('✅ IS_TESTING_ENVIRONMENT configurado como "true"');
  }

  // 1. Determinar puerto y verificar/iniciar servidor
  let targetPort = 3001;
  const baseUrl = process.env.BASE_URL;

  if (baseUrl) {
    try {
      const url = new URL(baseUrl);
      targetPort = parseInt(url.port) || 3001;
    } catch (e) {
      console.warn('⚠️ BASE_URL inválida, usando puerto 3001 por defecto');
    }
  }

  console.log('🔍 Verificando disponibilidad del servidor de testing...');
  const serverRunning = await isServerRunning(targetPort);

  // Verificar si hay cambios significativos antes de decidir sobre la compilación
  const needsRecompilation = hasSignificantChanges();

  if (!serverRunning) {
    // Buscar un puerto disponible si el objetivo está ocupado
    const availablePort = await findAvailablePort(targetPort);

    if (availablePort !== targetPort) {
      console.log(`ℹ️ Puerto ${targetPort} no disponible, usando puerto ${availablePort}`);
      // Actualizar BASE_URL para que los tests usen el puerto correcto
      process.env.BASE_URL = `http://localhost:${availablePort}`;
    }

    const serverStarted = await startGlobalTestServer(availablePort);
    if (!serverStarted) {
      console.error('❌ Error al iniciar el servidor de testing');
      process.exit(1);
    }

    // Esperar un tiempo significativo para asegurar que el servidor esté completamente listo
    console.log('⏳ Esperando que el servidor termine de inicializar completamente...');
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Guardar el caché después de iniciar el servidor
    saveCompilationCache();
  } else {
    console.log(`✅ Servidor de testing ya está ejecutándose en puerto ${targetPort}`);

    if (!needsRecompilation) {
      console.log('🚀 No se detectaron cambios, omitiendo compilación forzada');
      // Aún así, hacer una verificación rápida para asegurar que el servidor responde
      const baseUrl = process.env.BASE_URL || `http://localhost:${targetPort}`;
      try {
        const response = await fetch(baseUrl, { method: 'GET' });
        if (response.ok) {
          console.log('✅ Servidor responde correctamente, continuando con los tests');
          return;
        }
      } catch (error) {
        console.log('⚠️ Servidor no responde, forzando compilación...');
      }
    } else {
      console.log('🔄 Cambios detectados, se requiere recompilación');
    }
  }

  // Forzar una compilación completa del servidor haciendo llamadas explícitas
  console.log('🔄 Forzando compilación completa del servidor...');
  try {
    const baseUrl = process.env.BASE_URL || `http://localhost:${targetPort}`;
    console.log(`📡 Realizando peticiones a ${baseUrl} para forzar compilación...`);

    // Función para verificar si el servidor está compilado
    const checkServerCompilation = async (): Promise<boolean> => {
      try {
        // Realizar una petición al servidor
        const response = await fetch(baseUrl, { method: 'GET' });
        console.log(`📋 Respuesta del servidor: ${response.status} ${response.statusText}`);

        // Verificar si la respuesta es rápida (indicador de que está compilado)
        const startTime = Date.now();
        await fetch(baseUrl, { method: 'GET' });
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        console.log(`⏱️ Tiempo de respuesta: ${responseTime}ms`);

        // Si la respuesta es rápida (menos de 1 segundo), probablemente ya está compilado
        return responseTime < 1000;
      } catch (error) {
        console.error('⚠️ Error al verificar compilación:', error);
        return false;
      }
    };

    // Realizar múltiples intentos para asegurar que el servidor está compilado
    let isCompiled = false;
    let attempts = 0;
    const maxAttempts = 5;

    while (!isCompiled && attempts < maxAttempts) {
      attempts++;
      console.log(`🔄 Intento ${attempts}/${maxAttempts} de verificación de compilación...`);

      // Verificar si el servidor está compilado
      isCompiled = await checkServerCompilation();

      if (isCompiled) {
        console.log('✅ Servidor compilado y respondiendo rápidamente');
      } else {
        console.log('⏳ Servidor aún no está completamente compilado, esperando...');
        // Esperar antes del siguiente intento
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    // Esperar un tiempo adicional para asegurar que todo está completamente listo
    console.log('⏳ Esperando un tiempo adicional para asegurar que todo está listo...');
    await new Promise((resolve) => setTimeout(resolve, 10000));

    console.log('✅ Compilación del servidor completada y verificada');

    // Guardar el caché después de una compilación exitosa
    if (needsRecompilation) {
      saveCompilationCache();
    }
  } catch (error) {
    console.error('⚠️ Error al forzar la compilación del servidor:', error);
    // Continuar de todos modos, ya que el servidor podría estar funcionando
  }

  // 2. Limpiar la base de datos antes de inicializar
  console.log('🧹 Limpiando base de datos antes de inicializar tests...');
  await cleanupTestEnvironment();

  // 3. Inicializar entorno de prueba con usuarios constantes
  // Los datos variables (turnos, usuarios adicionales) se crearán en cada test según sea necesario
  const setupSuccess = await setupTestEnvironment({
    requireUsers: true,
    requireShifts: false,
  });

  if (!setupSuccess) {
    console.error('❌ Error al inicializar el entorno de prueba');
    process.exit(1);
  }

  console.log('✅ Configuración global completada correctamente');
  console.log('📋 Resumen:');
  console.log(
    `   - Servidor de testing: ${process.env.BASE_URL || `http://localhost:${targetPort}`}`
  );
  console.log('   - Usuarios constantes: Creados');
  console.log('   - Base de datos: Limpia y lista');
}

export default globalSetup;
