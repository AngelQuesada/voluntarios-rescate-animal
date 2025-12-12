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
      // Fallback for when running via script without explicit env vars sometimes
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
    // When there are no documents left, we are done
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  // Recurse on the next process tick, to avoid
  // exploding the stack.
  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}

async function cleanAuthUsers() {
  console.log('Limpiando usuarios de Firebase Auth...');
  let nextPageToken;
  let count = 0;
  do {
    const result = await auth.listUsers(1000, nextPageToken);
    const uids = result.users.map((user) => user.uid);
    if (uids.length > 0) {
      await auth.deleteUsers(uids);
      count += uids.length;
      console.log(`Eliminados ${uids.length} usuarios de Auth.`);
    }
    nextPageToken = result.pageToken;
  } while (nextPageToken);
  console.log(`Total usuarios eliminados de Auth: ${count}`);
}

async function cleanDatabase() {
  try {
    console.log('--- Iniciando limpieza de Base de Datos ---');

    // 1. Clean Firestore Collections
    for (const collectionName of COLLECTIONS_TO_CLEAN) {
      console.log(`Limpiando colección: ${collectionName}...`);
      await deleteCollection(collectionName);
      console.log(`Colección ${collectionName} limpiada.`);
    }

    // 2. Clean Auth Users
    await cleanAuthUsers();

    // 3. Verification
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
