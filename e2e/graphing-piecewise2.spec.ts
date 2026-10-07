import { expect, test, type Page } from '@playwright/test';

// GRAPHING-PIECEWISE2: piecewise branches in their own colours, the brace
// editor (otherwise row, reorder, examples), the coverage strip and gap note,
// typing cases, Analyze boundary cards, and the Graph examples gallery.

async function openGraph(page: Page, size = { width: 1440, height: 900 }) {
  await page.setViewportSize(size);
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
  await expect(page.getByTestId('graph-viewport')).toHaveAttribute('data-scene-pending', 'false');
}

async function setField(page: Page, testId: RegExp | string, latex: string) {
  const field = typeof testId === 'string' ? page.getByTestId(testId) : page.locator(`[data-testid]`).filter({ has: page.locator('math-field') });
  await (typeof testId === 'string' ? field : field.first()).evaluate((element, value) => {
    const mathField = (element.matches('math-field') ? element : element.querySelector('math-field')) as HTMLElement & { setValue: (source: string) => void };
    mathField.setValue(value);
    mathField.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  }, latex);
}

const branchStrokes = (page: Page) => page.getByTestId('graph-scene-paths').locator('path[data-branch-id]')
  .evaluateAll((paths) => paths.map((path) => [path.getAttribute('data-branch-id'), path.getAttribute('stroke')]));

test.describe('Piecewise, coloured and explained (GRAPHING-PIECEWISE2)', () => {
  test('draws each branch in its own colour and says where nothing is drawn', async ({ page }, testInfo) => {
    await openGraph(page);
    await enterExpression(page, String.raw`y=\begin{cases}x^{x+\sin(x)}&x>0\\x+e^x&x\le-5\end{cases}`);
    await expect.poll(async () => new Set((await branchStrokes(page)).map(([, stroke]) => stroke)).size).toBe(2);
    const note = page.getByTestId('graph-piecewise-gap-note');
    await expect(note).toContainText('Nothing is drawn for −5 < x ≤ 0.');

    // Add otherwise opens the editor at the otherwise row; once applied there is no gap and three colours.
    await note.getByRole('button', { name: 'Add otherwise' }).click();
    const editor = page.getByRole('group', { name: 'Piecewise branches' });
    await expect(editor).toBeVisible();
    await expect(page.getByTestId('graph-piecewise-coverage-gap')).toHaveCount(1);
    await page.screenshot({ path: testInfo.outputPath('piecewise2-editor-gap-1440x900.png') });
    await setField(page, 'graph-piecewise-draft-otherwise', '0');
    await editor.getByRole('button', { name: 'Apply' }).click();
    await expect(editor).toHaveCount(0);
    await expect(note).toHaveCount(0);
    await expect.poll(async () => new Set((await branchStrokes(page)).map(([, stroke]) => stroke)).size).toBe(3);
  });

  test('lets a branch be restyled on its own, and reordering changes which branch wins', async ({ page }) => {
    await openGraph(page);
    await enterExpression(page, String.raw`y=\begin{cases}x^2&x<1\\5&x<3\end{cases}`);
    await page.getByRole('button', { name: 'Expand piecewise branches' }).click();
    const editor = page.getByRole('group', { name: 'Piecewise branches' });
    await editor.getByRole('button', { name: 'Style branch 2' }).click();
    await page.getByRole('dialog', { name: 'Branch 2 style' }).getByRole('button', { name: 'Use orange' }).click();
    await expect.poll(async () => (await branchStrokes(page)).find(([id]) => id === 'branch.2')?.[1]).toBe('#ff9b4c');
    await page.keyboard.press('Escape');

    // Move branch 2 above branch 1 from the keyboard: then 5 wins for every x < 3.
    await editor.getByRole('button', { name: /^Move branch 2/u }).press('ArrowUp');
    await expect(page.getByTestId('graph-piecewise-branch-1')).toContainText('5');
    await editor.getByRole('button', { name: 'Apply' }).click();
    await expect.poll(() => page.getByTestId('graph-piecewise-summary').locator('math-field')
      .evaluate((element) => (element as HTMLElement & { value: string }).value)).toMatch(/^y=\\begin\{cases\}5&/u);
    // The moved branch keeps its own (orange) colour.
    await expect.poll(async () => (await branchStrokes(page)).find(([id]) => id === 'branch.2')?.[1]).toBe('#ff9b4c');
  });

  test('starts a piecewise function from the keyboard with cases', async ({ page }) => {
    await openGraph(page);
    const field = page.getByTestId('graph-expression-blank-row').locator('math-field');
    await field.click();
    await expect(field).toBeFocused();
    await page.keyboard.type('cases', { delay: 40 });
    await page.keyboard.type('x^2', { delay: 20 });
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Tab'); await page.keyboard.type('x<0', { delay: 20 });
    await page.keyboard.press('Tab'); await page.keyboard.type('1', { delay: 20 });
    await page.keyboard.press('Tab'); await page.keyboard.type('x>=0', { delay: 20 });
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('graph-piecewise-summary')).toBeVisible();
    await expect.poll(async () => (await branchStrokes(page)).length).toBe(2);
  });

  test('shows where a curve lies on the axis as a band, not a root per sample, and leaves tracing free', async ({ page }, testInfo) => {
    await openGraph(page);
    await page.getByRole('button', { name: 'Browse examples' }).click();
    await page.locator('[data-example-id="piecewise-triangle"]').click();
    await expect(page.getByTestId('graph-viewport')).toHaveAttribute('data-scene-pending', 'false');
    // Select the curve by tracing it on its zero stretch.
    const host = page.getByTestId('graph-viewport'); const box = (await host.boundingBox())!;
    const [xMin, xMax, yMin, yMax] = (await host.getAttribute('data-viewport'))!.split(',').map(Number) as [number, number, number, number];
    const at = (x: number, y: number) => ({ x: box.x + (x - xMin) / (xMax - xMin) * box.width, y: box.y + (yMax - y) / (yMax - yMin) * box.height });
    const start = at(-3.5, 0);
    await expect(async () => {
      await page.mouse.click(start.x, start.y);
      await expect(page.getByTestId('graph-ptx-stretch-label')).toHaveText(['Zero for x ≤ −2', 'Zero for x ≥ 2'], { timeout: 4_000 });
    }).toPass({ timeout: 20_000 });
    // No dots along the stretches: only the peak and the corners off the axis stretch can be points.
    await expect.poll(() => page.getByTestId('graph-ptx-dot').count()).toBeLessThan(5);
    // The trace follows the pointer along the stretch instead of jumping to its end.
    const along = at(-4.5, 0);
    await page.mouse.move(along.x, along.y, { steps: 4 });
    await expect(page.locator('.graph-trace-callout')).toHaveText(/^\(-4\.\d+, 0\) · otherwise/u);
    await page.getByRole('button', { name: 'Analyze' }).click();
    const overlay = page.getByRole('complementary', { name: 'Analyze graph' });
    await expect(overlay.locator('.graph-feature-card').filter({ hasText: 'Zero for x ≤ −2' })).toBeVisible({ timeout: 15_000 });
    await expect(overlay.locator('.graph-feature-card').filter({ hasText: 'every point here is a root' })).toHaveCount(2);
    await page.screenshot({ path: testInfo.outputPath('piecewise2-zero-stretches-1440x900.png') });
  });

  test('shows two curves lying on top of each other as one band, keeping their real crossings', async ({ page }, testInfo) => {
    await openGraph(page);
    for (const latex of ['x^2+y^2=4', String.raw`(2\cos t,2\sin t)\{0\le t\le\pi\}`, 'y=1']) await enterExpression(page, latex);
    const host = page.getByTestId('graph-viewport'); const box = (await host.boundingBox())!;
    const [xMin, xMax, yMin, yMax] = (await host.getAttribute('data-viewport'))!.split(',').map(Number) as [number, number, number, number];
    const bottom = { x: box.x + (0 - xMin) / (xMax - xMin) * box.width, y: box.y + (yMax + 2) / (yMax - yMin) * box.height };
    // Select the circle by tracing its bottom (only the full circle is there), once its geometry is in the scene.
    await expect(page.getByTestId('graph-viewport')).toHaveAttribute('data-scene-pending', 'false');
    await expect(async () => {
      await page.mouse.click(bottom.x, bottom.y);
      await expect(page.getByTestId('graph-ptx-stretch-label')).toHaveText(['Same curve'], { timeout: 4_000 });
    }).toPass({ timeout: 20_000 });
    // The circle's own points stay: where y = 1 crosses it, its ends at the axis and its top and bottom; nothing along the shared half.
    await expect.poll(() => page.getByTestId('graph-ptx-dot').count()).toBeLessThanOrEqual(6);
    await page.screenshot({ path: testInfo.outputPath('piecewise2-same-curve-1440x900.png') });
  });

  test('reports a jump in Analyze with its size and both sides', async ({ page }, testInfo) => {
    await openGraph(page);
    await enterExpression(page, String.raw`y=\begin{cases}x&x<0\\x+1&x\ge0\end{cases}`);
    await page.getByRole('button', { name: 'Analyze' }).click();
    const card = page.locator('.graph-feature-card').filter({ hasText: 'Jump of 1 at x = 0' });
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card).toContainText('left 0 · right 1 · value 1');
    await page.screenshot({ path: testInfo.outputPath('piecewise2-analyze-jump-1440x900.png') });
  });
});

test.describe('Graph examples gallery (GRAPHING-PIECEWISE2)', () => {
  for (const size of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
    test(`opens from an empty graph and loads every category at ${size.width}×${size.height}`, async ({ page }, testInfo) => {
      await openGraph(page, size);
      await page.getByRole('button', { name: 'Browse examples' }).click();
      const gallery = page.getByTestId('graph-examples');
      await expect(gallery).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`gallery-${size.width}x${size.height}.png`) });
      // Every category shows cards; an empty graph loads the example straight away.
      for (const tab of ['Implicit & regions', 'Complex', '3D, sliders & analysis', 'Curves & piecewise']) {
        await gallery.getByRole('tab', { name: tab }).click();
        await expect(gallery.locator('.graph-example-card').first()).toBeVisible();
      }
      await gallery.locator('[data-example-id="piecewise-triangle"]').click();
      await expect(gallery).toHaveCount(0);
      await expect.poll(async () => new Set((await branchStrokes(page)).map(([, stroke]) => stroke)).size).toBe(3);
    });
  }

  test('asks before touching a graph with items: add here or open a new tab', async ({ page }) => {
    await openGraph(page);
    await enterExpression(page, 'y=x');
    // A new row takes focus back once it is promoted; let that settle before opening the gallery.
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: '+ Add item' }).click();
    await page.getByRole('menuitem', { name: 'Examples…' }).click();
    const gallery = page.getByTestId('graph-examples');
    await gallery.getByRole('tab', { name: 'Implicit & regions' }).click();
    await gallery.locator('[data-example-id="folium"]').click();
    await gallery.getByRole('button', { name: 'Add to this graph' }).click();
    await expect(page.getByTestId('graph-expression-row')).toHaveCount(2);

    await page.getByRole('button', { name: '+ Add item' }).click();
    await page.getByRole('menuitem', { name: 'Examples…' }).click();
    await gallery.getByRole('tab', { name: 'Complex' }).click();
    await gallery.locator('[data-example-id="domain-colour"]').click();
    await gallery.getByRole('button', { name: 'Open in new graph tab' }).click();
    await expect(page.getByRole('tab', { name: /Untitled Graph 2/u })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('graph-expression-row')).toHaveCount(1);
  });
});
