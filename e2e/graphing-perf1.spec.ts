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


/** Whether a pixel of the given colour family is drawn within 4 px of a graph point (read from a real screenshot). */
async function colourNear(page: Page, points: Array<{ x: number; y: number }>, test: (r: number, g: number, b: number) => boolean) {
  const shot = (await page.screenshot()).toString('base64');
  const screen = await Promise.all(points.map((point) => realPoint(page, point.x, point.y)));
  return page.evaluate(async ({ shot, screen, test }) => {
    const image = new Image(); image.src = `data:image/png;base64,${shot}`;
    await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
    const matches = new Function('r', 'g', 'b', `return (${test})(r, g, b);`) as (r: number, g: number, b: number) => boolean;
    return screen.map(({ x, y }) => {
      const data = context.getImageData(Math.round(x) - 4, Math.round(y) - 4, 9, 9).data;
      for (let index = 0; index < data.length; index += 4) if (matches(data[index]!, data[index + 1]!, data[index + 2]!)) return true;
      return false;
    });
  }, { shot, screen, test: test.toString() });
}

const blue = (r: number, g: number, b: number) => b > 180 && b - r > 70 && b - g > 20;
const green = (r: number, g: number, b: number) => g > 170 && g - r > 60 && g - b > 40;

for (const gpu of [true, false]) {
  test.describe(`GRAPHING-PERF1 touching curves are visible (GPU ${gpu ? 'on' : 'off'})`, () => {
    test.beforeEach(async ({ page }) => {
      if (!gpu) await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function getContext(this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
          return kind === 'webgl2' ? null : (original as (...args: unknown[]) => unknown).call(this, kind, ...rest);
        } as typeof original;
      });
    });

    test('draws (x − y)² = 0 as a solid line and x² + y² = 0 as a dot', async ({ page }, testInfo) => {
      await openGraph(page);
      await enterExpression(page, '(x-y)^2=0');
      await expect(page.locator('[data-path-id$=":touching:0"]')).toHaveCount(1);
      // With the GPU field drawing the item, its CPU touching path must still be painted (it was hidden before PERF1).
      if (gpu) await expect(page.getByTestId('graph-real-renderer')).toHaveText('GPU');
      await expect(page.locator('[data-path-id$=":touching:0"]')).toBeVisible();
      await page.waitForTimeout(600);
      const along = [-4, -2.5, -1, 0.5, 2, 3.5].map((t) => ({ x: t, y: t }));
      expect(await colourNear(page, along, blue)).toEqual(along.map(() => true));
      // The GPU field itself paints nothing on a curve that only touches zero: pixel centres exactly on the
      // line (F = 0 in fp32) once drew blobs there, which beaded the CPU line.
      await page.locator('[data-path-id$=":touching:0"]').evaluate((node) => { (node as SVGElement).style.visibility = 'hidden'; });
      const dense = Array.from({ length: 41 }, (_, index) => ({ x: -5 + index / 4, y: -5 + index / 4 }));
      expect(await colourNear(page, dense, blue)).toEqual(dense.map(() => false));
      await page.locator('[data-path-id$=":touching:0"]').evaluate((node) => { (node as SVGElement).style.visibility = ''; });
      await enterExpression(page, 'x^2+y^2=0');
      await expect(page.locator('[data-testid="graph-scene-points"] [data-marker]')).toHaveCount(1);
      await page.waitForTimeout(600);
      expect(await colourNear(page, [{ x: 0, y: 0 }], green)).toEqual([true]);
      await page.screenshot({ path: testInfo.outputPath(`perf1-touching-gpu-${gpu ? 'on' : 'off'}.png`) });
    });
  });
}
