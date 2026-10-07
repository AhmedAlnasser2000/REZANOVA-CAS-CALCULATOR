import { defineConfig, devices } from '@playwright/test';
import { LEGACY_EQUATION_E2E_TESTS, LEGACY_EQUATION_ENABLED } from './tools/legacy-equation-tests.mjs';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  // Old Equation engine specs are inert unless CALCWIZ_LEGACY_EQUATION=1 (npm run test:legacy-equation:e2e).
  testIgnore: LEGACY_EQUATION_ENABLED ? [] : LEGACY_EQUATION_E2E_TESTS.map(p => p.replace(/^e2e\//, '**/')),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview:test',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      // WebKit proxy for the packaged WebKitGTK webview; runs only @gpu specs.
      name: 'webkit',
      grep: /@gpu/,
      use: {
        ...devices['Desktop Safari'],
      },
    },
  ],
});
