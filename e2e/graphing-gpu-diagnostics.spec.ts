import { expect, test } from '@playwright/test';

test.describe('Graph GPU diagnostics @gpu', () => {
  test('Settings reports WebGL2 capabilities for the Graph GPU renderer', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.getByTestId('settings-toggle').click();
    await page.getByRole('button', { name: 'Open Full Settings' }).click();
    await page.getByTestId('settings-category-runtime').click();
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
