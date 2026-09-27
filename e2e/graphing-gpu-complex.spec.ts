import { expect, test, type Page } from '@playwright/test';

async function openGraph(page: Page) {
  await page.getByTestId('workspace-tab-add-menu').click();
  await page.getByRole('menuitem', { name: 'New Graph' }).click();
  await expect(page.getByTestId('graph-page')).toBeVisible();
}

async function enterExpression(page: Page, latex: string) {
  await page.locator('math-field').first().evaluate((element, value) => {
    const mathField = element as HTMLElement & { setValue: (source: string) => void };
    mathField.setValue(value);
    mathField.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  }, latex);
}

test.describe('Graph GPU complex domain colouring @gpu', () => {
  test('draws every gesture frame on the GPU and falls back with a visible reason', async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.addInitScript(() => {
      const draws: number[] = [];
      (window as unknown as { __gpuDraws: number[] }).__gpuDraws = draws;
      const original = WebGL2RenderingContext.prototype.drawArrays;
      WebGL2RenderingContext.prototype.drawArrays = function drawArrays(...args) {
        draws.push(performance.now());
        return original.apply(this, args);
      };
    });
    await page.setViewportSize({ width: 1440, height: 940 });
    await page.goto('/'); await openGraph(page);
    await enterExpression(page, String.raw`f(z)=\frac{z^3}{z^2+1}`);
    const complex = page.getByTestId('graph-complex-viewport');
    const chip = complex.getByTestId('graph-complex-renderer');
    await expect(chip).toHaveText('GPU');
    await page.screenshot({ path: testInfo.outputPath('gpu-complex-initial.png') });

    const canvas = complex.getByLabel('Complex mapping visualization');
    const tileBefore = await canvas.getAttribute('data-tile-bounds');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('complex canvas has no bounds');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const drawsBefore = await page.evaluate(() => (window as unknown as { __gpuDraws: number[] }).__gpuDraws.length);
    for (let step = 0; step < 8; step += 1) {
      await page.mouse.wheel(0, -80);
      await page.evaluate(() => new Promise(requestAnimationFrame));
    }
    const drawsDuring = await page.evaluate(() => (window as unknown as { __gpuDraws: number[] }).__gpuDraws.length) - drawsBefore;
    // Every gesture frame is a GPU draw; the CPU tile is not replaced mid-gesture.
    expect(drawsDuring).toBeGreaterThanOrEqual(6);
    expect(await canvas.getAttribute('data-tile-bounds')).toBe(tileBefore);
    await page.screenshot({ path: testInfo.outputPath('gpu-complex-mid-gesture.png') });
    await expect.poll(() => canvas.getAttribute('data-tile-bounds'), { timeout: 5_000 }).not.toBe(tileBefore);

    // Trace reads the CPU evaluator at the exact point.
    await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.5);
    await expect(complex.locator('.graph-complex-trace')).toContainText('w =');

    // An expression the CPU authority cannot evaluate is never GPU-drawn.
    await enterExpression(page, String.raw`f(z)=z+0.5+0.25i`);
    await expect(chip).toHaveText('Standard rendering');
    await expect(chip).toHaveAttribute('title', /not supported by the complex evaluator/u);
    await expect(complex.locator('.graph-complex-trace')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
