import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Initialize Firebase Admin (Reusable)
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
    if (privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

initializeFirebaseAdmin();
const db = admin.firestore();

const USERS_FILE = path.join(__dirname, '../seeds/users.json');
const SHIFTS_FILE = path.join(__dirname, '../seeds/shifts.json');

async function verifyData() {
  console.log('--- Verificando Datos Insertados ---');

  try {
    // 1. Verify Users
    if (fs.existsSync(USERS_FILE)) {
      const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      const usersSnap = await db.collection('users').count().get();
      const dbUserCount = usersSnap.data().count;

      console.log(`Usuarios en JSON: ${users.length}`);
      console.log(`Usuarios en Firestore: ${dbUserCount}`);

      if (users.length === dbUserCount) {
        console.log('✅ Conteo de usuarios coincide.');
      } else {
        console.warn('⚠️ El conteo de usuarios NO coincide.');
      }

      // Check a random user
      if (users.length > 0) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const doc = await db.collection('users').doc(randomUser.uid).get();
        if (doc.exists && doc.data()?.email === randomUser.email) {
          console.log(`✅ Usuario de prueba verificado (${randomUser.email}).`);
        } else {
          console.error(`❌ Falló la verificación del usuario ${randomUser.email}`);
        }
      }
    } else {
      console.warn('No se encontró seeds/users.json');
    }

    // 2. Verify Shifts
    if (fs.existsSync(SHIFTS_FILE)) {
      const shifts = JSON.parse(fs.readFileSync(SHIFTS_FILE, 'utf8'));
      const shiftsSnap = await db.collection('shifts').count().get();
      const dbShiftCount = shiftsSnap.data().count;

      console.log(`Turnos en JSON: ${shifts.length}`);
      console.log(`Turnos en Firestore: ${dbShiftCount}`);

      if (shifts.length === dbShiftCount) {
        console.log('✅ Conteo de turnos coincide.');
      } else {
        console.warn(
          `⚠️ El conteo de turnos NO coincide. (JSON: ${shifts.length}, DB: ${dbShiftCount})`
        );
      }

      // Check a random shift
      if (shifts.length > 0) {
        const randomShift = shifts[Math.floor(Math.random() * shifts.length)];
        const doc = await db.collection('shifts').doc(randomShift.id).get();
        // Check exact match of assignments count
        const data = doc.data();
        if (
          doc.exists &&
          data?.date === randomShift.date &&
          data?.assignments?.length === randomShift.assignments.length
        ) {
          console.log(
            `✅ Turno de prueba verificado (${randomShift.id}). Asignaciones: ${data?.assignments?.length}`
          );
        } else {
          console.error(`❌ Falló la verificación del turno ${randomShift.id}`);
        }
      }
    } else {
      console.warn('No se encontró seeds/shifts.json');
    }
  } catch (error) {
    console.error('Error durante la verificación:', error);
    process.exit(1);
  }
}

verifyData().then(() => console.log('Verificación completada.'));
