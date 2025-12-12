const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Función para inicializar Firebase Admin (similar a la aplicación web)
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return; // Ya está inicializado
  }

  try {
    // En desarrollo local, intentar cargar desde archivo primero
    const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');

    if (fs.existsSync(serviceAccountPath)) {
      // Usar archivo de credenciales en desarrollo local
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
      console.log('Firebase Admin inicializado con archivo de credenciales');
      return;
    }

    // Si no hay archivo, usar variables de entorno
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error(
        'No se encontró serviceAccountKey.json ni variables de entorno configuradas correctamente'
      );
    }

    const credentials = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: privateKey,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
      universe_domain: 'googleapis.com',
    };

    admin.initializeApp({
      credential: admin.credential.cert(credentials),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });

    console.log('Firebase Admin inicializado con variables de entorno');
  } catch (error) {
    console.error('Error inicializando Firebase Admin:', error.message);
    console.error('\nAsegúrate de tener:');
    console.error('1. El archivo serviceAccountKey.json en la raíz del proyecto, O');
    console.error('2. Las variables de entorno FIREBASE_* configuradas correctamente');
    process.exit(1);
  }
}

// Inicializar Firebase Admin
initializeFirebaseAdmin();

const db = admin.firestore();
const auth = admin.auth();
const MOCK_FILE_PATH = path.join(__dirname, '../mocks/users.json');
const DEFAULT_PASSWORD = 'testing';

async function importUsersFromJson() {
  let usersToImport;
  try {
    const fileContents = fs.readFileSync(MOCK_FILE_PATH, 'utf8');
    usersToImport = JSON.parse(fileContents);
  } catch (error) {
    console.error(`Error al leer o parsear el archivo ${MOCK_FILE_PATH}:`, error);
    return;
  }

  if (!usersToImport || usersToImport.length === 0) {
    console.log('No se encontraron usuarios en el archivo JSON para importar.');
    return;
  }

  console.log(`Importando ${usersToImport.length} usuarios desde ${MOCK_FILE_PATH}...`);

  const firestoreBatch = db.batch();
  let authUsersCreated = 0;
  let firestoreDocsCreated = 0;
  let errorsCount = 0;

  for (const userRecord of usersToImport) {
    const { uid, email, name, lastName, roles, ...firestoreData } = userRecord;

    if (!email) {
      console.error(`Usuario omitido: Falta el campo email. UID original: ${uid || 'N/A'}`);
      errorsCount++;
      continue;
    }

    let userAuthRecord;
    try {
      // Crear usuario en Firebase Authentication
      const createUserRequest = {
        email: email,
        password: DEFAULT_PASSWORD,
        displayName: `${name || ''} ${lastName || ''}`.trim(),
        disabled: !(firestoreData.isEnabled === true), // Si isEnabled no es true, se deshabilita
      };
      // Si el UID original existe en el JSON, intentamos usarlo.
      // Firebase Auth permite especificar el UID durante la creación.
      if (uid) {
        createUserRequest.uid = uid;
      }

      userAuthRecord = await auth.createUser(createUserRequest);
      console.log(`Usuario de Auth creado: ${userAuthRecord.uid} (Email: ${email})`);
      authUsersCreated++;

      // Asignar claims (roles) si existen
      if (roles && Array.isArray(roles) && roles.length > 0) {
        // Asumimos que UserRoles.VOLUNTARIO es un valor numérico como en tu API create-user
        // Si los roles en el JSON no son numéricos, necesitarás mapearlos aquí.
        const mainRole = roles[0]; // O alguna lógica para determinar el rol principal
        await auth.setCustomUserClaims(userAuthRecord.uid, { role: mainRole, roles: roles });
        console.log(`Claims personalizados (roles) asignados para ${userAuthRecord.uid}`);
      }

      // Preparar datos para Firestore (sin el email si ya está en Auth, y sin uid porque es el ID del doc)
      const currentTimestamp = new Date().toISOString();
      const userDocumentData = {
        email, // Guardamos el email también en Firestore por consistencia con tu estructura User
        name,
        lastName,
        roles,
        ...firestoreData, // El resto de los campos, incluyendo isEnabled
        uid: userAuthRecord.uid, // Aseguramos que el uid en Firestore coincida con el de Auth
        createdAt: firestoreData.createdAt || currentTimestamp,
        updatedAt: currentTimestamp,
      };

      // Eliminar campos que no queremos duplicar o que no pertenecen a la colección users
      delete userDocumentData.password; // No guardar contraseñas en Firestore

      const userDocRef = db.collection('users').doc(userAuthRecord.uid);
      firestoreBatch.set(userDocRef, userDocumentData);
      firestoreDocsCreated++;
    } catch (error) {
      console.error(
        `Error al procesar/importar usuario (Email: ${email}, UID original: ${uid || 'N/A'}):`,
        error.message
      );
      errorsCount++;
      // Si la creación en Auth falló, no intentamos crear en Firestore para este usuario.
      // Si el error fue por UID duplicado y quieres actualizar, la lógica sería más compleja.
    }
  }

  if (firestoreDocsCreated > 0) {
    try {
      await firestoreBatch.commit();
      console.log('Batch de Firestore completado.');
    } catch (error) {
      console.error('Error al ejecutar el batch de Firestore:', error);
      errorsCount++; // Contar esto como un error adicional
    }
  }

  console.log('\nProceso de importación finalizado.');
  console.log(`- ${authUsersCreated} usuarios creados en Firebase Authentication.`);
  console.log(`- ${firestoreDocsCreated} documentos de usuario creados/actualizados en Firestore.`);
  if (errorsCount > 0) {
    console.log(`- ${errorsCount} errores durante la importación.`);
  }
}

importUsersFromJson()
  .then(() => {
    console.log('\nScript de importación finalizado.');
  })
  .catch((error) => {
    console.error('\nEl script de importación falló con un error general:', error);
  });
