import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia (DOM only - node-environment tests have no window)
if (typeof window !== 'undefined') Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock import.meta.env
vi.mock('import.meta', () => ({
  env: {
    VITE_API_URL: 'http://localhost:3000',
    VITE_ESCROW_CONTRACT_MAINNET: '0x...',
    VITE_ESCROW_CONTRACT_TESTNET: '0x...',
    VITE_WALLETCONNECT_PROJECT_ID: 'test-project-id',
  },
}));
