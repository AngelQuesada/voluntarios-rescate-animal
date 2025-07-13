
import { sendNotification } from '@/lib/notifications';
import { initAdmin } from '@/lib/firebaseAdmin';

jest.mock('@/lib/firebaseAdmin', () => ({
  initAdmin: jest.fn(),
}));

const mockMessaging = {
  send: jest.fn(),
};

(initAdmin as jest.Mock).mockReturnValue({ messaging: () => mockMessaging });

describe('sendNotification', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should send notification successfully', async () => {
    const fcmToken = 'test-token';
    const title = 'Test Title';
    const body = 'Test Body';

    await sendNotification(fcmToken, title, body);

    expect(mockMessaging.send).toHaveBeenCalledWith({
      token: fcmToken,
      notification: {
        title,
        body,
      },
    });
  });

  it('should handle error when sending notification', async () => {
    const fcmToken = 'test-token';
    const title = 'Test Title';
    const body = 'Test Body';
    const error = new Error('FCM error');
    mockMessaging.send.mockRejectedValue(error);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await sendNotification(fcmToken, title, body);

    expect(mockMessaging.send).toHaveBeenCalledWith({
      token: fcmToken,
      notification: {
        title,
        body,
      },
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error al enviar la notificación:', error);

    consoleErrorSpy.mockRestore();
  });
});
