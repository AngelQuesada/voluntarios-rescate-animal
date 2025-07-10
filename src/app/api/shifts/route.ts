import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { ShiftAssignment } from '@/store/api/shiftsApi';

// Inicializar Firebase Admin si no está inicializado
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
}

export async function GET() {
  try {
    const db = admin.firestore();
    const shiftsSnapshot = await db.collection('shifts').get();

    const shiftsArray: Array<{
      id: string;
      date: string;
      shift: string;
      assignments: ShiftAssignment[];
    }> = [];

    shiftsSnapshot.docs.forEach((shiftDoc) => {
      const data = shiftDoc.data();
      const [dateKey, shiftKey] = shiftDoc.id.split('_');

      if (dateKey && shiftKey) {
        shiftsArray.push({
          id: shiftDoc.id,
          date: data.date || dateKey,
          shift: data.shift || shiftKey,
          assignments: data.assignments || [],
        });
      }
    });

    return NextResponse.json(shiftsArray);
  } catch (error) {
    console.error('Error fetching shifts:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener los turnos',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
