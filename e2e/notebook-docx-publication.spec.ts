import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

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
  const geometry = await page.locator('.notebook-docx-dialog').evaluate((element) => {
    const box = element.getBoundingClientRect();
    return {
      bottom: box.bottom,
      documentOverflow: document.documentElement.scrollWidth - window.innerWidth,
      height: box.height,
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
  expect(geometry.height).toBeGreaterThan(300);
}

test('Notebook DOCX publication reports reflow and downloads valid OOXML', async ({ page }) => {
  await page.setViewportSize({ width: 2400, height: 1050 });
  await openWorkedNotebook(page);

  await page.getByRole('button', { name: 'File', exact: true }).click();
  const backstage = page.getByRole('dialog', { name: 'Notebook File' });
  await backstage.getByRole('button', { name: /Export Word/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Export Notebook as Word document' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/DOCX output reflows and does not preserve Notebook physical page numbers/u)).toBeVisible();
  await expect(dialog.getByText(/cannot be imported as a lossless Notebook/u)).toBeVisible();

  for (const width of [2400, 1440, 1100]) {
    await page.setViewportSize({ width, height: 1000 });
    await expectDialogContained(page);
    await attachScreenshot(page, `notebook-docx-${width}`);
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' });
  await page.locator('.active-surface--page').evaluate((element) => {
    (element as HTMLElement).style.setProperty('--page-ui-scale', '1.3');
  });
  await expectDialogContained(page);
  await attachScreenshot(page, 'notebook-docx-forced-colors-130');

  await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'none' });
  await page.locator('.active-surface--page').evaluate((element) => {
    (element as HTMLElement).style.setProperty('--page-ui-scale', '0.8');
  });
  await attachScreenshot(page, 'notebook-docx-80');

  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download .docx' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('Untitled Notebook.docx');
  const retainedPath = test.info().outputPath('notebook-docx-publication.docx');
  await download.saveAs(retainedPath);
  const signature = [...(await readFile(retainedPath)).subarray(0, 2)];
  expect(signature).toEqual([0x50, 0x4b]);
});
