import { expect, test, type Page } from '@playwright/test';

async function openGraph(page: Page) {
  await page.getByTestId('workspace-tab-add-menu').click();
  await page.getByRole('menuitem', { name: 'New Graph' }).click();
  await expect(page.getByTestId('graph-page')).toBeVisible();
}

async function enterExpression(page: Page, latex: string) {
  await page.locator('math-field').last().evaluate((element, value) => {
    const mathField = element as HTMLElement & { setValue: (source: string) => void };
    mathField.setValue(value);
    mathField.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  }, latex);
}

async function wheel(page: Page, target: ReturnType<Page['getByTestId']>, deltaY: number, steps: number) {
  const box = await target.boundingBox();
  if (!box) throw new Error('gesture target has no bounds');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let step = 0; step < steps; step += 1) {
    await page.mouse.wheel(0, deltaY);
    await page.evaluate(() => new Promise(requestAnimationFrame));
  }
}

test.describe('Graph sampler correctness', () => {
  test('places shifted branch cuts and keeps complex zoom live without resampling mid-gesture', async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 940 });
    await page.goto('/'); await openGraph(page);
    await enterExpression(page, String.raw`f(z)=\log(z-1)`);
    const complex = page.getByTestId('graph-complex-viewport');
    await expect(complex.getByText(/holomorphic; 1 branch cut in view/u)).toBeVisible();
    const canvas = complex.getByLabel('Complex mapping visualization');
    await expect(canvas).toHaveAttribute('data-tile-bounds', /.+/u);
    await page.waitForTimeout(900);
    const before = await canvas.getAttribute('data-tile-bounds');
    await page.screenshot({ path: testInfo.outputPath('complex-shifted-log-before.png') });

    await wheel(page, canvas, -60, 6);
    // During the gesture the stale tile is re-placed; no new tile is committed.
    expect(await canvas.getAttribute('data-tile-bounds')).toBe(before);
    await page.screenshot({ path: testInfo.outputPath('complex-shifted-log-mid-gesture.png') });
    await expect.poll(() => canvas.getAttribute('data-tile-bounds'), { timeout: 5_000 }).not.toBe(before);
    await page.screenshot({ path: testInfo.outputPath('complex-shifted-log-settled.png') });

    await enterExpression(page, String.raw`f(z)=\ln(z^2+1)`);
    await expect(complex.getByText(/branch geometry not determined; 0 branch cuts in view/u)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('keeps hard implicit graphs drawn after zooming out', async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 940 });
    await page.goto('/'); await openGraph(page);
    await enterExpression(page, String.raw`xy^{\sin(x)-\cos(x)}=y^{3x}`);
    const viewport = page.getByTestId('graph-viewport');
    const paths = page.getByTestId('graph-scene-paths').locator('path');
    await expect(paths.first()).toBeAttached();
    await page.screenshot({ path: testInfo.outputPath('implicit-mixed-power-initial.png') });

    await wheel(page, viewport, 120, 8);
    await expect(viewport).toHaveAttribute('data-scene-pending', 'false', { timeout: 10_000 });
    await page.waitForTimeout(1_800);
    await expect(paths.first()).toBeAttached();
    await expect(page.getByText('Could not resolve this item')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('implicit-mixed-power-zoomed-out.png') });

    await enterExpression(page, String.raw`\sin(\ln(\cos(y)+x))=0`);
    await page.waitForTimeout(1_800);
    await expect(paths.first()).toBeAttached();
    await page.screenshot({ path: testInfo.outputPath('implicit-nested-log.png') });
    expect(errors).toEqual([]);
  });
});
