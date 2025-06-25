/**
 * Utilidades para gestionar el servidor de testing
 */

import { ChildProcess } from 'child_process';

// Variable global para mantener referencia al servidor
let globalTestServer: ChildProcess | null = null;

/**
 * Establece la referencia global al servidor de testing
 */
export function setGlobalTestServer(server: ChildProcess | null): void {
  globalTestServer = server;
}

/**
 * Obtiene la referencia global al servidor de testing
 */
export function getGlobalTestServer(): ChildProcess | null {
  return globalTestServer;
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
                  execSync(checkProcessCommand, { stdio: 'ignore' }); // Si esto falla, el proceso no existe, va al catch de abajo
                  console.log(
                    `🔍 Proceso con PID ${globalTestServer.pid} encontrado, procediendo a terminarlo...`
                  );

                  // Matar el proceso y todos sus hijos
                  execSync(`taskkill /pid ${globalTestServer.pid} /T /F`, { stdio: 'ignore' }); // Si esto falla, se propaga al catch externo
                  console.log(`✅ Comando taskkill ejecutado para PID ${globalTestServer.pid}`);
                  serverTerminated = true;
                } catch (e) {
                  // Este catch es para cuando checkProcessCommand (Get-Process) falla.
                  console.log(`ℹ️ El proceso con PID ${globalTestServer.pid} ya no está en ejecución (verificado antes de taskkill).`);
                  serverTerminated = true; // Si no está en ejecución, se considera terminado para nuestros propósitos.
                }
              } catch (e) {
                // Este catch es principalmente si execSync(`taskkill ...`) falla.
                let originalProcessStillExists = false;
                try {
                  // Re-verificar si el proceso existe, por si acaso.
                  execSync(`powershell -Command "Get-Process -Id ${globalTestServer.pid} -ErrorAction SilentlyContinue"`, { stdio: 'ignore' });
                  originalProcessStillExists = true;
                } catch (checkErr) {
                  // El proceso ya no existe, lo cual es el objetivo.
                }

                if (originalProcessStillExists) {
                  console.warn(`⚠️ Falló taskkill para PID ${globalTestServer.pid} (aún detectado tras fallo), pero otros intentos seguirán. Error: ${e instanceof Error ? e.message : String(e)}`);
                } else {
                  console.log(`ℹ️ Taskkill para PID ${globalTestServer.pid} falló, pero el proceso ya no se detecta (confirmado tras fallo).`);
                  serverTerminated = true; // Si no existe, está terminado.
                }
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
                      console.log(`✅ Proceso con PID ${pid} terminado correctamente (buscado por puerto)`);
                      serverTerminated = true;
                    } catch (killError) {
                      let processStillExists = false;
                      try {
                        execSync(`powershell -Command "Get-Process -Id ${pid} -ErrorAction SilentlyContinue"`, { stdio: 'ignore' });
                        processStillExists = true;
                      } catch (checkErr) { /* Proceso ya no existe */ }

                      if (processStillExists) {
                        console.warn(`⚠️ Falló taskkill para PID ${pid} (buscado por puerto, aún detectado). Error: ${killError instanceof Error ? killError.message : String(killError)}`);
                      } else {
                        console.log(`ℹ️ Taskkill para PID ${pid} (buscado por puerto) falló, pero el proceso ya no se detecta.`);
                      }
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
                      console.log(`✅ Proceso Node.js con PID ${pid} terminado correctamente (buscado por nombre/cmdline)`);
                      serverTerminated = true;
                    } catch (killError) {
                      let processStillExists = false;
                      try {
                        execSync(`powershell -Command "Get-Process -Id ${pid} -ErrorAction SilentlyContinue"`, { stdio: 'ignore' });
                        processStillExists = true;
                      } catch (checkErr) { /* Proceso ya no existe */ }
                      
                      if (processStillExists) {
                        console.warn(`⚠️ Falló taskkill para PID ${pid} (proceso Node.js, aún detectado). Error: ${killError instanceof Error ? killError.message : String(killError)}`);
                      } else {
                        console.log(`ℹ️ Taskkill para PID ${pid} (proceso Node.js) falló, pero el proceso ya no se detecta.`);
                      }
                    }
                  }
                }
              }
            } else {
              console.log('ℹ️ No se encontraron procesos de Node.js que coincidan con nuestro servidor');
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
            console.log('🔄 Intentando terminar el servidor usando el método kill() del proceso...');
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
              console.warn(`⚠️ Aún hay procesos usando el puerto ${port}, intentando terminarlos...`);
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