import { test, expect } from '@playwright/test';
import { openLauncherApp, setMathFieldLatex, getMathFieldLatex } from './helpers';
import { installClipboardCapture } from './calculus-integral-evidence';

test('New Integration: exact answers, editable expressions, isolated tabs and saved derivations', async ({page}, testInfo) => {
  await installClipboardCapture(page);
  await page.goto('/'); await openLauncherApp(page, 'Calculus', 'New Integration');
  const workspace = page.getByTestId('new-integration-page'); await expect(workspace).toBeVisible();
  await page.screenshot({path: testInfo.outputPath('empty-editor.png'), fullPage: true});
  const edit = async (s: string) => setMathFieldLatex(page, s, 'new-integration-editor');
  await edit('x/x'); await workspace.getByRole('button', {name: 'Integrate', exact: true}).click();
  await expect(workspace.getByRole('alert')).toContainText('explicit indefinite integral');
  await workspace.getByRole('button', {name: 'Insert Integral', exact: true}).click();
  expect(await getMathFieldLatex(page, 'new-integration-editor')).toContain('\\int');
  await edit('\\int \\frac{1}{x^2+1}\\,dx');
  await workspace.getByRole('button', {name: 'Integrate', exact: true}).click();
  await expect(workspace.getByRole('heading', {name: 'Verified antiderivative'})).toBeVisible({timeout: 30000});
  await workspace.getByText('Conditions', {exact: true}).click();
  await workspace.getByText('Verification details', {exact: true}).click();
  await expect(workspace.getByText(/^Log norm \(/).first()).toBeVisible();
  await page.screenshot({path: testInfo.outputPath('formal-answer.png'), fullPage: true});
  await workspace.getByRole('button', {name: 'Copy LaTeX', exact: true}).click();
  await expect.poll(() => page.evaluate(() => window.__calcwizClipboardText)).toContain('\\sum_');
  const compactCopy = await page.evaluate(() => window.__calcwizClipboardText);
  await workspace.getByRole('button', {name: 'Show full formula', exact: true}).click();
  await expect(workspace.getByRole('button', {name: 'Show compact formula', exact: true})).toBeVisible();
  await workspace.getByRole('button', {name: 'Copy LaTeX', exact: true}).click();
  await expect.poll(() => page.evaluate(() => window.__calcwizClipboardText)).toBe(compactCopy);
  expect(compactCopy).toContain('\\ne0'); expect(compactCopy).not.toMatch(/[LqG]_\{/);
  await workspace.getByText('Original condition entries', {exact: true}).click();
  await page.screenshot({path: testInfo.outputPath('expanded-answer-original-conditions.png'), fullPage: true});
  const download = page.waitForEvent('download'); await workspace.getByRole('button', {name: 'Export derivation'}).click();
  const saved = await download; const path = testInfo.outputPath('derivation.json'); await saved.saveAs(path);
  // Changed draft must not change the producing request exported with the result.
  await edit('\\int \\frac{1}{x^5-x-1}\\,dx');
  await workspace.getByRole('button', {name: 'Integrate', exact: true}).click();
  await expect(workspace.getByRole('button', {name: 'Stop', exact: true})).toBeEnabled();
  await workspace.getByRole('button', {name: 'Stop', exact: true}).click();
  await expect(workspace.getByRole('button', {name: 'Stop', exact: true})).toBeDisabled();
  await workspace.getByRole('button', {name: 'New tab', exact: true}).click();
  expect(await getMathFieldLatex(page, 'new-integration-editor')).toBe('');
  await edit('\\int \\frac{0}{x-1}\\,dx');
  await workspace.getByRole('button', {name: 'Integrate', exact: true}).click();
  await expect(workspace.getByRole('heading', {name: 'Verified antiderivative'})).toBeVisible();
  await workspace.getByText('Conditions', {exact: true}).click();
  await page.screenshot({path: testInfo.outputPath('cancelled-exclusion.png'), fullPage: true});
  // Open saved creates a third tab only after successful fresh replay.
  await workspace.getByRole('button', {name: 'Open saved problem'}).click();
  await page.getByTestId('integration-artifact-file').setInputFiles(path);
  await expect(workspace.getByRole('heading', {name: 'Verified antiderivative'})).toBeVisible();
  await expect.poll(() => getMathFieldLatex(page, 'new-integration-editor')).toContain('x^2');
  await edit('\\int \\frac{x}{x(x^2+1)}\\,dx');
  await workspace.getByRole('button', {name: 'Verify against current problem'}).click();
  await page.getByTestId('integration-artifact-file').setInputFiles(path);
  await expect(workspace.getByText('Computing and verifying the complete answer…')).toBeHidden({timeout: 30000});
  expect(await getMathFieldLatex(page, 'new-integration-editor')).toContain('x');
  await page.reload(); await openLauncherApp(page, 'Calculus', 'New Integration');
  await expect(workspace).toBeVisible();
  await expect(workspace.getByTestId('integration-result')).toHaveCount(0);
  expect(await getMathFieldLatex(page, 'new-integration-editor')).toContain('\\int');
  await edit('\\int \\sin x\\,dx'); await workspace.getByRole('button', {name: 'Integrate', exact: true}).click();
  await expect(workspace.getByRole('heading', {name: 'Unsupported structure'})).toBeVisible();
  await page.screenshot({path: testInfo.outputPath('unsupported.png'), fullPage: true});
});

test('New Integration: background completion, limits, close cancellation and quintic readability', async ({page}, testInfo) => {
  await page.goto('/'); await openLauncherApp(page, 'Calculus', 'New Integration');
  const workspace = page.getByTestId('new-integration-page');
  const tabs = page.locator('[data-testid="workspace-tab"][data-workspace-kind="new-integration"]');
  await setMathFieldLatex(page, '\\int \\frac{1}{x^5-x-1}\\,dx', 'new-integration-editor');
  await workspace.getByRole('button', {name: 'Integrate', exact: true}).click();
  await workspace.getByRole('button', {name: 'New tab', exact: true}).click();
  await expect(tabs).toHaveCount(2);
  await expect(workspace.getByTestId('integration-result')).toHaveCount(0);
  await tabs.nth(0).getByRole('tab').click();
  await expect(workspace.getByRole('heading', {name: 'Verified antiderivative'})).toBeVisible({timeout: 60000});
  await workspace.getByText('Conditions', {exact: true}).click();
  await page.screenshot({path: testInfo.outputPath('quintic.png'), fullPage: true});
  await workspace.getByRole('button', {name: 'Show full formula', exact: true}).click();
  await page.screenshot({path: testInfo.outputPath('quintic-expanded.png'), fullPage: true});
  await tabs.nth(1).getByRole('tab').click();
  await tabs.nth(0).getByRole('tab').click();
  await expect(workspace.getByRole('button', {name: 'Show compact formula', exact: true})).toBeVisible();
  expect(await workspace.evaluate(e => e.scrollWidth <= e.clientWidth + 2)).toBe(true);
  await page.setViewportSize({width: 640, height: 900});
  await page.screenshot({path: testInfo.outputPath('quintic-narrow.png'), fullPage: true});
  expect(await workspace.evaluate(e => e.scrollWidth <= e.clientWidth + 2)).toBe(true);
  await workspace.getByText('Advanced execution limits', {exact: true}).click();
  await workspace.getByLabel('work', {exact: true}).fill('5');
  await workspace.getByRole('button', {name: 'Integrate', exact: true}).click();
  await expect(workspace.getByRole('heading', {name: 'Execution limit reached'})).toBeVisible();
  await tabs.nth(1).getByRole('tab').click();
  await workspace.getByText('Advanced execution limits', {exact: true}).click();
  await expect(workspace.getByLabel('work', {exact: true})).toHaveValue('20000000000');
  await setMathFieldLatex(page, '\\int \\frac{1}{x^5-x-1}\\,dx', 'new-integration-editor');
  await workspace.getByRole('button', {name: 'Integrate', exact: true}).click();
  await tabs.nth(1).getByRole('button', {name: /Close/}).click();
  // The existing shell can request confirmation for closing a busy tab.
  const confirmation = page.getByRole('alertdialog');
  if (await confirmation.isVisible()) await confirmation.getByRole('button', {name: /close/i}).click();
  await expect(tabs).toHaveCount(1);
});

test('New Integration fails clearly when workers are unavailable', async ({page}, testInfo) => {
  await page.addInitScript(() => {Object.defineProperty(window, 'Worker', {value: undefined, configurable: true});});
  await page.goto('/'); await openLauncherApp(page, 'Calculus', 'New Integration');
  const workspace = page.getByTestId('new-integration-page');
  await workspace.getByRole('button', {name: 'Example', exact: true}).click();
  await workspace.getByRole('button', {name: 'Integrate', exact: true}).click();
  await expect(workspace.getByRole('alert')).toContainText('Worker execution is unavailable');
  await page.screenshot({path: testInfo.outputPath('worker-unavailable.png'), fullPage: true});
});

test('New Integration opens without secure-context UUID or clipboard APIs', async ({page}) => {
  await page.addInitScript(() => {
    Object.defineProperty(crypto, 'randomUUID', {value: undefined, configurable: true});
    Object.defineProperty(navigator, 'clipboard', {value: undefined, configurable: true});
  });
  await page.goto('/'); await openLauncherApp(page, 'Calculus', 'New Integration');
  const workspace = page.getByTestId('new-integration-page'); await expect(workspace).toBeVisible();
  await workspace.getByRole('button', {name: 'Example', exact: true}).click();
  await workspace.getByRole('button', {name: 'Integrate', exact: true}).click();
  await expect(workspace.getByRole('heading', {name: 'Verified antiderivative'})).toBeVisible();
  await workspace.getByRole('button', {name: 'Copy LaTeX'}).click();
  await expect(workspace.getByText(/^(LaTeX copied\.|Clipboard is unavailable\.)$/)).toBeVisible();
});

test('New Integration restores full-view preference without restoring a result', async ({page}, testInfo) => {
  await page.goto('/'); await openLauncherApp(page, 'Calculus', 'New Integration');
  const workspace = page.getByTestId('new-integration-page');
  await workspace.getByRole('button', {name: 'Example', exact: true}).click();
  await workspace.getByRole('button', {name: 'Integrate', exact: true}).click();
  await workspace.getByRole('button', {name: 'Show full formula', exact: true}).click();
  await page.reload(); await openLauncherApp(page, 'Calculus', 'New Integration');
  await expect(workspace.getByTestId('integration-result')).toHaveCount(0);
  await workspace.getByRole('button', {name: 'Integrate', exact: true}).click();
  await expect(workspace.getByRole('button', {name: 'Show compact formula', exact: true})).toBeVisible();
  await page.screenshot({path: testInfo.outputPath('restored-full.png'), fullPage: true});
});

test('New Integration emphasizes continuation plus signs in a multi-term answer', async ({page}, testInfo) => {
  await page.goto('/'); await openLauncherApp(page, 'Calculus', 'New Integration');
  const workspace = page.getByTestId('new-integration-page');
  await setMathFieldLatex(page, String.raw`\int \frac{1}{y^5+\frac{y}{1+y^4}}-\frac{2y}{3}\,dy`, 'new-integration-editor');
  await workspace.getByRole('button', {name: 'Integrate', exact: true}).click();
  await workspace.getByRole('button', {name: 'Show full formula', exact: true}).click({timeout: 60000});
  await workspace.getByText('Conditions', {exact: true}).click();
  await page.screenshot({path: testInfo.outputPath('emphasized-additions.png'), fullPage: true});
  await page.setViewportSize({width: 640, height: 900});
  await page.screenshot({path: testInfo.outputPath('emphasized-additions-narrow.png'), fullPage: true});
  expect(await workspace.evaluate(e => e.scrollWidth <= e.clientWidth + 2)).toBe(true);
});
