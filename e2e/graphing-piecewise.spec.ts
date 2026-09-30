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
  await page.waitForTimeout(800);
}

/** Client coordinates of (x, y) in the Real pane, once the view has settled. */
async function realPoint(page: Page, x: number, y: number) {
  const host = page.getByTestId('graph-viewport');
  let previous = '';
  await expect.poll(async () => {
    const current = await host.getAttribute('data-viewport') ?? '';
    const stable = current !== '' && current === previous; previous = current; return stable;
  }, { intervals: [150] }).toBe(true);
  const box = await host.boundingBox();
  const [xMin, xMax, yMin, yMax] = previous.split(',').map(Number) as [number, number, number, number];
  if (!box) throw new Error('real pane has no bounds');
  return { x: box.x + (x - xMin) / (xMax - xMin) * box.width, y: box.y + (yMax - y) / (yMax - yMin) * box.height };
}

const callout = (page: Page) => page.locator('.graph-trace-callout');

test.describe('Piecewise graphing', () => {
  test('draws exact end circles at a jump and traces across the branches', async ({ page }, testInfo) => {
    await openGraph(page);
    await enterExpression(page, String.raw`\begin{cases}x&x<1\\x+2&x\ge1\end{cases}`);
    const markers = page.getByTestId('graph-scene-points').locator('[data-marker]');
    await expect(markers).toHaveCount(2);
    const start = await realPoint(page, -2, -2);
    await page.mouse.click(start.x, start.y);
    await expect(callout(page)).toHaveText('(-2, -2)');
    await expect(callout(page)).toHaveAttribute('data-ptx-badge', 'verified');
    // Sweeping right past x = 1 moves onto the second branch.
    const right = await realPoint(page, 2, 4);
    await page.mouse.move(right.x, right.y, { steps: 8 });
    await expect(callout(page)).toHaveText(/^\(2(?:\.\d+)?, 4(?:\.\d+)?\)$/u);
    // Arriving at the open circle reads the limit, not a value.
    const hole = await realPoint(page, 1, 1);
    await page.mouse.move(hole.x - 2, hole.y + 2, { steps: 6 });
    await expect(callout(page)).toHaveText('(1, undefined) · limit 1');
    const filled = await realPoint(page, 1, 3);
    await page.mouse.move(filled.x + 1, filled.y, { steps: 4 });
    await expect(callout(page)).toHaveText('Endpoint (1, 3)');
    await page.screenshot({ path: testInfo.outputPath('piecewise-jump.png') });
  });

  test('reads restriction braces and shows a hole where x ≠ 1', async ({ page }, testInfo) => {
    await openGraph(page);
    await enterExpression(page, String.raw`\frac{x^2-1}{x-1}\{x\ne1\}`);
    await expect(page.getByTestId('graph-scene-points').locator('[data-marker="open"]')).toHaveCount(1);
    await expect(page.locator('.graph-expression-error')).toHaveCount(0);
    const hole = await realPoint(page, 1, 2);
    await page.mouse.move(hole.x, hole.y);
    await expect(callout(page)).toHaveText('(1, undefined) · limit 2');
    await page.screenshot({ path: testInfo.outputPath('piecewise-hole.png') });
    await enterExpression(page, String.raw`x^2\{x>0\}`);
    await expect(page.getByTestId('graph-scene-paths').locator('path[data-item-id]')).toHaveCount(2);
  });

  test('draws polar branches, explains shadowed branches and polar letters', async ({ page }) => {
    await openGraph(page);
    await enterExpression(page, String.raw`r=\begin{cases}1&\theta<\pi\\2&\theta\ge\pi\end{cases}`);
    await expect(page.getByTestId('graph-scene-paths').locator('path[data-item-id]')).toHaveCount(2);
    await enterExpression(page, String.raw`\begin{cases}1&x<2\\2&x<3\end{cases}`);
    await expect(page.locator('.graph-expression-error').filter({ hasText: 'Branch 2 is partly covered by branch 1' })).toBeVisible();
    await enterExpression(page, 'y=ar^x');
    await expect(page.locator('.graph-expression-error').filter({ hasText: 'r and θ are polar coordinates' })).toBeVisible();
  });

  test('shows points of interest on a piecewise curve', async ({ page }) => {
    await openGraph(page);
    await enterExpression(page, String.raw`\begin{cases}x^2-4&x<0\\1&x\ge0\end{cases}`);
    const start = await realPoint(page, -1, -3);
    await page.mouse.click(start.x, start.y);
    await expect(callout(page)).toBeVisible();
    await expect(page.getByTestId('graph-ptx-dot')).not.toHaveCount(0, { timeout: 8_000 });
    const root = await realPoint(page, -2, 0);
    await page.mouse.move(root.x, root.y, { steps: 6 });
    await expect(callout(page)).toHaveText('Root (-2, 0)');
  });
});
