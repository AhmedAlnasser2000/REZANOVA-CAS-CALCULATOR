import { expect, test } from '@playwright/test';
import {
  getMathFieldLatex,
  openLauncherApp,
  openGeometrySlope,
  openSettingsPanel,
  openStatisticsRegression,
  openTable,
  setMathFieldLatex,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('main-editor')).toBeVisible();
});

test('Calculate smoke renders exact symbolic result', async ({ page }) => {
  await setMathFieldLatex(page, '\\frac{1}{3}+\\frac{1}{6x}');
  await page.getByTestId('soft-action-simplify').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label="\\\\frac{2x+1}{6x}"]')).toBeVisible();
  await expect(page.getByTestId('display-outcome-supplement-0')).toContainText('x');
});

test('Calculate smoke applies the selected angle unit to pi-based direct trig input', async ({ page }) => {
  await setMathFieldLatex(page, '\\sin\\left(\\frac{\\pi}{2}\\right)');
  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-approx')).toContainText('1');

  await openSettingsPanel(page);
  await page.getByTestId('settings-angle-unit-deg').click();
  await page.getByTestId('side-surface-overlay-backdrop').click();

  await page.getByTestId('keypad-execute').click();
  await expect(page.getByTestId('display-outcome-approx')).toContainText('0.0274121');

  await openSettingsPanel(page);
  await page.getByTestId('settings-angle-unit-grad').click();
  await page.getByTestId('side-surface-overlay-backdrop').click();

  await page.getByTestId('keypad-execute').click();
  await expect(page.getByTestId('display-outcome-approx')).toContainText('0.0246715');
});

test('Calculate smoke applies the selected angle unit to plain numeric direct trig input', async ({ page }) => {
  await setMathFieldLatex(page, '\\sin\\left(90\\right)');
  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-approx')).toContainText('1');

  await openSettingsPanel(page);
  await page.getByTestId('settings-angle-unit-rad').click();
  await page.getByTestId('side-surface-overlay-backdrop').click();

  await page.getByTestId('keypad-execute').click();
  await expect(page.getByTestId('display-outcome-approx')).toContainText('0.893997');

  await openSettingsPanel(page);
  await page.getByTestId('settings-angle-unit-grad').click();
  await page.getByTestId('side-surface-overlay-backdrop').click();

  await page.getByTestId('keypad-execute').click();
  await expect(page.getByTestId('display-outcome-approx')).toContainText('0.987688');
});
test('Calculate smoke exposes the algebra tray for explicit transforms', async ({ page }) => {
  await setMathFieldLatex(page, '\\frac{x^2-1}{x^2-x}');
  await page.getByTestId('soft-action-algebra').click();
  await expect(page.getByTestId('algebra-transform-tray')).toBeVisible();
  await page.getByTestId('algebra-transform-cancelFactors').click();

  await expect(page.getByTestId('algebra-transform-cancelFactors')).toBeVisible();
  await expect(page.getByText(/Canceled supported common factors/i)).toBeVisible();
});

test('PRL2 Calculate smoke evaluates broadened real-domain powers, roots, and logs', async ({ page }) => {
  await setMathFieldLatex(page, '\\left(-8\\right)^{\\frac{2}{3}}+\\log_{4}\\left(16\\right)');
  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label="6"]')).toBeVisible();
});

test('PRL2 Calculate smoke rejects out-of-real-domain numeric cases cleanly', async ({ page }) => {
  await setMathFieldLatex(page, '\\sqrt{-4}');
  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-error')).toBeVisible();
  await expect(page.getByText(/non-negative radicands/i)).toBeVisible();
});

test('PRL2 Calculate smoke keeps simplify from leaking raw NaN on invalid logs', async ({ page }) => {
  await setMathFieldLatex(page, '\\log\\left(-8\\right)');
  await page.getByTestId('soft-action-simplify').click();

  await expect(page.getByTestId('display-outcome-error')).toBeVisible();
  await expect(page.getByText(/positive arguments/i)).toBeVisible();
  await expect(page.getByText(/^NaN$/)).toHaveCount(0);
});
test('POLY2 smoke renders bounded cubic factorization through Calculate > Factor', async ({ page }) => {
  await setMathFieldLatex(page, 'x^3-6x^2+11x-6');
  await page.getByTestId('soft-action-factor').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label*="x-1"]')).toBeVisible();
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label*="x^2-5x+6"]')).toBeVisible();
});
test('POLY-RAD1 smoke keeps direct radical simplification wins visible on Calculate > Simplify', async ({ page }) => {
  await setMathFieldLatex(page, '\\sqrt{\\left(x^4-10x^2+25\\right)}');
  await page.getByTestId('soft-action-simplify').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-exact')).toContainText('∣');
  await expect(page.getByTestId('display-outcome-exact')).toContainText('x');
  await expect(page.getByTestId('display-outcome-exact')).toContainText('5');
});

test('Trigonometry smoke covers guided identity solve and expression-only guidance', async ({ page }) => {
  await openLauncherApp(page, 'Shape Math', 'Trigonometry');
  await page.getByRole('button', { name: /Identities/i }).click();
  await page.getByRole('button', { name: /Simplify/i }).click();
  await setMathFieldLatex(page, '\\sin^2\\left(x\\right)+\\cos^2\\left(x\\right)');
  await page.getByTestId('soft-action-evaluate').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-exact')).toContainText('1');

  await openLauncherApp(page, 'Shape Math', 'Trigonometry');
  await page.getByRole('button', { name: /Period & Phase/i }).click();
  await setMathFieldLatex(page, '\\cos\\left(x\\right)=x');
  await page.getByTestId('soft-action-evaluate').click();
  await expect(page.getByTestId('display-outcome-error')).toBeVisible();
  await expect(page.getByTestId('display-outcome-error')).toContainText('expression-only');
  await expect(page.getByTestId('display-outcome-action-send-equation')).toHaveCount(0);
});

test('Geometry smoke covers handoff-capable unresolved flow', async ({ page }) => {
  await openGeometrySlope(page);
  await setMathFieldLatex(page, 'slope(p1=(?,2), p2=(4,2), slope=0)');
  await page.getByTestId('soft-action-evaluate').click();

  await expect(page.getByTestId('display-outcome-error')).toBeVisible();
  await expect(page.getByTestId('display-outcome-action-send-equation')).toBeVisible();
});

test('Statistics smoke renders quality summary metadata', async ({ page }) => {
  await openStatisticsRegression(page);
  await setMathFieldLatex(page, 'regression(points={(1,2),(2,4),(3,6)})');
  await page.getByTestId('soft-action-evaluate').click();

  const detailSections = page.getByTestId('display-outcome-detail-sections');
  await expect(detailSections).toBeVisible();
  await expect(detailSections).toContainText('Quality Summary');
  await page.getByText('Quality Summary', { exact: true }).click();
  await expect(detailSections).toContainText('SSE = 0');
});

test('PRL2 Table smoke shows undefined rows and a warning for real-domain exits', async ({ page }) => {
  await openTable(page);
  await setMathFieldLatex(page, '\\sqrt{x}', 'table-primary-editor');
  await page.getByTestId('soft-action-build').click();

  await expect(page.getByTestId('table-preview')).toBeVisible();
  await expect(page.getByTestId('table-row-1')).toContainText('undefined');
  await expect(page.getByText(/outside the real domain/i)).toBeVisible();
});

test('Settings smoke uses the outboard inspector on wide layouts and keeps shell width stable', async ({ page }) => {
  await page.setViewportSize({ width: 2400, height: 960 });
  await page.reload();
  await expect(page.getByTestId('main-editor')).toBeVisible();
  await page.waitForTimeout(650);

  const shell = page.getByTestId('calculator-shell');
  const shellWidthBefore = (await shell.boundingBox())?.width;

  await openSettingsPanel(page);
  await expect(page.getByTestId('settings-panel')).toHaveAttribute(
    'data-settings-presentation',
    'outboard',
  );
  await expect(page.getByTestId('side-surface-host')).toHaveAttribute(
    'data-side-surface-presentation',
    'outboard',
  );

  const shellWidthAfterOpen = (await shell.boundingBox())?.width;
  expect(shellWidthBefore).toBeTruthy();
  expect(shellWidthAfterOpen).toBe(shellWidthBefore);

  // In a browser, UI scale is the browser's own zoom (GRAPHING-UI1): the panel says so instead of offering steps.
  await expect(page.getByTestId('settings-ui-scale-browser-hint')).toBeVisible();
  const highContrastSwitch = page.getByTestId('settings-high-contrast');
  await highContrastSwitch.locator('..').click();
  await expect(highContrastSwitch).toBeChecked();

  const shellClass = await shell.getAttribute('class');
  expect(shellClass).toContain('is-high-contrast');
  await expect(shell).not.toHaveAttribute('style', /ui-scale/);
});

test('Settings smoke uses a transparent, responsive overlay sheet on narrow layouts', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.reload();
  await expect(page.getByTestId('main-editor')).toBeVisible();

  await openSettingsPanel(page);
  const panel = page.getByTestId('settings-panel');
  const host = page.getByTestId('side-surface-host');
  const backdrop = page.getByTestId('side-surface-overlay-backdrop');
  await expect(panel).toHaveAttribute('data-settings-presentation', 'overlay');
  await expect(backdrop).toBeVisible();
  await expect.poll(() => backdrop.evaluate((element) => getComputedStyle(element).backgroundColor))
    .toBe('rgba(0, 0, 0, 0)');
  await expect.poll(() => panel.evaluate((element) => getComputedStyle(element).transitionDuration))
    .toContain('0.18s');

  await backdrop.click();
  await expect(host).toHaveAttribute('data-motion-phase', 'exiting');
  await expect.poll(() => panel.evaluate((element) => getComputedStyle(element).transitionDuration))
    .toContain('0.14s');
  await expect(host).toBeHidden();
});

test('Settings smoke keeps quick toggles in sync and stays mutually exclusive with history', async ({ page }) => {
  await page.setViewportSize({ width: 2400, height: 960 });
  await page.reload();
  await expect(page.getByTestId('main-editor')).toBeVisible();

  await openSettingsPanel(page);
  await page.getByTestId('settings-angle-unit-rad').click();
  await expect(page.getByTestId('quick-setting-angle-unit')).toHaveText('RAD');

  await page.getByTestId('history-toggle').click();
  await expect(page.getByTestId('history-panel')).toBeVisible();
  await expect(page.getByTestId('history-panel')).toHaveAttribute('data-history-presentation', 'outboard');
  await expect(page.getByTestId('settings-panel')).toHaveCount(0);
});

test('PRL1 smoke applies symbolic display preferences to rendered results while leaving editor load on canonical raw exact latex', async ({ page }) => {
  await page.setViewportSize({ width: 2400, height: 960 });
  await page.reload();
  await expect(page.getByTestId('main-editor')).toBeVisible();

  await openSettingsPanel(page);
  await page.getByTestId('settings-symbolic-mode-powers').click();

  await setMathFieldLatex(page, '\\left(\\sqrt{x}\\right)^{\\frac{1}{3}}');
  await page.getByTestId('soft-action-simplify').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label="x^{\\\\frac{1}{6}}"]')).toBeVisible();

  await page.getByTestId('display-outcome-action-to-editor').click();
  await expect.poll(() => getMathFieldLatex(page)).toBe('x^{\\frac{1}{6}}');
});

test('ND1 smoke switches read-only notation modes while keeping editor loads canonical', async ({ page }) => {
  await page.setViewportSize({ width: 2400, height: 960 });
  await page.reload();
  await expect(page.getByTestId('main-editor')).toBeVisible();

  await openSettingsPanel(page);
  await page.getByTestId('settings-symbolic-mode-powers').click();
  await page.getByTestId('settings-math-notation-plainText').click();

  await setMathFieldLatex(page, '\\left(\\sqrt{x}\\right)^{\\frac{1}{3}}');
  await page.getByTestId('soft-action-simplify').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-exact')).toContainText('x^(1/6)');

  await page.getByTestId('settings-math-notation-latex').click();

  await expect(page.getByTestId('display-outcome-exact')).toContainText('x^{\\frac{1}{6}}');
  await page.getByTestId('display-outcome-action-to-editor').click();
  await expect.poll(() => getMathFieldLatex(page)).toBe('x^{\\frac{1}{6}}');
});

test('PRL1 smoke keeps plain sqrt as a root in auto mode', async ({ page }) => {
  await page.setViewportSize({ width: 2400, height: 960 });
  await page.reload();
  await expect(page.getByTestId('main-editor')).toBeVisible();

  await openSettingsPanel(page);
  await page.getByTestId('settings-symbolic-mode-auto').click();

  await setMathFieldLatex(page, '\\sqrt{x}');
  await page.getByTestId('soft-action-simplify').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label="\\\\sqrt{x}"]')).toBeVisible();
});

test('PRL3 smoke canonicalizes bounded same-base log sums with condition lines', async ({ page }) => {
  await setMathFieldLatex(page, '\\ln(x)+\\ln(x+1)');
  await page.getByTestId('soft-action-simplify').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(
    page.getByTestId('display-outcome-exact').locator('[aria-label*="\\\\ln\\\\left(x"][aria-label*="x+1"]'),
  ).toBeVisible();
  await expect(page.getByTestId('display-outcome-supplement-0')).toContainText('x');
});

test('PRL3 smoke compacts repeated factors when same-base logs combine', async ({ page }) => {
  await setMathFieldLatex(page, '\\ln(4x)+\\ln(x^3)');
  await page.getByTestId('soft-action-simplify').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(
    page.getByTestId('display-outcome-exact').locator('[aria-label*="\\\\ln\\\\left(4"][aria-label*="x^{4}"]'),
  ).toBeVisible();
});

test('PRL3 smoke exposes Calculate rewrite transforms', async ({ page }) => {
  await setMathFieldLatex(page, '\\sqrt[3]{\\sqrt{x}}');
  await page.getByTestId('soft-action-algebra').click();
  await expect(page.getByTestId('algebra-transform-tray')).toBeVisible();
  await page.getByTestId('algebra-transform-rewriteAsPower').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label="x^{\\\\frac{1}{6}}"]')).toBeVisible();
});

test('PRL3 smoke exposes Calculate rewrite-as-root transforms', async ({ page }) => {
  await setMathFieldLatex(page, 'x^{\\frac{1}{6}}');
  await page.getByTestId('soft-action-algebra').click();
  await expect(page.getByTestId('algebra-transform-tray')).toBeVisible();
  await page.getByTestId('algebra-transform-rewriteAsRoot').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-exact').locator('[aria-label="x^{\\\\frac{1}{6}}"]')).toBeVisible();
  await page.getByTestId('display-outcome-action-to-editor').click();
  await expect.poll(() => getMathFieldLatex(page)).toBe('\\sqrt[6]{x}');
});

test('PRL3 smoke exposes Calculate change-base transforms', async ({ page }) => {
  await setMathFieldLatex(page, '\\log_{4}(x)');
  await page.getByTestId('soft-action-algebra').click();
  await expect(page.getByTestId('algebra-transform-tray')).toBeVisible();
  await page.getByTestId('algebra-transform-changeBase').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(
    page.getByTestId('display-outcome-exact').locator('[aria-label="\\\\frac{\\\\ln\\\\left(x\\\\right)}{\\\\ln\\\\left(4\\\\right)}"]'),
  ).toBeVisible();
});
