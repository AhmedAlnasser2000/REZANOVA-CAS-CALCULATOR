import { configDefaults, defineConfig } from 'vitest/config'
import { RETIRED_VITEST_EXCLUDES } from './tools/retired-workspace-tests.mjs'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: [...configDefaults.exclude, ...RETIRED_VITEST_EXCLUDES],
    maxWorkers: 4,
    reporters: ['default'],
    testTimeout: 250000,
  },
})
