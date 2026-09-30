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

/** Client coordinates of (x, y) in the Real pane. */
async function realPoint(page: Page, x: number, y: number) {
  const host = page.getByTestId('graph-viewport');
  const box = await host.boundingBox();
  const view = (await host.getAttribute('data-viewport'))?.split(',').map(Number);
  if (!box || !view) throw new Error('real pane has no viewport');
  const [xMin, xMax, yMin, yMax] = view as [number, number, number, number];
  return { x: box.x + (x - xMin) / (xMax - xMin) * box.width, y: box.y + (yMax - y) / (yMax - yMin) * box.height };
}

test.describe('PTX points of interest in the Real pane', () => {
  test('shows intersection dots for x and x^2, snaps only on arrival, and jumps with Shift+Arrow', async ({ page }, testInfo) => {
    await openGraph(page);
    await enterExpression(page, 'x');
    await enterExpression(page, 'x^2');
    const callout = page.locator('.graph-trace-callout');
    // Trace the parabola: that selects it, and its dots appear.
    const start = await realPoint(page, 2, 4);
    await page.mouse.click(start.x, start.y);
    await expect(callout).toBeVisible();
    await expect(page.getByTestId('graph-ptx-dot')).not.toHaveCount(0, { timeout: 8_000 });
    await expect(callout).toHaveAttribute('data-ptx-badge', 'verified');
    // Sweeping onto (1, 1) snaps to the intersection; nearby is plain tracing.
    const crossing = await realPoint(page, 1, 1);
    await page.mouse.move(crossing.x, crossing.y, { steps: 6 });
    await expect(callout).toHaveText(/^Intersection \(1, 1\)$/u);
    await expect(callout).toHaveAttribute('data-ptx-badge', 'exact');
    const near = await realPoint(page, 1.25, 1.5625);
    await page.mouse.move(near.x, near.y, { steps: 4 });
    await expect(callout).toHaveText('(1.25, 1.5625)');
    await page.screenshot({ path: testInfo.outputPath('ptx-real-dots.png') });
    await page.keyboard.press('Shift+ArrowLeft');
    await expect(callout).toHaveText(/^Intersection \(1, 1\)$/u);
    await page.keyboard.press('Shift+ArrowLeft');
    await expect(callout).toHaveText(/^(?:Intersection|Root|Extremum) \(0, 0\)$/u);
  });

  test('never pulls a trace toward a dot it has not reached', async ({ page }) => {
    await openGraph(page);
    await enterExpression(page, String.raw`\frac{\sin x}{x}`);
    const callout = page.locator('.graph-trace-callout');
    const start = await realPoint(page, 2, Math.sin(2) / 2);
    await page.mouse.click(start.x, start.y);
    await expect(callout).toBeVisible();
    await page.waitForTimeout(900);
    // Approaching the hole at x = 0 (its ring is a point of interest), the readout is f at the pointer each step.
    for (const x of [0.6, 0.4, 0.25]) {
      const point = await realPoint(page, x, Math.sin(x) / x);
      await page.mouse.move(point.x, point.y);
      await expect.poll(async () => {
        const match = /^\(([\d.]+), ([\d.]+)\)$/u.exec(await callout.textContent() ?? '');
        return match ? Math.abs(Number(match[2]) - Math.sin(Number(match[1])) / Number(match[1])) : 1;
      }).toBeLessThan(1e-5);
    }
    // Only on the ring itself does the trace take the hole: no value there, only the limit.
    const hole = await realPoint(page, 0.01, 1);
    await page.mouse.move(hole.x, hole.y);
    await expect(callout).toHaveText(/^\(0, undefined\) · limit 1$/u);
  });
});
