import { expect, test, type Page } from '@playwright/test';
import { build } from 'esbuild';

async function openGraph(page: Page) {
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

test.describe('Graph GPU complex loci @gpu', () => {
  test('draws a circle, rays without a false branch-cut edge, and a filled disk', async ({ page }) => {
    const bundle = await build({
      stdin: {
        contents: `
          export { createGraphGpuFieldLayer } from './src/lib/graphing/renderers/gpu/field-layer';
          export { buildGraphGpuComplexLocusProgram } from './src/lib/graphing/renderers/gpu/complex-locus';
          export { graphGpuRealFieldValueShading, GRAPH_GPU_REAL_FIELD_SHADING } from './src/lib/graphing/renderers/gpu/real-field';`,
        resolveDir: '.', loader: 'ts',
      },
      bundle: true, write: false, format: 'iife', globalName: 'GraphGpuLocusBundle', target: 'es2022',
    });
    await page.setContent('<!doctype html><canvas id="gpu" width="400" height="400"></canvas>');
    await page.addScriptTag({ content: bundle.outputFiles[0]!.text });
    const result = await page.evaluate(() => {
      type Api = typeof import('../src/lib/graphing/renderers/gpu/field-layer') & typeof import('../src/lib/graphing/renderers/gpu/complex-locus')
        & typeof import('../src/lib/graphing/renderers/gpu/real-field');
      const api = (window as unknown as { GraphGpuLocusBundle: Api }).GraphGpuLocusBundle;
      const canvas = document.getElementById('gpu') as HTMLCanvasElement;
      const layer = api.createGraphGpuFieldLayer(canvas, {}, { preserveDrawingBuffer: true });
      if (!layer) throw new Error('webgl2 unavailable');
      const size = { width: 400, height: 400 };
      const viewport = { xMin: -4, xMax: 4, yMin: -4, yMax: 4 };
      const render = (clauses: Array<{ left: unknown; operator: '=' | '<'; right: unknown }>, fillsRegion: boolean) => {
        const program = api.buildGraphGpuComplexLocusProgram(clauses, { key: JSON.stringify(clauses), fillsRegion });
        if (!('kind' in program)) throw new Error(program.reason);
        const uniforms = { viewport, parameters: [] };
        layer.clear(size);
        layer.draw(program, api.graphGpuRealFieldValueShading(program.clauseCount), uniforms, size, { target: 'field' });
        layer.draw(program, api.GRAPH_GPU_REAL_FIELD_SHADING, {
          ...uniforms,
          integers: { uClauseCount: program.clauseCount, uFillRegion: fillsRegion ? 1 : 0, uStrokeStyle: 0, uHalo: 0 },
          extra: {
            uStrict: [0, 0, 0, 0], uColor: [1, 1, 1], uStrokeOpacity: 1, uRegionOpacity: 0.5,
            uLineWidth: 2, uPixelRatio: 1,
          },
        }, size, { inputs: { uField: 'field' }, blend: true });
        const pixels = new Uint8Array(size.width * size.height * 4);
        layer.gl.readPixels(0, 0, size.width, size.height, layer.gl.RGBA, layer.gl.UNSIGNED_BYTE, pixels);
        // Alpha at graph coordinates (x, y); readPixels rows start at the bottom.
        return (x: number, y: number) => {
          const column = Math.round((x - viewport.xMin) / 8 * size.width);
          const row = Math.round((y - viewport.yMin) / 8 * size.height);
          return pixels[(row * size.width + column) * 4 + 3]!;
        };
      };
      const litAround = (alphaAt: (x: number, y: number) => number, x: number, y: number) => (
        Math.max(...[-0.03, 0, 0.03].flatMap((dx) => [-0.03, 0, 0.03].map((dy) => alphaAt(x + dx, y + dy)))));
      const circle = render([{ left: ['Abs', ['Add', 'z', -1]], operator: '=', right: 2 }], false);
      const ray = render([{ left: ['Arg', 'z'], operator: '=', right: Math.PI / 4 }], false);
      // arg = 3 rad lies just above the cut, where a false edge would be hardest to tell apart.
      const nearCut = render([{ left: ['Arg', 'z'], operator: '=', right: 3 }], false);
      const disk = render([{ left: ['Abs', 'z'], operator: '<', right: 2 }], true);
      return {
        circleOn: [litAround(circle, 3, 0), litAround(circle, -1, 0), litAround(circle, 1, 2), litAround(circle, 1, -2)],
        circleOff: [litAround(circle, 1, 0), litAround(circle, 0, 3)],
        rayOn: litAround(ray, 2, 2),
        // The negative real axis is the arg branch cut: arg jumps by 2 pi there but is never pi/4.
        rayCut: [litAround(ray, -2, 0), litAround(ray, -3, 0), litAround(ray, -1, 0.02)],
        rayOff: litAround(ray, 2, -2),
        nearCutOn: litAround(nearCut, 3 * Math.cos(3), 3 * Math.sin(3)),
        nearCutEdge: [litAround(nearCut, -2, 0), litAround(nearCut, -3.5, 0)],
        diskInside: disk(0.5, 0.5), diskOutside: disk(3, 3),
      };
    });
    for (const alpha of result.circleOn) expect(alpha).toBeGreaterThan(64);
    for (const alpha of result.circleOff) expect(alpha).toBe(0);
    expect(result.rayOn).toBeGreaterThan(64);
    for (const alpha of result.rayCut) expect(alpha).toBe(0);
    expect(result.rayOff).toBe(0);
    expect(result.nearCutOn).toBeGreaterThan(64);
    for (const alpha of result.nearCutEdge) expect(alpha).toBe(0);
    expect(result.diskInside).toBeGreaterThan(32);
    expect(result.diskOutside).toBe(0);
  });

  test('keeps drawing a locus live in the Complex pane beyond the area the CPU sampled', async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 940 });
    await page.goto('/');
    await openGraph(page);
    // The circle |z - 15| = 8 mostly lies outside the first view (-10..10), so the CPU scene holds only an arc.
    await enterExpression(page, String.raw`|z-15|=8`);
    await expect(page.locator('.graph-domain-switch [aria-pressed="true"]')).toHaveText('Complex');
    const canvas = page.locator('canvas.graph-complex-overlay-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('complex pane has no bounds');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    // Zoom out mid-gesture; the settled CPU sample has not caught up yet.
    for (let step = 0; step < 6; step += 1) await page.mouse.wheel(0, 200);
    await page.evaluate(() => new Promise(requestAnimationFrame));
    const farSide = await canvas.evaluate((element: HTMLCanvasElement) => {
      const [xMin, xMax, yMin, yMax] = (element.dataset.viewport ?? '').split(',').map(Number) as [number, number, number, number];
      const context = element.getContext('2d')!;
      const brightestBlue = (re: number, im: number) => {
        const px = Math.round((re - xMin) / (xMax - xMin) * element.width); const py = Math.round((yMax - im) / (yMax - yMin) * element.height);
        const data = context.getImageData(px - 4, py - 4, 9, 9).data;
        let best = 0;
        for (let index = 0; index < data.length; index += 4) best = Math.max(best, data[index + 2]! - data[index]!);
        return best;
      };
      // Points of the circle that were far outside the sampled view: 23, 15 + 8i, 15 - 8i.
      return { view: [xMin, xMax, yMin, yMax], east: brightestBlue(23, 0), north: brightestBlue(15, 8), south: brightestBlue(15, -8) };
    });
    expect(farSide.view[1]).toBeGreaterThan(23);
    expect(farSide.east).toBeGreaterThan(80);
    expect(farSide.north).toBeGreaterThan(80);
    expect(farSide.south).toBeGreaterThan(80);
    await page.screenshot({ path: testInfo.outputPath('gpu-locus-mid-gesture.png') });
    // Both shows the same locus in the Real pane at x = Re z, y = Im z, drawn by the GPU there too.
    await page.getByRole('button', { name: 'Both', exact: true }).click();
    await expect(page.getByTestId('graph-real-renderer')).toHaveText('GPU');
    await page.screenshot({ path: testInfo.outputPath('gpu-locus-both.png') });
    expect(errors).toEqual([]);
  });
});
