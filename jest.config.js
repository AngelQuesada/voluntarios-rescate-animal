// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^tests/helpers/(.*)$': '<rootDir>/tests/helpers/$1',
    '^tests/helpers/__mocks__/(.*)$': '<rootDir>/tests/helpers/__mocks__/$1',
  },
  transform: {
    '^.+\.(ts|tsx|js|jsx)$': ['babel-jest', { presets: ['next/babel'] }],
    'node_modules/jose/.+\.(js|jsx|ts|tsx)$': 'babel-jest',
    'node_modules/jwks-rsa/.+\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!(jose|jwks-rsa|firebase-admin|next-auth)/)'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/lib/firebase.ts',
    '!src/lib/firebaseAdmin.ts',
    '!src/middleware.ts',
    '!src/app/layout.tsx',
    '!src/app/globals.css',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}'],
};

module.exports = createJestConfig(customJestConfig);
