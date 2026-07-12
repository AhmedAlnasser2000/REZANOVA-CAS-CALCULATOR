import { expect, test, type Page } from '@playwright/test';

async function openWorkedExample(page: Page) {
  await page.goto('/');
  await page.getByTestId('workspace-tab-add-menu').click();
  await page.getByRole('menuitem', { name: 'New Notebook' }).click();
  await page.getByRole('button', { name: 'Start from template' }).click();
  await page.getByRole('button', { name: /Worked Example/ }).click();
  await expect(page.getByLabel('Notebook rich document')).toBeVisible();
}

async function openBlankNotebook(page: Page) {
  await page.goto('/');
  await page.getByTestId('workspace-tab-add-menu').click();
  await page.getByRole('menuitem', { name: 'New Notebook' }).click();
  await expect(page.getByLabel('Notebook rich document')).toBeVisible();
}

async function expectKeyboardClearance(page: Page) {
  const field = page.locator('.notebook-rich-display-field').first();
  await field.click();

  const keyboard = page.getByTestId('notebook-authoring-keyboard');
  await expect(keyboard).toBeVisible();
  await page.waitForTimeout(100);

  const bounds = await page.evaluate(() => {
    const measure = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) {
        return null;
      }
      const rect = element.getBoundingClientRect();
      return {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
      };
    };
    return {
      field: measure('.notebook-rich-display-field'),
      keyboard: measure('[data-testid="notebook-authoring-keyboard"]'),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  });

  expect(bounds.field).not.toBeNull();
  expect(bounds.keyboard).not.toBeNull();
  expect(bounds.keyboard!.left).toBeGreaterThanOrEqual(0);
  expect(bounds.keyboard!.right).toBeLessThanOrEqual(bounds.viewport.width);
  expect(bounds.keyboard!.bottom).toBeLessThanOrEqual(bounds.viewport.height);
  const overlapsField = bounds.keyboard!.left < bounds.field!.right
    && bounds.keyboard!.right > bounds.field!.left
    && bounds.keyboard!.top < bounds.field!.bottom
    && bounds.keyboard!.bottom > bounds.field!.top;
  expect(overlapsField).toBe(false);
  expect(bounds.overflow).toBeLessThanOrEqual(0);
}

test('Notebook keeps its math keyboard visible without covering the active field', async ({ page }) => {
  await page.setViewportSize({ width: 1487, height: 1058 });
  await openWorkedExample(page);

  await expect(page.getByRole('complementary', { name: 'Notebook outline' })).toBeVisible();
  await expect(page.getByTestId('notebook-outline-entry').first()).toContainText('Quadratic Equations');
  await expectKeyboardClearance(page);

  await test.info().attach('notebook-desktop-keyboard', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});

test('Notebook unifies compact tools, symbols, and matrix dimensions in one floating surface', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openWorkedExample(page);

  await page.locator('.notebook-rich-display-field').first().click();
  const surface = page.getByTestId('notebook-authoring-keyboard');
  await expect(surface).toBeVisible();
  await expect(surface).toHaveClass(/is-compact/);
  await expect(surface.getByRole('button', { name: 'Fraction' })).toContainText('a⁄b');
  await surface.getByRole('button', { name: 'Open symbol keyboard' }).click();
  await expect(surface).toHaveClass(/is-expanded/);
  await surface.getByRole('tab', { name: 'Structures' }).click();
  await surface.getByRole('button', { name: 'Matrix, document only' }).click();
  const picker = page.getByLabel('Choose matrix dimensions');
  await expect(picker.getByRole('gridcell')).toHaveCount(64);
  await picker.getByRole('gridcell', { name: '4 by 5 matrix' }).hover();
  await expect(picker).toContainText('4 × 5');
  await page.keyboard.press('Escape');
  await expect(picker).toBeHidden();
  await expect(surface.getByRole('searchbox')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(surface.getByRole('searchbox')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(surface).toBeHidden();
  await page.locator('.notebook-rich-display-field').first().click({ button: 'right' });
  await expect(surface).toBeVisible();

  await test.info().attach('notebook-unified-math-authoring-surface', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});

test('Notebook preserves a dominant canvas and clear keyboard at drawer width', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await openWorkedExample(page);

  await expect(page.getByRole('button', { name: 'Toggle Notebook outline' })).toBeVisible();
  await page.getByRole('button', { name: 'Toggle Notebook outline' }).click();
  await expect(page.getByRole('complementary', { name: 'Notebook outline' })).toBeVisible();
  await page.getByRole('button', { name: 'Close Notebook outline' }).click();
  await expectKeyboardClearance(page);

  await test.info().attach('notebook-drawer-keyboard', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});

test('Notebook renders recursive sections in the outline and document canvas', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openBlankNotebook(page);

  await page.getByRole('button', { name: 'Add top-level section' }).click();
  const outlineSections = page.locator('[data-outline-kind="section"]');
  await expect(outlineSections).toHaveCount(1);
  await outlineSections.first().getByRole('button', { name: /actions/ }).click();
  await page.getByRole('menuitem', { name: 'Add subsection' }).click();

  await expect(outlineSections).toHaveCount(2);
  await expect(outlineSections.nth(1)).toHaveAttribute('data-outline-depth', '1');
  await expect(page.getByTestId('notebook-section')).toHaveCount(2);

  await outlineSections.first().getByRole('button', { name: 'Collapse Untitled section' }).click();
  await expect(outlineSections).toHaveCount(1);
  await expect(page.getByTestId('notebook-section').first()).toHaveClass(/is-collapsed/);

  await test.info().attach('notebook-nested-section-hierarchy', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});

test('Notebook dismisses one transient layer per Escape without closing the document', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await openBlankNotebook(page);

  const templateTrigger = page.getByRole('button', { name: 'Start from template' });
  await templateTrigger.click();
  await expect(page.getByRole('button', { name: /Lecture Notes/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /Lecture Notes/ })).toBeHidden();
  await expect(templateTrigger).toBeFocused();

  await page.getByRole('button', { name: 'Toggle Notebook outline' }).click();
  await expect(page.getByRole('complementary', { name: 'Notebook outline' })).toHaveClass(/is-drawer-open/);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('complementary', { name: 'Notebook outline' })).not.toHaveClass(/is-drawer-open/);
  await expect(page.getByTestId('notebook-page')).toBeVisible();
  await expect(page.getByLabel('Notebook rich document')).toBeVisible();
});

test('Notebook keeps prose formatting palettes close to the selected text', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openBlankNotebook(page);

  const editor = page.getByLabel('Notebook rich document');
  await editor.click();
  await page.keyboard.type('A bounded selection should remain easy to format.');
  const drag = await page.evaluate(() => {
    const text = document.querySelector('.notebook-rich-editor p')?.firstChild;
    if (!(text instanceof Text)) {
      throw new Error('Notebook prose text was not available for pointer selection');
    }
    const point = (offset: number) => {
      const range = document.createRange();
      range.setStart(text, offset);
      range.setEnd(text, offset + 1);
      const bounds = range.getBoundingClientRect();
      return { x: bounds.left + 2, y: bounds.top + bounds.height / 2 };
    };
    return { start: point(2), end: point(text.data.length - 2) };
  });
  await page.mouse.move(drag.start.x, drag.start.y);
  await page.mouse.down();
  await page.mouse.move(drag.end.x, drag.end.y, { steps: 8 });
  await page.mouse.up();

  const selectionToolbar = page.getByTestId('notebook-selection-toolbar');
  await expect(selectionToolbar).toBeVisible();
  await selectionToolbar.getByRole('button', { name: 'Highlight selection' }).click();
  const palette = page.getByLabel('Notebook selection colors');
  await expect(palette).toBeVisible();
  await expect(palette.getByRole('button', { name: 'Text Color' })).toBeVisible();
  await expect(palette.getByRole('button', { name: 'Highlight', exact: true })).toBeVisible();

  const clearance = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="notebook-canvas"]')!.getBoundingClientRect();
    const toolbar = document.querySelector('[data-testid="notebook-selection-toolbar"]')!.getBoundingClientRect();
    return {
      insideHorizontally: toolbar.left >= canvas.left && toolbar.right <= canvas.right,
      belowChrome: toolbar.top >= canvas.top,
    };
  });
  expect(clearance.insideHorizontally).toBe(true);
  expect(clearance.belowChrome).toBe(true);

  await test.info().attach('notebook-selection-formatting-palettes', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});
