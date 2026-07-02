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

test.beforeEach(async ({ page }) => {
  await installClipboardCapture(page);
  await page.goto('/');
});

test('Calculus integral evidence harness covers answer, facts, copy, and history replay', async ({ page }) => {
  await openIndefiniteIntegral(page);
  await runIndefiniteIntegral(page, '\\frac{1}{\\sqrt{a*x+b}}');

  await expectAnswerLatex(page, '\\frac{2}{a}\\sqrt{ax+b}');
  await expectValidWhenLatex(page, 'a\\ne0', 'ax+b\\ge0');

  const copied = await copyResult(page);
  expect(copied).toContain('\\frac{2}{a}\\sqrt{ax+b}');

  const replayedLatex = await replayLatestHistoryEntry(page);
  expect(replayedLatex).toContain('\\frac{1}{\\sqrt');
  await expectAnswerLatex(page, '\\frac{2}{a}\\sqrt{ax+b}');
});

test('Calculus integral evidence harness detects scroll-safe long answers', async ({ page }) => {
  await openIndefiniteIntegral(page);
  await runIndefiniteIntegral(page, '\\frac{x+1}{(2*x-1)^2(3*x+2)}');

  await expectAnswerLatex(page, '\\ln', 'x-\\frac{1}{2}', 'x+\\frac{2}{3}');
  const partialFractions = await openDetailCard(page, 'Partial fractions');
  await expect(partialFractions).toBeVisible();
  await expectAnswerOverflowReady(page);
});
