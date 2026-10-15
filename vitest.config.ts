import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: [...configDefaults.exclude],
    maxWorkers: 4,
    reporters: ['default'],
    testTimeout: 250000,
  },
})
