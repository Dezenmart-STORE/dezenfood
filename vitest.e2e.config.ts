import { defineConfig } from 'vitest/config';

/**
 * End-to-end suite: runs the frontend's real RTK Query endpoints against a real
 * backend. Start the backend harness first (see src/__tests__/e2e/README.md).
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/e2e/**/*.e2e.ts'],
    setupFiles: ['src/__tests__/e2e/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
