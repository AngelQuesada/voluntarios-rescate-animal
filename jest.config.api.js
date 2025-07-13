// jest.config.api.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^tests/helpers/(.*)$': '<rootDir>/tests/helpers/$1',
    '^tests/helpers/__mocks__/(.*)$': '<rootDir>/tests/helpers/__mocks__/$1',
  },
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/tests/e2e/',
    '<rootDir>/src/components/',
    '<rootDir>/src/hooks/',
    '<rootDir>/src/store/',
  ],
  transformIgnorePatterns: ['/node_modules/(?!(jose|jwks-rsa|firebase-admin|next-auth)/)'],
  testMatch: [
    '<rootDir>/tests/unit/app/api/**/*.test.{ts,tsx}',
    '<rootDir>/src/app/api/**/*.test.{ts,tsx}',
  ],
};

module.exports = createJestConfig(customJestConfig);
