import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebaseAdmin';
import { UserRoles } from '@/lib/constants';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password = UserRoles.VOLUNTARIO, roles = [], ...userData } = req.body;

    // Asegurarse de que el usuario tenga al menos el rol de Voluntario
    const finalRoles = Array.isArray(roles) ? [...roles] : [];
    if (!finalRoles.includes(UserRoles.VOLUNTARIO)) {
      finalRoles.push(UserRoles.VOLUNTARIO);
    }

    // Usar el primer rol o Voluntario como rol principal (para compatibilidad)
    const mainRole = finalRoles[0] || UserRoles.VOLUNTARIO;

    // Crear usuario en Authentication
    const userRecord = await getAdminAuth().createUser({
      email,
      password,
      displayName: `${userData.name} ${userData.lastName}`,
    });

    // Asignar claims basados en los roles
    await getAdminAuth().setCustomUserClaims(userRecord.uid, {
      role: mainRole,
      roles: finalRoles,
    });

    // Guardar usuario en Firestore
    const currentTimestamp = new Date().toISOString();
    const userDocumentData = {
      email,
      userName: userData.userName || '',
      name: userData.name || '',
      lastName: userData.lastName || '',
      birthDate: userData.birthDate || '',
      phone: userData.phone || '',
      job: userData.job || '',
      location: userData.location || '',
      roles: finalRoles,
      isEnabled: userData.isEnabled !== undefined ? userData.isEnabled : true,
      createdAt: currentTimestamp,
      updatedAt: currentTimestamp,
    };

    await getAdminFirestore().collection('users').doc(userRecord.uid).set(userDocumentData);

    // Retornar el usuario completo
    return res.status(200).json({
      uid: userRecord.uid,
      ...userDocumentData,
    });
  } catch (error: Error | unknown) {
    console.error('Error creating user:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Error creando usuario',
      code: error instanceof Error ? 'unknown' : 'Codigo de error desconocido',
    });
  }
}
