import type { Config } from '@jest/types'; // @jest/types ^29.5.0

/**
 * Root Jest configuration for backend microservices testing.
 * Provides shared test settings and configuration for core, data, AI, and gateway services.
 * Ensures consistent test execution, coverage reporting, and TypeScript support.
 * 
 * @returns {Config.InitialOptions} Complete Jest configuration object
 */
const jestConfig = (): Config.InitialOptions => {
  return {
    // Use ts-jest preset for TypeScript support
    preset: 'ts-jest', // ts-jest ^29.1.0

    // Configure Node.js as test environment
    testEnvironment: 'node',

    // Define test root directory for all services
    roots: ['<rootDir>/services'],

    // Configure test patterns for TypeScript files
    testMatch: [
      '**/__tests__/**/*.ts',
      '**/?(*.)+(spec|test).ts'
    ],

    // Set up TypeScript transformation
    transform: {
      '^.+\\.ts$': 'ts-jest'
    },

    // Configure module name mapping for all microservices
    moduleNameMapper: {
      '^@shared/(.*)$': '<rootDir>/services/shared/$1',
      '^@core/(.*)$': '<rootDir>/services/core/src/$1',
      '^@data/(.*)$': '<rootDir>/services/data/src/$1',
      '^@ai/(.*)$': '<rootDir>/services/ai/src/$1',
      '^@gateway/(.*)$': '<rootDir>/services/gateway/src/$1'
    },

    // Configure coverage collection settings
    collectCoverageFrom: [
      'services/**/*.ts',
      '!services/**/*.d.ts',
      '!services/**/index.ts',
      '!services/**/*.test.ts',
      '!services/**/*.spec.ts'
    ],

    // Set coverage output directory
    coverageDirectory: '<rootDir>/coverage',

    // Configure coverage reporters
    coverageReporters: ['text', 'lcov'],

    // Set minimum coverage thresholds
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    },

    // Configure setup files to run after environment setup
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

    // Set test timeout for performance validation (2s SLA + buffer)
    testTimeout: 10000,

    // Enable verbose output for detailed test reporting
    verbose: true,

    // Configure global TypeScript settings
    globals: {
      'ts-jest': {
        tsconfig: '<rootDir>/tsconfig.json'
      }
    }
  };
};

// Export the configuration
export default jestConfig();