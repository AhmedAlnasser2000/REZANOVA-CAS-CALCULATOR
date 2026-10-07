import {test, expect} from '@playwright/test';
import {openLauncherApp, setMathFieldLatex, getMathFieldLatex} from './helpers';
import {installClipboardCapture} from './calculus-integral-evidence';

test('New Integration exponential answers, all-roots views, restrictions and both negative decisions', async ({page}, info) => {
  await installClipboardCapture(page); await page.goto('/'); await openLauncherApp(page, 'Calculus', 'New Integration');
  const workspace = page.getByTestId('new-integration-page');
  const run = async (source: string, title = 'Verified antiderivative') => {
    await setMathFieldLatex(page, source, 'new-integration-editor');
    await workspace.getByRole('button', {name: 'Integrate', exact: true}).click();
    await expect(workspace.getByRole('heading', {name: title, exact: true})).toBeVisible({timeout: 60000});
    await expect(workspace.getByText('Computing and verifying the complete answer…')).toBeHidden();
  };
  await run(String.raw`\int \frac{e^x}{e^{2x}+1}\,dx`);
  await workspace.getByText('Conditions', {exact: true}).click();
  await workspace.getByText('Verification details', {exact: true}).click();
  await expect(workspace.locator('.katex-error')).toHaveCount(0);
  await page.screenshot({path: info.outputPath('exponential-root-log-compact.png'), fullPage: true});
  await workspace.getByRole('button', {name: 'Copy LaTeX', exact: true}).click();
  await expect.poll(() => page.evaluate(() => window.__calcwizClipboardText)).toContain('e^{');
  const copied = await page.evaluate(() => window.__calcwizClipboardText);
  expect(copied).not.toContain('\\exp'); expect(copied).not.toMatch(/[LqG]_\{/); expect(copied).toContain('\\ne0');
  await workspace.getByRole('button', {name: 'Show full formula', exact: true}).click();
  await workspace.getByRole('button', {name: 'Copy LaTeX', exact: true}).click();
  await expect.poll(() => page.evaluate(() => window.__calcwizClipboardText)).toBe(copied);
  await page.setViewportSize({width: 640, height: 900});
  await page.screenshot({path: info.outputPath('exponential-root-log-full-narrow.png'), fullPage: true});
  expect(await workspace.evaluate(e => e.scrollWidth <= e.clientWidth + 2)).toBe(true);
  await expect(workspace.locator('.katex-error')).toHaveCount(0);
  await page.setViewportSize({width: 1280, height: 900});
  await run(String.raw`\int \frac{e^{1/x}}{e^{1/x}}\,dx`);
  await expect(workspace.locator('.ni-condition').filter({hasText: 'Source exclusion'}).first()).toBeVisible();
  await workspace.getByText('Original condition entries', {exact: true}).click();
  await page.screenshot({path: info.outputPath('cancelled-exponential-conditions.png'), fullPage: true});
  await run(String.raw`\int e^{x^2}\,dx`, 'Verified non-elementary');
  await expect(workspace.getByText(/No elementary antiderivative exists/)).toBeVisible();
  await workspace.getByRole('button', {name: 'Copy conclusion'}).click();
  await expect.poll(() => page.evaluate(() => window.__calcwizClipboardText)).toContain('No elementary antiderivative');
  await page.screenshot({path: info.outputPath('negative-laurent.png'), fullPage: true});
  await run(String.raw`\int \frac{1}{e^x+x}\,dx`, 'Verified non-elementary');
  await expect(workspace.getByText(/checked normal residue is nonconstant/)).toBeVisible();
  await page.screenshot({path: info.outputPath('negative-residue.png'), fullPage: true});
  await run(String.raw`\int e^x+e^{x^2}\,dx`, 'Unsupported structure');
  await expect(workspace.getByRole('alert')).toContainText('independent exponential families');
  await page.screenshot({path: info.outputPath('unsupported-independent-families.png'), fullPage: true});
  await run(String.raw`\int 0^0\,dx`, 'Invalid input');
  await expect(workspace.getByRole('alert')).toBeVisible();
});

test('New Integration exponential artifact correspondence, cancellation, saved tabs and source preservation', async ({page}, info) => {
  await page.goto('/'); await openLauncherApp(page, 'Calculus', 'New Integration');
  const workspace = page.getByTestId('new-integration-page');
  await setMathFieldLatex(page, String.raw`\int \frac{e^{2x}+e^x+e^xe^{x^2}+e^{x^2}}{e^x+e^{x^2}}\,dx`, 'new-integration-editor');
  await workspace.getByRole('button', {name: 'Integrate', exact: true}).click();
  await expect(workspace.getByRole('heading', {name: 'Verified antiderivative'})).toBeVisible({timeout: 60000});
  await workspace.getByText('Conditions', {exact: true}).click();
  await page.screenshot({path: info.outputPath('hidden-factor-cancellation.png'), fullPage: true});
  const download = page.waitForEvent('download'); await workspace.getByRole('button', {name: 'Export derivation'}).click();
  const file = await download, savedPath = info.outputPath('exponential-derivation.json'); await file.saveAs(savedPath);
  const equivalent = String.raw`\int 1+(e^{x/2})^2\,dx`;
  await setMathFieldLatex(page, equivalent, 'new-integration-editor');
  await workspace.getByRole('button', {name: 'Verify against current problem'}).click();
  await page.getByTestId('integration-artifact-file').setInputFiles(savedPath);
  await expect(workspace.getByText('Computing and verifying the complete answer…')).toBeHidden({timeout: 60000});
  await expect(workspace.getByRole('heading', {name: 'Verified antiderivative'})).toBeVisible();
  expect(await getMathFieldLatex(page, 'new-integration-editor')).toContain('x');
  await page.screenshot({path: info.outputPath('equivalent-generator-import.png'), fullPage: true});
  await setMathFieldLatex(page, String.raw`\int 1+e^{x+1}\,dx`, 'new-integration-editor');
  await workspace.getByRole('button', {name: 'Verify against current problem'}).click();
  await page.getByTestId('integration-artifact-file').setInputFiles(savedPath);
  await expect(workspace.getByText('Computing and verifying the complete answer…')).toBeHidden({timeout: 60000});
  await expect(workspace.getByText(/saved integrand differs/)).toBeVisible();
  await expect(workspace.getByRole('heading', {name: 'Verified antiderivative'})).toBeVisible();
  expect(await getMathFieldLatex(page, 'new-integration-editor')).toContain('x+1');
  const tabs = page.locator('[data-testid="workspace-tab"][data-workspace-kind="new-integration"]');
  await workspace.getByRole('button', {name: 'Open saved problem'}).click();
  await page.getByTestId('integration-artifact-file').setInputFiles(savedPath);
  await expect(tabs).toHaveCount(2, {timeout: 60000});
  expect(await getMathFieldLatex(page, 'new-integration-editor')).toContain('x^2');
  await page.reload(); await openLauncherApp(page, 'Calculus', 'New Integration');
  await expect(workspace.getByTestId('integration-result')).toHaveCount(0);
  await expect(tabs).toHaveCount(2);
});

test('New Integration preserves verified output when only derivation export is unavailable', async ({page}, info) => {
  // The actual worker still computes/verifies its answer; simulate the distinct size-only transport outcome.
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        if (String(url).includes('integration.worker')) this.addEventListener('message', event => {
          if (event.data.document?.outcomeKind === 'success') {
            delete event.data.artifact;
            event.data.exportUnavailable = 'Derivation export exceeds 16 MiB. The verified answer remains available.';
          }
        });
      }
    };
  });
  await page.goto('/'); await openLauncherApp(page, 'Calculus', 'New Integration');
  const workspace = page.getByTestId('new-integration-page');
  await setMathFieldLatex(page, String.raw`\int e^x\,dx`, 'new-integration-editor');
  await workspace.getByRole('button', {name: 'Integrate', exact: true}).click();
  await expect(workspace.getByRole('heading', {name: 'Verified antiderivative'})).toBeVisible();
  await expect(workspace.getByText('Derivation export exceeds 16 MiB. The verified answer remains available.')).toBeVisible();
  await expect(workspace.getByRole('button', {name: 'Export derivation'})).toBeDisabled();
  await expect(workspace.getByRole('button', {name: 'Copy LaTeX'})).toBeEnabled();
  await page.screenshot({path: info.outputPath('export-unavailable-verified-answer.png'), fullPage: true});
});

test('New Integration exports and replays a verified negative decision into a fresh saved tab', async ({page}, info) => {
  await page.goto('/'); await openLauncherApp(page, 'Calculus', 'New Integration');
  const workspace = page.getByTestId('new-integration-page');
  await setMathFieldLatex(page, String.raw`\int e^{x^2}\,dx`, 'new-integration-editor');
  await workspace.getByRole('button', {name: 'Integrate', exact: true}).click();
  await expect(workspace.getByRole('heading', {name: 'Verified non-elementary'})).toBeVisible();
  const download = page.waitForEvent('download'); await workspace.getByRole('button', {name: 'Export derivation'}).click();
  const file = await download, savedPath = info.outputPath('negative-derivation.json'); await file.saveAs(savedPath);
  await setMathFieldLatex(page, String.raw`\int e^x\,dx`, 'new-integration-editor');
  await workspace.getByRole('button', {name: 'Open saved problem'}).click();
  await page.getByTestId('integration-artifact-file').setInputFiles(savedPath);
  await expect(page.locator('[data-testid="workspace-tab"][data-workspace-kind="new-integration"]')).toHaveCount(2, {timeout: 60000});
  await expect(workspace.getByRole('heading', {name: 'Verified non-elementary'})).toBeVisible();
  expect(await getMathFieldLatex(page, 'new-integration-editor')).toContain('x^2');
  await page.screenshot({path: info.outputPath('negative-artifact-replay.png'), fullPage: true});
});
