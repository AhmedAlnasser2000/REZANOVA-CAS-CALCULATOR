import { expect, test, type Page } from '@playwright/test';

const SAMPLE_WEBM = Buffer.from('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', 'base64');
const POSTER_SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">'
  + '<rect width="320" height="180" fill="#203536"/>'
  + '<circle cx="160" cy="90" r="42" fill="#b8d49c"/>'
  + '<path d="M150 68 L150 112 L185 90 Z" fill="#071516"/>'
  + '</svg>',
);
const CAPTIONS = Buffer.from(
  'WEBVTT\n\n00:00.000 --> 00:00.900\nA local limit lesson.\n',
);

async function openBlankNotebook(page: Page) {
  await page.goto('/');
  await page.getByTestId('workspace-tab-add-menu').click();
  await page.getByRole('menuitem', { name: 'New Notebook' }).click();
  await expect(page.getByLabel('Notebook rich document')).toBeVisible();
}

async function expectVideoContained(page: Page) {
  const geometry = await page.getByTestId('notebook-video-figure').evaluate((element) => {
    const figure = element.getBoundingClientRect();
    const canvas = document.querySelector('.notebook-rich-scroll-region')!.getBoundingClientRect();
    const toolbar = document.querySelector('.notebook-rich-toolbar')!.getBoundingClientRect();
    const surface = document.querySelector('.active-surface--page')!;
    const scale = Number.parseFloat(getComputedStyle(surface).getPropertyValue('--page-ui-scale')) || 1;
    return {
      canvasLeft: canvas.left,
      canvasRight: canvas.right,
      figureLeft: figure.left,
      figureRight: figure.right,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      toolbarRight: toolbar.right * scale,
      viewport: window.innerWidth,
    };
  });
  expect(geometry.figureLeft).toBeGreaterThanOrEqual(geometry.canvasLeft);
  expect(geometry.figureRight).toBeLessThanOrEqual(geometry.canvasRight);
  expect(geometry.toolbarRight).toBeLessThanOrEqual(geometry.viewport);
  expect(geometry.overflow).toBeLessThanOrEqual(0);
}

test('Notebook inserts, seeks, formats, and persists a local WebM video', async ({ page }) => {
  await page.setViewportSize({ width: 2400, height: 1050 });
  await openBlankNotebook(page);
  const ribbonTabs = page.getByRole('tablist', { name: 'Notebook ribbon tabs' });
  const toolbar = page.getByLabel('Notebook formatting toolbar');

  await ribbonTabs.getByRole('tab', { name: 'Insert' }).click();
  await page.getByLabel('Choose video', { exact: true }).setInputFiles({
    name: 'limit-lesson.webm',
    mimeType: 'video/webm',
    buffer: SAMPLE_WEBM,
  });
  const dialog = page.getByRole('dialog', { name: 'Insert video' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Title').fill('Limit lesson');
  await dialog.getByLabel(/Description/).fill('A short local lesson about finite limits.');
  await dialog.getByLabel(/Caption/).fill('Approaching a finite limit');
  await dialog.getByRole('checkbox', { name: 'Loop playback' }).check();
  await dialog.getByRole('button', { name: 'Insert video' }).click();

  const figure = page.getByTestId('notebook-video-figure');
  const video = figure.locator('video');
  await expect(figure).toBeVisible();
  await expect(video).toHaveJSProperty('controls', true);
  await expect(video).toHaveJSProperty('autoplay', false);
  await expect(video).toHaveJSProperty('loop', true);
  await expect(figure).toContainText('Video 1. Approaching a finite limit');
  await expect(ribbonTabs.getByRole('tab', { name: 'Video Format' }))
    .toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.duration))
    .toBeGreaterThan(0.9);
  await video.evaluate(async (element: HTMLVideoElement) => {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('Video seek timed out.')), 4_000);
      element.addEventListener('seeked', () => {
        window.clearTimeout(timeout);
        resolve();
      }, { once: true });
      element.currentTime = 0.6;
    });
  });
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime))
    .toBeGreaterThan(0.5);

  await toolbar.getByRole('button', { name: 'Set video width to 50%' }).click();
  await toolbar.getByRole('button', { name: 'Align video right' }).click();
  await expect(figure).toHaveAttribute('data-video-alignment', 'right');
  await expect(figure).toHaveCSS('width', /.+/);

  await toolbar.getByRole('button', { name: 'Poster', exact: true }).click();
  await page.getByLabel('Choose video poster image').setInputFiles({
    name: 'lesson-poster.svg',
    mimeType: 'image/svg+xml',
    buffer: POSTER_SVG,
  });
  await expect(video).toHaveAttribute('poster', /blob:/);

  await toolbar.getByRole('button', { name: 'Add captions' }).click();
  await page.getByLabel('Choose WebVTT captions').setInputFiles({
    name: 'english.vtt',
    mimeType: 'text/vtt',
    buffer: CAPTIONS,
  });
  await expect(video.locator('track')).toHaveCount(1);
  await expect(page.getByTestId('notebook-outline-entry').filter({
    hasText: 'Approaching a finite limit',
  })).toBeVisible();

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
    const records = await new Promise<Array<{ assetIds?: string[]; document?: {
      version?: number;
      content?: Array<Record<string, unknown>>;
    } }>>((resolve, reject) => {
      recordsRequest.onsuccess = () => resolve(recordsRequest.result);
      recordsRequest.onerror = () => reject(recordsRequest.error);
    });
    database.close();
    const record = records.find((candidate) => candidate.document?.content?.some(
      (node) => node.type === 'videoFigure',
    ));
    const storedVideo = record?.document?.content?.find((node) => node.type === 'videoFigure');
    return {
      alignment: storedVideo?.alignment,
      assetCount: record?.assetIds?.length,
      caption: storedVideo?.caption,
      hasPoster: typeof storedVideo?.posterAssetId === 'string',
      trackCount: Array.isArray(storedVideo?.tracks) ? storedVideo.tracks.length : 0,
      version: record?.document?.version,
      widthPercent: storedVideo?.widthPercent,
    };
  })).toEqual({
    alignment: 'right',
    assetCount: 3,
    caption: 'Approaching a finite limit',
    hasPoster: true,
    trackCount: 1,
    version: 9,
    widthPercent: 50,
  });

  for (const width of [2400, 1440, 1100]) {
    await page.setViewportSize({ width, height: 960 });
    await expectVideoContained(page);
  }
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.locator('.active-surface--page').evaluate((element) => {
    (element as HTMLElement).style.setProperty('--page-ui-scale', '0.8');
  });
  await expectVideoContained(page);
  await page.emulateMedia({ forcedColors: 'active' });
  await page.setViewportSize({ width: 2400, height: 1050 });
  await page.locator('.active-surface--page').evaluate((element) => {
    (element as HTMLElement).style.setProperty('--page-ui-scale', '1.3');
  });
  await expectVideoContained(page);
  await expect(figure).toHaveCSS('outline-style', 'solid');
});
