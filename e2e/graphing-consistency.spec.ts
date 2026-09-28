import { expect, test, type Page } from '@playwright/test';

async function openGraph(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByTestId('workspace-tab-add-menu').click();
  await page.getByRole('menuitem', { name: 'New Graph' }).click();
  await expect(page.getByTestId('graph-page')).toBeVisible();
}

async function enterExpression(page: Page, latex: string, index = -1) {
  await page.locator('math-field').nth(index).evaluate((element, value) => {
    const mathField = element as HTMLElement & { setValue: (source: string) => void };
    mathField.setValue(value);
    mathField.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    mathField.blur();
  }, latex);
  await page.waitForTimeout(600);
}

/** Mean channel spread of the complex pane's centre: domain colouring is saturated, a blank pane is not. */
async function complexPaneSaturation(page: Page) {
  const pane = page.getByTestId('graph-complex-viewport');
  const box = await pane.boundingBox();
  if (!box) throw new Error('complex pane has no bounds');
  const shot = await page.screenshot({ clip: { x: box.x + box.width / 2 - 40, y: box.y + box.height / 2 - 40, width: 80, height: 80 } });
  return page.evaluate(async (base64) => {
    const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let spread = 0;
    for (let index = 0; index < data.length; index += 4) {
      spread += Math.max(data[index]!, data[index + 1]!, data[index + 2]!) - Math.min(data[index]!, data[index + 1]!, data[index + 2]!);
    }
    return spread / (data.length / 4);
  }, shot.toString('base64'));
}

test.describe('Graph input and view consistency', () => {
  test('a deleted complex map leaves the pane, and the view returns to Real', async ({ page }) => {
    await openGraph(page);
    const pressed = page.locator('.graph-domain-switch [aria-pressed="true"]');
    await expect(pressed).toHaveText('Real');
    // The selected view is visibly highlighted, not only marked for assistive technology.
    const background = await pressed.evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(background).not.toBe('rgba(0, 0, 0, 0)');

    await enterExpression(page, 'z');
    await expect(pressed).toHaveText('Complex');
    await expect(page.getByTestId('graph-view-notice')).toContainText('Opened Complex');
    await expect.poll(() => complexPaneSaturation(page), { timeout: 8_000 }).toBeGreaterThan(60);

    // Editing the map into a z/x mix is an error with guidance, and nothing stale stays drawn.
    await enterExpression(page, 'zx=y', 0);
    await expect(page.getByText('z is the complex variable and cannot be mixed with x or y.')).toBeVisible();
    await expect(pressed).toHaveText('Real');

    await enterExpression(page, 'z^2', 0);
    await expect(pressed).toHaveText('Complex');
    await page.getByRole('button', { name: 'Delete expression' }).click();
    await expect(pressed).toHaveText('Real');
    await page.getByRole('button', { name: 'Complex', exact: true }).click();
    await expect.poll(() => complexPaneSaturation(page), { timeout: 8_000 }).toBeLessThan(20);
    await expect(page.getByTestId('graph-complex-renderer')).toHaveCount(0);
  });

  test('trajectories stay in Real, and Analyze shows complex solve only for a z-map', async ({ page }) => {
    await openGraph(page);
    await enterExpression(page, String.raw`f(t)=\exp(it)`);
    await expect(page.locator('.graph-domain-switch [aria-pressed="true"]')).toHaveText('Real');
    await expect(page.getByTestId('graph-view-notice')).toHaveCount(0);
    await expect(page.getByTestId('graph-scene-paths').locator('path[data-path-id$=":argand-trajectory"]')).toBeAttached();

    await page.getByRole('button', { name: 'Analyze' }).click();
    const overlay = page.getByRole('complementary', { name: 'Analyze graph' });
    await expect(overlay.getByRole('tab')).toHaveText(['Features', 'Evidence']);
    await expect(overlay.getByText('Complex solve')).toHaveCount(0);
  });

  test('a real curve can show its complex values, labelled Re and Im', async ({ page }) => {
    await openGraph(page);
    await expect(page.locator('math-field').last()).toHaveAttribute('data-placeholder', String.raw`\text{Enter an expression…}`);
    await enterExpression(page, String.raw`\sqrt{-x}`);
    const toggle = page.getByRole('button', { name: 'Show complex values' });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    const paths = page.getByTestId('graph-scene-paths');
    await expect(paths.locator('path[data-stroke-role="complex-imaginary"]')).toHaveAttribute('stroke-dasharray', /\d/);
    await expect(paths.locator('path[data-stroke-role="complex-real"]')).toBeAttached();
    await expect(page.getByTestId('graph-complex-legend')).toBeVisible();
    await toggle.click();
    await expect(paths.locator('path[data-stroke-role="complex-imaginary"]')).toHaveCount(0);
    await expect(page.getByTestId('graph-complex-legend')).toHaveCount(0);
  });

  test('editing, deleting and panning together leave exactly one committed curve per row', async ({ page }) => {
    await openGraph(page);
    await enterExpression(page, String.raw`\sin(x)`);
    const box = await page.getByTestId('graph-viewport').boundingBox();
    if (!box) throw new Error('graph viewport has no bounds');
    const cx = box.x + box.width / 2; const cy = box.y + box.height / 2;
    for (const [round, latex] of [String.raw`x^2`, String.raw`\frac{1}{x}`, String.raw`\cos(2x)`].entries()) {
      await enterExpression(page, latex);
      await page.mouse.move(cx, cy); await page.mouse.down();
      for (let step = 1; step <= 10; step += 1) await page.mouse.move(cx + (round % 2 ? 16 : -16) * step, cy + step);
      await page.mouse.up();
      if (round === 2) await page.getByRole('button', { name: 'Delete expression' }).last().click();
    }
    const rowIds = await page.locator('[data-graph-item-id]').evaluateAll((rows) => rows
      .filter((row) => row.querySelector('[aria-label="Delete expression"]'))
      .map((row) => (row as HTMLElement).dataset.graphItemId).sort());
    await expect.poll(() => page.getByTestId('graph-scene-paths').locator('path[data-item-id]').evaluateAll((nodes) => [
      ...new Set(nodes.filter((node) => (node as SVGElement).style.display !== 'none')
        .map((node) => (node as SVGElement).dataset.itemId)),
    ].sort()), { timeout: 8_000 }).toEqual(rowIds);
    await expect(page.getByTestId('graph-scene-gesture-paths').locator('path')).toHaveCount(0);
  });
});
