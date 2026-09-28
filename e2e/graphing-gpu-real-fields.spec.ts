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
  }, latex);
  await page.waitForTimeout(500);
}

test.describe('Graph GPU real fields @gpu', () => {
  test('draws implicit fields on the GPU and refreshes formula curves during gestures', async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.addInitScript(() => {
      const draws: number[] = [];
      (window as unknown as { __gpuDraws: number[] }).__gpuDraws = draws;
      const original = WebGL2RenderingContext.prototype.drawArrays;
      WebGL2RenderingContext.prototype.drawArrays = function drawArrays(...args) {
        draws.push(performance.now());
        return original.apply(this, args);
      };
    });
    await page.setViewportSize({ width: 1440, height: 940 });
    await page.goto('/'); await openGraph(page);
    await enterExpression(page, String.raw`x^2+y^2=9`);
    await enterExpression(page, String.raw`x^2\le y<4`);
    await enterExpression(page, String.raw`y=x\sin\left(\frac{1}{x}\right)`);
    const chip = page.getByTestId('graph-real-renderer');
    await expect(chip).toHaveText('GPU');
    // GPU-drawn items stay in the committed scene (trace reads it) but are not painted twice.
    await expect(page.getByTestId('graph-scene-paths').locator('path[data-item-id]').first()).toBeAttached();
    await page.screenshot({ path: testInfo.outputPath('real-fields-initial.png') });

    const viewport = page.getByTestId('graph-viewport');
    const box = await viewport.boundingBox();
    if (!box) throw new Error('graph viewport has no bounds');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const drawsBefore = await page.evaluate(() => (window as unknown as { __gpuDraws: number[] }).__gpuDraws.length);
    for (let step = 0; step < 10; step += 1) {
      await page.mouse.wheel(0, -100);
      await page.evaluate(() => new Promise(requestAnimationFrame));
      await page.waitForTimeout(20);
    }
    const drawsDuring = await page.evaluate(() => (window as unknown as { __gpuDraws: number[] }).__gpuDraws.length) - drawsBefore;
    expect(drawsDuring).toBeGreaterThanOrEqual(8);
    await expect(page.getByTestId('graph-scene-gesture-paths').locator('path')).not.toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('real-fields-mid-gesture.png') });
    // The committed scene replaces the gesture overlay after settlement.
    await expect(page.getByTestId('graph-scene-gesture-paths').locator('path')).toHaveCount(0, { timeout: 5_000 });
    expect(errors).toEqual([]);
  });

  test('rejects sign changes across poles instead of drawing false asymptote lines', async ({ page }) => {
    const bundle = await build({
      stdin: {
        contents: `
          export { compileGraphExpression } from './src/lib/graphing/evaluator/compile';
          export { createGraphGpuFieldLayer } from './src/lib/graphing/renderers/gpu/field-layer';
          export { buildGraphGpuRealFieldProgram, graphGpuRealFieldValueShading, GRAPH_GPU_REAL_FIELD_SHADING } from './src/lib/graphing/renderers/gpu/real-field';`,
        resolveDir: '.', loader: 'ts',
      },
      bundle: true, write: false, format: 'iife', globalName: 'GraphGpuRealBundle', target: 'es2022',
    });
    await page.setContent('<!doctype html><canvas id="gpu" width="400" height="200"></canvas>');
    await page.addScriptTag({ content: bundle.outputFiles[0]!.text });
    const columns = await page.evaluate(() => {
      type Api = typeof import('../src/lib/graphing/renderers/gpu/real-field') & typeof import('../src/lib/graphing/renderers/gpu/field-layer')
        & typeof import('../src/lib/graphing/evaluator/compile');
      const api = (window as unknown as { GraphGpuRealBundle: Api }).GraphGpuRealBundle;
      const plan = (mathJson: unknown, freeSymbols: string[], id: string) => {
        const compiled = api.compileGraphExpression({ planId: id, sourceRevision: 1, expression: { mathJson: mathJson as never, freeSymbols } });
        if (!compiled.ok) throw new Error(compiled.stopReason.detailCode);
        return compiled.plan;
      };
      const canvas = document.getElementById('gpu') as HTMLCanvasElement;
      const layer = api.createGraphGpuFieldLayer(canvas);
      if (!layer) throw new Error('webgl2 unavailable');
      const program = api.buildGraphGpuRealFieldProgram([
        { left: plan('y', ['y'], 'l'), right: plan(['Tan', 'x'], ['x'], 'r'), operator: '=' },
      ], { key: 'tan', fillsRegion: false });
      if (!('kind' in program)) throw new Error(program.reason);
      const size = { width: 400, height: 200 };
      const uniforms = { viewport: { xMin: -4, xMax: 4, yMin: -2, yMax: 2 }, parameters: [] };
      layer.clear(size);
      layer.draw(program, api.graphGpuRealFieldValueShading(1), uniforms, size, { target: 'field' });
      layer.draw(program, api.GRAPH_GPU_REAL_FIELD_SHADING, {
        ...uniforms,
        integers: { uClauseCount: 1, uFillRegion: 0, uStrokeStyle: 0, uHalo: 0 },
        extra: { uStrict: [0, 0, 0, 0], uColor: [1, 1, 1], uStrokeOpacity: 1, uRegionOpacity: 0, uLineWidth: 2, uPixelRatio: 1 },
      }, size, { inputs: { uField: 'field' }, blend: true });
      const pixels = new Uint8Array(size.width * size.height * 4);
      layer.gl.readPixels(0, 0, size.width, size.height, layer.gl.RGBA, layer.gl.UNSIGNED_BYTE, pixels);
      const litRowsInColumn = (x: number) => {
        const column = Math.round((x + 4) / 8 * size.width);
        let lit = 0;
        for (let row = 0; row < size.height; row += 1) if (pixels[(row * size.width + column) * 4 + 3]! > 64) lit += 1;
        return lit;
      };
      return { pole: litRowsInColumn(Math.PI / 2), negativePole: litRowsInColumn(-Math.PI / 2), curve: litRowsInColumn(0.6) };
    });
    // A vertical false line would light most rows of the pole column.
    expect(columns.pole).toBeLessThan(12);
    expect(columns.negativePole).toBeLessThan(12);
    expect(columns.curve).toBeGreaterThan(0);
  });
});
