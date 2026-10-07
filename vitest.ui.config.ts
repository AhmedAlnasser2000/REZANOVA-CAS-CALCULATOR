import { configDefaults, defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';
import { LEGACY_EQUATION_ENABLED, LEGACY_EQUATION_UI_TESTS } from './tools/legacy-equation-tests.mjs';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      include: ['src/**/*.ui.test.ts', 'src/**/*.ui.test.tsx'],
      // Old Equation engine tests are inert unless CALCWIZ_LEGACY_EQUATION=1 (npm run test:legacy-equation:ui).
      exclude: [...configDefaults.exclude, ...(LEGACY_EQUATION_ENABLED ? [] : LEGACY_EQUATION_UI_TESTS)],
      maxWorkers: 2,
      setupFiles: ['src/test/setup-ui.ts'],
      reporters: ['default'],
      testTimeout: 30000,
      css: true,
      clearMocks: true,
      restoreMocks: true,
    },
  }),
);
