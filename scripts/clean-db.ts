import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Initialize Firebase Admin
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) return;

  try {
    const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
      return;
    }

    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!privateKey || !process.env.FIREBASE_PROJECT_ID) {
      // Si no se encuentra el service account o las variables de entorno
      throw new Error('No Service Account or Env Vars found');
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    process.exit(1);
  }
}

initializeFirebaseAdmin();
const db = admin.firestore();
const auth = admin.auth();

const COLLECTIONS_TO_CLEAN = ['users', 'shifts', 'userActions', 'settings'];

async function deleteCollection(collectionPath: string, batchSize: number = 50) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(
  db: admin.firestore.Firestore,
  query: admin.firestore.Query,
  resolve: (value?: unknown) => void
) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  // Recursividad para borrar los documentos de la colección
  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}

async function cleanAuthUsers() {
  console.log('Limpiando usuarios de Firebase Auth...');
  let result: admin.auth.ListUsersResult;
  let count = 0;

  do {
    // Los borramos de 100 en 100 para no sobrecargar el servidor
    result = await auth.listUsers(100);
    const uids = result.users.map((user) => user.uid);

    if (uids.length > 0) {
      const deleteResult = await auth.deleteUsers(uids);
      count += uids.length;
      console.log(
        `Eliminados ${deleteResult.successCount} usuarios de Auth (${deleteResult.failureCount} fallos).`
      );

      if (deleteResult.failureCount > 0) {
        deleteResult.errors.forEach((err) => {
          console.error(`Error eliminando usuario: ${JSON.stringify(err)}`);
        });
      }
      // Añadimos un pequeño limite para permitir la propagación y reiniciar rate limits
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  } while (result.users.length > 0);

  console.log(`Total usuarios eliminados de Auth: ${count}`);
}

async function cleanDatabase() {
  try {
    console.log('--- Iniciando limpieza de Base de Datos ---');

    // 1. Borramos colecciones firestore
    for (const collectionName of COLLECTIONS_TO_CLEAN) {
      console.log(`Limpiando colección: ${collectionName}...`);
      await deleteCollection(collectionName);
      console.log(`Colección ${collectionName} limpiada.`);
    }

    // 2. Borramos usuarios de Firebase Auth
    await cleanAuthUsers();

    // 3. Verificación
    console.log('--- Verificando limpieza ---');
    let allClean = true;
    for (const collectionName of COLLECTIONS_TO_CLEAN) {
      const snap = await db.collection(collectionName).limit(1).get();
      if (!snap.empty) {
        console.error(`ERROR: La colección ${collectionName} NO está vacía.`);
        allClean = false;
      } else {
        console.log(`OK: La colección ${collectionName} está vacía.`);
      }
    }

    const key = (await auth.listUsers(1)).users;
    if (key.length > 0) {
      console.error(`ERROR: Aún quedan usuarios en Auth.`);
      allClean = false;
    } else {
      console.log(`OK: No hay usuarios en Auth.`);
    }

    if (allClean) {
      console.log('✅ Base de datos limpiada correctamente.');
    } else {
      console.error('❌ La limpieza falló en algunos elementos.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error durante la limpieza:', error);
    process.exit(1);
  }
}

cleanDatabase();
