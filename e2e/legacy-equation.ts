import { test } from '@playwright/test';

/** Old Equation engine specs in shared files: skipped unless CALCWIZ_LEGACY_EQUATION=1 (tools/legacy-equation-tests.mjs). */
export const legacyEquationTest = process.env.CALCWIZ_LEGACY_EQUATION === '1' ? test : test.skip;
