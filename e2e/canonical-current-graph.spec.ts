import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('Graph analysis uses current authority without changing proof levels or runtime output', async ({ page }) => {
  const directory = '.task_tmp/canonical-result-consolidation/graph-browser';
  await mkdir(directory, { recursive: true });
  await page.addInitScript(() => {
    localStorage.clear(); sessionStorage.clear();
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener('message', event => {
          if (event.data?.result?.canonicalResult) {
            Object.assign(window, { __graphCanonicalResult: event.data.result.canonicalResult });
          }
        });
      }
    };
  });
  await page.setViewportSize({ width: 1440, height: 940 });
  await page.goto('/');
  await page.getByTestId('workspace-tab-add-menu').click();
  await page.getByRole('menuitem', { name: 'New Graph' }).click();
  await expect(page.getByTestId('graph-page')).toBeVisible();
  await page.locator('math-field').last().evaluate(element => {
    const field = element as HTMLElement & { setValue(value: string): void };
    field.setValue('x^2-4');
    field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    field.blur();
  });
  await expect(page.getByTestId('graph-scene-paths').locator('path')).toHaveCount(1);
  await page.getByRole('button', { name: 'Analyze' }).click();
  const overlay = page.getByRole('complementary', { name: 'Analyze graph' });
  await expect(overlay.getByRole('heading', { name: 'Root' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as {__graphCanonicalResult?: unknown}).__graphCanonicalResult))
    .toMatchObject({ version: 7, outcomeKind: 'success' });
  await overlay.getByRole('tab', { name: 'Evidence' }).click();
  await expect(overlay.getByText('exact polynomial factorisation').first()).toBeVisible();
  await page.screenshot({ path: `${directory}/analysis.png`, fullPage: true });
  await page.setViewportSize({ width: 760, height: 800 });
  await page.screenshot({ path: `${directory}/analysis-narrow.png`, fullPage: true });
});
