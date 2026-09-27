#!/usr/bin/env node
// Browser WebGL2 probe for Graph GPU feasibility evidence. Runs the shared
// probe in Chrome with hardware ANGLE, Chrome with SwiftShader, and
// Playwright WebKit (an imperfect proxy for the packaged WebKitGTK webview).
//
// Usage: node tools/graph-gpu/browser-probe.mjs [--out <file>] [--chrome <path>]
import fs from 'node:fs/promises';
import { chromium, webkit } from '@playwright/test';
import { runWebglProbe } from '../../src/lib/graphing/renderers/gpu/probe.ts';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const chromePath = option('--chrome', process.env.GRAPH_GPU_CHROME ?? '/usr/bin/google-chrome');
const outFile = option('--out', null);

const environments = [
  {
    environment: 'chrome-hardware-angle',
    launch: () => chromium.launch({
      headless: true,
      executablePath: chromePath,
      args: ['--enable-gpu', '--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist'],
    }),
  },
  {
    environment: 'chrome-swiftshader',
    launch: () => chromium.launch({
      headless: true,
      executablePath: chromePath,
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    }),
  },
  { environment: 'playwright-webkit', launch: () => webkit.launch({ headless: true }) },
];

const reports = [];
for (const entry of environments) {
  let browser = null;
  try {
    browser = await entry.launch();
    const page = await browser.newPage();
    await page.setContent('<!doctype html><title>probe</title>');
    const probe = await page.evaluate(`(${runWebglProbe.toString()})()`);
    reports.push({ environment: entry.environment, browserVersion: browser.version(), probe });
  } catch (error) {
    reports.push({ environment: entry.environment, error: error instanceof Error ? error.message.split('\n')[0] : String(error) });
  } finally {
    await browser?.close();
  }
}
const text = `${JSON.stringify({ capturedAt: new Date().toISOString(), reports }, null, 2)}\n`;
if (outFile) await fs.writeFile(outFile, text);
process.stdout.write(text);
