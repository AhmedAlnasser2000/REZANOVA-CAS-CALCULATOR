import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';

async function openWorkedNotebook(page: Page) {
  await page.goto('/');
  await page.getByTestId('workspace-tab-add-menu').click();
  await page.getByRole('menuitem', { name: 'New Notebook' }).click();
  await page.getByRole('button', { name: 'Start from template' }).click();
  await page.getByRole('button', { name: /Worked Example/ }).click();
  await expect(page.getByLabel('Notebook rich document')).toBeVisible();
}

async function attachScreenshot(page: Page, name: string) {
  const path = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path });
  await test.info().attach(name, { path, contentType: 'image/png' });
}

async function expectDialogContained(page: Page) {
  const geometry = await page.locator('.notebook-web-dialog').evaluate((element) => {
    const box = element.getBoundingClientRect();
    return {
      bottom: box.bottom,
      documentOverflow: document.documentElement.scrollWidth - window.innerWidth,
      left: box.left,
      right: box.right,
      top: box.top,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      width: box.width,
    };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
  expect(geometry.documentOverflow).toBeLessThanOrEqual(0);
  expect(geometry.width).toBeGreaterThan(300);
}

test('Notebook Web publication is responsive and saves a safe offline package', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: undefined,
      writable: true,
    });
  });
  await page.setViewportSize({ width: 2400, height: 1050 });
  await openWorkedNotebook(page);

  await page.getByRole('button', { name: 'File', exact: true }).click();
  const backstage = page.getByRole('dialog', { name: 'Notebook File' });
  await backstage.getByRole('button', { name: /Export Web package/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Export Notebook as Web package' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/self-contained, read-only publication/u)).toBeVisible();

  for (const width of [2400, 1440, 1100]) {
    await page.setViewportSize({ width, height: 1000 });
    await expectDialogContained(page);
    await attachScreenshot(page, `notebook-web-${width}`);
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' });
  await page.locator('.active-surface--page').evaluate((element) => {
    (element as HTMLElement).style.setProperty('--page-ui-scale', '1.3');
  });
  await expectDialogContained(page);
  await attachScreenshot(page, 'notebook-web-forced-colors-130');

  await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'none' });
  await page.locator('.active-surface--page').evaluate((element) => {
    (element as HTMLElement).style.setProperty('--page-ui-scale', '0.8');
  });
  await attachScreenshot(page, 'notebook-web-80');

  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Save Web package' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('Untitled Notebook - Web.zip');
  const retainedPath = test.info().outputPath('notebook-web-publication.zip');
  await download.saveAs(retainedPath);
  await expect(dialog.getByRole('status')).toContainText('browser cannot choose a save location');

  const zip = await JSZip.loadAsync(await readFile(retainedPath));
  const html = await zip.file('index.html')!.async('string');
  const css = await zip.file('styles.css')!.async('string');
  expect(html).toContain("script-src 'none'");
  expect(html).toContain('<math xmlns="http://www.w3.org/1998/Math/MathML"');
  expect(html).not.toContain('<script>');
  expect(css).toContain('@media print');
  expect(css).toContain('.cwiz-notebook');

  const previewHtml = html
    .replace(/<meta http-equiv="Content-Security-Policy"[^>]+>/u, '')
    .replace('<link rel="stylesheet" href="styles.css">', `<style>${css}</style>`);
  await page.setContent(previewHtml);
  await page.emulateMedia({ forcedColors: 'none', media: 'screen' });
  await page.setViewportSize({ width: 1100, height: 1000 });
  await expect(page.getByRole('heading', { name: /Quadratic Equations/ })).toBeVisible();
  await expect(page.locator('math').first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  await attachScreenshot(page, 'notebook-web-package-desktop');

  await page.setViewportSize({ width: 560, height: 900 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  await attachScreenshot(page, 'notebook-web-package-narrow');

  await page.setViewportSize({ width: 1100, height: 1000 });
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.cwiz-notebook')).toHaveCSS('box-shadow', 'none');
  await attachScreenshot(page, 'notebook-web-package-print');
});
