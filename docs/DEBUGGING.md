# Guía de Depuración para Rescate Animal Voluntariado

Este documento proporciona instrucciones sobre cómo depurar la aplicación durante el desarrollo.

## Configuración de Depuración

El proyecto está configurado para permitir la depuración de Node.js/Next.js utilizando el protocolo de inspección de Node.js.

### Puertos de Depuración

Cuando se ejecuta en modo de depuración, la aplicación utiliza los siguientes puertos:

- **9229**: Puerto principal de depuración para el proceso Node.js
- **9230**: Puerto secundario para el router server de Next.js

## Iniciar la Aplicación en Modo Depuración

Para iniciar la aplicación en modo depuración, ejecuta el siguiente comando:

```bash
npm run dev:debug
```

Verás mensajes similares a estos en la consola:

```
Debugger listening on ws://127.0.0.1:9229/[id]
For help, see: https://nodejs.org/en/docs/inspector
Debugger listening on ws://127.0.0.1:9230/[id]
For help, see: https://nodejs.org/en/docs/inspector
the --inspect option was detected, the Next.js router server should be inspected at 127.0.0.1:9230.
```

## Cómo conectar un depurador

### Usando VS Code

1. Asegúrate de que la aplicación esté ejecutándose en modo depuración (`npm run dev:debug`)
2. Abre VS Code en el directorio del proyecto
3. Ve a la pestaña "Run and Debug" (Ctrl+Shift+D)
4. Selecciona una de las configuraciones disponibles:
   - **"Attach to Next.js Main Process"**: Para depurar el proceso principal de Next.js (puerto 9229)
   - **"Attach to Next.js Router Server"**: Para depurar el servidor de enrutamiento de Next.js (puerto 9230)
   - **"Launch Next.js with Debugger"**: Para iniciar la aplicación directamente en modo depuración
   - **"Debug Client (Browser)"**: Para depurar componentes React y código del lado del cliente
   - **"Attach to Chrome (Client Debugging)"**: Para conectarse a una instancia de Chrome ya abierta
   - **"Debug Full Stack (Server + Client)"**: Para depurar simultáneamente servidor y cliente
   - **"Debug Current Test File"**: Para depurar el archivo de prueba actualmente abierto
5. Haz clic en el botón de inicio (flecha verde) o presiona F5
6. Coloca puntos de interrupción en tu código haciendo clic en el margen izquierdo del editor

### Depuración específica de componentes React (Frontend)

Para depurar componentes React y código del lado del cliente:

1. **Opción 1 - Configuración automática**:
   - Selecciona "Debug Client (Browser)" en VS Code
   - Esto abrirá automáticamente Chrome con debugging habilitado
   - Coloca puntos de interrupción en tus componentes React
   - Navega en la aplicación para activar los breakpoints

2. **Opción 2 - Debugging completo (recomendado)**:
   - Selecciona "Debug Full Stack (Server + Client)"
   - Esto iniciará debugging tanto del servidor como del cliente
   - Podrás depurar APIs y componentes React simultáneamente

3. **Opción 3 - Chrome manual**:
   - Abre Chrome con: `chrome --remote-debugging-port=9222`
   - En VS Code, selecciona "Attach to Chrome (Client Debugging)"
   - Navega a `http://localhost:3000` en Chrome

### Configuración de Source Maps

La aplicación está configurada para generar source maps optimizados para debugging:
- `eval-source-map` en desarrollo para mapeo preciso
- Minimización deshabilitada en el cliente durante desarrollo
- Source maps habilitados también en producción para debugging post-deploy

### Configuración de launch.json

Crea o edita un archivo `.vscode/launch.json` con la siguiente configuración:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Attach to Next.js Main Process",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Attach to Next.js Router Server",
      "type": "node",
      "request": "attach",
      "port": 9230,
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### Usando Chrome DevTools

1. Abre Chrome y navega a `chrome://inspect`
2. Haz clic en "Open dedicated DevTools for Node"
3. En la pestaña "Connection", asegúrate de que los puertos 9229 y 9230 estén en la lista de "Network targets"
4. Deberías ver los procesos de Node.js disponibles para inspección en la sección "Remote Target"

## Solución de Problemas

### Conflictos de Puerto

Si encuentras errores relacionados con puertos en uso:

1. Verifica si hay otros procesos usando los puertos 9229 o 9230:
   ```bash
   # En Windows (PowerShell)
   netstat -ano | findstr 9229
   netstat -ano | findstr 9230
   ```

2. Termina los procesos que estén usando esos puertos o modifica el script `dev:debug` en `package.json` para usar puertos diferentes.

### Depurador No Se Conecta

Si el depurador no se conecta:

1. Asegúrate de que el firewall no esté bloqueando las conexiones a los puertos de depuración
2. Verifica que estás intentando conectarte a la dirección IP correcta (127.0.0.1)
3. Reinicia la aplicación y el depurador

## Consejos para Depuración Efectiva

- Coloca puntos de interrupción (breakpoints) en VS Code haciendo clic en el margen izquierdo junto al número de línea
- Utiliza `console.log()` estratégicamente para depuración básica
- Para depurar problemas en el lado del cliente, usa las herramientas de desarrollo del navegador