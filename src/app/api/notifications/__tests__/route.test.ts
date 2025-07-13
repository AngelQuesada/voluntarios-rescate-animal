import { POST, DELETE } from '@/app/api/notifications/route';
import { getAdminFirestore } from '@/lib/firebaseAdmin';

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200,
    })),
  },
}));

jest.mock('@/lib/firebaseAdmin', () => ({
  getAdminFirestore: jest.fn(),
}));

const mockDb = {
  collection: jest.fn().mockReturnThis(),
  doc: jest.fn().mockReturnThis(),
  update: jest.fn(),
  set: jest.fn(),
};

(getAdminFirestore as jest.Mock).mockReturnValue(mockDb);

describe('API /api/notifications', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should save FCM token successfully', async () => {
      const req = {
        json: async () => ({ token: 'test-token', userId: 'test-user' }),
      } as any;

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockDb.doc).toHaveBeenCalledWith('test-user');
      expect(mockDb.update).toHaveBeenCalledWith({ fcmToken: 'test-token' });
    });

    it('should return 400 if token or userId is missing', async () => {
      const req = {
        json: async () => ({ token: 'test-token' }),
      } as any;

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('El token y el ID de usuario son obligatorios');
    });
  });

  describe('DELETE', () => {
    it('should delete FCM token successfully', async () => {
      const req = {
        json: async () => ({ userId: 'test-user' }),
      } as any;

      const response = await DELETE(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockDb.doc).toHaveBeenCalledWith('test-user');
      expect(mockDb.update).toHaveBeenCalledWith({ fcmToken: null });
    });

    it('should return 400 if userId is missing', async () => {
      const req = {
        json: async () => ({}),
      } as any;

      const response = await DELETE(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('El ID de usuario es obligatorio');
    });
  });
});
