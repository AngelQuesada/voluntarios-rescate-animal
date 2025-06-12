import { NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ShiftAssignment } from '@/store/api/shiftsApi';

export async function GET() {
  try {
    const shiftsCollection = collection(db, 'shifts');
    const shiftsSnapshot = await getDocs(shiftsCollection);

    const shiftsData: {
      [day: string]: { [shift: string]: { uid: string }[] };
    } = {};

    shiftsSnapshot.forEach((shiftDoc) => {
      const [day, shift] = shiftDoc.id.split('-');
      const shiftAssignments = shiftDoc.data().assignments || [];

      if (!shiftsData[day]) shiftsData[day] = {};
      shiftsData[day][shift] = shiftAssignments.filter(
        (a: ShiftAssignment) => a && typeof a.uid === 'string'
      );
    });

    return NextResponse.json(shiftsData);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener los turnos' }, { status: 500 });
  }
}
