/**
 * Utilidades para gestionar el servidor de testing
 */

import { ChildProcess } from 'child_process';
import { kill } from 'cross-port-killer';

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
 * Detiene el servidor global de testing de forma robusta y multiplataforma.
 */
export async function stopGlobalTestServer(): Promise<boolean> {
  const server = getGlobalTestServer();
  // Asegurarse de que el puerto se interpreta como número
  const port = parseInt(process.env.PORT || '3001', 10);

  // 1. Intento de apagado normal (graceful shutdown)
  if (server && !server.killed) {
    console.log(`🛑 Deteniendo servidor de testing (PID: ${server.pid})...`);
    const killedGracefully = server.kill('SIGTERM');
    if (killedGracefully) {
      console.log('✅ Señal SIGTERM enviada al proceso del servidor.');
      // Dar un momento para que el proceso se cierre limpiamente
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
      console.warn('⚠️ No se pudo enviar la señal SIGTERM al proceso del servidor.');
    }
  } else {
    console.log('ℹ️ No hay un proceso de servidor global registrado para detener con SIGTERM.');
  }

  // 2. Garantía de limpieza forzada y multiplataforma usando el puerto
  try {
    console.log(`🧹 Forzando liberación del puerto ${port} como medida de seguridad final...`);
    const killedPids = await kill(port);
    if (killedPids.length > 0) {
      console.log(`✅ Procesos en el puerto ${port} (PIDs: ${killedPids.join(', ')}) fueron terminados.`);
    } else {
      console.log(`ℹ️ No se encontraron procesos escuchando en el puerto ${port} para terminar.`);
    }
  } catch (error) {
    // Si cross-port-killer falla (ej. permisos), se registra pero no se detiene el flujo.
    // A menudo, puede fallar si el puerto ya estaba libre, lo cual no es un error crítico.
    console.warn(`⚠️ Ocurrió un problema menor al intentar forzar la liberación del puerto ${port}. Esto puede ser normal si el puerto ya estaba libre. Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  // 3. Limpiar la referencia global
  setGlobalTestServer(null);
  console.log('✅ Servidor de testing detenido y referencia global limpiada.');

  return true;
}