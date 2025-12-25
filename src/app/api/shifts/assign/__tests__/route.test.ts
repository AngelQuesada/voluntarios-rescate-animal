import { POST } from '@/app/api/shifts/assign/route';
import * as notifications from '@/lib/notifications';
import admin from 'firebase-admin';
import { UserRoles } from '@/lib/constants';

// Define the mock function for verifyAuth
const mockVerifyAuth = jest.fn();

// Mock the auth-api module
jest.mock('@/lib/auth-api', () => ({
  verifyAuth: (...args: any[]) => mockVerifyAuth(...args),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200,
    })),
  },
}));

// Mock dependencies
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

// Firestore mock configuration
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
    // Mock user as Admin
    mockVerifyAuth.mockResolvedValue({
      user: { uid: 'admin-user' },
      userData: { roles: [UserRoles.ADMINISTRADOR] },
    });

    const req = {
      json: async () => ({
        dateKey: '2025-07-12',
        shiftKey: 'M',
        uid: 'user-with-token',
        action: 'add',
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
    // Mock user as Admin
    mockVerifyAuth.mockResolvedValue({
      user: { uid: 'admin-user' },
      userData: { roles: [UserRoles.ADMINISTRADOR] },
    });

    const req = {
      json: async () => ({
        dateKey: '2025-07-12',
        shiftKey: 'M',
        uid: 'admin-user',
        action: 'add',
      }),
    } as any;

    await POST(req);

    expect(sendNotificationSpy).not.toHaveBeenCalled();
  });

  it('should not send notification when it is not an admin assignment (self assignment)', async () => {
    // Mock user as Voluntario/Normal User
    mockVerifyAuth.mockResolvedValue({
      user: { uid: 'user-with-token' },
      userData: { roles: [UserRoles.VOLUNTARIO] },
    });

    const req = {
      json: async () => ({
        dateKey: '2025-07-12',
        shiftKey: 'M',
        uid: 'user-with-token',
        action: 'add',
      }),
    } as any;

    await POST(req);

    expect(sendNotificationSpy).not.toHaveBeenCalled();
  });
});
