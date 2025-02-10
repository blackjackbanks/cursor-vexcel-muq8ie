import type { Config } from '@jest/types';

/**
 * Creates and exports the Jest configuration for the Excel Add-in web application
 * Version: Jest 29.0.0+
 * Purpose: Configure comprehensive test environment for TypeScript and React components
 */
const jestConfig: Config.InitialOptions = {
  // Test discovery and execution roots
  roots: ['<rootDir>/src', '<rootDir>/tests'],

  // Configure jsdom test environment for React component testing
  testEnvironment: 'jsdom',

  // Setup files to run before tests
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts',
    '<rootDir>/tests/mocks/excel.mock.ts',
    '<rootDir>/tests/mocks/office.mock.ts'
  ],

  // Test timeout threshold (10 seconds)
  testTimeout: 10000,

  // Module resolution and path aliases matching tsconfig.json
  moduleNameMapper: {
    // Internal path aliases
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@pages/(.*)$': '<rootDir>/src/pages/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@interfaces/(.*)$': '<rootDir>/src/interfaces/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@constants/(.*)$': '<rootDir>/src/constants/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@ai/(.*)$': '<rootDir>/src/ai/$1',
    '^@formulas/(.*)$': '<rootDir>/src/formulas/$1',

    // Asset mocks
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/tests/mocks/fileMock.js'
  },

  // File transformations
  transform: {
    // TypeScript and TSX files
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
        isolatedModules: true
      }
    ],
    // JavaScript and JSX files
    '^.+\\.(js|jsx)$': [
      'babel-jest',
      {
        presets: [
          '@babel/preset-env',
          '@babel/preset-react',
          '@babel/preset-typescript'
        ]
      }
    ]
  },

  // Test file patterns
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',

  // File extensions to consider
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.styles.ts',
    '!src/**/index.ts',
    '!src/types/**/*',
    '!src/interfaces/**/*',
    '!src/constants/**/*',
    '!src/config/**/*',
    '!src/mocks/**/*'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Coverage output directory
  coverageDirectory: '<rootDir>/coverage',

  // Watch plugins for development
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],

  // TypeScript configuration
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
      diagnostics: true,
      isolatedModules: true
    }
  },

  // Performance optimization
  maxWorkers: '50%',

  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost'
  }
};

export default jestConfig;