import { expect, test, type Locator, type Page } from '@playwright/test';

async function openGraph(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByTestId('workspace-tab-add-menu').click();
  await page.getByRole('menuitem', { name: 'New Graph' }).click();
  await expect(page.getByTestId('graph-page')).toBeVisible();
}

async function setField(field: Locator, latex: string) {
  await field.evaluate((element, value) => {
    const mathField = element as HTMLElement & { setValue: (source: string) => void };
    mathField.setValue(value);
    mathField.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    mathField.blur();
  }, latex);
}

async function enterExpression(page: Page, latex: string) {
  await setField(page.locator('math-field').last(), latex);
  await page.waitForTimeout(800);
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
  if (!box) throw new Error('real pane has no bounds');
  return { x: box.x + (x - xMin) / (xMax - xMin) * box.width, y: box.y + (yMax - y) / (yMax - yMin) * box.height };
}

async function expectTraceWorks(page: Page) {
  const callout = page.locator('.graph-trace-callout');
  await page.keyboard.press('Escape');
  const point = await realPoint(page, 3, 3);
  await page.mouse.click(point.x, point.y);
  await expect(callout).toHaveText(/^\(3(?:\.\d+)?, 3(?:\.\d+)?\)$/u);
  await page.keyboard.press('Escape');
}

// Every visible item is drawn once: no item missing, no path id twice, nothing from a deleted item.
async function sceneState(page: Page) {
  return page.getByTestId('graph-scene-paths').locator('path[data-item-id]').evaluateAll((nodes) => {
    const ids = nodes.map((node) => (node as SVGElement).dataset.pathId ?? '');
    return { items: [...new Set(nodes.map((node) => (node as SVGElement).dataset.itemId))].sort(), duplicates: ids.filter((id, index) => ids.indexOf(id) !== index) };
  });
}

test.describe('GRAPHING-FIX2', () => {
  test('editing piecewise branches never disables tracing of other curves', async ({ page }) => {
    await openGraph(page);
    await enterExpression(page, 'x');
    await enterExpression(page, String.raw`\begin{cases}x^2&x<0\\1&x\ge0\end{cases}`);
    await expectTraceWorks(page);
    await page.getByRole('button', { name: 'Expand piecewise branches' }).click();
    const condition = page.locator('[data-testid^="graph-piecewise-draft-condition-"]').first();
    // Invalid past the grace period: the piecewise item hides, the other curve stays traceable.
    await setField(condition, 'x<');
    await page.waitForTimeout(600);
    await expectTraceWorks(page);
    // Valid again: the item is back at once, without pressing Apply.
    await setField(condition, 'x<0');
    await expect(page.getByTestId('graph-scene-paths').locator('path[data-item-id]')).toHaveCount(3);
    await expectTraceWorks(page);
    // Invalid, then deleted: nothing stays stuck.
    await setField(condition, 'x<');
    await page.waitForTimeout(600);
    await page.locator('[data-testid="graph-expression-row"]').nth(1).getByRole('button', { name: /Delete/u }).click();
    await expectTraceWorks(page);
  });

  test('a restriction is a plain expression row, edited as text', async ({ page }) => {
    await openGraph(page);
    await enterExpression(page, String.raw`x=y^2\{y>0\}`);
    const row = page.locator('[data-testid="graph-expression-row"]').first();
    await expect(row.getByRole('button', { name: 'Expand piecewise branches' })).toHaveCount(0);
    await expect(row).not.toHaveAttribute('data-piecewise-state', /.+/u);
    await setField(row.locator('math-field'), String.raw`x=y^2\{y>1\}`);
    await expect(page.getByTestId('graph-scene-points').locator('[data-marker="open"]')).toHaveCount(1);
    const ring = await page.getByTestId('graph-scene-points').locator('[data-marker="open"]').boundingBox();
    const expected = await realPoint(page, 1, 1);
    expect(Math.hypot((ring!.x + ring!.width / 2) - expected.x, (ring!.y + ring!.height / 2) - expected.y)).toBeLessThan(3);
  });

  test('stress: edits, pans, zooms and deletes never vanish or duplicate curves', async ({ page }) => {
    test.setTimeout(300_000);
    await openGraph(page);
    for (const latex of ['x', '\\sin(x)', String.raw`\begin{cases}x^2&x<0\\1&x\ge0\end{cases}`, 'x^2-3']) await enterExpression(page, latex);
    const rows = page.locator('[data-testid="graph-expression-row"]');
    const viewport = page.getByTestId('graph-viewport');
    const box = (await viewport.boundingBox())!;
    let seed = 7; const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const log: string[] = [];
    let expectedItems = 4;
    for (let step = 0; step < 40; step += 1) {
      const action = Math.floor(random() * 6);
      if (action === 0) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + (random() - 0.5) * 300, box.y + box.height / 2 + (random() - 0.5) * 200, { steps: 6 }); await page.mouse.up();
        log.push('pan');
      } else if (action === 1) {
        await page.mouse.move(box.x + random() * box.width, box.y + random() * box.height);
        for (let i = 0; i < 3; i += 1) await page.mouse.wheel(0, random() < 0.5 ? -120 : 120);
        log.push('zoom');
      } else if (action === 2 || action === 3) {
        const expand = page.getByRole('button', { name: 'Expand piecewise branches' });
        if (await expand.count()) await expand.first().click();
        const condition = page.locator('[data-testid^="graph-piecewise-draft-condition-"]').first();
        if (await condition.count()) {
          await setField(condition, action === 2 ? 'x<' : `x<${Math.floor(random() * 4) - 2}`);
          if (random() < 0.5) await page.waitForTimeout(400);
          log.push(action === 2 ? 'piecewise-invalid' : 'piecewise-valid');
          if (action === 2) { await setField(condition, 'x<0'); log.push('piecewise-fixed'); }
        }
      } else if (action === 4 && expectedItems > 2) {
        await rows.nth(Math.floor(random() * expectedItems)).getByRole('button', { name: /Delete/u }).click();
        expectedItems -= 1; log.push('delete');
      } else {
        await enterExpression(page, ['\\cos(x)', 'x^3/10', '\\frac{1}{x}', String.raw`\begin{cases}-x&x<1\\2&x\ge1\end{cases}`][Math.floor(random() * 4)]!);
        expectedItems += 1; log.push('add');
      }
      await expect(page.locator('.graph-status')).toContainText('Ready', { timeout: 15_000 });
      await page.waitForTimeout(300);
      const rowCount = await rows.count();
      const state = await sceneState(page);
        expect(state.duplicates, log.join(',')).toEqual([]);
      expect(state.items.length, log.join(',')).toBe(rowCount);
    }
  });
});
