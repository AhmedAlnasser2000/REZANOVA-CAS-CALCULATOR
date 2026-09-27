#!/usr/bin/env node
// Graph benchmark harness (non-gating). Measures gesture responsiveness for
// Calcwiz and the local Equation.io mirror on identical cases.
//
//   node tools/graph-bench/run.mjs --target calcwiz --url http://127.0.0.1:4173/
//   node tools/graph-bench/run.mjs --target equation-io --url http://127.0.0.1:4177/
//
// Options: --gpu hardware|swiftshader, --cases id,id, --out <dir>, --chrome <path>,
//          --repeat <n>. Calcwiz needs `npm run preview:test` (or any served
//          build); Equation.io commands live in playground/sources/metadata/equation-io.yaml.
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { selectGraphBenchCases } from './cases.mjs';
import { installGraphBenchInstrumentation } from './instrument.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const target = option('--target', 'calcwiz');
const url = option('--url', target === 'calcwiz' ? 'http://127.0.0.1:4173/' : 'http://127.0.0.1:4177/');
const gpu = option('--gpu', 'hardware');
const outDir = path.resolve(option('--out', '.task_tmp/graph-bench'));
const chromePath = option('--chrome', process.env.GRAPH_GPU_CHROME ?? '/usr/bin/google-chrome');
const repeat = Math.max(1, Number(option('--repeat', '1')));
const cases = selectGraphBenchCases(option('--cases', '')?.split(',').filter(Boolean));
if (!['calcwiz', 'equation-io'].includes(target)) throw new Error(`Unknown --target ${target}`);
if (!['hardware', 'swiftshader'].includes(gpu)) throw new Error(`Unknown --gpu ${gpu}`);

const GPU_ARGS = {
  hardware: ['--enable-gpu', '--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist'],
  swiftshader: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
};

function summarizeFrames(frames) {
  const intervals = frames.slice(1).map((value, index) => value - frames[index]).sort((a, b) => a - b);
  if (intervals.length === 0) return { frameCount: 0, avgFrameMs: null, p95FrameMs: null, longFrames: 0 };
  return {
    frameCount: intervals.length,
    avgFrameMs: Number((intervals.reduce((sum, value) => sum + value, 0) / intervals.length).toFixed(2)),
    p95FrameMs: Number(intervals[Math.floor(intervals.length * 0.95)].toFixed(2)),
    longFrames: intervals.filter((value) => value > 34).length,
  };
}

async function prepareCalcwiz(page, entry) {
  await page.goto(url);
  await page.getByTestId('workspace-tab-add-menu').click();
  await page.getByRole('menuitem', { name: 'New Graph' }).click();
  await page.getByTestId('graph-page').waitFor();
  await page.locator('math-field').last().evaluate((element, value) => {
    element.setValue(value);
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  }, entry.calcwiz);
  if (entry.pane === 'complex') {
    const canvas = page.getByTestId('graph-complex-viewport').locator('canvas');
    await canvas.waitFor();
    return canvas;
  }
  if (entry.pane === 'real-3d') {
    await page.getByRole('button', { name: '3D' }).first().click();
    const canvas = page.getByTestId('graph-three-viewport').locator('.graph-three-canvas');
    await canvas.waitFor();
    return canvas;
  }
  const viewport = page.getByTestId('graph-viewport');
  await viewport.waitFor();
  return viewport;
}

async function prepareEquationIo(page, entry) {
  await page.goto(`${url.replace(/\/$/, '')}/#${encodeURIComponent(entry.equationIo)}`);
  const canvas = page.locator('#gl');
  await canvas.waitFor();
  return canvas;
}

async function runCase(page, entry, iteration) {
  const surface = target === 'calcwiz' ? await prepareCalcwiz(page, entry) : await prepareEquationIo(page, entry);
  await page.waitForTimeout(1200);
  const box = await surface.boundingBox();
  if (!box) throw new Error(`${entry.id}: gesture surface has no bounds`);
  const prefix = path.join(outDir, `${target}-${gpu}-${entry.id}-${iteration}`);
  await page.screenshot({ path: `${prefix}-before.png` });
  const frame = () => page.evaluate(() => new Promise(requestAnimationFrame));
  const mark = await page.evaluate(() => window.__graphBenchMark());
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.evaluate(() => window.__graphBenchStartFrames());
  if (entry.gesture === 'orbit') {
    if (target === 'calcwiz') await page.keyboard.down('Alt');
    await page.mouse.down();
    for (let step = 1; step <= 40; step += 1) {
      await page.mouse.move(box.x + box.width / 2 + step * 5.5, box.y + box.height / 2 + step * 3);
      await frame();
    }
    await page.mouse.up();
    if (target === 'calcwiz') await page.keyboard.up('Alt');
  } else {
    for (let step = 0; step < 12; step += 1) {
      await page.mouse.wheel(0, -60);
      await frame();
    }
  }
  const inputEnd = await page.evaluate(() => performance.now());
  const frames = await page.evaluate(() => window.__graphBenchStopFrames());
  await page.waitForTimeout(1500);
  const channels = await page.evaluate(({ mark, inputEnd }) => window.__graphBenchSince(mark, inputEnd), { mark, inputEnd });
  await page.screenshot({ path: `${prefix}-after.png` });
  const status = target === 'calcwiz'
    ? await page.locator('.graph-status').first().textContent().catch(() => null)
    : null;
  return { case: entry.id, iteration, gesture: entry.gesture, ...summarizeFrames(frames), ...channels,
    status: status?.trim() ?? null, screenshots: [`${prefix}-before.png`, `${prefix}-after.png`] };
}

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: chromePath, args: GPU_ARGS[gpu] });
const results = [];
let renderer = null;
try {
  for (let iteration = 1; iteration <= repeat; iteration += 1) {
    for (const entry of cases) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 940 }, deviceScaleFactor: 1 });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript(`(${installGraphBenchInstrumentation.toString()})()`);
      try {
        const result = await runCase(page, entry, iteration);
        renderer ??= await page.evaluate(() => {
          const gl = document.createElement('canvas').getContext('webgl2');
          const info = gl?.getExtension('WEBGL_debug_renderer_info');
          return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : null;
        });
        results.push({ ...result, errors });
      } catch (error) {
        results.push({ case: entry.id, iteration, error: error instanceof Error ? error.message.split('\n')[0] : String(error), errors });
      } finally {
        await page.close();
      }
      process.stderr.write(`[graph-bench] ${target} ${entry.id} #${iteration} done\n`);
    }
  }
} finally {
  await browser.close();
}
const report = { target, url, gpu, renderer, browserVersion: browser.version(), capturedAt: new Date().toISOString(), results };
const reportPath = path.join(outDir, `${target}-${gpu}-report.json`);
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
