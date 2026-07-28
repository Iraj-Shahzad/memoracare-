import type { Config } from 'jest';

// ts-jest reads tsconfig.json; type-checking is kept lenient for tests too.
const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: ['**/tests/**/*.test.ts'],
  testTimeout: 30000,
  clearMocks: true,
};

export default config;
