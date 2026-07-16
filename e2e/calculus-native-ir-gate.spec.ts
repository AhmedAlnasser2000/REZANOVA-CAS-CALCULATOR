import { expect, test } from '@playwright/test';
import {
  copyResult,
  expectAnswerLatex,
  expectAnswerOverflowReady,
  installClipboardCapture,
  openDetailCard,
  openIndefiniteIntegral,
  replayLatestHistoryEntry,
  runIndefiniteIntegral,
} from './calculus-integral-evidence';
import { getMathFieldLatex } from './helpers';

test.beforeEach(async ({ page }) => {
  await installClipboardCapture(page);
  await page.goto('/');
});

test('native integration result stays readable and authoritative across app actions', async ({ page }) => {
  await openIndefiniteIntegral(page);
  await runIndefiniteIntegral(page, 'x^2+3x');

  await expectAnswerLatex(page, '\\frac{x^3}{3}', '\\frac{3x^2}{2}', '+C');
  await expect(page.getByTestId('display-outcome-error')).toHaveCount(0);
  await expectAnswerOverflowReady(page);

  const presentation = await openDetailCard(page, 'Integration Presentation');
  await expect(presentation).toContainText('Calculus-owned antiderivative expression');

  const copied = await copyResult(page);
  expect(copied.replace(/\s+/g, '')).toContain('+C');
  expect(copied).not.toContain('legacy-placeholder');

  await page.getByTestId('display-outcome-action-to-editor').click();
  await expect.poll(() => getMathFieldLatex(page)).toContain('+C');

  const replayed = await replayLatestHistoryEntry(page);
  expect(replayed.replace(/\s+/g, '')).toContain('x^2+3x');
  await expectAnswerLatex(page, '\\frac{x^3}{3}', '\\frac{3x^2}{2}', '+C');

  if (process.env.CALCWIZ_CAPTURE_GATE_EVIDENCE === '1') {
    await page.screenshot({
      path: test.info().outputPath('calculus-native-ir.png'),
      fullPage: true,
    });
  }
});
