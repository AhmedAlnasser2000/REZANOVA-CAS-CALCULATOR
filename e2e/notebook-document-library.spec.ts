import { expect, test, type Page } from '@playwright/test';

async function openBlankNotebook(page: Page) {
  await page.goto('/');
  await page.getByTestId('workspace-tab-add-menu').click();
  await page.getByRole('menuitem', { name: 'New Notebook' }).click();
  await expect(page.getByLabel('Notebook rich document')).toBeVisible();
  await expect(page.getByText('Saved locally').first()).toBeVisible();
}

async function attachScreenshot(page: Page, name: string) {
  const path = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path });
  await test.info().attach(name, { path, contentType: 'image/png' });
}

async function expectViewportContained(page: Page, selector: string) {
  const geometry = await page.locator(selector).evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      bottom: bounds.bottom,
      left: bounds.left,
      right: bounds.right,
      top: bounds.top,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
}

test('Notebook library stays usable across desktop widths, scaling, contrast, and tab switching', async ({ page }) => {
  await page.setViewportSize({ width: 2400, height: 1100 });
  await openBlankNotebook(page);

  const title = page.getByLabel('Notebook title');
  await title.fill('Durable Library Evidence');
  await expect(page.getByText('Unsaved changes').first()).toBeVisible();
  await page.keyboard.press('Control+S');
  await expect(page.getByText('Saved locally').first()).toBeVisible();

  await page.getByTestId('workspace-tab-add-menu').click();
  await page.getByRole('menuitem', { name: 'New Calculate tab' }).click();
  await expect(page.getByTestId('notebook-page')).toBeHidden();
  await page.getByRole('tab', { name: /Durable Library Evidence/ }).click();
  await expect(title).toHaveValue('Durable Library Evidence');
  await expect(page.getByText('Saved locally').first()).toBeVisible();

  await page.getByRole('button', { name: 'File', exact: true }).click();
  const firstBackstage = page.getByRole('dialog', { name: 'Notebook File' });
  await firstBackstage.getByRole('button', { name: 'Open', exact: true }).click();
  const allNotebooks = firstBackstage.getByLabel('All Notebooks');
  const currentRecord = allNotebooks.getByRole('button', { name: /Durable Library Evidence/ }).first();
  await currentRecord.click({ button: 'right' });
  const actions = page.getByRole('menu', { name: 'Notebook actions' });
  await expect(actions.getByRole('menuitem', { name: 'Open' })).toBeVisible();
  await expect(actions.getByRole('menuitem', { name: 'Rename' })).toBeVisible();
  await expect(actions.getByRole('menuitem', { name: 'Duplicate' })).toBeVisible();
  await expect(actions.getByRole('menuitem', { name: 'Move to Trash' })).toBeVisible();
  await expectViewportContained(page, '.notebook-library-context-menu');
  await attachScreenshot(page, 'notebook-library-context-menu');
  await page.keyboard.press('Escape');
  await firstBackstage.getByRole('button', { name: 'Close Notebook File' }).click();

  for (const width of [2400, 1440, 1100]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.getByRole('button', { name: 'File', exact: true }).click();
    const backstage = page.getByRole('dialog', { name: 'Notebook File' });
    await expect(backstage).toBeVisible();
    await backstage.getByRole('button', { name: 'File', exact: true }).click();
    await expect(backstage.getByRole('button', { name: /New/ })).toBeVisible();
    await expect(backstage.getByRole('heading', { name: 'Templates' })).toBeVisible();
    const geometry = await backstage.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        left: bounds.left,
        right: bounds.right,
        viewport: window.innerWidth,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
      };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewport);
    expect(geometry.overflow).toBeLessThanOrEqual(0);
    await backstage.getByRole('button', { name: 'Open', exact: true }).click();
    const record = backstage.getByLabel('All Notebooks').getByRole('button', { name: /Durable Library Evidence/ }).first();
    await record.click({ button: 'right' });
    await expect(page.getByRole('menu', { name: 'Notebook actions' })).toBeVisible();
    await expectViewportContained(page, '.notebook-library-context-menu');
    await attachScreenshot(page, `notebook-library-${width}`);
    await page.keyboard.press('Escape');
    await backstage.getByRole('button', { name: 'Close Notebook File' }).click();
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' });
  await page.locator('.active-surface--page').evaluate((element) => {
    (element as HTMLElement).style.setProperty('--page-ui-scale', '1.3');
  });
  await page.getByRole('button', { name: 'File', exact: true }).click();
  const scaled = page.getByRole('dialog', { name: 'Notebook File' });
  await expect(scaled).toBeVisible();
  await scaled.getByRole('button', { name: 'File', exact: true }).click();
  await expect(scaled.getByRole('button', { name: /Save portable Notebook/ })).toBeDisabled();
  await scaled.getByRole('button', { name: 'Open', exact: true }).click();
  const forcedRecord = scaled.getByLabel('All Notebooks').getByRole('button', { name: /Durable Library Evidence/ }).first();
  await forcedRecord.click({ button: 'right' });
  await expectViewportContained(page, '.notebook-library-context-menu');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
    .toBeLessThanOrEqual(0);
  await attachScreenshot(page, 'notebook-library-forced-colors-130');
  await page.keyboard.press('Escape');
  await scaled.getByRole('button', { name: 'Close Notebook File' }).click();

  await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'none' });
  await page.locator('.active-surface--page').evaluate((element) => {
    (element as HTMLElement).style.setProperty('--page-ui-scale', '0.8');
  });
  await page.getByRole('button', { name: 'File', exact: true }).click();
  const compact = page.getByRole('dialog', { name: 'Notebook File' });
  await compact.getByRole('button', { name: 'Open', exact: true }).click();
  const compactRecord = compact.getByLabel('All Notebooks').getByRole('button', { name: /Durable Library Evidence/ }).first();
  await compactRecord.click({ button: 'right' });
  await expectViewportContained(page, '.notebook-library-context-menu');
  await attachScreenshot(page, 'notebook-library-80');
  await page.keyboard.press('Escape');
  await compact.getByRole('button', { name: 'Close Notebook File' }).click();
  await expect(page.getByTestId('notebook-canvas')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
    .toBeLessThanOrEqual(0);
});
