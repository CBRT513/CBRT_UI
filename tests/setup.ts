/**
 * Jest setup file for CBRT fabric tests
 */

// Global test configuration
process.env.NODE_ENV = 'test';
process.env.FABRIC_TEST_MODE = 'true';

// Mock logger utility
jest.mock('../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch globally for tests
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Cleanup after all tests
afterAll(() => {
  jest.restoreAllMocks();
});