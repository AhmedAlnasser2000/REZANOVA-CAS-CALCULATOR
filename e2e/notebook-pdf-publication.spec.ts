import { expect, test, type Page } from '@playwright/test';

async function openBlankNotebook(page: Page) {
  await page.addInitScript(() => {
    window.print = () => document.body.setAttribute('data-notebook-print-invoked', 'true');
  });
  await page.goto('/');
  await page.getByTestId('workspace-tab-add-menu').click();
  await page.getByRole('menuitem', { name: 'New Notebook' }).click();
  await expect(page.getByLabel('Notebook rich document')).toBeVisible();
}

async function attachScreenshot(page: Page, name: string) {
  const path = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path });
  await test.info().attach(name, { path, contentType: 'image/png' });
}

async function expectPreviewContained(page: Page) {
  const geometry = await page.evaluate(() => {
    const dialog = document.querySelector('.notebook-pdf-dialog')!.getBoundingClientRect();
    const chrome = document.querySelector('.notebook-pdf-dialog-chrome')!.getBoundingClientRect();
    const preview = document.querySelector('.notebook-print-preview')!.getBoundingClientRect();
    const paper = document.querySelector('.notebook-print-page')!.getBoundingClientRect();
    return {
      chromeRight: chrome.right,
      dialogBottom: dialog.bottom,
      dialogLeft: dialog.left,
      dialogRight: dialog.right,
      dialogTop: dialog.top,
      documentOverflow: document.documentElement.scrollWidth - window.innerWidth,
      paperHeight: paper.height,
      paperWidth: paper.width,
      previewLeft: preview.left,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    };
  });
  expect(geometry.dialogLeft).toBeGreaterThanOrEqual(0);
  expect(geometry.dialogTop).toBeGreaterThanOrEqual(0);
  expect(geometry.dialogRight).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.dialogBottom).toBeLessThanOrEqual(geometry.viewportHeight);
  expect(geometry.documentOverflow).toBeLessThanOrEqual(0);
  expect(geometry.paperWidth).toBeGreaterThan(400);
  expect(geometry.paperHeight).toBeGreaterThan(600);
  if (geometry.viewportWidth > 900) {
    expect(geometry.previewLeft).toBeGreaterThanOrEqual(geometry.chromeRight - 1);
  }
}

test('Notebook PDF publication previews exact pages and stays readable across layouts', async ({ page }) => {
  await page.setViewportSize({ width: 2400, height: 1050 });
  await openBlankNotebook(page);
  const editor = page.getByLabel('Notebook rich document');
  const tabs = page.getByRole('tablist', { name: 'Notebook ribbon tabs' });
  const toolbar = page.getByLabel('Notebook formatting toolbar');

  await editor.click();
  await page.keyboard.type('Limit laws remain selectable in the publication projection.');
  await tabs.getByRole('tab', { name: 'Layout' }).click();
  await toolbar.getByRole('button', { name: 'Header, footer, and page numbering' }).click();
  let runningEditor = page.getByLabel('Running matter editor');
  await runningEditor.fill('Calculus notes');
  await tabs.getByRole('tab', { name: 'Header & Footer' }).click();
  await toolbar.getByRole('button', { name: 'Edit footer' }).click();
  await toolbar.getByRole('button', { name: 'left region' }).click();
  runningEditor = page.getByLabel('Running matter editor');
  await runningEditor.fill('Rezanova');
  await toolbar.getByRole('button', { name: 'right region' }).click();
  await toolbar.getByRole('button', { name: 'Insert page number at caret' }).click();
  await toolbar.getByLabel('Starting page number').fill('3');
  await toolbar.getByRole('button', { name: 'Close Header and Footer' }).click();
  await tabs.getByRole('tab', { name: 'Layout' }).click();
  await toolbar.getByRole('button', { name: 'Insert page break' }).click();
  await expect(page.getByText('Page 1 of 2')).toBeVisible();

  await page.getByRole('button', { name: 'File', exact: true }).click();
  const backstage = page.getByRole('dialog', { name: 'Notebook File' });
  await backstage.getByRole('button', { name: /Print \/ Save as PDF/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Print or save Notebook as PDF' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('No substitutions or layout approximations are required.')).toBeVisible();
  await expect(page.getByTestId('notebook-print-projection')).toBeVisible();
  await expect(page.locator('.notebook-print-page')).toHaveCount(2);
  await expect(page.locator('.notebook-print-page').nth(0).locator('header')).toHaveText('Calculus notes');
  await expect(page.locator('.notebook-print-page').nth(1).locator('.notebook-running-page-number')).toHaveText('4');

  for (const width of [2400, 1440, 1100]) {
    await page.setViewportSize({ width, height: 1000 });
    await expectPreviewContained(page);
    await attachScreenshot(page, `notebook-pdf-${width}`);
  }

  await dialog.getByLabel('Physical pages').click();
  await dialog.getByLabel('PDF from page').fill('2');
  await dialog.getByLabel('PDF to page').fill('2');
  await expect(page.locator('.notebook-print-page')).toHaveCount(1);
  await expect(page.locator('.notebook-print-page')).toHaveAttribute('data-page', '2');

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' });
  await page.locator('.active-surface--page').evaluate((element) => {
    (element as HTMLElement).style.setProperty('--page-ui-scale', '1.3');
  });
  await expectPreviewContained(page);
  await attachScreenshot(page, 'notebook-pdf-forced-colors-130');

  await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'none' });
  await page.locator('.active-surface--page').evaluate((element) => {
    (element as HTMLElement).style.setProperty('--page-ui-scale', '0.8');
  });
  await attachScreenshot(page, 'notebook-pdf-80');
  await dialog.getByRole('button', { name: 'Open system print dialog' }).click();
  await expect.poll(() => page.locator('body').getAttribute('data-notebook-print-invoked')).toBe('true');
});
