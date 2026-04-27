import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgres://nuthatch:dev_password@localhost:5432/nuthatch_test';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'dist'],
    fileParallelism: false,
    testTimeout: 15_000,
    globalSetup: ['./__tests__/setup/global.ts'],
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      NUTHATCH_SECRET_KEY: 'test_secret_minimum_32_chars_for_jwt',
      NUTHATCH_PUBLIC_URL: 'http://localhost:3000',
      NODE_ENV: 'test',
    },
  },
});
