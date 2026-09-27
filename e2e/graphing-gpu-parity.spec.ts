import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { compileGraphExpression } from '../src/lib/graphing/evaluator';
import { interpretGraphComplexProgramF32, translateGraphComplexMapping } from '../src/lib/graphing/renderers/gpu/complex-program';
import type { GraphGpuProgram } from '../src/lib/graphing/renderers/gpu/field-layer';
import { interpretGraphRealProgramF32, translateGraphRealPlan } from '../src/lib/graphing/renderers/gpu/real-program';

// Driver parity: the real field layer runs in the browser's WebGL2 driver and
// its read-back values are compared with the float32 reference interpreters,
// which the Node suite already holds to the CPU authorities.

const SIZE = { width: 48, height: 32 };
const VIEWPORT = { xMin: -3.1, xMax: 2.9, yMin: -2.05, yMax: 1.95 };

function realProgram(mathJson: unknown, freeSymbols: string[]) {
  const compiled = compileGraphExpression({ planId: `parity.${JSON.stringify(mathJson)}`, sourceRevision: 1,
    expression: { mathJson: mathJson as never, freeSymbols } });
  if (!compiled.ok) throw new Error(compiled.stopReason.detailCode);
  const program = translateGraphRealPlan(compiled.plan);
  if (!('kind' in program)) throw new Error(program.reason);
  return program;
}

function complexProgram(mathJson: unknown) {
  const program = translateGraphComplexMapping(mathJson, { key: `parity.${JSON.stringify(mathJson)}` });
  if (!('kind' in program)) throw new Error(program.reason);
  return program;
}

const PROGRAMS: GraphGpuProgram[] = [
  realProgram(['Add', ['Power', 'x', 2], ['Power', 'y', 2], -4], ['x', 'y']),
  realProgram(['Power', 'y', ['Add', ['Sin', 'x'], ['Negate', ['Cos', 'x']]]], ['x', 'y']),
  realProgram(['Sin', ['Ln', ['Add', ['Cos', 'y'], 'x']]], ['x', 'y']),
  // A fixed modulus: with a modulus near 0, mod jumps many times inside one
  // pixel and no driver can agree pixel-for-pixel (Node parity covers it).
  realProgram(['Add', ['Mod', ['Multiply', 3, 'x'], 1.7], ['Root', 'x', 3], ['Sqrt', ['Add', 'y', 1]]], ['x', 'y']),
  realProgram(['Add', ['Multiply', 'a', 'x'], ['Arcsin', ['Divide', 'y', 2]]], ['x', 'y', 'a']),
  complexProgram(['Add', ['Log', ['Add', 'z', -1]], ['Divide', 1, 'z']]),
  complexProgram(['Divide', ['Power', 'z', 3], ['Add', ['Power', 'z', 2], 1]]),
  complexProgram(['Add', ['Sqrt', 'z'], ['Arctan', ['Divide', 'z', 2]], ['Exp', ['Multiply', ['Complex', 0, 1], 'z']]]),
];


function evaluate(program: GraphGpuProgram, x: number, y: number, parameters: number[]) {
  return program.kind === 'real'
    ? interpretGraphRealProgramF32(program, x, y, parameters)
    : interpretGraphComplexProgramF32(program, { re: x, im: y }, parameters);
}

function pair(value: number | { re: number; im: number }): [number, number] {
  return typeof value === 'number' ? [value, 0] : [value.re, value.im];
}

let bundle = '';
test.beforeAll(async () => {
  const result = await build({
    entryPoints: ['src/lib/graphing/renderers/gpu/field-layer.ts'],
    bundle: true, write: false, format: 'iife', globalName: 'GraphGpuFieldLayerBundle', target: 'es2022',
  });
  bundle = result.outputFiles[0]!.text;
});

// Opt-in hardware run: GRAPH_GPU_CHROME=/usr/bin/google-chrome uses the
// machine's GPU instead of Playwright's software-rendered headless shell.
if (process.env.GRAPH_GPU_CHROME) {
  test.use({ launchOptions: { executablePath: process.env.GRAPH_GPU_CHROME,
    args: ['--enable-gpu', '--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist'] } });
}

test.describe('Graph GPU driver parity @gpu', () => {
  test('field layer matches the float32 reference programs pixel for pixel', async ({ page }) => {
    await page.setContent('<!doctype html><canvas id="gpu" width="48" height="32"></canvas>');
    await page.addScriptTag({ content: bundle });
    const readBack = await page.evaluate(({ programs, viewport, size }) => {
      const api = (window as unknown as { GraphGpuFieldLayerBundle: typeof import('../src/lib/graphing/renderers/gpu/field-layer') }).GraphGpuFieldLayerBundle;
      const canvas = document.getElementById('gpu') as HTMLCanvasElement;
      const layer = api.createGraphGpuFieldLayer(canvas);
      if (!layer) return { error: 'webgl2-unavailable' };
      if (!layer.floatTargets) return { error: 'float-targets-unavailable' };
      const outputs = programs.map((program) => {
        const pixels = layer.readRaw(program, { viewport, parameters: program.parameterNames.map(() => 1.5) }, size);
        return pixels ? Array.from(pixels) : null;
      });
      const compiledAfterFirstPass = layer.compiledPrograms;
      // Pan/zoom/slider changes are uniform updates: no new programs.
      layer.readRaw(programs[0]!, { viewport: { xMin: -9, xMax: 7, yMin: -4, yMax: 5 }, parameters: [] }, size);
      layer.readRaw(programs[4]!, { viewport, parameters: [-2.25] }, size);
      const compiledAfterUniformChanges = layer.compiledPrograms;
      const debugInfo = layer.gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = debugInfo ? String(layer.gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)) : 'masked';
      const loseContext = layer.gl.getExtension('WEBGL_lose_context');
      loseContext?.loseContext();
      const drawWhileLost = layer.draw(programs[0]!, { id: 'raw', body: 'outColor = vec4(1.0);' }, { viewport, parameters: [] }, size);
      const lostReported = layer.isContextLost();
      layer.dispose();
      return { renderer, outputs, compiledAfterFirstPass, compiledAfterUniformChanges, drawWhileLost, lostReported };
    }, { programs: PROGRAMS, viewport: VIEWPORT, size: SIZE });
    if ('error' in readBack) throw new Error(String(readBack.error));

    expect(readBack.compiledAfterFirstPass).toBe(PROGRAMS.length);
    expect(readBack.compiledAfterUniformChanges).toBe(PROGRAMS.length);
    expect(readBack.drawWhileLost).toBe(false);
    expect(readBack.lostReported).toBe(true);

    const f = Math.fround;
    const report: string[] = [];
    PROGRAMS.forEach((program, index) => {
      const pixels = readBack.outputs[index];
      expect(pixels, `program ${index} read back`).not.toBeNull();
      let domainMismatches = 0; let valueMismatches = 0; let compared = 0;
      for (let row = 0; row < SIZE.height; row += 1) {
        for (let column = 0; column < SIZE.width; column += 1) {
          const offset = (row * SIZE.width + column) * 4;
          const gpuOk = pixels![offset + 2]! > 0.5;
          const x = f(VIEWPORT.xMin + (VIEWPORT.xMax - VIEWPORT.xMin) * f((column + 0.5) / SIZE.width));
          const y = f(VIEWPORT.yMin + (VIEWPORT.yMax - VIEWPORT.yMin) * f((row + 0.5) / SIZE.height));
          const parameters = program.parameterNames.map(() => 1.5);
          const reference = evaluate(program, x, y, parameters);
          if ((reference !== null) !== gpuOk) { domainMismatches += 1; continue; }
          if (reference === null) continue;
          const [expectedRe, expectedIm] = pair(reference);
          const tolerance = 2e-3 * Math.max(1, Math.hypot(expectedRe, expectedIm));
          // Skip pixels on a jump discontinuity (floor/mod/branch cuts): within
          // a quarter pixel either side is a valid value for the driver.
          const quarter = [(VIEWPORT.xMax - VIEWPORT.xMin) / SIZE.width / 4, (VIEWPORT.yMax - VIEWPORT.yMin) / SIZE.height / 4];
          const discontinuous = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
            const nearby = evaluate(program, x + dx! * quarter[0]!, y + dy! * quarter[1]!, parameters);
            if (nearby === null) return true;
            const [nearRe, nearIm] = pair(nearby);
            return Math.hypot(nearRe - expectedRe, nearIm - expectedIm) > tolerance * 50;
          });
          if (discontinuous) continue;
          compared += 1;
          const error = Math.hypot(pixels![offset]! - expectedRe, pixels![offset + 1]! - expectedIm);
          if (error > tolerance) valueMismatches += 1;
        }
      }
      report.push(`#${index} compared=${compared} domain=${domainMismatches} value=${valueMismatches}`);
      // Domain edges may flip at most a handful of boundary pixels between
      // float32 paths; interior disagreements would be a translation bug.
      expect(domainMismatches, report.at(-1)).toBeLessThanOrEqual(Math.ceil(SIZE.width * SIZE.height * 0.01));
      expect(valueMismatches, report.at(-1)).toBeLessThanOrEqual(Math.ceil(compared * 0.01));
      expect(compared).toBeGreaterThan(0);
    });
    test.info().annotations.push({ type: 'gpu-parity', description: `${readBack.renderer}: ${report.join('; ')}` });
  });
});
