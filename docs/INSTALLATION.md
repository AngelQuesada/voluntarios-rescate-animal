# Guía de Instalación

Esta guía proporciona instrucciones detalladas para configurar el entorno de desarrollo para el Sistema de Gestión de Voluntariado para Rescate Animal.

## Requisitos previos

- Node.js v18 o superior (requerido para las últimas características)
- npm (gestor de paquetes preferido)
- Cuenta en Firebase
- Editor de código (recomendado: Visual Studio Code)
- Git para control de versiones

## Pasos de instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/rescate-animal-voluntariado.git
cd rescate-animal-voluntariado
```

### 2. Instalar dependencias

```bash
npm install
# o 
yarn install
```

### 3. Configurar Firebase

1. Crear un nuevo proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Habilitar Authentication con proveedores de email/password y Google
3. Crear una base de datos Firestore
4. Obtener las credenciales de la aplicación web y del SDK Admin

### 4. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```bash
# Firebase Client (Frontend)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Firebase Admin SDK (Backend/API Routes)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CLIENT_X509_CERT_URL=your-cert-url
```

#### Obtener credenciales de Firebase Admin

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Configuración del proyecto** > **Cuentas de servicio**
4. Haz clic en **"Generar nueva clave privada"**
5. Se descargará un archivo JSON con las credenciales
6. Extrae los valores del JSON y configúralos en las variables de entorno correspondientes

**⚠️ Importante**: Nunca subas archivos de credenciales al repositorio. Siempre usa variables de entorno.

### 5. Inicializar Firestore con colecciones básicas

Las colecciones principales que necesitarás crear son:
- `users` - Para almacenar información de los usuarios
- `shifts` - Para almacenar los turnos programados
- `settings` - Para configuraciones globales

La estructura de datos se detalla en el documento [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).

### 6. Configurar datos de prueba (opcional)

Puedes usar el script de creación de usuarios para poblar la base de datos con datos de prueba:

```bash
node scripts/create_users.js
```

Este script requiere que las variables de entorno estén configuradas correctamente.

### 7. Iniciar el servidor de desarrollo

```bash
npm run dev
# o
yarn dev
```

### 8. Configurar entorno de testing (opcional)

Para ejecutar los tests E2E, necesitas configurar variables de entorno adicionales:

```bash
# Crear archivo .env.test para testing
cp .env.example .env.test
```

Edita `.env.test` con las configuraciones específicas para testing:

```bash
# URL base para tests (usualmente localhost con puerto diferente)
BASE_URL=http://localhost:3001

# Configuraciones de Firebase para testing (pueden ser las mismas que desarrollo)
NEXT_PUBLIC_FIREBASE_API_KEY=your-test-api-key
# ... resto de configuraciones Firebase
```

#### Ejecutar tests

```bash
# Tests unitarios con Jest
npm test

# Tests E2E con Playwright
npm run test:e2e

# Tests específicos por proyecto
npm run test:e2e -- --project=login-tests
npm run test:e2e -- --project=security-validation-tests
```

### 9. Acceder a la aplicación

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Solución de problemas comunes

### Error "The default Firebase app does not exist"
- Verifica que todas las variables de entorno de Firebase Admin estén configuradas correctamente
- Asegúrate de haber reiniciado el servidor de desarrollo después de configurar las variables

### Errores de autenticación Firebase
- Verifica que las credenciales en el archivo `.env.local` sean correctas
- Confirma que los dominios estén autorizados en Firebase Console

### Errores de dependencias
- Elimina la carpeta `node_modules` y el archivo `package-lock.json` o `yarn.lock`
- Ejecuta `npm install` o `yarn install` nuevamente

### Problemas con las reglas de Firestore
- Revisa que las reglas de seguridad en Firebase Console permitan operaciones de lectura/escritura según sea necesario para desarrollo

## Testing

El proyecto incluye configuración para testing con Jest y Playwright:

```bash
# Tests unitarios
npm run test

# Tests end-to-end
npm run test:e2e
```