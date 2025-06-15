#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Iconos para los logs
const icons = {
  start: '🚀',
  clean: '🧹',
  install: '📦',
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  dev: '🔧',
};

// Función para mostrar logs con formato
function log(type, message) {
  const timestamp = new Date().toLocaleTimeString('es-ES');
  console.log(`${icons[type]} [${timestamp}] ${message}`);
}

// Función para ejecutar comandos con logs
function executeCommand(command, description) {
  try {
    log('info', `Ejecutando: ${description}`);
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    log('success', `Completado: ${description}`);
  } catch (error) {
    log('error', `Error en: ${description}`);
    console.error(error.message);
    process.exit(1);
  }
}

// Función principal
async function restartProject() {
  try {
    log('start', 'Iniciando reinicio completo del proyecto...');

    // Paso 1: Limpiar directorios y archivos
    log('clean', 'Limpiando archivos y directorios...');

    const itemsToClean = [
      { path: 'node_modules', type: 'directory' },
      { path: '.next', type: 'directory' },
      { path: '.cache', type: 'directory' },
      { path: 'package-lock.json', type: 'file' },
    ];

    for (const item of itemsToClean) {
      const itemPath = path.join(process.cwd(), item.path);

      if (fs.existsSync(itemPath)) {
        try {
          log('info', `Eliminando ${item.type}: ${item.path}...`);
          if (item.type === 'directory') {
            // Para directorios grandes como node_modules, mostrar progreso
            if (item.path === 'node_modules') {
              log('warning', 'Eliminando node_modules... esto puede tardar unos momentos');
            }
            fs.rmSync(itemPath, { recursive: true, force: true });
            log('success', `✓ Eliminado directorio: ${item.path}`);
          } else {
            fs.unlinkSync(itemPath);
            log('success', `✓ Eliminado archivo: ${item.path}`);
          }
        } catch (error) {
          log('warning', `No se pudo eliminar ${item.path}: ${error.message}`);
        }
      } else {
        log('info', `${item.path} no existe, omitiendo...`);
      }
    }

    log('success', '✓ Limpieza completada');

    // Paso 2: Reinstalar dependencias
    log('install', 'Reinstalando dependencias...');
    executeCommand('npm install', 'Instalación de dependencias');

    // Paso 3: Verificar instalación
    log('info', 'Verificando instalación...');
    if (fs.existsSync(path.join(process.cwd(), 'node_modules'))) {
      log('success', 'node_modules creado correctamente');
    } else {
      log('error', 'Error: node_modules no fue creado');
      process.exit(1);
    }

    // Paso 4: Iniciar servidor de desarrollo
    log('dev', 'Iniciando servidor de desarrollo...');
    log('info', 'El servidor se iniciará en http://localhost:3000');
    executeCommand('npm run dev', 'Servidor de desarrollo');
  } catch (error) {
    log('error', `Error durante el reinicio del proyecto: ${error.message}`);
    process.exit(1);
  }
}

// Manejo de señales para limpieza
process.on('SIGINT', () => {
  log('warning', 'Proceso interrumpido por el usuario');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('warning', 'Proceso terminado');
  process.exit(0);
});

// Ejecutar el script
if (require.main === module) {
  restartProject();
}

module.exports = { restartProject };
