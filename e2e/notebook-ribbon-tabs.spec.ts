import { expect, test, type Page } from '@playwright/test';

async function openBlankNotebook(page: Page) {
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

async function expectRibbonContained(page: Page) {
  const geometry = await page.locator('.notebook-rich-ribbon').evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const toolbar = element.querySelector('.notebook-rich-toolbar')!.getBoundingClientRect();
    const railOverlap = [...document.querySelectorAll('.notebook-collapsed-rail')]
      .filter((rail) => getComputedStyle(rail).display !== 'none')
      .some((rail) => {
        const railBounds = rail.getBoundingClientRect();
        return railBounds.left < bounds.right
          && railBounds.right > bounds.left
          && railBounds.top < bounds.bottom
          && railBounds.bottom > bounds.top;
      });
    return {
      left: bounds.left,
      right: bounds.right,
      toolbarLeft: toolbar.left,
      toolbarRight: toolbar.right,
      viewport: window.innerWidth,
      pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
      railOverlap,
    };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.toolbarLeft).toBeGreaterThanOrEqual(geometry.left);
  expect(geometry.toolbarRight).toBeLessThanOrEqual(geometry.right);
  expect(geometry.pageOverflow).toBeLessThanOrEqual(0);
  expect(geometry.railOverlap).toBe(false);
}

test('Notebook ribbon separates Home, Insert, Layout, and File without disturbing Workspace Tabs', async ({ page }) => {
  await page.setViewportSize({ width: 2400, height: 1050 });
  await openBlankNotebook(page);

  const workspaceTabs = page.locator('.workspace-tabs-shell');
  const workspaceTabsBefore = await workspaceTabs.boundingBox();
  const ribbonTabs = page.getByRole('tablist', { name: 'Notebook ribbon tabs' });
  const toolbar = page.getByLabel('Notebook formatting toolbar');
  await expect(page.locator('.app-page-shell-header--notebook')).toHaveText('Untitled Notebook');
  await expect(page.getByRole('button', { name: 'File', exact: true })).toBeVisible();
  await expect(ribbonTabs.getByRole('tab', { name: 'Home' })).toHaveAttribute('aria-selected', 'true');
  await expect(ribbonTabs.getByRole('tab', { name: 'Insert' })).toHaveAttribute('aria-selected', 'false');
  await expect(ribbonTabs.getByRole('tab', { name: 'Layout' })).toHaveAttribute('aria-selected', 'false');
  await expect(ribbonTabs.getByRole('tab', { name: 'Picture Format' })).toHaveCount(0);
  await expect(ribbonTabs.getByRole('tab', { name: 'Video Format' })).toHaveCount(0);
  await expect(toolbar.getByRole('region', { name: 'Font' })).toBeVisible();
  await expect(toolbar.getByRole('region', { name: 'Paragraph' })).toBeVisible();
  await expect(toolbar.getByRole('region', { name: 'Styles' })).toBeVisible();
  await expect(toolbar.getByRole('region', { name: 'Edit' })).toBeVisible();

  await ribbonTabs.getByRole('tab', { name: 'Insert' }).click();
  await expect(toolbar.getByRole('region', { name: 'Structure' })).toBeVisible();
  await expect(toolbar.getByRole('region', { name: 'Math' })).toBeVisible();
  await expect(toolbar.getByRole('region', { name: 'Media' })).toBeVisible();
  await expect(toolbar.getByRole('region', { name: 'Document' })).toBeVisible();
  await expect(toolbar.getByRole('button', { name: /Image/ })).toBeEnabled();
  await expect(toolbar.getByRole('button', { name: /Video/ })).toBeEnabled();
  expect(await workspaceTabs.boundingBox()).toEqual(workspaceTabsBefore);

  await ribbonTabs.getByRole('tab', { name: 'Layout' }).click();
  await expect(toolbar.getByRole('region', { name: 'Page setup' })).toBeVisible();
  await expect(toolbar.getByLabel('Paper size')).toHaveValue('a4');
  await expect(toolbar.getByRole('button', { name: 'Insert page break' })).toBeVisible();
  await ribbonTabs.getByRole('tab', { name: 'Insert' }).click();

  await toolbar.getByRole('button', { name: 'Insert evidence' }).click();
  await expect(page.getByTestId('notebook-evidence-node')).toBeVisible();
  await toolbar.getByRole('button', { name: 'Insert divider' }).click();
  await expect(page.getByLabel('Notebook rich document').locator('hr')).toHaveCount(1);
  await ribbonTabs.getByRole('tab', { name: 'Home' }).click();
  await toolbar.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByLabel('Notebook rich document').locator('hr')).toHaveCount(0);
  await toolbar.getByRole('button', { name: 'Redo' }).click();
  await expect(page.getByLabel('Notebook rich document').locator('hr')).toHaveCount(1);

  for (const width of [2400, 1440, 1100]) {
    await page.setViewportSize({ width, height: 1000 });
    await expectRibbonContained(page);
    const ribbonBounds = await page.locator('.notebook-rich-ribbon').boundingBox();
    expect(ribbonBounds).not.toBeNull();
    expect(ribbonBounds!.x + ribbonBounds!.width).toBeLessThanOrEqual(width);
    await ribbonTabs.getByRole('tab', { name: 'Home' }).click();
    await toolbar.getByRole('button', { name: /Paragraph style/ }).click();
    const styles = page.getByRole('menu', { name: 'Paragraph styles' });
    await expect(styles).toBeVisible();
    const menuBounds = await styles.boundingBox();
    expect(menuBounds).not.toBeNull();
    expect(menuBounds!.x).toBeGreaterThanOrEqual(0);
    expect(menuBounds!.x + menuBounds!.width).toBeLessThanOrEqual(width);
    await page.keyboard.press('Escape');
    await ribbonTabs.getByRole('tab', { name: 'Insert' }).click();
    await expect(toolbar.getByRole('button', { name: /Image/ })).toBeEnabled();
    await toolbar.getByRole('button', { name: 'Insert academic container' }).click();
    const containerMenu = page.getByRole('menu', { name: 'Academic containers' });
    const containerBounds = await containerMenu.boundingBox();
    expect(containerBounds).not.toBeNull();
    expect(containerBounds!.x).toBeGreaterThanOrEqual(8);
    expect(containerBounds!.x + containerBounds!.width).toBeLessThanOrEqual(width - 8);
    expect(containerBounds!.y).toBeGreaterThanOrEqual(8);
    expect(containerBounds!.y + containerBounds!.height).toBeLessThanOrEqual(992);
    await page.keyboard.press('Escape');
    await attachScreenshot(page, `notebook-ribbon-${width}`);
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' });
  await page.locator('.active-surface--page').evaluate((element) => {
    (element as HTMLElement).style.setProperty('--page-ui-scale', '1.3');
  });
  await expectRibbonContained(page);
  await attachScreenshot(page, 'notebook-ribbon-forced-colors-130');

  await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'none' });
  await page.locator('.active-surface--page').evaluate((element) => {
    (element as HTMLElement).style.setProperty('--page-ui-scale', '0.8');
  });
  await expectRibbonContained(page);
  await attachScreenshot(page, 'notebook-ribbon-80');
});

test('Notebook ribbon keeps an editor range while changing tabs and dismisses transient menus', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openBlankNotebook(page);
  const editor = page.getByLabel('Notebook rich document');
  const ribbonTabs = page.getByRole('tablist', { name: 'Notebook ribbon tabs' });
  const toolbar = page.getByLabel('Notebook formatting toolbar');

  await editor.click();
  await page.keyboard.type('Selection remains authored');
  await page.keyboard.press('Control+A');
  await toolbar.getByRole('button', { name: 'Paragraph style: Normal' }).click();
  await expect(page.getByRole('menu', { name: 'Paragraph styles' })).toBeVisible();
  await ribbonTabs.getByRole('tab', { name: 'Insert' }).click();
  await expect(page.getByRole('menu', { name: 'Paragraph styles' })).toBeHidden();
  await ribbonTabs.getByRole('tab', { name: 'Home' }).click();
  await toolbar.getByRole('button', { name: 'Bold' }).click();
  await expect(editor.locator('strong')).toHaveText('Selection remains authored');

  await page.getByRole('button', { name: 'File', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Notebook File' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Notebook File' })).toBeHidden();
});
