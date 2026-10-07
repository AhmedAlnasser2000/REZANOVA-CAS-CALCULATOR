/**
 * TESTS-LEGACY-EQUATION-INERT1: tests of the old Equation engine's behaviour are inert in every full run
 * (unit, UI, e2e, CI). The old Equation workspace and its logic stay; their tests run only on demand:
 *   npm run test:legacy-equation      (unit)
 *   npm run test:legacy-equation:ui   (UI)
 *   npm run test:legacy-equation:e2e  (browser, after npm run build)
 * Shared files keep their other tests and mark the old-engine ones with `legacyEquationIt`
 * (src/test/legacy-equation.ts); the golden corpus skips its `equation` cases the same way.
 */
export const LEGACY_EQUATION_ENV = 'CALCWIZ_LEGACY_EQUATION';
export const LEGACY_EQUATION_ENABLED = process.env[LEGACY_EQUATION_ENV] === '1';

export const LEGACY_EQUATION_UNIT_TESTS = [
  'src/lib/equation/**/*.test.ts',
  'src/lib/modes/equation/**/*.test.ts',
  'src/lib/modes/equation-complex-stability.test.ts',
  'src/lib/ooe/pilots/equation-pilot.test.ts',
];

export const LEGACY_EQUATION_UI_TESTS = [
  'src/app/runtime/useEquationRuntime.ui.test.tsx',
  'src/AppMain.complex.ui.test.tsx',
  'src/AppMain.formula-presentation.ui.test.tsx',
  'src/AppMain.numeric-interval-guidance.ui.test.tsx',
];

/** Shared files whose old-engine tests use `legacyEquationIt` (run in full by the legacy scripts). */
export const LEGACY_EQUATION_SHARED_UI_TESTS = [
  'src/AppMain.ui.test.tsx',
  'src/AppMain.workspace-tabs.ui.test.tsx',
];

export const LEGACY_EQUATION_E2E_TESTS = [
  'e2e/equation-card-credibility.spec.ts',
  'e2e/equation-systems-locus-readback-repair.spec.ts',
];

/** Shared specs whose old-engine tests are skipped unless the legacy flag is set. */
export const LEGACY_EQUATION_SHARED_E2E_TESTS = [
  'e2e/qa1-smoke.spec.ts',
  'e2e/canonical-result-v2-supplement-table.spec.ts',
];
