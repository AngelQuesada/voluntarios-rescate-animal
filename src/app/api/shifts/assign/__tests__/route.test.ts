import { POST } from '@/app/api/shifts/assign/route';
import * as notifications from '@/lib/notifications';
import admin from 'firebase-admin';

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200,
    })),
  },
}));

// Mockear las dependencias
jest.mock('@/lib/notifications', () => ({
  sendNotification: jest.fn(),
}));

jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(),
  },
  firestore: Object.assign(jest.fn(), {
    FieldValue: {
      arrayUnion: jest.fn(),
      arrayRemove: jest.fn(),
      serverTimestamp: jest.fn(),
    },
  }),
}));

// Configuración del mock de firestore antes de las pruebas
const mockFirestore = {
  collection: jest.fn().mockReturnThis(),
  doc: jest.fn((id) => ({
    get: jest.fn(() => {
      if (id === 'user-with-token') {
        return Promise.resolve({ exists: true, data: () => ({ fcmToken: 'user-fcm-token' }) });
      } else if (id.startsWith('2025-07-12')) {
        return Promise.resolve({ exists: true, data: () => ({ date: '2025-07-12' }) });
      }
      return Promise.resolve({ exists: false, data: () => ({}) });
    }),
    set: jest.fn(),
    update: jest.fn(),
  })),
};

(admin.firestore as jest.Mock).mockReturnValue(mockFirestore);

describe('API /api/shifts/assign', () => {
  const sendNotificationSpy = jest.spyOn(notifications, 'sendNotification');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send notification when admin assigns shift to another user', async () => {
    const req = {
      json: async () => ({
        dateKey: '2025-07-12',
        shiftKey: 'M',
        uid: 'user-with-token',
        action: 'add',
        performedByUid: 'admin-user',
        isAdminAssignment: true,
      }),
    } as any;

    await POST(req);

    expect(sendNotificationSpy).toHaveBeenCalledTimes(1);
    expect(sendNotificationSpy).toHaveBeenCalledWith(
      'user-fcm-token',
      'Se te ha asignado un turno nuevo',
      expect.stringContaining('Tu nuevo turno es el')
    );
  });

  it('should not send notification when admin assigns shift to themselves', async () => {
    const req = {
      json: async () => ({
        dateKey: '2025-07-12',
        shiftKey: 'M',
        uid: 'admin-user',
        action: 'add',
        performedByUid: 'admin-user',
        isAdminAssignment: true,
      }),
    } as any;

    await POST(req);

    expect(sendNotificationSpy).not.toHaveBeenCalled();
  });

  it('should not send notification when it is not an admin assignment', async () => {
    const req = {
      json: async () => ({
        dateKey: '2025-07-12',
        shiftKey: 'M',
        uid: 'user-with-token',
        action: 'add',
        performedByUid: 'user-with-token',
        isAdminAssignment: false,
      }),
    } as any;

    await POST(req);

    expect(sendNotificationSpy).not.toHaveBeenCalled();
  });
});
