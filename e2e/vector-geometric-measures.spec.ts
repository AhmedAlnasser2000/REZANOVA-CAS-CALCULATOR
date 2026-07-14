import { mkdir } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  copyResult,
  installClipboardCapture,
  replayLatestHistoryEntry,
} from './calculus-integral-evidence';
import { openLauncherApp, setMathFieldLatex } from './helpers';

const SCREENSHOT_DIR = '.task_tmp/vector-geometric-measures1';

function vectorCard(page: Page, name: string): Locator {
  return page.locator('.linear-algebra-value-card')
    .filter({ has: page.getByLabel(`Vector ${name} name`) })
    .first();
}

async function setVector(page: Page, name: string, values: readonly number[]) {
  await page.getByLabel(`Vector ${name} length`).fill(String(values.length));
  const inputs = vectorCard(page, name).locator('.linear-algebra-vector-grid input');
  await expect(inputs).toHaveCount(values.length);
  for (let index = 0; index < values.length; index += 1) {
    await inputs.nth(index).fill(String(values[index]));
    await inputs.nth(index).blur();
  }
}

async function addVector(page: Page, name: string, values: readonly number[]) {
  await page.getByRole('button', { name: 'Add Vector' }).click();
  await expect(page.getByLabel(`Vector ${name} name`)).toBeVisible();
  await setVector(page, name, values);
}

async function runEditor(page: Page, latex: string) {
  await setMathFieldLatex(page, latex);
  await page.getByTestId('editor-runtime-run').click();
}

async function rawLatex(locator: Locator) {
  return locator.locator('[data-raw-latex]').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('data-raw-latex') ?? '').join('\n'));
}

function detailCard(page: Page, title: string) {
  return page.locator('details.result-summary-block')
    .filter({ has: page.locator('.result-summary-label', { hasText: title }) })
    .first();
}

test.beforeAll(async () => {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await installClipboardCapture(page);
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.goto('/');
});

test('shows exact areas and oriented volume with Ctrl templates, copy, replay, and bounded stops', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Vector');
  await addVector(page, 'p', [1, 0, 0]);
  await addVector(page, 'q', [0, 2, 0]);
  await addVector(page, 'r', [0, 0, 3]);

  await page.getByTestId('keypad-layer-ctrl').click();
  await expect(page.getByTestId('keypad-linear-proj-u')).toContainText('parallel');
  await expect(page.getByTestId('keypad-linear-proj-v')).toContainText('distance');
  await expect(page.getByTestId('keypad-linear-unit')).toContainText('area');
  await expect(page.getByTestId('keypad-linear-gram')).toContainText('triArea');
  await expect(page.getByTestId('keypad-linear-orth-u')).toContainText('volume');

  await runEditor(page, String.raw`\operatorname{parallelogramArea}\left(p,q\right)`);
  await expect.poll(() => rawLatex(page.getByTestId('display-outcome-success'))).toContain('2');
  await expect(detailCard(page, '3D Geometry')).toContainText('right-hand-rule oriented normal');

  await runEditor(page, String.raw`\operatorname{triangleArea}\left(p,q\right)`);
  await expect.poll(() => rawLatex(page.getByTestId('display-outcome-success'))).toContain('1');

  await runEditor(page, String.raw`\operatorname{volume}\left(p,q,r\right)`);
  const outcome = page.getByTestId('display-outcome-success');
  await expect(outcome).toBeVisible();
  await expect.poll(() => rawLatex(outcome)).toContain('6');
  const geometry = detailCard(page, '3D Geometry');
  if (!await geometry.evaluate((element) => (element as HTMLDetailsElement).open)) {
    await geometry.locator('summary').click();
  }
  await expect(geometry).toContainText('positive right-handed orientation');
  await expect.poll(() => rawLatex(geometry)).toContain(String.raw`s=(p\times q)\cdot r=6`);
  await page.screenshot({ fullPage: true, path: `${SCREENSHOT_DIR}/oriented-volume-expanded.png` });

  expect(await copyResult(page)).toBe('6');
  await geometry.locator('summary').click();
  await expect.poll(() => geometry.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(false);
  await expect(outcome.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).resolves.toBe(true);
  await page.screenshot({ fullPage: true, path: `${SCREENSHOT_DIR}/oriented-volume.png` });

  const replayed = await replayLatestHistoryEntry(page);
  expect(replayed).toContain('volume');
  expect(replayed).toContain('p,q,r');
  await expect.poll(() => rawLatex(page.getByTestId('display-outcome-success'))).toContain('6');

  await runEditor(page, String.raw`\operatorname{volume}\left([1,0],[0,1],[1,1]\right)`);
  await expect(page.getByTestId('display-outcome-error')).toContainText('Volume requires three 3D vectors.');
  await page.screenshot({ fullPage: true, path: `${SCREENSHOT_DIR}/volume-3d-stop.png` });
});
