/**
 * Limpieza global para Playwright
 * Este archivo se ejecuta una vez después de todos los tests
 */

import { FullConfig } from '@playwright/test';
import { cleanupTestDataConditional, initializeFirebaseAdmin } from './test-db-setup';
import { stopGlobalTestServer } from './server-utils';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Iniciando limpieza global después de los tests de Playwright...');
  
  // 1. Limpiar datos variables de la base de datos
  if (process.env.AUTO_CLEANUP_TEST_DATA === 'true') {
    console.log('🔄 Limpieza automática de datos de prueba activada');
    
    // Inicializar Firebase Admin para la limpieza
    const firebaseInitialized = await initializeFirebaseAdmin();
    if (!firebaseInitialized) {
      console.error('⚠️ Error al inicializar Firebase Admin para limpieza');
    } else {
      const cleanupSuccess = await cleanupTestDataConditional();
      
      if (!cleanupSuccess) {
        console.error('⚠️ Error durante la limpieza del entorno de prueba');
        // No salimos con error para no interrumpir el flujo de CI/CD
      } else {
        console.log('✅ Datos variables limpiados correctamente');
      }
    }
  } else {
    console.log('ℹ️ Limpieza automática de datos de prueba desactivada');
  }

  // 2. Detener servidor de testing
  console.log('🛑 Deteniendo servidor de testing...');
  const serverStopped = await stopGlobalTestServer();
  
  if (!serverStopped) {
    console.error('⚠️ Error al detener el servidor de testing');
  } else {
    console.log('✅ Servidor de testing detenido correctamente');
  }

  console.log('✅ Limpieza global completada');
}

export default globalTeardown;