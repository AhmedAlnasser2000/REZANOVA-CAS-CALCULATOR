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
  await page.waitForTimeout(400);
}

test.describe('Graph GPU surfaces @gpu', () => {
  test('draws surfaces in the vertex shader and moves sliders without recompiling', async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.addInitScript(() => {
      const counters = { draws: 0, links: 0 };
      (window as unknown as { __gpu: typeof counters }).__gpu = counters;
      const prototype = WebGL2RenderingContext.prototype;
      const drawElements = prototype.drawElements;
      prototype.drawElements = function patched(...args) { counters.draws += 1; return drawElements.apply(this, args); };
      const linkProgram = prototype.linkProgram;
      prototype.linkProgram = function patched(...args) { counters.links += 1; return linkProgram.apply(this, args); };
    });
    await page.setViewportSize({ width: 1440, height: 940 });
    await page.goto('/'); await openGraph(page);
    await enterExpression(page, String.raw`z=a\sin(x)\cos(y)`);
    await page.getByRole('button', { name: 'Create slider for a' }).click();
    await page.getByRole('group', { name: 'Graph dimension' }).getByRole('button', { name: '3D' }).click();
    const viewport = page.getByTestId('graph-three-viewport');
    await expect(viewport).toHaveAttribute('data-gpu-surfaces', '1');
    await expect(page.getByTestId('graph-surface-renderer')).toHaveText('GPU');
    await page.screenshot({ path: testInfo.outputPath('gpu-surface-initial.png') });

    const counters = () => page.evaluate(() => ({ ...(window as unknown as { __gpu: { draws: number; links: number } }).__gpu }));
    const slider = page.locator('input[type="range"]').first();
    const box = await slider.boundingBox();
    if (!box) throw new Error('slider has no bounds');
    const before = await counters();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    for (let step = 1; step <= 10; step += 1) {
      await page.mouse.move(box.x + box.width / 2 + step * (box.width / 2 - 6) / 10, box.y + box.height / 2);
      await page.evaluate(() => new Promise(requestAnimationFrame));
    }
    await page.mouse.up();
    const after = await counters();
    // Every slider step redraws the GPU surface from uniforms: no shader links.
    expect(after.draws - before.draws).toBeGreaterThanOrEqual(10);
    expect(after.links - before.links).toBe(0);
    await expect(viewport).toHaveAttribute('data-gpu-surfaces', '1');
    await page.screenshot({ path: testInfo.outputPath('gpu-surface-after-slider.png') });

    expect(errors).toEqual([]);
  });
});
