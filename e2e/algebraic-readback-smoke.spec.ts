import { expect, test } from '@playwright/test';
import {
  openLauncherApp,
  setMathFieldLatex,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

async function clickVisibleLauncherEntry(page: Parameters<typeof openLauncherApp>[0], label: string) {
  await page.locator('button.launcher-entry:visible')
    .filter({ has: page.locator('strong', { hasText: new RegExp(`^${label}$`, 'i') }) })
    .click();
}

async function openIndefiniteIntegral(page: Parameters<typeof openLauncherApp>[0]) {
  await openLauncherApp(page, 'Calculus', 'Calculus');
  await clickVisibleLauncherEntry(page, 'Integrals');
  await clickVisibleLauncherEntry(page, 'Indefinite');
  await expect(page.getByText('Indefinite Integral').first()).toBeVisible();
}

test('algebraic reciprocal radical readback avoids scalar reciprocal products', async ({ page }) => {
  await openIndefiniteIntegral(page);
  await setMathFieldLatex(page, '\\frac{1}{\\sqrt{a*x+b}}');
  await page.getByTestId('keypad-execute').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  const exact = page.getByTestId('display-outcome-exact');
  await expect(exact.locator('[aria-label*="\\\\frac{2}{a}"]')).toBeVisible();
  await expect(exact.locator('[aria-label*="sqrt"]')).toBeVisible();
  await expect(exact.locator('[aria-label*="2\\\\frac{1}{a}"]')).toHaveCount(0);
});
