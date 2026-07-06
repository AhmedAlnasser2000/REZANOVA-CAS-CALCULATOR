import { expect, test } from '@playwright/test';
import { openLauncherApp, setMathFieldLatex } from './helpers';

async function clickVisibleLauncherEntry(page: Parameters<typeof openLauncherApp>[0], label: string) {
  await page.locator('button.launcher-entry:visible')
    .filter({ has: page.locator('strong', { hasText: new RegExp(`^${label}$`, 'i') }) })
    .click();
}

async function openLimitScreen(page: Parameters<typeof openLauncherApp>[0]) {
  await openLauncherApp(page, 'Calculus', 'Calculus');
  await clickVisibleLauncherEntry(page, 'Limits');
  await clickVisibleLauncherEntry(page, 'Limit');
  await expect(page.getByTestId('main-editor')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('guided Limit exposes the finite Gruntz bridge route with compact evidence', async ({ page }) => {
  await openLimitScreen(page);
  await setMathFieldLatex(page, 'lim x -> 0+ exp(1/x)');
  await page.getByTestId('soft-action-evaluate').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-answer-block').locator('[aria-label*="infty"]')).toBeVisible();
  await expect(page.getByTestId('display-outcome-answer-block')).not.toContainText('guarded rows');

  const method = page.locator('[data-testid^="display-outcome-detail-section-"]')
    .filter({ hasText: 'Limit Method' })
    .first();
  await expect(method).toBeVisible();
  await method.locator('summary').click();
  await expect(method).toContainText('Gruntz finite');
  await expect(method).toContainText('Conclusion');

  const bridge = page.locator('[data-testid^="display-outcome-detail-section-"]')
    .filter({ hasText: 'Gruntz Finite Bridge' })
    .first();
  await expect(bridge).toBeVisible();

  const route = page.locator('[data-testid^="display-outcome-detail-section-"]')
    .filter({ hasText: 'Limit Route' })
    .first();
  await expect(route).toBeVisible();
  await route.locator('summary').click();
  await expect(route).toContainText('Gruntz asymptotic route');
});
