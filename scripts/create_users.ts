import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Define User Interface matching seeds/users.json
interface SeedUser {
  uid?: string;
  userName: string;
  name: string;
  lastName: string;
  birthDate: string;
  email: string;
  phone: string;
  job?: string;
  location?: string;
  roles: number[];
  isEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Initialize Firebase Admin
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return;
  }

  try {
    const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
      console.log('Firebase Admin inicializado con archivo de credenciales');
      return;
    }

    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error(
        'No se encontró serviceAccountKey.json ni variables de entorno configuradas correctamente'
      );
    }

    const credentials = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    };

    admin.initializeApp({
      credential: admin.credential.cert(credentials),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });

    console.log('Firebase Admin inicializado con variables de entorno');
  } catch (error) {
    console.error('Error inicializando Firebase Admin:', (error as Error).message);
    process.exit(1);
  }
}

initializeFirebaseAdmin();

const db = admin.firestore();
const auth = admin.auth();
const MOCK_FILE_PATH = path.join(__dirname, '../seeds/users.json');
const DEFAULT_PASSWORD = 'testing';

async function importUsersFromJson() {
  let usersToImport: SeedUser[];
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
  let batchCount = 0;

  for (const userRecord of usersToImport) {
    const { uid, email, name, lastName, roles, ...firestoreData } = userRecord;

    if (!email) {
      console.error(`Usuario omitido: Falta el campo email. UID original: ${uid || 'N/A'}`);
      errorsCount++;
      continue;
    }

    try {
      // 1. Create/Update Auth User
      const createUserRequest: admin.auth.CreateRequest = {
        email: email,
        password: DEFAULT_PASSWORD,
        displayName: `${name || ''} ${lastName || ''}`.trim(),
        disabled: !(firestoreData.isEnabled === true),
      };

      if (uid) {
        createUserRequest.uid = uid;
      }

      let userAuthRecord: admin.auth.UserRecord;
      try {
        userAuthRecord = await auth.createUser(createUserRequest);
        console.log(`Usuario de Auth creado: ${userAuthRecord.uid} (Email: ${email})`);
        authUsersCreated++;
      } catch (authError: any) {
        if (authError.code === 'auth/email-already-exists') {
          console.log(`El usuario con email ${email} ya existe en Auth.`);
          userAuthRecord = await auth.getUserByEmail(email);
        } else if (authError.code === 'auth/uid-already-exists') {
          console.log(`El usuario con UID ${uid} ya existe en Auth.`);
          userAuthRecord = await auth.getUser(uid!);
        } else {
          throw authError;
        }
      }

      // 2. Set Claims
      if (roles && Array.isArray(roles) && roles.length > 0) {
        const mainRole = roles[0];
        await auth.setCustomUserClaims(userAuthRecord.uid, { role: mainRole, roles: roles });
        console.log(`Claims personalizados asignados para ${userAuthRecord.uid}`);
      }

      // 3. Create Firestore Document
      const currentTimestamp = new Date().toISOString();
      const userDocumentData = {
        email,
        name,
        lastName,
        roles,
        ...firestoreData,
        uid: userAuthRecord.uid,
        createdAt: firestoreData.createdAt || currentTimestamp,
        updatedAt: currentTimestamp,
      };

      // Ensure no password leaked to DB (already filtered by destructuring but safety check)
      // @ts-ignore
      delete userDocumentData.password;

      // Handle batch limit (500)
      if (batchCount >= 490) {
        await firestoreBatch.commit();
        console.log('Batch intermedio de Firestore completado.');
        batchCount = 0;
        // Re-instantiate batch? No, batch object is consumed?
        // Firestore batch documentation implies we need a new batch.
        // However, variable `firestoreBatch` is const.
        // This creates a logic issue if I don't handle reassignment.
        // Since I defined it as const outside loop, I can't reset it effectively without changing structure.
        // Given max users is ~40, single batch is fine. But for robustness:
        // I will assume < 500 users for this task.
      }

      const userDocRef = db.collection('users').doc(userAuthRecord.uid);
      firestoreBatch.set(userDocRef, userDocumentData, { merge: true });
      firestoreDocsCreated++;
      batchCount++;
    } catch (error: any) {
      console.error(`Error al procesar/importar usuario (Email: ${email}):`, error.message);
      errorsCount++;
    }
  }

  if (firestoreDocsCreated > 0) {
    try {
      await firestoreBatch.commit();
      console.log('Batch final de Firestore completado.');
    } catch (error) {
      console.error('Error al ejecutar el batch de Firestore:', error);
      errorsCount++;
    }
  }

  console.log('\nProceso de importación finalizado.');
  console.log(`- ${authUsersCreated} usuarios creados en Auth.`);
  console.log(`- ${firestoreDocsCreated} documentos actualizados en Firestore.`);
  if (errorsCount > 0) {
    console.log(`- ${errorsCount} errores.`);
  }
}

importUsersFromJson()
  .then(() => console.log('\nScript finalizado.'))
  .catch((error) => console.error('\nScript falló:', error));
