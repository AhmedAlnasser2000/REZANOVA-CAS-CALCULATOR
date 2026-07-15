import { expect, test, type Locator, type Page } from '@playwright/test';

type StoredBrowserNotebook = {
  assetIds?: string[];
  document?: {
    content?: Array<{
      alignment?: string;
      caption?: string;
      crop?: { height?: number; width?: number; x?: number; y?: number };
      displayAspectRatio?: number;
      placement?: string;
      rotation?: number;
      type?: string;
      widthPercent?: number;
    }>;
    version?: number;
  };
};

type StoredBrowserAsset = {
  metadata?: { mimeType?: string };
};

const SAFE_SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">'
  + '<defs><linearGradient id="paint"><stop stop-color="#84bfe8"/>'
  + '<stop offset="1" stop-color="#b8d49c"/></linearGradient></defs>'
  + '<rect width="320" height="180" rx="18" fill="url(#paint)"/>'
  + '<path d="M24 138 C92 42 188 154 296 38" fill="none" stroke="#102021" stroke-width="8"/>'
  + '</svg>',
);

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

async function dragNotebookControl(
  page: Page,
  control: Locator,
  destination: { x: number; y: number },
) {
  const bounds = await control.boundingBox();
  if (!bounds) throw new Error('Notebook media control is not visible.');
  const start = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(destination.x, destination.y, { steps: 8 });
  await page.mouse.up();
}

async function expectImageContained(page: Page) {
  const geometry = await page.getByTestId('notebook-image-figure').evaluate((element) => {
    const figure = element.getBoundingClientRect();
    const canvas = document.querySelector('.notebook-rich-scroll-region')!.getBoundingClientRect();
    return {
      canvasLeft: canvas.left,
      canvasRight: canvas.right,
      figureLeft: figure.left,
      figureRight: figure.right,
      pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  expect(geometry.figureLeft).toBeGreaterThanOrEqual(geometry.canvasLeft);
  expect(geometry.figureRight).toBeLessThanOrEqual(geometry.canvasRight);
  expect(geometry.pageOverflow).toBeLessThanOrEqual(0);
}

test('Notebook inserts a durable safe SVG figure and exposes contextual Picture Format', async ({ page }) => {
  await page.setViewportSize({ width: 2400, height: 1050 });
  await openBlankNotebook(page);

  const ribbonTabs = page.getByRole('tablist', { name: 'Notebook ribbon tabs' });
  const toolbar = page.getByLabel('Notebook formatting toolbar');
  await ribbonTabs.getByRole('tab', { name: 'Insert' }).click();
  await expect(toolbar.getByRole('button', { name: 'Image' })).toBeEnabled();
  await page.getByLabel('Choose image').setInputFiles({
    name: 'limit-figure.svg',
    mimeType: 'image/svg+xml',
    buffer: SAFE_SVG,
  });

  const dialog = page.getByRole('dialog', { name: 'Insert image' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Insert image' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Alternative text is empty');
  await dialog.getByLabel('Alternative text').fill('A curve approaching a finite limit.');
  await dialog.getByLabel(/Caption/).fill('Limit diagram');
  await dialog.getByRole('button', { name: 'Insert image' }).click();

  const figure = page.getByTestId('notebook-image-figure');
  await expect(figure).toBeVisible();
  await expect(figure.getByRole('img', { name: 'A curve approaching a finite limit.' }))
    .toBeVisible();
  await expect(figure).toContainText('Figure 1. Limit diagram');
  await expect(page.getByTestId('notebook-outline-entry').filter({ hasText: 'Limit diagram' }))
    .toBeVisible();
  await expect(ribbonTabs.getByRole('tab', { name: 'Picture Format' }))
    .toHaveAttribute('aria-selected', 'true');

  await page.keyboard.press('Control+S');
  await expect(page.getByText('Saved locally').first()).toBeVisible();
  await expect.poll(async () => page.evaluate(async () => {
    const request = indexedDB.open('calcwiz-notebook-library-v1', 2);
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction(['records', 'assets'], 'readonly');
    const recordsRequest = transaction.objectStore('records').getAll();
    const assetsRequest = transaction.objectStore('assets').getAll();
    const [records, assets] = await Promise.all([
      new Promise<StoredBrowserNotebook[]>((resolve, reject) => {
        recordsRequest.onsuccess = () => resolve(
          recordsRequest.result as StoredBrowserNotebook[],
        );
        recordsRequest.onerror = () => reject(recordsRequest.error);
      }),
      new Promise<StoredBrowserAsset[]>((resolve, reject) => {
        assetsRequest.onsuccess = () => resolve(
          assetsRequest.result as StoredBrowserAsset[],
        );
        assetsRequest.onerror = () => reject(assetsRequest.error);
      }),
    ]);
    database.close();
    const record = records.find((candidate) => candidate.document?.content?.some(
      (node: { type?: string }) => node.type === 'imageFigure',
    ));
    const image = record?.document?.content?.find(
      (node: { type?: string }) => node.type === 'imageFigure',
    );
    return {
      assetCount: assets.length,
      assetIds: record?.assetIds,
      caption: image?.caption,
      mimeType: assets[0]?.metadata?.mimeType,
      version: record?.document?.version,
    };
  })).toEqual({
    assetCount: 1,
    assetIds: [expect.stringMatching(/^sha256:[0-9a-f]{64}$/)],
    caption: 'Limit diagram',
    mimeType: 'image/svg+xml',
    version: 13,
  });

  await ribbonTabs.getByRole('tab', { name: 'Home' }).click();
  await figure.click();
  await expect(ribbonTabs.getByRole('tab', { name: 'Picture Format' })).toBeVisible();
  await expect(ribbonTabs.getByRole('tab', { name: 'Home' }))
    .toHaveAttribute('aria-selected', 'true');

  for (const width of [2400, 1440, 1100]) {
    await page.setViewportSize({ width, height: 1000 });
    await expectImageContained(page);
    await attachScreenshot(page, `notebook-image-${width}`);
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('.active-surface--page').evaluate((element) => {
    (element as HTMLElement).style.setProperty('--page-ui-scale', '0.8');
  });
  await expectImageContained(page);
  await attachScreenshot(page, 'notebook-image-80');

  await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' });
  await page.locator('.active-surface--page').evaluate((element) => {
    (element as HTMLElement).style.setProperty('--page-ui-scale', '1.3');
  });
  await expectImageContained(page);
  await expect(figure.locator('.notebook-media-transform-shell')).toHaveCSS('outline-style', 'solid');
  await attachScreenshot(page, 'notebook-image-forced-colors-130');
});

test('Notebook image staging dismisses with Escape and rejects GIF before creating a figure', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await openBlankNotebook(page);
  await page.getByRole('tab', { name: 'Insert' }).click();
  const picker = page.getByLabel('Choose image');

  await picker.setInputFiles({
    name: 'cancelled.svg',
    mimeType: 'image/svg+xml',
    buffer: SAFE_SVG,
  });
  await expect(page.getByRole('dialog', { name: 'Insert image' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Insert image' })).toBeHidden();
  await expect(page.getByTestId('notebook-image-figure')).toHaveCount(0);

  await picker.setInputFiles({
    name: 'animated.gif',
    mimeType: 'image/gif',
    buffer: Buffer.from('GIF89a'),
  });
  await expect(page.getByRole('alert')).toContainText('GIF images are not supported');
  await expect(page.getByTestId('notebook-image-figure')).toHaveCount(0);
  await attachScreenshot(page, 'notebook-image-gif-rejection-1100');
});

test('Picture Format persists page-aware wrap, crop, rotation, size, and alignment', async ({ page }) => {
  await page.setViewportSize({ width: 2400, height: 1050 });
  await openBlankNotebook(page);
  const editor = page.getByLabel('Notebook rich document');
  const ribbonTabs = page.getByRole('tablist', { name: 'Notebook ribbon tabs' });
  const toolbar = page.getByLabel('Notebook formatting toolbar');

  await editor.click();
  await page.keyboard.type('A readable text column must remain beside a wrapped mathematical figure.');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Page geometry decides when square wrapping safely falls back to normal flow.');
  await ribbonTabs.getByRole('tab', { name: 'Insert' }).click();
  await page.getByLabel('Choose image').setInputFiles({
    name: 'wrapped-limit.svg',
    mimeType: 'image/svg+xml',
    buffer: SAFE_SVG,
  });
  const insertDialog = page.getByRole('dialog', { name: 'Insert image' });
  await insertDialog.getByRole('checkbox', { name: /Decorative image/ }).check();
  await insertDialog.getByRole('button', { name: 'Insert image' }).click();

  const figure = page.getByTestId('notebook-image-figure');
  await expect(ribbonTabs.getByRole('tab', { name: 'Picture Format' }))
    .toHaveAttribute('aria-selected', 'true');
  await toolbar.getByRole('button', { name: 'Set image width to 50%' }).click();
  await toolbar.getByRole('button', { name: 'Align image left' }).click();
  await toolbar.getByRole('button', { name: /Wrap text:/ }).click();
  await page.getByRole('menuitemradio', { name: /Square Left/ }).click();
  await expect(figure).toHaveAttribute('data-image-placement', 'square-left');
  await expect(figure).toHaveCSS('float', 'left');

  await ribbonTabs.getByRole('tab', { name: 'Layout' }).click();
  await toolbar.getByLabel('Page margins').selectOption('wide');
  await ribbonTabs.getByRole('tab', { name: 'Picture Format' }).click();
  await expect(figure).toHaveAttribute('data-image-requested-placement', 'square-left');
  await expect(figure).toHaveAttribute('data-image-placement', 'normal');
  await expect(figure).toHaveAttribute('data-image-wrap-fallback', 'true');

  await ribbonTabs.getByRole('tab', { name: 'Layout' }).click();
  await toolbar.getByLabel('Page margins').selectOption('normal');
  await ribbonTabs.getByRole('tab', { name: 'Picture Format' }).click();
  await expect(figure).toHaveAttribute('data-image-placement', 'square-left');

  await figure.click();
  const imageFrame = figure.locator('.notebook-image-frame');
  const resizeFrame = await imageFrame.boundingBox();
  if (!resizeFrame) throw new Error('Image frame is not visible.');
  await dragNotebookControl(
    page,
    figure.getByRole('button', { name: 'Resize image from the right' }),
    {
      x: resizeFrame.x + resizeFrame.width + Math.max(48, resizeFrame.width * 0.12),
      y: resizeFrame.y + resizeFrame.height / 2,
    },
  );
  const stretchedFrame = await imageFrame.boundingBox();
  if (!stretchedFrame) throw new Error('Stretched image frame is not visible.');
  expect(stretchedFrame.width).toBeGreaterThan(resizeFrame.width);
  expect(Math.abs(stretchedFrame.height - resizeFrame.height)).toBeLessThan(2);
  await toolbar.getByRole('button', { name: 'Reset image proportions' }).click();
  const resetFrame = await imageFrame.boundingBox();
  if (!resetFrame) throw new Error('Reset image frame is not visible.');
  expect(Math.abs(resetFrame.width - stretchedFrame.width)).toBeLessThan(2);
  expect(resetFrame.width / resetFrame.height).toBeCloseTo(16 / 9, 1);

  await toolbar.getByRole('button', { name: 'Crop image' }).click();
  const cropOverlay = page.getByTestId('notebook-image-crop-overlay');
  await expect(cropOverlay).toBeVisible();
  const cropFrame = await imageFrame.boundingBox();
  const cropWestHandle = figure.getByRole('button', { name: 'Crop image from the left' });
  if (!cropFrame) throw new Error('Image crop frame is not visible.');
  const cropHandleBounds = await cropWestHandle.boundingBox();
  if (!cropHandleBounds) throw new Error('Image crop control is not visible.');
  await dragNotebookControl(page, cropWestHandle, {
    x: cropHandleBounds.x + cropHandleBounds.width / 2 + Math.max(24, cropFrame.width * 0.1),
    y: cropHandleBounds.y + cropHandleBounds.height / 2,
  });
  await expect(figure).toHaveAttribute('data-notebook-image-crop-mode', 'true');
  await toolbar.getByRole('button', { name: 'Finish cropping image' }).click();
  await expect(cropOverlay).toBeHidden();

  const rotationFrame = await imageFrame.boundingBox();
  if (!rotationFrame) throw new Error('Image rotation frame is not visible.');
  await dragNotebookControl(
    page,
    figure.getByRole('button', { name: 'Rotate image' }),
    {
      x: rotationFrame.x + rotationFrame.width * 0.8,
      y: rotationFrame.y + rotationFrame.height * 0.25,
    },
  );
  await expect(figure).toHaveCSS('width', /.+/);
  await expect(figure.locator('.notebook-media-transform-shell')).toHaveCSS('transform', /matrix\(.+/);

  await editor.press('Control+End');
  await page.keyboard.press('Enter');
  await page.keyboard.type(
    'This paragraph flows beside the picture while the remaining line length stays comfortable.',
  );
  await page.keyboard.press('Enter');
  await page.keyboard.type(
    'A second line demonstrates that wrapping remains part of the single editor flow.',
  );
  await figure.click();
  await ribbonTabs.getByRole('tab', { name: 'Picture Format' }).click();

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
    const records = await new Promise<StoredBrowserNotebook[]>((resolve, reject) => {
      recordsRequest.onsuccess = () => resolve(recordsRequest.result as StoredBrowserNotebook[]);
      recordsRequest.onerror = () => reject(recordsRequest.error);
    });
    database.close();
    return records.flatMap((record) => record.document?.content ?? [])
      .find((node) => node.type === 'imageFigure');
  })).toMatchObject({
    alignment: 'left',
    crop: { height: 1, width: expect.any(Number), x: expect.any(Number), y: 0 },
    placement: 'square-left',
    rotation: expect.any(Number),
    type: 'imageFigure',
    widthPercent: expect.any(Number),
  });
  const storedImage = await page.evaluate(async () => {
    const request = indexedDB.open('calcwiz-notebook-library-v1', 2);
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const recordsRequest = database.transaction('records', 'readonly')
      .objectStore('records').getAll();
    const records = await new Promise<StoredBrowserNotebook[]>((resolve, reject) => {
      recordsRequest.onsuccess = () => resolve(recordsRequest.result as StoredBrowserNotebook[]);
      recordsRequest.onerror = () => reject(recordsRequest.error);
    });
    database.close();
    return records.flatMap((record) => record.document?.content ?? [])
      .find((node) => node.type === 'imageFigure');
  });
  expect(storedImage?.crop?.x).toBeGreaterThan(0);
  expect(storedImage?.crop?.width).toBeLessThan(1);
  expect(storedImage?.displayAspectRatio).toBeUndefined();
  expect(storedImage?.widthPercent).toBeGreaterThan(50);
  expect(storedImage?.rotation).toBeGreaterThan(10);
  expect(storedImage?.rotation).toBeLessThan(85);

  for (const width of [2400, 1440, 1100]) {
    await page.setViewportSize({ width, height: 1000 });
    await expectImageContained(page);
    await toolbar.getByRole('button', { name: 'Crop image' }).click();
    await expect(cropOverlay).toBeVisible();
    const bounds = await cropOverlay.evaluate((element) => {
      const overlay = element.getBoundingClientRect();
      const canvas = document.querySelector('.notebook-rich-scroll-region')!.getBoundingClientRect();
      return {
        bottom: overlay.bottom,
        canvasBottom: canvas.bottom,
        canvasLeft: canvas.left,
        canvasRight: canvas.right,
        left: overlay.left,
        right: overlay.right,
        top: overlay.top,
      };
    });
    expect(bounds.left).toBeGreaterThanOrEqual(bounds.canvasLeft);
    expect(bounds.right).toBeLessThanOrEqual(bounds.canvasRight);
    expect(bounds.top).toBeGreaterThanOrEqual(0);
    expect(bounds.bottom).toBeLessThanOrEqual(bounds.canvasBottom);
    await attachScreenshot(page, `notebook-picture-format-${width}`);
    await toolbar.getByRole('button', { name: 'Finish cropping image' }).click();
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('.active-surface--page').evaluate((element) => {
    (element as HTMLElement).style.setProperty('--page-ui-scale', '0.8');
  });
  await expectImageContained(page);
  await attachScreenshot(page, 'notebook-picture-format-80');

  await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' });
  await page.locator('.active-surface--page').evaluate((element) => {
    (element as HTMLElement).style.setProperty('--page-ui-scale', '1.3');
  });
  await expectImageContained(page);
  await expect(figure).toHaveAttribute('data-image-requested-placement', 'square-left');
  await expect(figure).toHaveAttribute('data-image-placement', 'normal');
  await expect(figure).toHaveAttribute('data-image-wrap-fallback', 'true');
  await expect(figure).toHaveCSS('float', 'none');
  await expect(figure.locator('.notebook-media-transform-shell')).toHaveCSS('outline-style', 'solid');
  await attachScreenshot(page, 'notebook-picture-format-forced-colors-130');
  await page.getByRole('button', { name: 'Wrap text: Square Left' }).click();
  await expect(page.getByRole('menu', { name: 'Picture wrapping' }).getByRole('status'))
    .toHaveText('Normal flow is used at this size to keep the text column readable.');
  await page.keyboard.press('Escape');
});
