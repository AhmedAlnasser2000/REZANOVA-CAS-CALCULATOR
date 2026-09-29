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

/** Client coordinates of the complex number re + im·i in the Complex pane. */
async function complexPoint(page: Page, re: number, im: number) {
  const canvas = page.locator('canvas.graph-complex-overlay-canvas');
  const box = await canvas.boundingBox();
  const view = (await canvas.getAttribute('data-viewport'))?.split(',').map(Number);
  if (!box || !view) throw new Error('complex pane has no viewport');
  const [xMin, xMax, yMin, yMax] = view as [number, number, number, number];
  return { x: box.x + (re - xMin) / (xMax - xMin) * box.width, y: box.y + (yMax - im) / (yMax - yMin) * box.height };
}

test.describe('Graph complex loci and roots', () => {
  test('draws loci and exact root points on the Argand plane', async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await openGraph(page);
    await enterExpression(page, String.raw`|z-1|=2`);
    await expect(page.locator('.graph-domain-switch [aria-pressed="true"]')).toHaveText('Complex');
    await enterExpression(page, String.raw`\arg(z)=\frac{\pi}{4}`);
    await enterExpression(page, 'z^3=1');
    const status = page.locator('.graph-complex-toolbar > span').first();
    await expect(status).toContainText('2 loci');
    await expect(status).toContainText('3 root points · all exact');
    // Hovering the root z = −1/2 + (√3/2)i reads its exact form.
    await expect.poll(async () => {
      const point = await complexPoint(page, -0.5, Math.sqrt(3) / 2);
      await page.mouse.move(point.x, point.y);
      return page.getByTestId('graph-complex-root-readout').textContent().catch(() => null);
    }, { timeout: 8_000 }).toBe('z = e^(2πi/3) · exact');
    await page.screenshot({ path: testInfo.outputPath('complex-loci-roots.png') });
    // Both shows the same loci in the Real pane at x = Re z, y = Im z.
    await page.getByRole('button', { name: 'Both', exact: true }).click();
    await expect(page.getByTestId('graph-scene-paths').locator('path[data-item-id]')).not.toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('finds the root points of a conjugate equation', async ({ page }) => {
    await openGraph(page);
    await enterExpression(page, String.raw`\overline{z}=z^2`);
    await expect(page.locator('.graph-domain-switch [aria-pressed="true"]')).toHaveText('Complex');
    await expect(page.locator('.graph-complex-toolbar > span').first()).toContainText('4 root points');
    await expect.poll(async () => {
      const point = await complexPoint(page, -0.5, Math.sqrt(3) / 2);
      await page.mouse.move(point.x, point.y);
      return page.getByTestId('graph-complex-root-readout').textContent().catch(() => null);
    }, { timeout: 8_000 }).toMatch(/^z ≈ −0\.5 \+ 0\.866025i · numeric/u);
  });

  test('labels a traced complex value of a real curve as the complex part', async ({ page }) => {
    await openGraph(page);
    await enterExpression(page, String.raw`\sqrt{-x}`);
    await page.getByRole('button', { name: 'Show complex values' }).click();
    const imaginary = page.getByTestId('graph-scene-paths').locator('path[data-stroke-role="complex-imaginary"]');
    await expect(imaginary).toBeAttached();
    const point = await imaginary.evaluate((path: SVGPathElement) => {
      const local = path.getPointAtLength(path.getTotalLength() * 0.6);
      const screen = new DOMPoint(local.x, local.y).matrixTransform(path.getScreenCTM()!);
      return { x: screen.x, y: screen.y };
    });
    await page.mouse.click(point.x, point.y);
    const callout = page.locator('.graph-trace-callout');
    await expect(callout).toContainText('Complex part · Im f(');
    await expect(callout).toContainText(/f\([\d.]+\) = 0 \+ [\d.]+i/u);
  });

  test('keeps drawing 3D after many 2D and 3D switches', async ({ page }) => {
    await openGraph(page);
    await enterExpression(page, String.raw`\ln x`);
    for (let round = 0; round < 30; round += 1) {
      await page.getByRole('button', { name: '3D', exact: true }).click();
      await page.getByRole('button', { name: '2D', exact: true }).click();
    }
    await page.getByRole('button', { name: '3D', exact: true }).click();
    await expect(page.getByTestId('graph-three-viewport')).toHaveAttribute('data-ready', 'true');
    expect(await page.locator('canvas.graph-three-canvas').evaluate((canvas: HTMLCanvasElement) => (
      canvas.getContext('webgl2')?.isContextLost() ?? true))).toBe(false);
    await expect(page.getByText('Precise 2D fallback')).toHaveCount(0);
  });
});
