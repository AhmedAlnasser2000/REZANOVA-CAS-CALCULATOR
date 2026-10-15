import { expect, test } from '@playwright/test';

test.describe('Graph GPU diagnostics @gpu', () => {
  test('Settings reports WebGL2 capabilities for the Graph GPU renderer', async ({ page }, testInfo) => {
    await page.goto('/');
    // Every open surface is a page; Settings opens from the tab strip's "+" menu.
    await page.getByTestId('workspace-tab-add-menu').click();
    await page.getByRole('menuitem', { name: 'Open Settings Page' }).click();
    await page.getByTestId('settings-category-graphing').click();
    const card = page.getByTestId('graphics-diagnostics');
    await card.scrollIntoViewIfNeeded();
    const summary = card.getByTestId('graphics-diagnostics-graphics');
    await expect(summary).not.toHaveText('Checking…');
    await expect(summary).not.toContainText('WebGL2 unavailable');
    await expect(card.getByTestId('graphics-diagnostics-field-test')).toContainText('Passed');
    await expect(card.getByTestId('graphics-diagnostics-capabilities')).toContainText('Float targets yes');
    await card.screenshot({ path: testInfo.outputPath('graphics-diagnostics.png') });
    await testInfo.attach('graphics-diagnostics', {
      body: await card.screenshot(),
      contentType: 'image/png',
    });
  });
});
