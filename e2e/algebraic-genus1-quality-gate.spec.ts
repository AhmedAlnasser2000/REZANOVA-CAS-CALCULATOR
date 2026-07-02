import { expect, test } from '@playwright/test';
import {
  copyResult,
  expectAnswerLatex,
  expectAnswerOverflowReady,
  expectValidWhenLatex,
  installClipboardCapture,
  openDetailCard,
  openIndefiniteIntegral,
  replayLatestHistoryEntry,
  runIndefiniteIntegral,
} from './calculus-integral-evidence';

const screenshotDir = '.task_tmp/algebraic-genus1-quality-gate1';

async function captureEvidence(page: Parameters<typeof expectAnswerLatex>[0], name: string) {
  await page.screenshot({
    path: `${screenshotDir}/${name}.png`,
    fullPage: true,
  });
}

test.beforeEach(async ({ page }) => {
  await installClipboardCapture(page);
  await page.goto('/');
});

test('genus-1 first-kind elliptic answer keeps facts, copy, details, and history replay usable', async ({ page }) => {
  await openIndefiniteIntegral(page);
  await runIndefiniteIntegral(page, '\\frac{1}{\\sqrt{(1-x^2)(1-m*x^2)}}');

  await expectAnswerLatex(page, '\\operatorname{EllipticF}', '\\arcsin(x)', 'm');
  await expectValidWhenLatex(page, '1-x^2', '1-mx^2');

  const proof = await openDetailCard(page, 'Genus-1 Elliptic Proof Backcheck');
  await expect(proof).toContainText('template-proved');
  await expect(proof.locator('[data-raw-latex*="EllipticF"]')).toBeVisible();
  await expect(proof).not.toContainText('quad prototype');

  const copied = await copyResult(page);
  expect(copied).toContain('EllipticF');
  expect(copied).toContain('\\arcsin');

  const replayedLatex = await replayLatestHistoryEntry(page);
  expect(replayedLatex).toContain('\\sqrt');
  await expectAnswerLatex(page, '\\operatorname{EllipticF}', '\\arcsin(x)', 'm');
  await captureEvidence(page, 'first-kind-history-replay');
});

test('genus-1 Hermite bridge answer remains scroll-safe and copyable', async ({ page }) => {
  await openIndefiniteIntegral(page);
  await runIndefiniteIntegral(page, '\\frac{A*x^2+B}{\\sqrt{(1-x^2)(1-m*x^2)}}');

  await expectAnswerLatex(page, '\\operatorname{EllipticF}', '\\operatorname{EllipticE}');
  await expectValidWhenLatex(page, 'm\\ne0');
  await expectAnswerOverflowReady(page);

  const copied = await copyResult(page);
  expect(copied).toContain('EllipticF');
  expect(copied).toContain('EllipticE');
  expect(copied).not.toContain('2\\frac{1}{');
  await captureEvidence(page, 'hermite-bridge-overflow');
});

test('genus-1 third-kind elliptic answer exposes characteristic facts and proof details', async ({ page }) => {
  await openIndefiniteIntegral(page);
  await runIndefiniteIntegral(page, '\\frac{1}{(1-n*x^2)\\sqrt{(1-x^2)(1-m*x^2)}}');

  await expectAnswerLatex(page, '\\operatorname{EllipticPi}', 'n', '\\arcsin(x)', 'm');
  await expectValidWhenLatex(page, '1-nx^2', '1-x^2', '1-mx^2');

  const proof = await openDetailCard(page, 'Genus-1 Elliptic Proof Backcheck');
  await expect(proof).toContainText('template-proved');
  await expect(proof.locator('[data-raw-latex*="EllipticPi"]')).toBeVisible();
  await expectAnswerOverflowReady(page);
  await captureEvidence(page, 'third-kind-facts');
});

test('genus-1 one-real-root cubic first-kind answer keeps complex-pair details usable', async ({ page }) => {
  await openIndefiniteIntegral(page);
  await runIndefiniteIntegral(page, '\\frac{1}{\\sqrt{x^3+x+1}}');

  await expectAnswerLatex(page, '\\operatorname{EllipticF}', 'A_{\\alpha_{1}}');
  await expectValidWhenLatex(page, 'x>\\alpha_{1}');

  const data = await openDetailCard(page, 'Complex-Pair Legendre Data');
  await expect(data.locator('[data-raw-latex*="A_{\\\\alpha_{1}}"]').first()).toBeVisible();
  const proof = await openDetailCard(page, 'Genus-1 Legendre Change Of Variable Proof');
  await expect(proof.locator('[data-raw-latex*="tan"]').first()).toBeVisible();
  await expectAnswerOverflowReady(page);

  const copied = await copyResult(page);
  expect(copied).toContain('EllipticF');
  expect(copied).toContain('A_{\\alpha_{1}}');
  await captureEvidence(page, 'complex-pair-first-kind');
});
