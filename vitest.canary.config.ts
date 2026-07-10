import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['e2e/canaries/canary-registry.test.ts'],
    reporters: ['default'],
  },
});
