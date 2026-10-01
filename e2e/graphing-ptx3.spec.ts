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
const dots = (page: Page) => page.getByTestId('graph-ptx-dot');

/** Clicks the curve there: it is selected (its dots appear) and traced, so moving sweeps it and snaps onto dots. */
async function selectAt(page: Page, x: number, y: number) {
  const point = await realPoint(page, x, y);
  await page.mouse.click(point.x, point.y);
  await expect(callout(page)).toBeVisible();
}

async function hoverAt(page: Page, x: number, y: number) {
  const point = await realPoint(page, x, y);
  await page.mouse.move(point.x, point.y);
}

test.describe('PTX3', () => {
  test('gives parametric and polar curves their points of interest', async ({ page }, testInfo) => {
    await openGraph(page);
    await enterExpression(page, String.raw`(\cos t,\sin t)`);
    await selectAt(page, Math.cos(1), Math.sin(1));
    await expect(dots(page)).not.toHaveCount(0, { timeout: 8_000 });
    await hoverAt(page, 0, 1);
    await expect(callout(page)).toHaveText(/^(?:Highest|y-intercept) \(0, 1\) · t = /u);
    await hoverAt(page, -1, 0);
    await expect(callout(page)).toHaveText(/^(?:Leftmost|x-intercept) \(−?-?1, 0\) · t = /u);
    await page.screenshot({ path: testInfo.outputPath('ptx3-parametric.png') });
    await enterExpression(page, String.raw`r=2\cos(2\theta)`);
    await selectAt(page, 2, 0);
    // The rose's own dots replace the circle's once its points are found.
    await page.waitForTimeout(1200);
    await expect(dots(page)).not.toHaveCount(0);
    await hoverAt(page, 0.3, 0.3);
    await hoverAt(page, 0, 0);
    await expect(callout(page)).toHaveText(/^Origin \(0, 0\) · θ = 0\.785398$/u, { timeout: 8_000 });
  });

  test('gives implicit curves their points and intersects curves of different kinds', async ({ page }) => {
    await openGraph(page);
    await enterExpression(page, 'x^2+y^2=9');
    await enterExpression(page, 'x');
    await selectAt(page, 3 * Math.cos(1), 3 * Math.sin(1));
    await expect(dots(page)).not.toHaveCount(0, { timeout: 8_000 });
    await hoverAt(page, 0, 3);
    await expect(callout(page)).toHaveText(/^(?:y-intercept|Highest) \(0, 3\)/u);
    const meet = 3 / Math.SQRT2;
    await hoverAt(page, meet, meet);
    await expect(callout(page)).toHaveText(/^Intersection \(2\.1213\d*, 2\.1213\d*\)/u);
  });

  test('reads a region: inside with ✓, its edges included or not, and its corner', async ({ page }, testInfo) => {
    await openGraph(page);
    await enterExpression(page, String.raw`x<y\le2`);
    await hoverAt(page, -1, 1);
    await expect(callout(page)).toHaveText(/^\(−?-?1(?:\.\d+)?, 1(?:\.\d+)?\) · x < y ✓ · y ≤ 2 ✓$/u);
    await hoverAt(page, 3, 1);
    await expect(callout(page)).toBeHidden();
    // A click inside selects the region, so its corner shows; the corner is open because x < y excludes it.
    const inside = await realPoint(page, -1, 1);
    await page.mouse.click(inside.x, inside.y);
    await expect(dots(page).and(page.locator('.is-open'))).toHaveCount(1, { timeout: 8_000 });
    await hoverAt(page, 2, 2);
    await expect(callout(page)).toHaveText('Corner (2, 2) · not included');
    await page.screenshot({ path: testInfo.outputPath('ptx3-region.png') });
    // Tracing the top edge says it belongs to the region.
    const edge = await realPoint(page, -3, 2);
    await page.mouse.click(edge.x, edge.y);
    await expect(callout(page)).toContainText('edge of y ≤ 2, included');
  });

  test('gives a piecewise curve its roots and its intersections with another curve', async ({ page }) => {
    await openGraph(page);
    await enterExpression(page, 'x');
    await enterExpression(page, String.raw`\begin{cases}x^2-1&x<0\\x-1&x\ge0\end{cases}`);
    await selectAt(page, -2, 3);
    await expect(dots(page)).not.toHaveCount(0, { timeout: 8_000 });
    await hoverAt(page, -1.4, 0.96);
    await hoverAt(page, -1, 0);
    await expect(callout(page)).toHaveText(/^Root \(-1, 0\)/u);
    const meet = (1 - Math.sqrt(5)) / 2;
    await hoverAt(page, meet, meet * meet - 1);
    await expect(callout(page)).toHaveText(/^Intersection \(-0\.618034, -0\.618034\)/u);
  });

  test('traces a complex trajectory z(t) exactly and reads z and t', async ({ page }) => {
    await openGraph(page);
    await enterExpression(page, String.raw`f(t)=\exp(it)`);
    await expect(page.getByTestId('graph-scene-paths').locator('path[data-path-id$=":argand-trajectory"]')).toHaveCount(1);
    const onCircle = await realPoint(page, Math.cos(0.5), Math.sin(0.5));
    await page.mouse.click(onCircle.x, onCircle.y);
    // The default t-range goes round several times, so t is 0.5 plus a whole number of turns.
    await expect(callout(page)).toHaveText(/^z = 0\.87\d* \+ 0\.47\d*i · t = -?\d+\.\d+$/u);
    const t = Number(/t = (-?[\d.]+)$/u.exec(await callout(page).textContent() ?? '')![1]);
    expect(Math.abs(((t - 0.5) / (2 * Math.PI)) - Math.round((t - 0.5) / (2 * Math.PI)))).toBeLessThan(1e-3);
  });
});
