#!/usr/bin/env node
// Packaged-desktop WebGL2 probe: drives the built Tauri binary through
// `tauri-driver` + WebKitWebDriver (raw W3C WebDriver over fetch, no client
// dependency) and injects the shared WebGL2 probe into the WebKitGTK webview.
//
// Usage: node tools/graph-gpu/desktop-probe.mjs [--binary <path>] [--out <file>]
//   [--native-driver <WebKitWebDriver path>] [--env KEY=VALUE ...] [--verbose] [--smoke]
// `--smoke` also opens a Graph through the UI, switches `z=x^2+y^2` to 3D,
// asserts the Three viewport mounts with a surface mesh, and fails the process
// when WebGL2, float render targets, field precision, or the 3D mount fail.
// WebKit automation is only enabled in debug Tauri builds, and WebKitWebDriver
// must match the installed WebKitGTK version.
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { runWebglProbe } from '../../src/lib/graphing/renderers/gpu/probe.ts';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const binary = path.resolve(option('--binary', path.join(repoRoot, 'src-tauri/target/debug/calcwiz_desktop')));
const smoke = args.includes('--smoke');
const outFile = option('--out', null);
const port = Number(option('--port', '4444'));
const nativeDriver = option('--native-driver', null);
const extraEnv = Object.fromEntries(args
  .flatMap((value, index) => (args[index - 1] === '--env' ? [value.split('=')] : [])));

// Snap-hosted parents leak SNAP*/LD_LIBRARY_PATH, which previously crashed the
// packaged app in libpthread; the driver and app run from a clean environment.
const cleanEnv = Object.fromEntries(Object.entries(process.env)
  .filter(([key]) => !key.startsWith('SNAP') && key !== 'LD_LIBRARY_PATH' && key !== 'LD_PRELOAD'));
Object.assign(cleanEnv, extraEnv);

const base = `http://127.0.0.1:${port}`;
const verbose = args.includes('--verbose');
const log = (message) => { if (verbose) process.stderr.write(`[desktop-probe] ${message}\n`); };
async function webdriver(method, route, body) {
  const response = await fetch(`${base}${route}`, {
    method,
    signal: AbortSignal.timeout(60_000),
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response.json();
  if (!response.ok || payload.value?.error) {
    throw new Error(`${method} ${route}: ${JSON.stringify(payload.value ?? payload)}`);
  }
  return payload.value;
}

async function waitForDriver() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${base}/status`, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
    } catch { /* driver still starting */ }
    await delay(100);
  }
  throw new Error('tauri-driver did not become ready');
}

async function waitFor(label, predicate, timeoutMs = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await predicate().catch(() => null);
    if (value) return value;
    await delay(200);
  }
  throw new Error(`timed out waiting for ${label}`);
}

async function findElement(session, using, value) {
  const element = await webdriver('POST', `/session/${session}/element`, { using, value });
  return Object.values(element)[0];
}

async function click(session, using, value) {
  const id = await waitFor(`${using} ${value}`, () => findElement(session, using, value));
  await webdriver('POST', `/session/${session}/element/${id}/click`, {});
}

const execute = (session, script, scriptArgs = []) => webdriver('POST', `/session/${session}/execute/sync`, { script, args: scriptArgs });

async function runGraphThreeSmoke(session) {
  await click(session, 'css selector', '[data-testid="workspace-tab-add-menu"]');
  await click(session, 'xpath', "//*[@role='menuitem'][contains(normalize-space(.), 'New Graph')]");
  await waitFor('graph page', () => execute(session, "return Boolean(document.querySelector('[data-testid=\"graph-page\"]'));"));
  await waitFor('expression field', () => execute(session, `
    const fields = document.querySelectorAll('math-field');
    const field = fields[fields.length - 1];
    if (!field || typeof field.setValue !== 'function') return false;
    field.setValue('z=x^2+y^2');
    field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    return true;`));
  await click(session, 'xpath', "//button[normalize-space(.)='3D']");
  const mounted = await waitFor('three viewport with surface', () => execute(session, `
    const viewport = document.querySelector('[data-testid="graph-three-viewport"]');
    if (!viewport || viewport.dataset.ready !== 'true') return null;
    const meshes = Number(viewport.dataset.surfaceMeshCount ?? 0);
    const fallback = document.querySelector('.graph-renderer-fallback');
    return meshes > 0 ? { ready: true, surfaceMeshCount: meshes, fallbackVisible: Boolean(fallback) } : null;`), 30_000);
  // The vertex-shader surface draws once the CPU mesh has supplied its height range.
  const chip = await waitFor('surface renderer chip', () => execute(session, `
    const chip = document.querySelector('[data-testid="graph-surface-renderer"]');
    const viewport = document.querySelector('[data-testid="graph-three-viewport"]');
    return chip ? { text: chip.textContent, title: chip.title, gpuSurfaces: Number(viewport?.dataset.gpuSurfaces ?? 0),
      resolution: document.querySelector('canvas.graph-three-canvas')?.dataset.gpuSurfaceResolution ?? '' } : null;`), 30_000);
  await delay(1000);
  const screenshot = await webdriver('GET', `/session/${session}/screenshot`);
  return { ...mounted, chip, screenshot };
}

async function runComplexGpuSmoke(session) {
  // Continue in the same Graph tab: switch the expression to a complex mapping.
  await waitFor('complex expression', () => execute(session, `
    const fields = document.querySelectorAll('math-field');
    const field = fields[0];
    if (!field || typeof field.setValue !== 'function') return false;
    field.setValue('f(z)=\\\\frac{z^3}{z^2+1}');
    field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    return true;`));
  const chip = await waitFor('complex renderer chip', () => execute(session, `
    const chip = document.querySelector('[data-testid="graph-complex-renderer"]');
    return chip && !/starting/u.test(chip.title) ? { text: chip.textContent, title: chip.title } : null;`), 30_000);
  await delay(1500);
  const screenshot = await webdriver('GET', `/session/${session}/screenshot`);
  return { chip, screenshot };
}

async function runRealFieldGpuSmoke(session) {
  await waitFor('implicit expression', () => execute(session, `
    const fields = document.querySelectorAll('math-field');
    const field = fields[0];
    if (!field || typeof field.setValue !== 'function') return false;
    field.setValue('x^2+y^2=9');
    field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    return true;`));
  const chip = await waitFor('real renderer chip', () => execute(session, `
    const chip = document.querySelector('[data-testid="graph-real-renderer"]');
    return chip && !/starting/u.test(chip.title) ? { text: chip.textContent, title: chip.title } : null;`), 30_000);
  await delay(1000);
  const screenshot = await webdriver('GET', `/session/${session}/screenshot`);
  return { chip, screenshot };
}

async function runSurfaceHeatSmoke(session) {
  // Same row, now a real surface: 2D draws it as a GPU height map over the hidden SVG bands.
  await waitFor('surface expression', () => execute(session, `
    const field = document.querySelectorAll('math-field')[0];
    if (!field || typeof field.setValue !== 'function') return false;
    field.setValue('z=x^2-y^2');
    field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    return true;`));
  const heat = await waitFor('surface height map', () => execute(session, `
    const chip = document.querySelector('[data-testid="graph-real-renderer"]');
    const bands = [...document.querySelectorAll('[data-testid="graph-scene-surfaces"] path')];
    if (!chip || /starting/u.test(chip.title) || bands.length === 0) return null;
    return { chip: { text: chip.textContent, title: chip.title },
      visibleSvgBands: bands.filter((band) => band.style.display !== 'none').length };`), 30_000);
  await delay(1000);
  const screenshot = await webdriver('GET', `/session/${session}/screenshot`);
  return { ...heat, screenshot };
}

async function runComplexLocusSmoke(session) {
  // Same row, now a locus in z: the view opens Complex and draws it on the Argand plane.
  await waitFor('locus expression', () => execute(session, `
    const field = document.querySelectorAll('math-field')[0];
    if (!field || typeof field.setValue !== 'function') return false;
    field.setValue('|z-1|=2');
    field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    return true;`));
  const locus = await waitFor('complex locus', () => execute(session, `
    const pressed = document.querySelector('.graph-domain-switch [aria-pressed="true"]')?.textContent ?? '';
    const status = document.querySelector('.graph-complex-toolbar > span')?.textContent ?? '';
    return /locus/u.test(status) ? { mode: pressed, status } : null;`), 30_000);
  await delay(1000);
  // The locus is drawn by the GPU and composited into the Complex pane's canvas: the circle |z-1| = 2 must show
  // as coloured pixels at 3, -1, 1+2i and 1-2i (the Argand plane itself is grey or near black).
  const painted = await execute(session, `
    const canvas = document.querySelector('canvas.graph-complex-overlay-canvas');
    const [xMin, xMax, yMin, yMax] = (canvas?.dataset.viewport ?? '').split(',').map(Number);
    const context = canvas?.getContext('2d');
    if (!context || ![xMin, xMax, yMin, yMax].every(Number.isFinite)) return null;
    const strength = (re, im) => {
      const px = Math.round((re - xMin) / (xMax - xMin) * canvas.width); const py = Math.round((yMax - im) / (yMax - yMin) * canvas.height);
      const data = context.getImageData(px - 4, py - 4, 9, 9).data;
      let best = 0;
      for (let index = 0; index < data.length; index += 4) best = Math.max(best, data[index + 2] - data[index]);
      return best;
    };
    return [strength(3, 0), strength(-1, 0), strength(1, 2), strength(1, -2)];`);
  locus.circlePixels = painted;
  const screenshot = await webdriver('GET', `/session/${session}/screenshot`);
  return { ...locus, screenshot };
}

function smokeFailures(probe, graphThree, complexGpu, realGpu, surfaceHeat, complexLocus) {
  const failures = [];
  if (!probe.webgl2) failures.push('WebGL2 context unavailable');
  if (probe.software === true) failures.push(`software renderer: ${probe.unmaskedRenderer ?? probe.renderer}`);
  if (!probe.extensions?.EXT_color_buffer_float) failures.push('EXT_color_buffer_float unavailable');
  const error = probe.fieldShader?.maxAbsError;
  if (typeof error !== 'number' || error > 1e-4) failures.push(`field shader error ${error}`);
  if (graphThree && (!graphThree.ready || graphThree.surfaceMeshCount < 1)) failures.push('Three 3D viewport did not mount a surface');
  if (graphThree && (graphThree.chip?.text !== 'GPU' || graphThree.chip.gpuSurfaces < 1)) {
    failures.push(`surface is not GPU-rendered: ${graphThree.chip?.text} (${graphThree.chip?.title})`);
  }
  if (complexGpu && complexGpu.chip.text !== 'GPU') failures.push(`complex pane is not GPU-rendered: ${complexGpu.chip.text} (${complexGpu.chip.title})`);
  if (realGpu && realGpu.chip.text !== 'GPU') failures.push(`real fields are not GPU-rendered: ${realGpu.chip.text} (${realGpu.chip.title})`);
  if (surfaceHeat && (surfaceHeat.chip.text !== 'GPU' || surfaceHeat.visibleSvgBands > 0)) {
    failures.push(`2D surface is not a GPU height map: ${surfaceHeat.chip.text}, ${surfaceHeat.visibleSvgBands} SVG bands visible`);
  }
  if (complexLocus && complexLocus.mode !== 'Complex') failures.push(`a locus did not open the Complex view (${complexLocus.mode})`);
  if (complexLocus && !(complexLocus.circlePixels?.every((strength) => strength > 80))) {
    failures.push(`the locus circle is not painted in the Complex pane (${JSON.stringify(complexLocus.circlePixels)})`);
  }
  return failures;
}

await fs.access(binary);
const driverArgs = ['--port', String(port), ...(nativeDriver ? ['--native-driver', path.resolve(nativeDriver)] : [])];
const driver = spawn('tauri-driver', driverArgs, { env: cleanEnv, stdio: ['ignore', 'pipe', 'pipe'] });
let driverLog = '';
driver.stdout.on('data', (chunk) => { driverLog += chunk; });
driver.stderr.on('data', (chunk) => { driverLog += chunk; });
let sessionId = null;
try {
  await waitForDriver();
  log('driver ready; creating session');
  const session = await webdriver('POST', '/session', {
    capabilities: { alwaysMatch: { 'tauri:options': { application: binary } } },
  });
  sessionId = session.sessionId;
  log(`session ${sessionId}; running probe`);
  await delay(1500);
  const probe = await webdriver('POST', `/session/${sessionId}/execute/sync`, {
    script: `return (${runWebglProbe.toString()})();`,
    args: [],
  });
  let graphThree = null;
  if (smoke) {
    log('probe captured; running Graph 3D smoke');
    const three = await runGraphThreeSmoke(sessionId);
    graphThree = { ready: three.ready, surfaceMeshCount: three.surfaceMeshCount, fallbackVisible: three.fallbackVisible, chip: three.chip };
    if (outFile) await fs.writeFile(outFile.replace(/\.json$/u, '') + '-surface.png', Buffer.from(three.screenshot, 'base64'));
  }
  let complexGpu = null;
  if (smoke) {
    await click(sessionId, 'xpath', "//button[normalize-space(.)='2D']");
    log('running complex GPU smoke');
    const complex = await runComplexGpuSmoke(sessionId);
    complexGpu = { chip: complex.chip };
    if (outFile) await fs.writeFile(outFile.replace(/\.json$/u, '') + '-complex.png', Buffer.from(complex.screenshot, 'base64'));
  }
  let realGpu = null;
  if (smoke) {
    await click(sessionId, 'xpath', "//button[normalize-space(.)='Real']");
    log('running real-field GPU smoke');
    const real = await runRealFieldGpuSmoke(sessionId);
    realGpu = { chip: real.chip };
    if (outFile) await fs.writeFile(outFile.replace(/\.json$/u, '') + '-real.png', Buffer.from(real.screenshot, 'base64'));
  }
  let surfaceHeat = null;
  if (smoke) {
    log('running 2D surface height-map smoke');
    const heat = await runSurfaceHeatSmoke(sessionId);
    surfaceHeat = { chip: heat.chip, visibleSvgBands: heat.visibleSvgBands };
    if (outFile) await fs.writeFile(outFile.replace(/\.json$/u, '') + '-heat.png', Buffer.from(heat.screenshot, 'base64'));
  }
  let complexLocus = null;
  if (smoke) {
    log('running complex locus smoke');
    const locus = await runComplexLocusSmoke(sessionId);
    complexLocus = { mode: locus.mode, status: locus.status, circlePixels: locus.circlePixels };
    if (outFile) await fs.writeFile(outFile.replace(/\.json$/u, '') + '-locus.png', Buffer.from(locus.screenshot, 'base64'));
  }
  const failures = smoke ? smokeFailures(probe, graphThree, complexGpu, realGpu, surfaceHeat, complexLocus) : [];
  const report = {
    environment: 'packaged-tauri-webkitgtk',
    binary: path.relative(repoRoot, binary),
    extraEnv,
    capturedAt: new Date().toISOString(),
    probe,
    ...(smoke ? { graphThree, complexGpu, realGpu, surfaceHeat, complexLocus, failures } : {}),
  };
  const text = `${JSON.stringify(report, null, 2)}\n`;
  if (outFile) await fs.writeFile(outFile, text);
  process.stdout.write(text);
  if (failures.length > 0) {
    process.stderr.write(`desktop smoke failed:\n- ${failures.join('\n- ')}\n`);
    process.exitCode = 1;
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n--- driver log ---\n${driverLog}\n`);
  process.exitCode = 1;
} finally {
  if (sessionId) await webdriver('DELETE', `/session/${sessionId}`).catch(() => {});
  driver.kill('SIGTERM');
}
