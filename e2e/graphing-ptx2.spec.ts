import { expect, test, type Page } from '@playwright/test';

async function openGraph(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByTestId('workspace-tab-add-menu').click();
  await page.getByRole('menuitem', { name: 'New Graph' }).click();
  await expect(page.getByTestId('graph-page')).toBeVisible();
}

async function enterExpression(page: Page, latex: string) {
  await page.locator('math-field').last().evaluate((element, value) => {
    const mathField = element as HTMLElement & { setValue: (source: string) => void };
    mathField.setValue(value);
    mathField.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    mathField.blur();
  }, latex);
  await page.waitForTimeout(900);
}

async function realPoint(page: Page, x: number, y: number) {
  const host = page.getByTestId('graph-viewport');
  let previous = '';
  await expect.poll(async () => {
    const current = await host.getAttribute('data-viewport') ?? '';
    const stable = current !== '' && current === previous; previous = current; return stable;
  }, { intervals: [150] }).toBe(true);
  const box = await host.boundingBox();
  const [xMin, xMax, yMin, yMax] = previous.split(',').map(Number) as [number, number, number, number];
  return { x: box!.x + (x - xMin) / (xMax - xMin) * box!.width, y: box!.y + (yMax - y) / (yMax - yMin) * box!.height };
}

async function complexPoint(page: Page, re: number, im: number) {
  const canvas = page.locator('canvas.graph-complex-overlay-canvas');
  const box = await canvas.boundingBox();
  const [xMin, xMax, yMin, yMax] = (await canvas.getAttribute('data-viewport'))!.split(',').map(Number) as [number, number, number, number];
  return { x: box!.x + (re - xMin) / (xMax - xMin) * box!.width, y: box!.y + (yMax - im) / (yMax - yMin) * box!.height };
}

const callout = (page: Page) => page.locator('.graph-trace-callout');

test.describe('PTX2', () => {
  test('traces parametric and polar curves exactly, with their parameter', async ({ page }) => {
    await openGraph(page);
    await enterExpression(page, String.raw`(\cos t,\sin t)`);
    const onCircle = await realPoint(page, Math.cos(1), Math.sin(1));
    await page.mouse.click(onCircle.x, onCircle.y);
    await expect(callout(page)).toContainText(' · t = ');
    // PTX-ENGINE1: the point is evaluated with guaranteed enclosures, so the badge is proved.
    await expect(callout(page)).toHaveAttribute('data-ptx-badge', 'proved');
    await page.keyboard.press('Escape');
    await enterExpression(page, 'r=3');
    const onPolar = await realPoint(page, 0, 3);
    await page.mouse.click(onPolar.x, onPolar.y);
    await expect(callout(page)).toContainText(' · r = 3 · θ = ');
  });

  test('draws holes and jumps on ordinary curves', async ({ page }, testInfo) => {
    await openGraph(page);
    await enterExpression(page, String.raw`\frac{x^2-1}{x-1}`);
    const hole = await realPoint(page, 1, 2);
    await expect(page.getByTestId('graph-scene-points').locator('[data-marker="open"]')).toHaveCount(1);
    await page.mouse.move(hole.x, hole.y);
    await expect(callout(page)).toHaveText('(1, undefined) · limit 2');
    await enterExpression(page, String.raw`\lfloor x\rfloor`);
    await expect(page.getByTestId('graph-scene-points').locator('[data-marker="filled"]')).not.toHaveCount(0);
    const step = await realPoint(page, 2, 2);
    await page.mouse.move(step.x, step.y);
    await expect(callout(page)).toHaveText('Endpoint (2, 2)');
    await page.screenshot({ path: testInfo.outputPath('ptx2-holes-jumps.png') });
  });

  test('marks a z-map zero with a dot and its pole with a ring', async ({ page }) => {
    await openGraph(page);
    await enterExpression(page, String.raw`\frac{z^2-1}{z}`);
    const probe = await complexPoint(page, 2, 2);
    await page.mouse.click(probe.x, probe.y);
    await expect.poll(() => page.locator('canvas.graph-complex-overlay-canvas').getAttribute('data-ptx-dots'), { timeout: 8_000 }).not.toBe('0');
    await page.keyboard.press('Escape');
    const zero = await complexPoint(page, 1, 0);
    await page.mouse.move(zero.x, zero.y);
    await expect(page.getByTestId('graph-complex-root-readout')).toHaveText('Zero · z = 1');
    const pole = await complexPoint(page, 0, 0);
    await page.mouse.move(pole.x, pole.y);
    await expect(page.getByTestId('graph-complex-root-readout')).toHaveText('Pole · z = 0');
  });

  test('shows asymptotes while a curve is selected, with Always and Off in its details', async ({ page }, testInfo) => {
    await openGraph(page);
    await enterExpression(page, String.raw`\frac{x}{x-1}`);
    const labels = page.getByTestId('graph-ptx-asymptotes').locator('text');
    await expect(labels).toHaveCount(0);
    const onCurve = await realPoint(page, 3, 1.5);
    await page.mouse.click(onCurve.x, onCurve.y);
    await expect(labels).toHaveText(['x = 1', 'y = 1'], { timeout: 8_000 });
    await page.screenshot({ path: testInfo.outputPath('ptx2-asymptotes.png') });
    await page.getByRole('button', { name: 'Show item options' }).click();
    await page.getByRole('button', { name: 'Off', exact: true }).click();
    await expect(labels).toHaveCount(0, { timeout: 8_000 });
    await page.getByRole('button', { name: 'Always', exact: true }).click();
    await expect(labels).toHaveCount(2, { timeout: 8_000 });
    // Always keeps them when nothing is selected.
    await enterExpression(page, 'x^2');
    await page.keyboard.press('Escape');
    await expect(labels).toHaveCount(2);
    await page.screenshot({ path: testInfo.outputPath('ptx2-details.png') });
  });

  test('draws the asymptotes of tan x, which has no written denominator, named as multiples of π', async ({ page }, testInfo) => {
    await openGraph(page);
    await enterExpression(page, String.raw`\tan x`);
    const onCurve = await realPoint(page, 0.5, Math.tan(0.5));
    await page.mouse.click(onCurve.x, onCurve.y);
    const labels = page.getByTestId('graph-ptx-asymptotes').locator('text');
    await expect(labels).toContainText(['x = −3π/2', 'x = −π/2', 'x = π/2', 'x = 3π/2'], { timeout: 8_000 });
    await page.screenshot({ path: testInfo.outputPath('asymptote-fix1-tan.png') });
  });
});
