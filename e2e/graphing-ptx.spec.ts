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

/** Client coordinates of re + im·i in the Complex pane. */
async function complexPoint(page: Page, re: number, im: number) {
  const canvas = page.locator('canvas.graph-complex-overlay-canvas');
  const box = await canvas.boundingBox();
  const view = (await canvas.getAttribute('data-viewport'))?.split(',').map(Number);
  if (!box || !view) throw new Error('complex pane has no viewport');
  const [xMin, xMax, yMin, yMax] = view as [number, number, number, number];
  return { x: box.x + (re - xMin) / (xMax - xMin) * box.width, y: box.y + (yMax - im) / (yMax - yMin) * box.height };
}

const readout = (page: Page) => page.getByTestId('graph-complex-ptx-readout');

test.describe('PTX point tracing', () => {
  test('traces a complex locus on the true curve: click, sweep, step, clear', async ({ page }, testInfo) => {
    await openGraph(page);
    await enterExpression(page, String.raw`|z-1|=2`);
    await expect(page.locator('.graph-complex-toolbar > span').first()).toContainText('1 locus');
    const near = await complexPoint(page, 3.03, 0);
    await page.mouse.click(near.x, near.y);
    await expect(readout(page)).toContainText('z = 3');
    await expect(readout(page)).toHaveAttribute('data-ptx-level', 'numeric-validated');
    await expect(readout(page).locator('.graph-ptx-badge')).toHaveText('verified');
    // Sweeping: the pointer above the circle's top is projected onto it.
    const top = await complexPoint(page, 1.1, 2.4);
    await page.mouse.move(top.x, top.y, { steps: 6 });
    await expect.poll(async () => {
      const match = /z = ([-−\d.]+) \+ ([\d.]+)i/u.exec(await readout(page).textContent() ?? '');
      return match ? Math.abs(Math.hypot(Number(match[1]!.replace('−', '-')) - 1, Number(match[2])) - 2) : 1;
    }).toBeLessThan(1e-4);
    const before = await readout(page).textContent();
    await page.keyboard.press('ArrowRight');
    await expect(readout(page)).not.toHaveText(before ?? '');
    await page.screenshot({ path: testInfo.outputPath('ptx-complex-locus.png') });
    await page.keyboard.press('Escape');
    await expect(readout(page)).toHaveCount(0);
  });

  test('snaps to a locus intersection dot only on arrival', async ({ page }) => {
    await openGraph(page);
    await enterExpression(page, String.raw`|z|=2`);
    await enterExpression(page, String.raw`|z-2|=2`);
    const start = await complexPoint(page, 2.02, 0);
    await page.mouse.click(start.x, start.y);
    await expect(readout(page)).toContainText('z = 2');
    // Wait for the points of interest (computed in the worker) before sweeping onto one.
    await page.waitForTimeout(900);
    const crossing = await complexPoint(page, 1, Math.sqrt(3));
    await expect.poll(async () => {
      await page.mouse.move(crossing.x + 1, crossing.y + 1);
      return readout(page).textContent();
    }, { timeout: 8_000 }).toContain('Intersection · z = 1 + 1.73205i');
    const away = await complexPoint(page, 1.4, 1.46);
    await page.mouse.move(away.x, away.y);
    await expect(readout(page)).not.toContainText('Intersection');
  });

  test('pins a z-map probe and mirrors a traced locus in the Real pane', async ({ page }) => {
    await openGraph(page);
    await enterExpression(page, 'z^2');
    const probe = await complexPoint(page, 1, 1);
    await page.mouse.click(probe.x, probe.y);
    await expect(readout(page)).toContainText('pinned');
    await expect(readout(page)).toContainText('w = ');
    const elsewhere = await complexPoint(page, -2, -1);
    await page.mouse.move(elsewhere.x, elsewhere.y);
    await expect(readout(page)).toContainText('pinned');
    await page.keyboard.press('Escape');

    await page.locator('[data-graph-item-id] math-field').first().evaluate((element) => {
      const mathField = element as HTMLElement & { setValue: (source: string) => void };
      mathField.setValue('|z-1|=2');
      mathField.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
      mathField.blur();
    });
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: 'Both', exact: true }).click();
    const onCircle = await complexPoint(page, 3.02, 0);
    await page.mouse.click(onCircle.x, onCircle.y);
    await expect(readout(page)).toContainText('z = 3');
    await expect(page.getByTestId('graph-ptx-mirror')).toBeVisible();
  });
});
