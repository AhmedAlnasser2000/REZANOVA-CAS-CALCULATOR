import { expect, test, type Locator, type Page } from '@playwright/test';

type StoredBrowserNotebook = {
  assetIds?: string[];
  document?: {
    content?: Array<{
      alignment?: string;
      caption?: string;
      crop?: { height?: number; width?: number; x?: number; y?: number };
      displayAspectRatio?: number;
      displayHeightPt?: number;
      displayWidthPt?: number;
      objectPlacement?: {
        mode?: string;
        anchor?: { kind?: string; nodeId?: string; pageNumber?: number };
        widthPt?: number;
        wrap?: string;
      };
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

async function expectImageControlsMatchVisibleFrame(figure: Locator) {
  const geometry = await figure.evaluate((element) => {
    const figure = element.getBoundingClientRect();
    const figureStyle = getComputedStyle(element);
    const nodeViewWrapper = element.closest('.react-renderer');
    const nodeViewWrapperStyle = nodeViewWrapper ? getComputedStyle(nodeViewWrapper) : null;
    const shell = element.querySelector('.notebook-media-transform-shell')?.getBoundingClientRect();
    const frame = element.querySelector('.notebook-image-frame')?.getBoundingClientRect();
    const viewport = element.querySelector('.notebook-image-crop-viewport')?.getBoundingClientRect();
    const image = element.querySelector('.notebook-image-crop-viewport img')?.getBoundingClientRect();
    const northWest = element.querySelector('[data-notebook-media-resize-handle="north-west"]')?.getBoundingClientRect();
    const southEast = element.querySelector('[data-notebook-media-resize-handle="south-east"]')?.getBoundingClientRect();
    if (!shell || !frame || !viewport || !image || !northWest || !southEast) return null;
    return {
      frame: {
        bottom: frame.bottom,
        height: frame.height,
        left: frame.left,
        right: frame.right,
        top: frame.top,
        width: frame.width,
      },
      figureOutline: {
        style: figureStyle.outlineStyle,
        width: figureStyle.outlineWidth,
      },
      figureRect: {
        height: figure.height,
        left: figure.left,
        top: figure.top,
        width: figure.width,
      },
      image: {
        height: image.height,
        width: image.width,
      },
      nodeViewWrapperOutline: nodeViewWrapperStyle ? {
        style: nodeViewWrapperStyle.outlineStyle,
        width: nodeViewWrapperStyle.outlineWidth,
      } : null,
      northWest: {
        x: northWest.left + northWest.width / 2,
        y: northWest.top + northWest.height / 2,
      },
      shell: {
        height: shell.height,
        left: shell.left,
        top: shell.top,
        width: shell.width,
      },
      southEast: {
        x: southEast.left + southEast.width / 2,
        y: southEast.top + southEast.height / 2,
      },
      viewport: {
        height: viewport.height,
        width: viewport.width,
      },
    };
  });
  if (!geometry) throw new Error('Selected image controls were not measurable.');
  expect(
    geometry.figureOutline.style === 'none' || geometry.figureOutline.width === '0px',
  ).toBe(true);
  expect(
    !geometry.nodeViewWrapperOutline
      || geometry.nodeViewWrapperOutline.style === 'none'
      || geometry.nodeViewWrapperOutline.width === '0px',
  ).toBe(true);
  expect(Math.abs(geometry.figureRect.left - geometry.frame.left)).toBeLessThanOrEqual(2);
  expect(Math.abs(geometry.figureRect.top - geometry.frame.top)).toBeLessThanOrEqual(2);
  expect(Math.abs(geometry.figureRect.width - geometry.frame.width)).toBeLessThanOrEqual(2);
  expect(Math.abs(geometry.figureRect.height - geometry.frame.height)).toBeLessThanOrEqual(2);
  expect(Math.abs(geometry.shell.left - geometry.frame.left)).toBeLessThanOrEqual(2);
  expect(Math.abs(geometry.shell.top - geometry.frame.top)).toBeLessThanOrEqual(2);
  expect(Math.abs(geometry.shell.width - geometry.frame.width)).toBeLessThanOrEqual(2);
  expect(Math.abs(geometry.shell.height - geometry.frame.height)).toBeLessThanOrEqual(2);
  expect(Math.abs(geometry.viewport.width - geometry.frame.width)).toBeLessThanOrEqual(2);
  expect(Math.abs(geometry.viewport.height - geometry.frame.height)).toBeLessThanOrEqual(2);
  expect(geometry.image.width).toBeGreaterThanOrEqual(geometry.viewport.width - 2);
  expect(geometry.image.height).toBeGreaterThanOrEqual(geometry.viewport.height - 2);
  expect(Math.abs(geometry.northWest.x - geometry.frame.left)).toBeLessThanOrEqual(10);
  expect(Math.abs(geometry.northWest.y - geometry.frame.top)).toBeLessThanOrEqual(10);
  expect(Math.abs(geometry.southEast.x - geometry.frame.right)).toBeLessThanOrEqual(10);
  expect(Math.abs(geometry.southEast.y - geometry.frame.bottom)).toBeLessThanOrEqual(10);
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

  const figure = page.getByTestId('notebook-image-figure');
  await expect(figure).toBeVisible();
  await figure.click();
  await expect(ribbonTabs.getByRole('tab', { name: 'Picture Format' }))
    .toHaveAttribute('aria-selected', 'true');
  await expect(figure.locator('.notebook-image-frame'))
    .toHaveAttribute('data-image-load-state', 'ready');
  await expectImageControlsMatchVisibleFrame(figure);
  await expect(figure.locator('figcaption')).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Insert image' })).toHaveCount(0);

  await toolbar.getByRole('button', { name: 'Edit image caption and Figure numbering' }).click();
  const dialog = page.getByRole('dialog', { name: 'Picture details' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Alternative text').fill('A curve approaching a finite limit.');
  await dialog.getByLabel(/Caption/).fill('Limit diagram');
  await dialog.getByRole('checkbox', { name: /Number this caption/ }).check();
  await dialog.getByRole('button', { name: 'Save details' }).click();

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
      displayHeightPt: image?.displayHeightPt,
      displayWidthPt: image?.displayWidthPt,
      mimeType: assets[0]?.metadata?.mimeType,
      version: record?.document?.version,
    };
  })).toEqual({
    assetCount: 1,
    assetIds: [expect.stringMatching(/^sha256:[0-9a-f]{64}$/)],
    caption: 'Limit diagram',
    displayHeightPt: expect.any(Number),
    displayWidthPt: expect.any(Number),
    mimeType: 'image/svg+xml',
    version: 14,
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

test('Notebook rejects GIF before creating a figure', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await openBlankNotebook(page);
  await page.getByRole('tab', { name: 'Insert' }).click();
  const picker = page.getByLabel('Choose image');

  await picker.setInputFiles({
    name: 'animated.gif',
    mimeType: 'image/gif',
    buffer: Buffer.from('GIF89a'),
  });
  await expect(page.getByRole('alert')).toContainText('GIF images are not supported');
  await expect(page.getByTestId('notebook-image-figure')).toHaveCount(0);
  await attachScreenshot(page, 'notebook-image-gif-rejection-1100');
});

test('Notebook image direct resizing keeps the selected boundary on the visible image', async ({ page }) => {
  await page.setViewportSize({ width: 2400, height: 1050 });
  await openBlankNotebook(page);
  const editor = page.getByLabel('Notebook rich document');
  const ribbonTabs = page.getByRole('tablist', { name: 'Notebook ribbon tabs' });

  await editor.click();
  await page.keyboard.type('Images should resize directly without a stale placeholder frame.');
  await ribbonTabs.getByRole('tab', { name: 'Insert' }).click();
  await page.getByLabel('Choose image').setInputFiles({
    name: 'direct-resize.svg',
    mimeType: 'image/svg+xml',
    buffer: SAFE_SVG,
  });

  const figure = page.getByTestId('notebook-image-figure');
  await expect(figure).toBeVisible();
  await figure.click();
  await expect(ribbonTabs.getByRole('tab', { name: 'Picture Format' }))
    .toHaveAttribute('aria-selected', 'true');
  await expect(figure.locator('.notebook-image-frame'))
    .toHaveAttribute('data-image-load-state', 'ready');

  const imageFrame = figure.locator('.notebook-image-frame');
  const originalFrame = await imageFrame.boundingBox();
  if (!originalFrame) throw new Error('Image frame is not visible.');
  await dragNotebookControl(
    page,
    figure.getByRole('button', { name: 'Resize image from right' }),
    {
      x: originalFrame.x + originalFrame.width + Math.max(120, originalFrame.width * 0.35),
      y: originalFrame.y + originalFrame.height / 2,
    },
  );
  const enlargedFrame = await imageFrame.boundingBox();
  if (!enlargedFrame) throw new Error('Enlarged image frame is not visible.');
  expect(enlargedFrame.width).toBeGreaterThan(originalFrame.width);
  expect(Math.abs(enlargedFrame.height - originalFrame.height)).toBeLessThan(2);
  await expectImageControlsMatchVisibleFrame(figure);

  await dragNotebookControl(
    page,
    figure.getByRole('button', { name: 'Resize image from right' }),
    {
      x: enlargedFrame.x + Math.max(90, enlargedFrame.width * 0.52),
      y: enlargedFrame.y + enlargedFrame.height / 2,
    },
  );
  const downsizedFrame = await imageFrame.boundingBox();
  if (!downsizedFrame) throw new Error('Downsized image frame is not visible.');
  expect(downsizedFrame.width).toBeLessThan(enlargedFrame.width);
  expect(Math.abs(downsizedFrame.height - enlargedFrame.height)).toBeLessThan(2);
  await expectImageControlsMatchVisibleFrame(figure);

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
    displayHeightPt: expect.any(Number),
    displayWidthPt: expect.any(Number),
    placement: 'normal',
    type: 'imageFigure',
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
  expect(storedImage?.displayWidthPt).toBeGreaterThan(36);
  expect(storedImage?.displayHeightPt).toBeGreaterThan(36);
  expect(storedImage?.widthPercent).toBeUndefined();

  for (const width of [2400, 1440, 1100]) {
    await page.setViewportSize({ width, height: 1000 });
    await expectImageContained(page);
    await expectImageControlsMatchVisibleFrame(figure);
    await attachScreenshot(page, `notebook-image-direct-resize-${width}`);
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('.active-surface--page').evaluate((element) => {
    (element as HTMLElement).style.setProperty('--page-ui-scale', '0.8');
  });
  await expectImageContained(page);
  await expectImageControlsMatchVisibleFrame(figure);
  await attachScreenshot(page, 'notebook-image-direct-resize-80');

  await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' });
  await page.locator('.active-surface--page').evaluate((element) => {
    (element as HTMLElement).style.setProperty('--page-ui-scale', '1.3');
  });
  await expectImageContained(page);
  await expect(figure.locator('.notebook-media-transform-shell')).toHaveCSS('outline-style', 'solid');
  await expectImageControlsMatchVisibleFrame(figure);
  await attachScreenshot(page, 'notebook-image-direct-resize-forced-colors-130');
});

test('Notebook image drag into page whitespace creates a floating object', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await openBlankNotebook(page);
  const editor = page.getByLabel('Notebook rich document');
  const ribbonTabs = page.getByRole('tablist', { name: 'Notebook ribbon tabs' });

  await editor.click();
  await page.keyboard.type('Anchor paragraph for a floating image.');
  await ribbonTabs.getByRole('tab', { name: 'Insert' }).click();
  await page.getByLabel('Choose image').setInputFiles({
    name: 'floating-image.svg',
    mimeType: 'image/svg+xml',
    buffer: SAFE_SVG,
  });

  const figure = page.getByTestId('notebook-image-figure');
  await expect(figure).toBeVisible();
  await figure.click();
  await expect(figure.locator('.notebook-image-frame'))
    .toHaveAttribute('data-image-load-state', 'ready');

  const stageBounds = await page.locator('.notebook-page-stage').boundingBox();
  const figureBounds = await figure.boundingBox();
  if (!stageBounds || !figureBounds) throw new Error('Notebook image or page stage is not visible.');
  await dragNotebookControl(
    page,
    figure.getByRole('button', { name: 'Move image' }),
    {
      x: stageBounds.x + 24,
      y: figureBounds.y + figureBounds.height / 2,
    },
  );

  await expect(page.locator('[data-notebook-floating-object="true"]')).toHaveCount(1);
  await page.keyboard.press('Control+S');
  await expect(page.getByText('Saved locally').first()).toBeVisible();
  await expect.poll(async () => page.evaluate(async () => {
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
  })).toMatchObject({
    objectPlacement: {
      anchor: { kind: 'paragraph' },
      mode: 'floating',
      widthPt: expect.any(Number),
      wrap: 'square',
    },
    type: 'imageFigure',
  });
});
