// Mock completo de Firebase
const mockFirestore = {
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({
        exists: true,
        data: () => ({ id: 'test-id', name: 'Test Data' }),
      })),
      set: jest.fn(() => Promise.resolve()),
      update: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve()),
      onSnapshot: jest.fn(),
    })),
    add: jest.fn(() => Promise.resolve({ id: 'new-doc-id' })),
    where: jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({
        docs: [
          {
            id: 'doc1',
            data: () => ({ name: 'Test 1' }),
          },
          {
            id: 'doc2',
            data: () => ({ name: 'Test 2' }),
          },
        ],
      })),
      onSnapshot: jest.fn(),
    })),
    orderBy: jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({ docs: [] })),
      onSnapshot: jest.fn(),
    })),
    limit: jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({ docs: [] })),
    })),
    get: jest.fn(() => Promise.resolve({ docs: [] })),
  })),
};

const mockAuth = {
  currentUser: null,
  signInWithEmailAndPassword: jest.fn(() => 
    Promise.resolve({ user: { uid: 'test-uid', email: 'test@example.com' } })
  ),
  signOut: jest.fn(() => Promise.resolve()),
  onAuthStateChanged: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(() => 
    Promise.resolve({ user: { uid: 'new-uid', email: 'new@example.com' } })
  ),
};

const mockStorage = {
  ref: jest.fn(() => ({
    child: jest.fn(() => ({
      put: jest.fn(() => Promise.resolve({
        ref: {
          getDownloadURL: jest.fn(() => Promise.resolve('https://example.com/image.jpg')),
        },
      })),
      getDownloadURL: jest.fn(() => Promise.resolve('https://example.com/image.jpg')),
      delete: jest.fn(() => Promise.resolve()),
    })),
  })),
};

module.exports = {
  db: mockFirestore,
  auth: mockAuth,
  storage: mockStorage,
  initializeApp: jest.fn(),
  getFirestore: jest.fn(() => mockFirestore),
  getAuth: jest.fn(() => mockAuth),
  getStorage: jest.fn(() => mockStorage),
};