import { expect, test, type Page } from '@playwright/test';

type StoredPageNotebook = {
  document?: {
    content?: Array<{ type?: string }>;
    headerFooter?: {
      defaultFooter?: Record<string, unknown>;
      defaultHeader?: Record<string, unknown>;
      differentFirstPage?: boolean;
      firstPageFooter?: Record<string, unknown>;
      firstPageHeader?: Record<string, unknown>;
      pageNumberStart?: number;
    };
    pageSetup?: {
      marginsPt?: { bottom?: number; left?: number; right?: number; top?: number };
      orientation?: string;
      paperSize?: string;
    };
    version?: number;
  };
};

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

async function expectPageStageContained(page: Page) {
  const geometry = await page.evaluate(() => {
    const stage = document.querySelector('.notebook-page-stage')!.getBoundingClientRect();
    const scroll = document.querySelector('.notebook-rich-scroll-region')!.getBoundingClientRect();
    const sheets = [...document.querySelectorAll('.notebook-page-sheet')]
      .map((sheet) => sheet.getBoundingClientRect());
    return {
      gap: sheets.length > 1 ? sheets[1]!.top - sheets[0]!.bottom : 0,
      pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
      sheetCount: sheets.length,
      sheetHeights: sheets.map((sheet) => sheet.height),
      stageLeft: stage.left,
      stageRight: stage.right,
      scrollLeft: scroll.left,
      scrollRight: scroll.right,
    };
  });
  expect(geometry.stageLeft).toBeGreaterThanOrEqual(geometry.scrollLeft - 1);
  expect(geometry.stageRight).toBeLessThanOrEqual(geometry.scrollRight + 1);
  expect(geometry.stageLeft).toBeGreaterThanOrEqual(0);
  expect(geometry.pageOverflow).toBeLessThanOrEqual(0);
  expect(geometry.sheetCount).toBe(2);
  expect(geometry.sheetHeights.every((height) => height > 100)).toBe(true);
  expect(geometry.gap).toBeGreaterThan(0);
}

async function expectPopoverInsideViewport(page: Page, dialogName: string) {
  const dialog = page.getByRole('dialog', { name: dialogName });
  await expect(dialog).toBeVisible();
  const bounds = await page.evaluate((name) => {
    const dialog = [...document.querySelectorAll<HTMLElement>('[role="dialog"]')]
      .find((candidate) => candidate.getAttribute('aria-label') === name)!;
    const popover = dialog.getBoundingClientRect();
    const keyboard = document.querySelector<HTMLElement>('[data-testid="notebook-authoring-keyboard"]');
    const keyboardBounds = keyboard && getComputedStyle(keyboard).display !== 'none'
      ? keyboard.getBoundingClientRect()
      : null;
    const keyboardOverlap = keyboardBounds
      ? popover.left < keyboardBounds.right
        && popover.right > keyboardBounds.left
        && popover.top < keyboardBounds.bottom
        && popover.bottom > keyboardBounds.top
      : false;
    return {
      keyboardOverlap,
      left: popover.left,
      right: popover.right,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      top: popover.top,
      bottom: popover.bottom,
    };
  }, dialogName);
  expect(bounds.left).toBeGreaterThanOrEqual(8);
  expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth - 8);
  expect(bounds.top).toBeGreaterThanOrEqual(8);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.viewportHeight - 8);
  expect(bounds.keyboardOverlap).toBe(false);
}

test('Notebook V11 directly authors running matter and renders two physical sheets', async ({ page }) => {
  await page.setViewportSize({ width: 2400, height: 1050 });
  await openBlankNotebook(page);
  const editor = page.getByLabel('Notebook rich document');
  const tabs = page.getByRole('tablist', { name: 'Notebook ribbon tabs' });
  const toolbar = page.getByLabel('Notebook formatting toolbar');

  await expect(page.locator('.notebook-page-stage')).toHaveClass(/is-print/);
  await expect(page.getByText('Page 1 of 1')).toBeVisible();
  await editor.click();
  await page.keyboard.type('Limit laws begin with a stable local argument.');
  await page.keyboard.press('Control+A');

  await tabs.getByRole('tab', { name: 'Layout' }).click();
  await toolbar.getByLabel('Paper size').selectOption('letter');
  await toolbar.getByLabel('Page orientation').selectOption('landscape');
  await toolbar.getByLabel('Page margins').selectOption('narrow');
  await tabs.getByRole('tab', { name: 'Home' }).click();
  await toolbar.getByRole('button', { name: 'Bold' }).click();
  await expect(editor.locator('strong')).toHaveText('Limit laws begin with a stable local argument.');
  await page.keyboard.press('ArrowRight');

  const firstSheet = await page.locator('.notebook-page-sheet').first().boundingBox();
  expect(firstSheet).not.toBeNull();
  await page.mouse.dblclick(firstSheet!.x + firstSheet!.width / 2, firstSheet!.y + 18);
  let runningEditor = page.getByLabel('Running matter editor');
  await runningEditor.fill('Calculus I');
  await attachScreenshot(page, 'notebook-running-matter-editing');
  await tabs.getByRole('tab', { name: 'Header & Footer' }).click();
  await toolbar.getByRole('button', { name: 'Edit footer' }).click();
  await toolbar.getByRole('button', { name: 'left region' }).click();
  runningEditor = page.getByLabel('Running matter editor');
  await runningEditor.fill('Limit laws');
  await toolbar.getByRole('button', { name: 'right region' }).click();
  await toolbar.getByRole('button', { name: 'Insert page number at caret' }).click();
  await toolbar.getByLabel('Starting page number').fill('4');
  await toolbar.getByRole('checkbox', { name: 'Different first page' }).check();
  await toolbar.getByRole('button', { name: 'Close Header and Footer' }).click();

  await tabs.getByRole('tab', { name: 'Layout' }).click();
  await toolbar.getByRole('button', { name: 'Insert page break' }).click();
  await expect(editor.locator('[data-notebook-page-break]')).toHaveCount(1);
  const authoredText = editor.locator('strong');
  await expect(authoredText).toBeVisible();
  await authoredText.scrollIntoViewIfNeeded();
  await expect.poll(() => authoredText.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const hit = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
    return hit === element || element.contains(hit);
  })).toBe(true);
  await expect(page.getByText('Page 1 of 2')).toBeVisible();
  await expect(page.locator('.notebook-page-sheet')).toHaveCount(2);
  await expect(page.locator('.notebook-page-sheet').nth(0).locator('.notebook-running-matter.is-header')).toBeEmpty();
  await expect(page.locator('.notebook-page-sheet').nth(1).locator('.notebook-running-matter.is-header')).toHaveText('Calculus I');
  await expect(page.locator('.notebook-page-sheet').nth(1).locator('.notebook-running-matter.is-footer')).toContainText('Limit laws');
  await expect(page.locator('.notebook-page-sheet').nth(1).locator('.notebook-running-page-number')).toHaveText('5');

  await page.keyboard.press('Control+S');
  await expect(page.getByText('Saved locally').first()).toBeVisible();
  await expect.poll(async () => page.evaluate(async () => {
    const request = indexedDB.open('calcwiz-notebook-library-v1', 2);
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction('records', 'readonly');
    const recordsRequest = transaction.objectStore('records').getAll();
    const records = await new Promise<StoredPageNotebook[]>((resolve, reject) => {
      recordsRequest.onsuccess = () => resolve(recordsRequest.result as StoredPageNotebook[]);
      recordsRequest.onerror = () => reject(recordsRequest.error);
    });
    database.close();
    const document = records.find((record) => record.document?.content?.some(
      (node) => node.type === 'pageBreak',
    ))?.document;
    return {
      headerFooter: document?.headerFooter,
      pageBreaks: document?.content?.filter((node) => node.type === 'pageBreak').length,
      pageSetup: document?.pageSetup,
      version: document?.version,
    };
  })).toEqual({
    headerFooter: {
      defaultFooter: {
        center: [{ type: 'paragraph' }],
        left: [{ type: 'paragraph', content: [{ type: 'text', text: 'Limit laws' }] }],
        right: [{ type: 'paragraph', content: [{ type: 'pageNumber' }] }],
      },
      defaultHeader: {
        center: [{ type: 'paragraph', content: [{ type: 'text', text: 'Calculus I' }] }],
        left: [{ type: 'paragraph' }],
        right: [{ type: 'paragraph' }],
      },
      differentFirstPage: true,
      firstPageFooter: {
        center: [{ type: 'paragraph' }], left: [{ type: 'paragraph' }], right: [{ type: 'paragraph' }],
      },
      firstPageHeader: {
        center: [{ type: 'paragraph' }], left: [{ type: 'paragraph' }], right: [{ type: 'paragraph' }],
      },
      pageNumberStart: 4,
    },
    pageBreaks: 1,
    pageSetup: {
      marginsPt: { bottom: 36, left: 36, right: 36, top: 36 },
      orientation: 'landscape',
      paperSize: 'letter',
    },
    version: 12,
  });

  for (const width of [2400, 1440, 1100]) {
    await page.setViewportSize({ width, height: 1000 });
    await expectPageStageContained(page);
    await toolbar.getByRole('button', { name: 'Edit custom margins' }).click();
    await expectPopoverInsideViewport(page, 'Custom margins');
    await page.keyboard.press('Escape');
    await attachScreenshot(page, `notebook-pages-${width}`);
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('.active-surface--page').evaluate((element) => {
    (element as HTMLElement).style.setProperty('--page-ui-scale', '0.8');
  });
  await expectPageStageContained(page);
  await attachScreenshot(page, 'notebook-pages-80');

  await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' });
  await page.locator('.active-surface--page').evaluate((element) => {
    (element as HTMLElement).style.setProperty('--page-ui-scale', '1.3');
  });
  await attachScreenshot(page, 'notebook-pages-forced-colors-130');
  await expectPageStageContained(page);
  await expect(page.locator('.notebook-page-sheet').first()).toHaveCSS('border-top-style', 'solid');
});

test('Notebook Draft view remains continuous and layout popovers avoid Math Authoring', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await openBlankNotebook(page);
  const tabs = page.getByRole('tablist', { name: 'Notebook ribbon tabs' });
  const toolbar = page.getByLabel('Notebook formatting toolbar');

  await tabs.getByRole('tab', { name: 'Insert' }).click();
  await toolbar.getByRole('button', { name: 'Separate equation' }).click();
  await expect(page.getByTestId('notebook-authoring-keyboard')).toBeVisible();
  await tabs.getByRole('tab', { name: 'Layout' }).click();
  await toolbar.getByRole('button', { name: 'Edit custom margins' }).click();
  await expectPopoverInsideViewport(page, 'Custom margins');
  await page.keyboard.press('Escape');

  await toolbar.getByRole('button', { name: 'Draft' }).click();
  await expect(page.locator('.notebook-page-stage')).toHaveClass(/is-draft/);
  await expect(page.locator('.notebook-page-sheet')).toHaveCount(0);
  await expect(page.getByText('Draft view')).toBeVisible();
  await toolbar.getByRole('button', { name: 'Print' }).click();
  await expect(page.locator('.notebook-page-stage')).toHaveClass(/is-print/);
  await attachScreenshot(page, 'notebook-draft-print-1100');
});
