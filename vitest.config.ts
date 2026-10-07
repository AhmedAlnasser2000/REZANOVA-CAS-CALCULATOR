import { configDefaults, defineConfig } from 'vitest/config'
import { LEGACY_EQUATION_ENABLED, LEGACY_EQUATION_UNIT_TESTS } from './tools/legacy-equation-tests.mjs'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Old Equation engine tests are inert unless CALCWIZ_LEGACY_EQUATION=1 (npm run test:legacy-equation).
    exclude: [...configDefaults.exclude, ...(LEGACY_EQUATION_ENABLED ? [] : LEGACY_EQUATION_UNIT_TESTS)],
    maxWorkers: 4,
    reporters: ['default'],
    testTimeout: 250000,
  },
})
