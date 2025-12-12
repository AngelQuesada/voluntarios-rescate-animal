import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Interfaces
interface ShiftAssignment {
  uid: string;
}

interface SeedShift {
  id: string; // "YYYY-MM-DD_M"
  date: string;
  shift: 'M' | 'T';
  assignments: ShiftAssignment[];
}

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
    if (!privateKey || !process.env.FIREBASE_PROJECT_ID)
      throw new Error('Credenciales no encontradas');

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  } catch (error) {
    console.error('Error init Firebase:', error);
    process.exit(1);
  }
}

initializeFirebaseAdmin();
const db = admin.firestore();
const SHIFTS_FILE = path.join(__dirname, '../seeds/shifts.json');

async function importShifts() {
  if (!fs.existsSync(SHIFTS_FILE)) {
    console.error('No se encontró seeds/shifts.json');
    return;
  }

  const shifts: SeedShift[] = JSON.parse(fs.readFileSync(SHIFTS_FILE, 'utf8'));
  console.log(`Importando ${shifts.length} turnos...`);

  // Process in chunks to avoid batch limits
  const CHUNK_SIZE = 50;
  for (let i = 0; i < shifts.length; i += CHUNK_SIZE) {
    const chunk = shifts.slice(i, i + CHUNK_SIZE);
    const batch = db.batch();

    for (const shift of chunk) {
      const shiftRef = db.collection('shifts').doc(shift.id);

      // Update Shift Document
      batch.set(
        shiftRef,
        {
          date: shift.date,
          shift: shift.shift,
          assignments: shift.assignments, // Array of { uid: string }
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // Update User Documents (add shiftId to 'shifts' array)
      for (const assignment of shift.assignments) {
        const userRef = db.collection('users').doc(assignment.uid);
        batch.set(
          userRef,
          {
            shifts: admin.firestore.FieldValue.arrayUnion(shift.id),
          },
          { merge: true }
        );
      }
    }

    await batch.commit();
    console.log(`Procesado lote ${i / CHUNK_SIZE + 1} (${chunk.length} turnos)`);
  }

  console.log('Importación de turnos completada.');
}

importShifts()
  .then(() => console.log('Done.'))
  .catch((e) => console.error(e));
