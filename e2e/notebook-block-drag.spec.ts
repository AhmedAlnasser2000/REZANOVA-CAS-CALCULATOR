import { expect, test, type Locator, type Page } from '@playwright/test';

async function openWorkedExample(page: Page) {
  await page.goto('/');
  await page.getByTestId('workspace-tab-add-menu').click();
  await page.getByRole('menuitem', { name: 'New Notebook' }).click();
  await page.getByRole('button', { name: 'Start from template' }).click();
  await page.getByRole('button', { name: /Worked Example/ }).click();
  await expect(page.getByLabel('Notebook rich document')).toBeVisible();
}

async function dragHandleBefore(page: Page, source: Locator, target: Locator) {
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();
  await source.hover();
  const targetBounds = await target.boundingBox();
  expect(targetBounds).not.toBeNull();
  await page.mouse.down();
  await page.mouse.move(
    targetBounds!.x + targetBounds!.width / 2,
    targetBounds!.y + 3,
    { steps: 8 },
  );
}

async function dragHandleTo(page: Page, source: Locator, destination: { x: number; y: number }) {
  await source.scrollIntoViewIfNeeded();
  const bounds = await source.boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
  await page.mouse.down();
  await page.mouse.move(destination.x, destination.y, { steps: 8 });
}

test('Notebook uses one pointer path for canvas and Outline block movement', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openWorkedExample(page);

  const note = page.getByTestId('notebook-semantic-note');
  const solutionEntry = page.getByTestId('notebook-outline-entry').filter({ hasText: 'Solution' });
  const canvasHandle = note.getByRole('button', { name: /Move Note/ });
  await dragHandleBefore(page, canvasHandle, solutionEntry);
  await expect(page.locator('.notebook-block-drop-guide')).toHaveAttribute('data-placement', 'before');
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('.notebook-block-drop-guide')).toHaveCount(0);
  await expect(page.getByTestId('notebook-outline-entry').nth(3)).toContainText('Note');

  await dragHandleBefore(page, canvasHandle, solutionEntry);
  await page.mouse.up();
  await expect(page.getByTestId('notebook-outline-entry').nth(2)).toContainText('Note');

  const noteEntry = page.getByTestId('notebook-outline-entry').filter({ hasText: 'Note' });
  await dragHandleBefore(
    page,
    solutionEntry.getByRole('button', { name: /Move Solution/ }),
    noteEntry,
  );
  await page.mouse.up();
  await expect(page.getByTestId('notebook-outline-entry').nth(2)).toContainText('Solution');

  await page.getByRole('tab', { name: 'Insert' }).click();
  await page.getByRole('button', { name: 'Insert evidence' }).click();
  await expect(page.getByTestId('notebook-evidence-node')
    .getByRole('button', { name: /Move Evidence snapshot/ })).toBeVisible();
  await page.getByRole('button', { name: 'Insert divider' }).click();
  await expect(page.locator('.notebook-rich-editor-host hr[data-notebook-node-id]')).toBeVisible();
  await page.getByRole('button', { name: 'Add section' }).click();
  await expect(page.getByTestId('notebook-section')
    .getByRole('button', { name: /Move Untitled section/ })).toBeVisible();
  await expect(page.getByTestId('notebook-display-math-node')
    .getByRole('button', { name: 'Move separate equation' })).toBeVisible();
});

test('Notebook block drag into page whitespace creates a floating structured object', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openWorkedExample(page);
  await expect(page.locator('.notebook-page-stage.is-print')).toBeVisible();

  await page.getByLabel('Notebook rich document').click();
  await page.getByRole('tab', { name: 'Insert' }).click();
  await page.getByRole('button', { name: 'Insert evidence' }).click();
  const evidenceHandle = page.getByRole('button', { name: /Move Evidence snapshot/ }).last();
  await expect(evidenceHandle).toBeVisible();
  const evidence = evidenceHandle.locator('xpath=ancestor::*[@data-notebook-block-type="evidenceSnapshot"][1]');
  await expect(evidence).toBeVisible();
  const evidenceBounds = await evidence.boundingBox();
  expect(evidenceBounds).not.toBeNull();
  const dropPoint = await page.evaluate((sourceCenterY) => {
    const stage = document.querySelector('.notebook-page-stage')!.getBoundingClientRect();
    return {
      x: stage.right - 36,
      y: Math.min(Math.max(stage.top + 80, sourceCenterY), stage.bottom - 80),
    };
  }, evidenceBounds!.y + evidenceBounds!.height / 2);

  await dragHandleTo(
    page,
    evidenceHandle,
    dropPoint,
  );
  await expect(page.locator('.notebook-block-floating-guide')).toContainText('Float here');
  await page.mouse.up();
  await expect(evidence).toHaveAttribute('data-notebook-floating-object', 'true');
  await page.keyboard.press('Control+S');
  await expect(page.getByText('Saved locally').first()).toBeVisible();
  await expect.poll(async () => page.evaluate(async () => {
    function findFloatingEvidence(nodes: unknown[]): { objectPlacement?: { mode?: string; wrap?: string }; type?: string } | undefined {
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        const record = node as {
          content?: unknown[];
          objectPlacement?: { mode?: string; wrap?: string };
          type?: string;
        };
        if (record.type === 'evidenceSnapshot' && record.objectPlacement?.mode === 'floating') {
          return record;
        }
        if (Array.isArray(record.content)) {
          const nested = findFloatingEvidence(record.content);
          if (nested) return nested;
        }
      }
      return undefined;
    }
    const request = indexedDB.open('calcwiz-notebook-library-v1', 2);
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const recordsRequest = database.transaction('records', 'readonly')
      .objectStore('records').getAll();
    const records = await new Promise<Array<{ document?: { content?: unknown[] } }>>((resolve, reject) => {
      recordsRequest.onsuccess = () => resolve(recordsRequest.result as Array<{ document?: { content?: unknown[] } }>);
      recordsRequest.onerror = () => reject(recordsRequest.error);
    });
    database.close();
    return records.map((record) => findFloatingEvidence(record.document?.content ?? []))
      .find(Boolean);
  })).toMatchObject({
    objectPlacement: { mode: 'floating', wrap: 'square' },
    type: 'evidenceSnapshot',
  });
});

for (const evidence of [
  { name: 'wide-80', width: 2400, height: 1100, scale: '0.8', forcedColors: false },
  { name: 'desktop-100', width: 1440, height: 1000, scale: '1', forcedColors: false },
  { name: 'narrow-100-forced', width: 1100, height: 900, scale: '1', forcedColors: true },
  { name: 'wide-130-forced', width: 2400, height: 1100, scale: '1.3', forcedColors: true },
]) {
  test(`Notebook block handles and guides remain contained at ${evidence.name}`, async ({ page }) => {
    await page.setViewportSize({ width: evidence.width, height: evidence.height });
    await page.emulateMedia({ forcedColors: evidence.forcedColors ? 'active' : 'none' });
    await openWorkedExample(page);
    await page.locator('.active-surface--page').evaluate((element, scale) => {
      (element as HTMLElement).style.setProperty('--page-ui-scale', scale);
    }, evidence.scale);

    if (evidence.width <= 1100) {
      const toggle = page.getByRole('button', { name: 'Toggle Notebook outline' });
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('complementary', { name: 'Notebook outline' }))
        .toHaveClass(/is-drawer-open/);
    }
    const source = page.getByTestId('notebook-outline-entry')
      .filter({ hasText: 'Note' })
      .getByRole('button', { name: /Move Note/ });
    const target = page.getByTestId('notebook-outline-entry').filter({ hasText: 'Solution' });
    await expect.poll(async () => (await source.boundingBox())?.x ?? -1)
      .toBeGreaterThanOrEqual(0);
    const bounds = await source.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(evidence.width);
    await dragHandleBefore(page, source, target);
    const guideLocator = page.locator('.notebook-block-drop-guide');
    await expect(guideLocator).toHaveCount(1, { timeout: 3_000 });
    const guide = await guideLocator.boundingBox();
    expect(guide).not.toBeNull();
    expect(guide!.x).toBeGreaterThanOrEqual(0);
    expect(guide!.x + guide!.width).toBeLessThanOrEqual(evidence.width);
    await page.mouse.up();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
      .toBeLessThanOrEqual(0);
  });
}
