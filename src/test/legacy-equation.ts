import { it, test } from 'vitest';

/**
 * Old Equation engine tests in shared files: skipped in full runs, run by the legacy scripts
 * (see tools/legacy-equation-tests.mjs).
 */
export const LEGACY_EQUATION_ENABLED = process.env.CALCWIZ_LEGACY_EQUATION === '1';
export const legacyEquationIt = LEGACY_EQUATION_ENABLED ? it : it.skip;
export const legacyEquationTest = LEGACY_EQUATION_ENABLED ? test : test.skip;
