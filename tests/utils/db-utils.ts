import { getAdminFirestore, getAdminAuth } from '../../src/lib/firebaseAdmin';

export async function clearShiftsCollection() {
  const db = getAdminFirestore();
  const shiftsRef = db.collection('shifts');
  const snapshot = await shiftsRef.get();

  if (snapshot.empty) {
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
}

export interface ShiftSeedData {
  date: string;
  area: 'Mañana' | 'Tarde';
  assignments?: { uid: string }[];
}

export async function seedShift(shiftData: ShiftSeedData) {
  const db = getAdminFirestore();
  const shiftKey = shiftData.area === 'Mañana' ? 'M' : 'T';
  const docId = `${shiftData.date}_${shiftKey}`;

  await db
    .collection('shifts')
    .doc(docId)
    .set(
      {
        assignments: shiftData.assignments || [],
        date: shiftData.date,
        created_at: new Date(),
      },
      { merge: true }
    );
  return docId;
}

export async function deleteShift(shiftId: string) {
  const db = getAdminFirestore();
  await db.collection('shifts').doc(shiftId).delete();
}

export async function getUserIdByEmail(email: string): Promise<string> {
  const auth = getAdminAuth();
  const user = await auth.getUserByEmail(email);
  return user.uid;
}
