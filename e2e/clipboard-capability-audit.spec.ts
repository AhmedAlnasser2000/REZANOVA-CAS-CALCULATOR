import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import {
  closeSidePanelIfOpen,
  openSettingsPanel,
  setMathFieldLatex,
} from './helpers';

const CUSTOM_MIME = 'web application/x-calcwiz-math+json';
const SCREENSHOT_DIR = '.task_tmp/printer-detail-clipboard-program';

test.beforeAll(async () => {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
});

test('Chromium supports the required lossless math clipboard formats', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const result = await page.evaluate(async (customMime) => {
    const serialized = JSON.stringify({
      schema: 'calcwiz.math-clipboard',
      version: 1,
      canonicalLatex: String.raw`x^{\frac{1}{6}}`,
      metadata: { surface: 'display', mode: 'calculate' },
    });
    const item = new ClipboardItem({
      [customMime]: new Blob([serialized], { type: 'application/x-calcwiz-math+json' }),
      'text/html': new Blob(['<span data-calcwiz-math-envelope="audit">x^(1/6)</span>'], {
        type: 'text/html',
      }),
      'text/plain': new Blob(['x^(1/6)'], { type: 'text/plain' }),
    });
    await navigator.clipboard.write([item]);
    const [read] = await navigator.clipboard.read();
    return {
      supports: ClipboardItem.supports(customMime),
      types: read.types,
      custom: await (await read.getType(customMime)).text(),
      html: await (await read.getType('text/html')).text(),
      text: await (await read.getType('text/plain')).text(),
    };
  }, CUSTOM_MIME);

  expect(result.supports).toBe(true);
  expect(result.types).toEqual(expect.arrayContaining([CUSTOM_MIME, 'text/html', 'text/plain']));
  expect(JSON.parse(result.custom)).toMatchObject({
    schema: 'calcwiz.math-clipboard',
    canonicalLatex: String.raw`x^{\frac{1}{6}}`,
  });
  expect(result.html).toContain('data-calcwiz-math-envelope');
  expect(result.text).toBe('x^(1/6)');
});

test('Display copy keeps visible plain text beside the exact canonical envelope', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.goto('/');
  await openSettingsPanel(page);
  await page.getByTestId('settings-symbolic-mode-powers').click();
  await page.getByTestId('settings-math-notation-plainText').click();
  await closeSidePanelIfOpen(page);

  await setMathFieldLatex(page, String.raw`\left(\sqrt{x}\right)^{\frac{1}{3}}`);
  await page.getByTestId('soft-action-simplify').click();
  await expect(page.getByTestId('display-outcome-exact')).toContainText('x^(1/6)');
  await page.getByTestId('display-outcome-action-copy-result').click();
  await expect(page.getByTestId('display-status')).toHaveText('Result copied');

  const copied = await page.evaluate(async (customMime) => {
    const [item] = await navigator.clipboard.read();
    return {
      envelope: JSON.parse(await (await item.getType(customMime)).text()),
      text: await (await item.getType('text/plain')).text(),
      html: await (await item.getType('text/html')).text(),
    };
  }, CUSTOM_MIME);
  expect(copied.text).toBe('x^(1/6)');
  expect(copied.envelope).toMatchObject({
    schema: 'calcwiz.math-clipboard',
    version: 1,
    canonicalLatex: String.raw`x^{\frac{1}{6}}`,
    metadata: { surface: 'display', mode: 'calculate' },
  });
  expect(copied.html).toContain('data-calcwiz-math-envelope');
  await page.screenshot({
    fullPage: true,
    path: `${SCREENSHOT_DIR}/b1-canonical-clipboard.png`,
  });
});
