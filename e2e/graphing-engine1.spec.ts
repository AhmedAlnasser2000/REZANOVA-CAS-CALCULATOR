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

const callout = (page: Page) => page.locator('.graph-trace-callout');

/** The drawn path of the first item, in graph coordinates (from the trace readouts it supports). */
async function scenePathCount(page: Page) {
  return page.getByTestId('graph-scene-paths').locator('path[data-item-id]').count();
}

test.describe('PTX-ENGINE1', () => {
  test('proves a trace readout on y = sin x and shows the proved badge', async ({ page }) => {
    await openGraph(page);
    await enterExpression(page, String.raw`\sin x`);
    const point = await realPoint(page, 1.2, Math.sin(1.2));
    await page.mouse.click(point.x, point.y);
    await expect(callout(page)).toHaveAttribute('data-ptx-badge', 'proved');
    await expect(callout(page)).toHaveText(/^\(1\.\d+, 0\.9\d+\)$/u);
  });

  test('draws curves that only touch zero, and joins a crossing through its point', async ({ page }, testInfo) => {
    await openGraph(page);
    await enterExpression(page, '(x-y)^2=0');
    await expect.poll(() => scenePathCount(page)).toBeGreaterThan(0);
    const onLine = await realPoint(page, 2, 2);
    await page.mouse.click(onLine.x, onLine.y);
    await expect(callout(page)).toHaveText(/^\(2(?:\.0+)?, 2(?:\.0+)?\)/u);
    await page.keyboard.press('Escape');
    await enterExpression(page, 'x^2=y^2');
    await expect.poll(() => scenePathCount(page)).toBeGreaterThan(1);
    await page.screenshot({ path: testInfo.outputPath('engine1-touching-crossing.png') });
  });

  test('draws a spike narrower than the sampling at its full height', async ({ page }) => {
    await openGraph(page);
    await enterExpression(page, String.raw`\frac{1}{10^6(x-0.3)^2+1}`);
    const peak = await realPoint(page, 0.3, 1);
    await page.mouse.click(peak.x, peak.y);
    await expect(callout(page)).toHaveText(/^\(0\.\d+, (?:0\.9\d+|1)\)/u);
  });

  test('counts the zeros and poles of a z-map exactly in Analyze', async ({ page }) => {
    await openGraph(page);
    await enterExpression(page, String.raw`\frac{z^2-1}{z}`);
    await page.getByRole('button', { name: 'Analyze' }).click();
    const overlay = page.getByRole('complementary', { name: 'Analyze graph' });
    await overlay.getByRole('tab', { name: 'Evidence' }).click();
    await expect(overlay.getByText(/exactly 2 zeros and 1 pole/u).first()).toBeVisible({ timeout: 10_000 });
  });
});
