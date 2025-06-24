/**
 * Configuración y gestión de la base de datos para tests E2E
 * Este archivo maneja la creación y limpieza de datos de prueba
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { User } from '../../src/types/common';

// Tipos para la configuración de testing
export interface TestUser {
  email: string;
  password: string;
  userData: Omit<User, 'id'> & { uid: string };
}

export interface TestShift {
  id?: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  maxVolunteers: number;
  assignedUsers: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestEnvironmentOptions {
  requireUsers?: boolean;
  requireShifts?: boolean;
  pastDays?: number;
  futureDays?: number;
  cleanupBeforeSetup?: boolean;
}

// Usuarios constantes para testing (nunca se borran)
// NOTA: Las UIDs se generarán automáticamente por Firebase Auth
export const TEST_USERS: Record<'ADMIN' | 'RESPONSABLE' | 'VOLUNTARIO', TestUser> = {
  ADMIN: {
    email: 'administradortest@voluntario.com',
    password: 'testing',
    userData: {
      uid: '', // Se asignará automáticamente por Firebase Auth
      username: 'admin_test',
      roles: [3], // Administrador
      name: 'Admin',
      lastname: 'Test',
      birthdate: '1990-01-01',
      email: 'administradortest@voluntario.com',
      phone: '+34600000001',
      job: 'Administrador de Sistema',
      location: 'Granada',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isEnabled: true,
    },
  },
  RESPONSABLE: {
    email: 'responsabletest@voluntario.com',
    password: 'testing',
    userData: {
      uid: '', // Se asignará automáticamente por Firebase Auth
      username: 'responsable_test',
      roles: [2], // Responsable
      name: 'Responsable',
      lastname: 'Test',
      birthdate: '1985-05-15',
      email: 'responsabletest@voluntario.com',
      phone: '+34600000002',
      job: 'Coordinador',
      location: 'Granada',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isEnabled: true,
    },
  },
  VOLUNTARIO: {
    email: 'voluntariotest@voluntario.com',
    password: 'testing',
    userData: {
      uid: '', // Se asignará automáticamente por Firebase Auth
      username: 'voluntario_test',
      roles: [1], // Voluntario
      name: 'Voluntario',
      lastname: 'Test',
      birthdate: '1995-12-20',
      email: 'voluntariotest@voluntario.com',
      phone: '+34600000003',
      job: 'Estudiante',
      location: 'Granada',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isEnabled: true,
    },
  },
};

// Usuarios variables adicionales para testing
// NOTA: Las UIDs se generarán automáticamente por Firebase Auth
export const VARIABLE_TEST_USERS: TestUser[] = [
  {
    email: 'voluntario1@test.com',
    password: 'testing',
    userData: {
      uid: '', // Se asignará automáticamente por Firebase Auth
      username: 'voluntario1_test',
      roles: [1],
      name: 'María',
      lastname: 'García',
      birthdate: '1992-03-10',
      email: 'voluntario1@test.com',
      phone: '+34600000004',
      job: 'Enfermera',
      location: 'Granada',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isEnabled: true,
    },
  },
  {
    email: 'voluntario2@test.com',
    password: 'testing',
    userData: {
      uid: '', // Se asignará automáticamente por Firebase Auth
      username: 'voluntario2_test',
      roles: [1],
      name: 'Carlos',
      lastname: 'López',
      birthdate: '1988-07-25',
      email: 'voluntario2@test.com',
      phone: '+34600000005',
      job: 'Veterinario',
      location: 'Granada',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isEnabled: true,
    },
  },
  {
    email: 'responsable2@test.com',
    password: 'testing',
    userData: {
      uid: 'test-resp2-uid',
      username: 'responsable2_test',
      roles: [2],
      name: 'Ana',
      lastname: 'Martínez',
      birthdate: '1983-11-08',
      email: 'responsable2@test.com',
      phone: '+34600000006',
      job: 'Coordinadora',
      location: 'Granada',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isEnabled: true,
    },
  },
  // Usuarios creados en user-crud.spec.ts
  {
    email: 'nuevo.voluntario@test.com',
    password: 'testing123',
    userData: {
      uid: 'nuevo-voluntario-uid',
      username: 'nuevo_voluntario',
      roles: [1], // Voluntario
      name: 'Nuevo',
      lastname: 'Voluntario',
      birthdate: '1990-01-01',
      email: 'nuevo.voluntario@test.com',
      phone: '+34600111111',
      job: 'Estudiante',
      location: 'Granada',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isEnabled: true,
    },
  },
  {
    email: 'nuevo.responsable@test.com',
    password: 'testing123',
    userData: {
      uid: 'nuevo-responsable-uid',
      username: 'nuevo_responsable',
      roles: [2], // Responsable
      name: 'Nuevo',
      lastname: 'Responsable',
      birthdate: '1985-01-01',
      email: 'nuevo.responsable@test.com',
      phone: '+34600222222',
      job: 'Coordinador',
      location: 'Granada',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isEnabled: true,
    },
  },
  {
    email: 'nuevo.admin@test.com',
    password: 'testing123',
    userData: {
      uid: 'nuevo-admin-uid',
      username: 'nuevo_admin',
      roles: [3], // Administrador
      name: 'Nuevo',
      lastname: 'Administrador',
      birthdate: '1980-01-01',
      email: 'nuevo.admin@test.com',
      phone: '+34600333333',
      job: 'Administrador',
      location: 'Granada',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isEnabled: true,
    },
  },
  // Usuarios creados en advanced-auth.spec.ts
  {
    email: 'disabled.user@test.com',
    password: 'testing123',
    userData: {
      uid: 'disabled-user-uid',
      username: 'disabled_user',
      roles: [1], // Voluntario
      name: 'Usuario',
      lastname: 'Deshabilitado',
      birthdate: '1990-01-01',
      email: 'disabled.user@test.com',
      phone: '+34600444444',
      job: 'Tester',
      location: 'Granada',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isEnabled: false,
    },
  },
  {
    email: 'failed.attempts@test.com',
    password: 'testing123',
    userData: {
      uid: 'failed-attempts-uid',
      username: 'failed_attempts',
      roles: [1], // Voluntario
      name: 'Usuario',
      lastname: 'Intentos Fallidos',
      birthdate: '1990-01-01',
      email: 'failed.attempts@test.com',
      phone: '+34600555555',
      job: 'Tester',
      location: 'Granada',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isEnabled: true,
    },
  },
];

let adminApp: any = null;
let adminDb: any = null;
let adminAuth: any = null;

/**
 * Inicializa Firebase Admin SDK para testing
 */
export async function initializeFirebaseAdmin(): Promise<boolean> {
  try {
    if (adminApp) {
      return true; // Ya inicializado
    }

    // Verificar que las variables de entorno estén configuradas
    const requiredEnvVars = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_PRIVATE_KEY',
      'FIREBASE_CLIENT_EMAIL',
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        console.error(`❌ Variable de entorno requerida no encontrada: ${envVar}`);
        return false;
      }
    }

    // Configurar credenciales de Firebase Admin
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    };

    // Inicializar Firebase Admin
    adminApp = initializeApp(
      {
        credential: cert(serviceAccount as any),
        projectId: process.env.FIREBASE_PROJECT_ID,
      },
      'test-admin'
    );

    adminDb = getFirestore(adminApp);
    adminAuth = getAuth(adminApp);

    console.log('✅ Firebase Admin SDK inicializado correctamente para testing');
    return true;
  } catch (error) {
    console.error('❌ Error al inicializar Firebase Admin SDK:', error);
    return false;
  }
}

/**
 * Crea usuarios constantes en Firebase Auth y Firestore
 */
export async function createConstantUsers(): Promise<boolean> {
  try {
    if (!adminAuth || !adminDb) {
      console.error('❌ Firebase Admin no está inicializado');
      return false;
    }

    console.log('👥 Creando usuarios constantes...');

    for (const [userType, testUser] of Object.entries(TEST_USERS)) {
      try {
        // Verificar si el usuario ya existe en Auth
        let userRecord;
        try {
          userRecord = await adminAuth.getUserByEmail(testUser.email);
          console.log(`ℹ️ Usuario ${userType} ya existe en Auth`);
        } catch (error: any) {
          if (error.code === 'auth/user-not-found') {
            // Crear usuario en Firebase Auth sin especificar UID (Firebase generará una automáticamente)
            userRecord = await adminAuth.createUser({
              email: testUser.email,
              password: testUser.password,
              displayName: `${testUser.userData.name} ${testUser.userData.lastname}`,
              emailVerified: true,
              disabled: false,
            });
            console.log(`✅ Usuario ${userType} creado en Auth con UID: ${userRecord.uid}`);
          } else {
            throw error;
          }
        }

        // Crear/actualizar documento en Firestore usando la UID generada por Firebase Auth
        const userDoc = adminDb.collection('users').doc(userRecord.uid);
        await userDoc.set(
          {
            ...testUser.userData,
            uid: userRecord.uid, // Usar la UID real generada por Firebase Auth
          },
          { merge: true }
        );

        console.log(`✅ Usuario ${userType} creado/actualizado en Firestore`);
      } catch (error) {
        console.error(`❌ Error al crear usuario ${userType}:`, error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Error al crear usuarios constantes:', error);
    return false;
  }
}

/**
 * Crea usuarios variables para testing
 */
export async function createVariableUsers(): Promise<boolean> {
  try {
    if (!adminAuth || !adminDb) {
      console.error('❌ Firebase Admin no está inicializado');
      return false;
    }

    console.log('👥 Creando usuarios variables...');

    for (const testUser of VARIABLE_TEST_USERS) {
      try {
        // Verificar si el usuario ya existe en Auth
        let userRecord;
        try {
          userRecord = await adminAuth.getUserByEmail(testUser.email);
          console.log(`ℹ️ Usuario variable ${testUser.userData.name} ya existe en Auth`);
        } catch (error: any) {
          if (error.code === 'auth/user-not-found') {
            // Crear usuario en Firebase Auth sin especificar UID (Firebase generará una automáticamente)
            userRecord = await adminAuth.createUser({
              email: testUser.email,
              password: testUser.password,
              displayName: `${testUser.userData.name} ${testUser.userData.lastname}`,
              emailVerified: true,
              disabled: false,
            });
            console.log(`✅ Usuario variable ${testUser.userData.name} creado en Auth con UID: ${userRecord.uid}`);
          } else {
            throw error;
          }
        }

        // Crear/actualizar documento en Firestore usando la UID generada por Firebase Auth
        const userDoc = adminDb.collection('users').doc(userRecord.uid);
        await userDoc.set({
          ...testUser.userData,
          uid: userRecord.uid, // Usar la UID real generada por Firebase Auth
        });

        console.log(`✅ Usuario variable ${testUser.userData.name} creado/actualizado en Firestore`);
      } catch (error: any) {
        console.error(`❌ Error al crear usuario variable ${testUser.userData.name}:`, error);
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Error al crear usuarios variables:', error);
    return false;
  }
}

/**
 * Crea turnos de prueba
 */
export async function createTestShifts(
  options: { pastDays?: number; futureDays?: number } = {}
): Promise<boolean> {
  try {
    if (!adminAuth || !adminDb) {
      console.error('❌ Firebase Admin no está inicializado');
      return false;
    }

    const { pastDays = 7, futureDays = 14 } = options;
    console.log(
      `📅 Creando turnos de prueba (${pastDays} días pasados, ${futureDays} días futuros)...`
    );

    // Obtener UIDs reales de los usuarios desde Firebase Auth
    let adminUid: string;
    let voluntarioUid: string;
    
    try {
      const adminRecord = await adminAuth.getUserByEmail(TEST_USERS.ADMIN.email);
      adminUid = adminRecord.uid;
      
      const voluntarioRecord = await adminAuth.getUserByEmail(TEST_USERS.VOLUNTARIO.email);
      voluntarioUid = voluntarioRecord.uid;
    } catch (error) {
      console.error('❌ Error al obtener UIDs de usuarios para crear turnos:', error);
      return false;
    }

    const shifts: TestShift[] = [];
    const today = new Date();

    // Crear turnos para días pasados
    for (let i = pastDays; i > 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      shifts.push({
        date: date.toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '13:00',
        location: 'Refugio Principal',
        maxVolunteers: 4,
        assignedUsers: [voluntarioUid],
        createdBy: adminUid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      shifts.push({
        date: date.toISOString().split('T')[0],
        startTime: '16:00',
        endTime: '20:00',
        location: 'Refugio Principal',
        maxVolunteers: 3,
        assignedUsers: [],
        createdBy: adminUid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Crear turnos para días futuros
    for (let i = 1; i <= futureDays; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);

      shifts.push({
        date: date.toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '13:00',
        location: 'Refugio Principal',
        maxVolunteers: 4,
        assignedUsers: i % 3 === 0 ? [voluntarioUid] : [],
        createdBy: adminUid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      shifts.push({
        date: date.toISOString().split('T')[0],
        startTime: '16:00',
        endTime: '20:00',
        location: 'Refugio Principal',
        maxVolunteers: 3,
        assignedUsers: [],
        createdBy: adminUid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Guardar turnos en Firestore
    const batch = adminDb.batch();
    shifts.forEach((shift) => {
      const shiftRef = adminDb.collection('shifts').doc();
      batch.set(shiftRef, shift);
    });

    await batch.commit();
    console.log(`✅ ${shifts.length} turnos de prueba creados`);
    return true;
  } catch (error) {
    console.error('❌ Error al crear turnos de prueba:', error);
    return false;
  }
}

/**
 * Limpia datos variables de la base de datos
 */
export async function cleanupVariableData(): Promise<boolean> {
  try {
    if (!adminAuth || !adminDb) {
      console.error('❌ Firebase Admin no está inicializado');
      return false;
    }

    console.log('🧹 Limpiando datos variables...');

    // Eliminar usuarios variables de Auth y Firestore
    for (const testUser of VARIABLE_TEST_USERS) {
      try {
        // Buscar usuario por email para obtener la UID real
        let userRecord;
        try {
          userRecord = await adminAuth.getUserByEmail(testUser.email);
          
          // Eliminar de Firebase Auth
          await adminAuth.deleteUser(userRecord.uid);
          console.log(`✅ Usuario variable ${testUser.userData.name} eliminado de Auth`);
          
          // Eliminar documento de Firestore usando la UID real
          await adminDb.collection('users').doc(userRecord.uid).delete();
          console.log(`✅ Usuario variable ${testUser.userData.name} eliminado de Firestore`);
        } catch (error: any) {
          if (error.code === 'auth/user-not-found') {
            console.log(`ℹ️ Usuario variable ${testUser.userData.name} no encontrado en Auth`);
          } else {
            console.error(`❌ Error al eliminar usuario ${testUser.userData.name}:`, error);
          }
        }
      } catch (error) {
        console.error(
          `❌ Error al procesar usuario variable ${testUser.userData.name}:`,
          error
        );
      }
    }

    // Eliminar todos los turnos
    const shiftsSnapshot = await adminDb.collection('shifts').get();
    const batch = adminDb.batch();
    shiftsSnapshot.docs.forEach((doc: any) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`✅ ${shiftsSnapshot.size} turnos eliminados`);

    return true;
  } catch (error) {
    console.error('❌ Error al limpiar datos variables:', error);
    return false;
  }
}

/**
 * Limpia todos los datos de testing (incluyendo constantes)
 */
export async function cleanupAllTestData(): Promise<boolean> {
  try {
    if (!adminAuth || !adminDb) {
      console.error('❌ Firebase Admin no está inicializado');
      return false;
    }

    console.log('🧹 Limpiando todos los datos de testing...');

    // Limpiar datos variables primero
    await cleanupVariableData();

    // Eliminar usuarios constantes
    for (const [userType, testUser] of Object.entries(TEST_USERS)) {
      try {
        // Buscar usuario por email para obtener la UID real
        let userRecord;
        try {
          userRecord = await adminAuth.getUserByEmail(testUser.email);
          
          // Eliminar de Firebase Auth
          await adminAuth.deleteUser(userRecord.uid);
          
          // Eliminar documento de Firestore usando la UID real
          await adminDb.collection('users').doc(userRecord.uid).delete();
          console.log(`✅ Usuario constante ${userType} eliminado`);
        } catch (error: any) {
          if (error.code === 'auth/user-not-found') {
            console.log(`ℹ️ Usuario constante ${userType} no encontrado`);
          } else {
            console.error(`❌ Error al eliminar usuario constante ${userType}:`, error);
          }
        }
      } catch (error) {
        console.error(`❌ Error al procesar usuario constante ${userType}:`, error);
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Error al limpiar todos los datos de testing:', error);
    return false;
  }
}

/**
 * Limpia datos condicionalmente basado en variables de entorno
 */
export async function cleanupTestDataConditional(): Promise<boolean> {
  if (process.env.AUTO_CLEANUP_TEST_DATA === 'true') {
    return await cleanupVariableData();
  }
  console.log('ℹ️ Limpieza automática desactivada');
  return true;
}
