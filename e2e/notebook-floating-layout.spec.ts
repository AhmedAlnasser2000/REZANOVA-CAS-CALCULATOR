import { expect, test, type Page } from '@playwright/test';

type StoredNotebookRecord = {
  revision: number;
  savedAt: string;
  document: {
    content: unknown[];
    title: string;
    updatedAt: string;
  };
};

async function openBlankNotebook(page: Page) {
  await page.goto('/');
  await page.getByTestId('workspace-tab-add-menu').click();
  await page.getByRole('menuitem', { name: 'New Notebook' }).click();
  await expect(page.getByLabel('Notebook rich document')).toBeVisible();
  await page.keyboard.press('Control+S');
  await expect(page.getByText('Saved locally').first()).toBeVisible();
}

async function installFloatingLayoutFixture(page: Page) {
  await page.evaluate(async () => {
    const request = indexedDB.open('calcwiz-notebook-library-v1', 2);
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const read = database.transaction('records', 'readonly').objectStore('records').getAll();
    const records = await new Promise<StoredNotebookRecord[]>((resolve, reject) => {
      read.onsuccess = () => resolve(read.result as StoredNotebookRecord[]);
      read.onerror = () => reject(read.error);
    });
    const record = records.at(-1);
    if (!record?.document) throw new Error('Notebook fixture record was not available.');
    const placement = (
      anchor: { kind: 'page'; pageNumber: number } | { kind: 'paragraph'; nodeId: string },
      zOrder: number,
      overrides: Record<string, unknown> = {},
    ) => ({
      mode: 'floating',
      anchor,
      horizontalReference: 'margins',
      verticalReference: 'margins',
      xPt: 0,
      yPt: 0,
      widthPt: 180,
      wrap: 'in-front',
      textDistancePt: { top: 0, right: 12, bottom: 0, left: 12 },
      zOrder,
      ...overrides,
    });
    record.document.content = [{
      type: 'paragraph',
      id: 'paragraph.anchor',
      content: [{ type: 'text', text: 'Anchor paragraph' }],
    }, {
      type: 'semanticBlock',
      id: 'container.floating',
      variant: 'theorem',
      objectPlacement: placement(
        { kind: 'paragraph', nodeId: 'paragraph.anchor' },
        0,
        { wrap: 'square', widthPt: 190 },
      ),
      content: [{
        type: 'paragraph',
        id: 'paragraph.container',
        content: [{ type: 'text', text: 'A floating theorem stays editable.' }],
      }],
    }, {
      type: 'paragraph',
      id: 'paragraph.wrapped',
      content: [{
        type: 'text',
        text: 'This paragraph uses the remaining column beside the square-wrapped theorem.',
      }],
    }, {
      type: 'horizontalRule',
      id: 'divider.fixed-page',
      objectPlacement: placement(
        { kind: 'page', pageNumber: 3 },
        1,
        { wrap: 'top-and-bottom', widthPt: 300 },
      ),
    }, {
      type: 'section',
      id: 'section.oversized',
      title: 'Oversized floating section',
      objectPlacement: placement(
        { kind: 'paragraph', nodeId: 'paragraph.anchor' },
        2,
        { yPt: 140, widthPt: 320 },
      ),
      content: Array.from({ length: 52 }, (_, index) => ({
        type: 'paragraph',
        id: `paragraph.large.${index}`,
        content: [{
          type: 'text',
          text: `Structured content line ${index + 1} remains editable after returning to flow.`,
        }],
      })),
    }];
    record.document.title = 'Floating Layout Evidence';
    record.revision += 1;
    record.savedAt = new Date().toISOString();
    record.document.updatedAt = record.savedAt;
    const write = database.transaction('records', 'readwrite').objectStore('records').put(record);
    await new Promise<void>((resolve, reject) => {
      write.onsuccess = () => resolve();
      write.onerror = () => reject(write.error);
    });
    database.close();
  });
  await page.reload();
  await page.getByTestId('workspace-tab-add-menu').click();
  await page.getByRole('menuitem', { name: 'New Notebook' }).click();
  await expect(page.getByLabel('Notebook rich document')).toBeVisible();
  await page.getByRole('button', { name: 'File', exact: true }).click();
  const backstage = page.getByRole('dialog', { name: 'Notebook File' });
  await backstage.getByRole('button', { name: 'Open', exact: true }).click();
  await backstage.getByLabel('All Notebooks')
    .getByRole('button', { name: /Floating Layout Evidence/ })
    .first()
    .dblclick();
  await expect(page.getByLabel('Notebook title')).toHaveValue('Floating Layout Evidence');
}

test('Notebook derives fixed pages, paragraph anchors, wrap exclusions, and Draft placeholders', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openBlankNotebook(page);
  await installFloatingLayoutFixture(page);

  const container = page.locator('[data-notebook-node-id="container.floating"]');
  const divider = page.locator('[data-notebook-node-id="divider.fixed-page"]');
  const wrapped = page.locator('[data-notebook-node-id="paragraph.wrapped"]');
  expect(pageErrors).toEqual([]);
  await expect(page.locator('.notebook-page-stage'))
    .toHaveAttribute('data-notebook-floating-count', '2');
  await expect(container).toHaveCSS('position', 'absolute');
  await expect(divider).toHaveCSS('position', 'absolute');
  await expect.poll(async () => page.evaluate(async () => {
    const request = indexedDB.open('calcwiz-notebook-library-v1', 2);
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const read = database.transaction('records', 'readonly').objectStore('records').getAll();
    const records = await new Promise<StoredNotebookRecord[]>((resolve, reject) => {
      read.onsuccess = () => resolve(read.result as StoredNotebookRecord[]);
      read.onerror = () => reject(read.error);
    });
    database.close();
    const content = records.find(({ document }) => (
      document.title === 'Floating Layout Evidence'
    ))?.document.content as Array<{
      id?: string;
      objectPlacement?: { mode?: string };
    }> | undefined;
    const expectedIds = new Set([
      'container.floating',
      'divider.fixed-page',
      'paragraph.anchor',
      'paragraph.wrapped',
      'section.oversized',
    ]);
    return Object.fromEntries((content ?? [])
      .filter((node) => node.id && expectedIds.has(node.id))
      .map((node) => [node.id, node.objectPlacement?.mode ?? 'missing']));
  })).toEqual({
    'container.floating': 'floating',
    'divider.fixed-page': 'floating',
    'paragraph.anchor': 'missing',
    'paragraph.wrapped': 'missing',
    'section.oversized': 'flow',
  });
  await expect.poll(() => page.locator('.notebook-page-sheet').count()).toBeGreaterThanOrEqual(3);
  await expect(page.getByText(/floating structured object returned to document flow/u)).toBeVisible();
  await expect(page.locator('[data-notebook-node-id="section.oversized"]'))
    .not.toHaveAttribute('data-notebook-floating-object', 'true');

  const geometry = await page.evaluate(() => {
    const sheet = document.querySelector('.notebook-page-sheet')!.getBoundingClientRect();
    const anchor = document.querySelector<HTMLElement>('[data-notebook-node-id="paragraph.anchor"]')!
      .getBoundingClientRect();
    const containerBounds = document.querySelector<HTMLElement>('[data-notebook-node-id="container.floating"]')!
      .getBoundingClientRect();
    const wrappedBounds = document.querySelector<HTMLElement>('[data-notebook-node-id="paragraph.wrapped"]')!
      .getBoundingClientRect();
    return {
      anchorLeft: anchor.left,
      anchorTop: anchor.top,
      containerBottom: containerBounds.bottom,
      containerLeft: containerBounds.left,
      containerTop: containerBounds.top,
      sheetBottom: sheet.bottom,
      sheetLeft: sheet.left,
      sheetRight: sheet.right,
      sheetTop: sheet.top,
      wrappedLeft: wrappedBounds.left,
      wrappedTop: wrappedBounds.top,
    };
  });
  expect(geometry.containerLeft).toBeGreaterThanOrEqual(geometry.sheetLeft);
  expect(geometry.containerTop).toBeGreaterThanOrEqual(geometry.sheetTop);
  expect(geometry.containerBottom).toBeLessThanOrEqual(geometry.sheetBottom);
  expect(geometry.wrappedTop).toBeLessThan(geometry.containerBottom);
  expect(geometry.anchorLeft).toBeGreaterThan(geometry.containerLeft + 100);
  expect(geometry.wrappedLeft).toBeGreaterThan(geometry.containerLeft + 100);
  expect(geometry.containerTop).toBeGreaterThanOrEqual(geometry.anchorTop - 2);
  expect(geometry.containerLeft).toBeLessThan(geometry.sheetRight);
  const thirdPagePlacement = await page.evaluate(() => {
    const sheets = [...document.querySelectorAll('.notebook-page-sheet')]
      .map((sheet) => sheet.getBoundingClientRect());
    const dividerBounds = document.querySelector<HTMLElement>(
      '[data-notebook-node-id="divider.fixed-page"]',
    )!.getBoundingClientRect();
    return {
      dividerTop: dividerBounds.top,
      pageTop: sheets[2]!.top,
      pageBottom: sheets[2]!.bottom,
    };
  });
  expect(thirdPagePlacement.dividerTop).toBeGreaterThanOrEqual(thirdPagePlacement.pageTop);
  expect(thirdPagePlacement.dividerTop).toBeLessThan(thirdPagePlacement.pageBottom);

  for (const evidence of [
    { width: 2400, height: 1100, scale: '0.8', forcedColors: false },
    { width: 1440, height: 1000, scale: '1', forcedColors: false },
    { width: 1100, height: 900, scale: '1', forcedColors: true },
    { width: 2400, height: 1100, scale: '1.3', forcedColors: true },
  ]) {
    await page.setViewportSize({ width: evidence.width, height: evidence.height });
    await page.emulateMedia({ forcedColors: evidence.forcedColors ? 'active' : 'none' });
    await page.locator('.active-surface--page').evaluate((element, scale) => {
      (element as HTMLElement).style.setProperty('--page-ui-scale', scale);
    }, evidence.scale);
    await expect(page.locator('.notebook-page-stage'))
      .toHaveAttribute('data-notebook-floating-count', '2');
    const containment = await page.evaluate(() => {
      const sheets = [...document.querySelectorAll('.notebook-page-sheet')]
        .map((sheet) => sheet.getBoundingClientRect());
      const containerBounds = document.querySelector<HTMLElement>(
        '[data-notebook-node-id="container.floating"]',
      )!.getBoundingClientRect();
      const dividerBounds = document.querySelector<HTMLElement>(
        '[data-notebook-node-id="divider.fixed-page"]',
      )!.getBoundingClientRect();
      const contains = (outer: DOMRect, inner: DOMRect) => (
        inner.left >= outer.left - 1
        && inner.right <= outer.right + 1
        && inner.top >= outer.top - 1
        && inner.bottom <= outer.bottom + 1
      );
      return {
        container: contains(sheets[0]!, containerBounds),
        divider: contains(sheets[2]!, dividerBounds),
        overflow: document.documentElement.scrollWidth - window.innerWidth,
      };
    });
    expect(containment.container).toBe(true);
    expect(containment.divider).toBe(true);
    expect(containment.overflow).toBeLessThanOrEqual(0);
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ forcedColors: 'none' });
  await page.locator('.active-surface--page').evaluate((element) => {
    (element as HTMLElement).style.setProperty('--page-ui-scale', '1');
  });

  const tabs = page.getByRole('tablist', { name: 'Notebook ribbon tabs' });
  const toolbar = page.getByLabel('Notebook formatting toolbar');
  await tabs.getByRole('tab', { name: 'Layout' }).click();
  await toolbar.getByRole('button', { name: 'Draft' }).click();
  await expect.poll(() => divider.evaluate((element) => (
    getComputedStyle(element, '::before').content
  ))).toContain('Page 3');
  await expect(page.locator('.notebook-page-sheet')).toHaveCount(0);
  await expect(page.getByText('Draft view')).toBeVisible();
  await expect(wrapped).toBeVisible();
});
