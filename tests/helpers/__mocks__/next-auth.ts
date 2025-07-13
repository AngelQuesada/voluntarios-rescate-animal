const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'voluntario',
  },
  expires: '2025-12-31',
};

const mockUseSession = jest.fn(() => ({
  data: mockSession,
  status: 'authenticated',
  update: jest.fn(),
}));

const mockSignIn = jest.fn(() => Promise.resolve({ ok: true, error: null }));

const mockSignOut = jest.fn(() => Promise.resolve());
const mockGetSession = jest.fn(() => Promise.resolve(mockSession));

module.exports = {
  useSession: mockUseSession,
  signIn: mockSignIn,
  signOut: mockSignOut,
  getSession: mockGetSession,
  getProviders: jest.fn(() => Promise.resolve({})),
  getCsrfToken: jest.fn(() => Promise.resolve('mock-csrf-token')),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
};
