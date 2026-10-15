import { defineConfig, devices } from '@playwright/test';
import { RETIRED_BROWSER_SPECS } from './tools/retired-workspace-tests.mjs';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  // Specs of retired workspaces stay on disk but do not run (EQUATION-RECONSTRUCTION-CLOSEOUT1 PR B).
  testIgnore: RETIRED_BROWSER_SPECS.map((spec) => `**/${spec}`),
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
