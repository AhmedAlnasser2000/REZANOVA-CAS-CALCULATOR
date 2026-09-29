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
  await page.waitForTimeout(700);
}

/** Units per pixel along x and y in the Complex pane. */
async function complexScale(page: Page) {
  const canvas = page.locator('canvas.graph-complex-overlay-canvas');
  const box = await canvas.boundingBox();
  const view = (await canvas.getAttribute('data-viewport'))?.split(',').map(Number);
  if (!box || !view) throw new Error('complex pane has no viewport');
  const [xMin, xMax, yMin, yMax] = view as [number, number, number, number];
  return { x: (xMax - xMin) / box.width, y: (yMax - yMin) / box.height };
}

/** Units per pixel along x and y in the Real pane. */
async function realScale(page: Page) {
  const host = page.getByTestId('graph-viewport');
  const box = await host.boundingBox();
  const view = (await host.getAttribute('data-viewport'))?.split(',').map(Number);
  if (!box || !view) throw new Error('real pane has no viewport');
  const [xMin, xMax, yMin, yMax] = view as [number, number, number, number];
  return { x: (xMax - xMin) / box.width, y: (yMax - yMin) / box.height };
}

test.describe('Graph equal axes', () => {
  test('draws round circles in Real, Complex and Both, and after a resize', async ({ page }, testInfo) => {
    await openGraph(page);
    await enterExpression(page, String.raw`x^2+y^2=1`);
    await expect.poll(async () => {
      const scale = await realScale(page);
      return Math.abs(scale.x / scale.y - 1);
    }, { timeout: 8_000 }).toBeLessThan(0.01);
    await page.screenshot({ path: testInfo.outputPath('equal-axes-real.png') });

    await page.getByRole('button', { name: 'Complex', exact: true }).click();
    await expect.poll(async () => {
      const scale = await complexScale(page);
      return Math.abs(scale.x / scale.y - 1);
    }, { timeout: 8_000 }).toBeLessThan(0.01);

    await page.getByRole('button', { name: 'Both', exact: true }).click();
    await page.setViewportSize({ width: 1100, height: 760 });
    await expect.poll(async () => {
      const complex = await complexScale(page); const real = await realScale(page);
      return Math.max(Math.abs(complex.x / complex.y - 1), Math.abs(real.x / real.y - 1));
    }, { timeout: 8_000 }).toBeLessThan(0.01);
    await page.screenshot({ path: testInfo.outputPath('equal-axes-both.png') });
  });

  test('lets the axes stretch again when Equal axes is switched off', async ({ page }) => {
    await openGraph(page);
    await enterExpression(page, String.raw`x^2+y^2=1`);
    await page.getByRole('button', { name: 'Complex', exact: true }).click();
    const toggle = page.getByRole('button', { name: 'Equal axes' });
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.waitForTimeout(600);
    const scale = await complexScale(page);
    expect(Math.abs(scale.x / scale.y - 1)).toBeGreaterThan(0.05);
    await toggle.click();
    await expect.poll(async () => {
      const next = await complexScale(page);
      return Math.abs(next.x / next.y - 1);
    }, { timeout: 8_000 }).toBeLessThan(0.01);
  });
});
