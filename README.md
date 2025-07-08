# Sistema de Gestión de Voluntariado para Rescate Animal

Este proyecto es una aplicación web diseñada para coordinar y gestionar voluntarios en organizaciones de rescate animal. Permite la planificación de turnos, asignación de roles y comunicación entre voluntarios.

## Características principales

- Gestión de turnos de voluntariado (mañana/tarde)
- Sistema de roles (Administrador, Responsable, Voluntario)
- Calendario interactivo para asignación de turnos
- Panel de administración para gestión de usuarios
- Notificaciones y recordatorios

## Tecnologías utilizadas

- **Frontend**: Next.js, React, TypeScript, Material-UI
- **Backend**: Firebase (Authentication, Firestore)
- **Estado**: React Context API y hooks personalizados
- **Despliegue**: Vercel (recomendado)

## Requisitos previos

- Node.js v16 o superior
- Cuenta en Firebase
- npm o yarn

## Instalación

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/rescate-animal-voluntariado.git
   cd rescate-animal-voluntariado
   ```

2. Instalar dependencias:
   ```bash
   npm install
   # o
   yarn install
   ```

3. Configurar variables de entorno (ver sección de configuración)

4. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   # o
   yarn dev
   ```

5. Abrir [http://localhost:3000](http://localhost:3000) en el navegador

## Configuración

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```
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

### Obtener las credenciales de Firebase Admin

1. Ve a la [Consola de Firebase](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Configuración del proyecto** > **Cuentas de servicio**
4. Haz clic en **"Generar nueva clave privada"**
5. Se descargará un archivo JSON con las credenciales
6. Copia los valores del archivo JSON a las variables de entorno correspondientes:

```json
{
  "type": "service_account",
  "project_id": "tu-proyecto-id", // → FIREBASE_PROJECT_ID
  "private_key_id": "tu-private-key-id", // → FIREBASE_PRIVATE_KEY_ID  
  "private_key": "-----BEGIN PRIVATE KEY-----\n...", // → FIREBASE_PRIVATE_KEY
  "client_email": "firebase-adminsdk-xxxxx@tu-proyecto.iam.gserviceaccount.com", // → FIREBASE_CLIENT_EMAIL
  "client_id": "123456789", // → FIREBASE_CLIENT_ID
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..." // → FIREBASE_CLIENT_X509_CERT_URL
}
```

**Importante**: 
- Para desarrollo local, configura estas variables en tu archivo `.env.local`
- Para producción (Vercel), configúralas en el panel de Environment Variables
- Nunca subas archivos de credenciales al repositorio Git

## Testing

El proyecto incluye una suite completa de tests para garantizar la calidad y seguridad del sistema:

### Tests de Seguridad y Permisos
- **Control de acceso por roles**: Verificación de que solo los administradores pueden acceder a funcionalidades críticas
- **Permisos de asignación de turnos**: Tests que aseguran que solo usuarios autorizados pueden asignar voluntarios a turnos
- **Acceso al panel de administración**: Validación de restricciones de acceso según el rol del usuario

### Tipos de Tests
- **Tests unitarios**: Con Jest y React Testing Library
- **Tests E2E**: Con Playwright para flujos completos de usuario
- **Tests de integración**: Verificación de interacciones entre componentes

Para ejecutar los tests:
```bash
# Tests unitarios
npm test

# Tests E2E
npm run test:e2e
```

Más información en [tests/README.md](tests/README.md)

## Documentación adicional

Para más información sobre la configuración y uso del sistema, consulta los siguientes documentos:

- [Guía de instalación](docs/INSTALLATION.md)
- [Configuración de Firebase](docs/FIREBASE_CONFIG.md)
- [Esquema de base de datos](docs/DATABASE_SCHEMA.md)
- [Roles de usuario](docs/USER_ROLES.md)
- [API Documentation](docs/API_DOCS.md)
- [Guía de despliegue](docs/DEPLOYMENT.md)
- [Consideraciones de seguridad](docs/SECURITY.md)
- [Documentación de tests](tests/README.md)
- [Documentación de testing](docs/testing/README.md)
  - [Mocking de Firebase en Tests](docs/testing/firebase-mocking.md)
  - [Importancia de los Mocks en Tests Unitarios](docs/testing/importancia-mocks.md)
  - [Manejo de Timeouts en Tests de Jest](docs/testing/manejo-timeouts-jest.md)
  - [Configuración de Jest en el Proyecto](docs/testing/configuracion-jest.md)

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo LICENSE para más detalles.
