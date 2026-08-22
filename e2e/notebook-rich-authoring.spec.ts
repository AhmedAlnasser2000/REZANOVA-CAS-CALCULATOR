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

  const nativeMathLiveChrome = await page.locator('.notebook-rich-display-field').first()
    .evaluate((field) => {
      const shadow = field.shadowRoot;
      if (!shadow) {
        return null;
      }
      return {
        menu: getComputedStyle(shadow.querySelector('[part="menu-toggle"]')!).display,
        keyboard: getComputedStyle(shadow.querySelector('[part="virtual-keyboard-toggle"]')!).display,
      };
    });
  expect(nativeMathLiveChrome).toEqual({ menu: 'none', keyboard: 'none' });

  await test.info().attach('notebook-unified-math-authoring-surface', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});

test('Notebook inline math stays visually seamless and template insertion leaves a caret', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openBlankNotebook(page);

  await page.getByRole('tab', { name: 'Insert' }).click();
  await page.getByRole('button', { name: 'In text' }).click();
  const field = page.getByTestId('notebook-inline-math-field');
  const keyboard = page.getByTestId('notebook-authoring-keyboard');
  await expect(keyboard).toBeVisible();

  const chrome = await page.getByTestId('notebook-inline-math-node').evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      background: style.backgroundColor,
      border: style.borderWidth,
      boxShadow: style.boxShadow,
      outline: style.outlineStyle,
    };
  });
  expect(chrome).toEqual({
    background: 'rgba(0, 0, 0, 0)',
    border: '0px',
    boxShadow: 'none',
    outline: 'none',
  });

  await keyboard.getByRole('button', { name: 'Fraction' }).click();
  const insertionState = await field.evaluate((element) => {
    const mathField = element as HTMLElement & {
      selectionIsCollapsed: boolean;
      getValue: (format: string) => string;
    };
    return {
      collapsed: mathField.selectionIsCollapsed,
    groupHighlight: getComputedStyle(
      mathField.shadowRoot!.querySelector('.ML__contains-highlight')!,
    ).backgroundColor,
    value: mathField.getValue('latex'),
    };
  });
  expect(insertionState.collapsed).toBe(true);
  expect(insertionState.groupHighlight).toBe('rgba(0, 0, 0, 0)');
  expect(insertionState.value).toContain('\\frac');

  await page.keyboard.type('x');
  await expect.poll(() => field.evaluate((element) =>
    (element as HTMLElement & { getValue: (format: string) => string }).getValue('latex')))
    .toContain('\\frac{x}');
});

test('Notebook prose keeps calculator keystrokes and math suggestions passive', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openBlankNotebook(page);

  const editor = page.getByLabel('Notebook rich document');
  await editor.click();
  await page.keyboard.type('Use sin(x)+1 = 2, then x^2 = 1.');

  await expect(editor).toContainText('Use sin(x)+1 = 2, then x^2 = 1.');
  await expect(page.getByTestId('notebook-math-suggestion')).toBeHidden();
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
  await selectionToolbar.getByRole('button', { name: 'Italicize selection' }).click();
  const italicText = editor.locator('em').first();
  await expect(italicText).toBeVisible();
  expect(await italicText.evaluate((element) => getComputedStyle(element).fontStyle)).toBe('italic');
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

test('Notebook fills the wide stage, resizes panes, and compensates page scale', async ({ page }) => {
  await page.setViewportSize({ width: 2400, height: 1100 });
  await openBlankNotebook(page);

  const stage = page.getByTestId('app-stage');
  const notebook = page.getByTestId('notebook-page');
  const editor = page.getByLabel('Notebook rich document');
  const template = page.getByTestId('notebook-template-start');
  await expect(editor).toBeFocused();
  await expect(page.getByText('Start writing your explanation...')).toBeVisible();

  const initialGeometry = await page.evaluate(() => {
    const stageBounds = document.querySelector('[data-testid="app-stage"]')!.getBoundingClientRect();
    const notebookBounds = document.querySelector('[data-testid="notebook-page"]')!.getBoundingClientRect();
    const sheetBounds = document.querySelector('.notebook-page-sheet')!.getBoundingClientRect();
    const scrollBounds = document.querySelector('.notebook-rich-scroll-region')!.getBoundingClientRect();
    const pageStyle = getComputedStyle(document.querySelector('.notebook-page-stage')!);
    const marginTop = Number.parseFloat(pageStyle.getPropertyValue('--notebook-page-margin-top-px'));
    const marginRight = Number.parseFloat(pageStyle.getPropertyValue('--notebook-page-margin-right-px'));
    const marginBottom = Number.parseFloat(pageStyle.getPropertyValue('--notebook-page-margin-bottom-px'));
    const marginLeft = Number.parseFloat(pageStyle.getPropertyValue('--notebook-page-margin-left-px'));
    const promptBounds = [...document.querySelectorAll('span')]
      .find((element) => element.textContent === 'Start writing your explanation...')!
      .getBoundingClientRect();
    const templateBounds = document.querySelector('[data-testid="notebook-template-start"]')!.getBoundingClientRect();
    return {
      stageWidth: stageBounds.width,
      notebookWidth: notebookBounds.width,
      promptInsidePage: promptBounds.left >= sheetBounds.left + marginLeft - 1
        && promptBounds.right <= sheetBounds.right - marginRight + 1
        && promptBounds.top >= sheetBounds.top + marginTop - 1,
      templateInsidePage: templateBounds.left >= sheetBounds.left + marginLeft - 1
        && templateBounds.right <= sheetBounds.right - marginRight + 1
        && templateBounds.top >= sheetBounds.top + marginTop - 1
        && templateBounds.bottom <= sheetBounds.bottom - marginBottom + 1,
      templateInsideViewport: templateBounds.top >= scrollBounds.top
        && templateBounds.bottom <= scrollBounds.bottom,
    };
  });
  expect(initialGeometry.notebookWidth).toBeGreaterThanOrEqual(initialGeometry.stageWidth - 2);
  expect(initialGeometry.promptInsidePage).toBe(true);
  expect(initialGeometry.templateInsidePage).toBe(true);
  expect(initialGeometry.templateInsideViewport).toBe(true);

  for (const width of [1440, 1100]) {
    await page.setViewportSize({ width, height: 900 });
    const onboardingGeometry = await page.evaluate(() => {
      const sheetBounds = document.querySelector('.notebook-page-sheet')!.getBoundingClientRect();
      const scrollBounds = document.querySelector('.notebook-rich-scroll-region')!.getBoundingClientRect();
      const pageStyle = getComputedStyle(document.querySelector('.notebook-page-stage')!);
      const marginTop = Number.parseFloat(pageStyle.getPropertyValue('--notebook-page-margin-top-px'));
      const marginRight = Number.parseFloat(pageStyle.getPropertyValue('--notebook-page-margin-right-px'));
      const marginBottom = Number.parseFloat(pageStyle.getPropertyValue('--notebook-page-margin-bottom-px'));
      const marginLeft = Number.parseFloat(pageStyle.getPropertyValue('--notebook-page-margin-left-px'));
      const promptBounds = [...document.querySelectorAll('span')]
        .find((element) => element.textContent === 'Start writing your explanation...')!
        .getBoundingClientRect();
      const templateBounds = document.querySelector('[data-testid="notebook-template-start"]')!
        .getBoundingClientRect();
      return {
        promptInsidePage: promptBounds.left >= sheetBounds.left + marginLeft - 1
          && promptBounds.right <= sheetBounds.right - marginRight + 1
          && promptBounds.top >= sheetBounds.top + marginTop - 1,
        scrollBounds: { bottom: scrollBounds.bottom, top: scrollBounds.top },
        templateBounds: { bottom: templateBounds.bottom, top: templateBounds.top },
        templateInsidePage: templateBounds.left >= sheetBounds.left + marginLeft - 1
          && templateBounds.right <= sheetBounds.right - marginRight + 1
          && templateBounds.top >= sheetBounds.top + marginTop - 1
          && templateBounds.bottom <= sheetBounds.bottom - marginBottom + 1,
      };
    });
    expect(onboardingGeometry.promptInsidePage).toBe(true);
    expect(onboardingGeometry.templateInsidePage).toBe(true);
    expect(onboardingGeometry.templateBounds.top).toBeGreaterThanOrEqual(onboardingGeometry.scrollBounds.top);
    expect(onboardingGeometry.templateBounds.bottom).toBeLessThanOrEqual(onboardingGeometry.scrollBounds.bottom);
  }
  await page.setViewportSize({ width: 2400, height: 1100 });

  const outline = page.getByRole('complementary', { name: 'Notebook outline' });
  const outlineWidthBefore = (await outline.boundingBox())!.width;
  const separator = page.getByRole('separator', { name: 'Resize Notebook outline' });
  const separatorBounds = (await separator.boundingBox())!;
  await page.mouse.move(separatorBounds.x + separatorBounds.width / 2, separatorBounds.y + 120);
  await page.mouse.down();
  await page.mouse.move(separatorBounds.x + 84, separatorBounds.y + 120, { steps: 6 });
  await page.mouse.up();
  expect((await outline.boundingBox())!.width).toBeGreaterThan(outlineWidthBefore + 50);
  await separator.dblclick();
  expect(Math.round((await outline.boundingBox())!.width)).toBe(320);

  const tabsBefore = await page.locator('.workspace-tabs-shell').boundingBox();
  await page.locator('.active-surface--page').evaluate((element) => {
    (element as HTMLElement).style.setProperty('--page-ui-scale', '1.3');
    element.classList.add('is-high-contrast');
  });
  const scaledGeometry = await page.evaluate(() => {
    const bounds = document.querySelector('[data-testid="notebook-page"]')!.getBoundingClientRect();
    return {
      left: bounds.left,
      right: bounds.right,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  const tabsAfter = await page.locator('.workspace-tabs-shell').boundingBox();
  expect(scaledGeometry.left).toBeGreaterThanOrEqual(0);
  expect(scaledGeometry.right).toBeLessThanOrEqual(2400);
  expect(scaledGeometry.overflow).toBeLessThanOrEqual(0);
  expect(tabsAfter).toEqual(tabsBefore);

  await test.info().attach('notebook-wide-high-contrast-130', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });

  await page.locator('.active-surface--page').evaluate((element) => {
    (element as HTMLElement).style.setProperty('--page-ui-scale', '0.8');
  });
  await expect(stage).toBeVisible();
  await expect(notebook).toBeVisible();
  await expect(template).toBeVisible();
  const reducedOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(reducedOverflow).toBeLessThanOrEqual(0);
});

test('Notebook keeps math size and cancellation scoped to an explicit selected term', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openBlankNotebook(page);

  await page.getByRole('tab', { name: 'Insert' }).click();
  await page.getByRole('button', { name: 'Separate equation' }).click();
  const field = page.locator('.notebook-rich-display-field').first();
  await expect(field).toBeVisible();
  const keyboard = page.getByTestId('notebook-authoring-keyboard');
  await expect(keyboard).toBeVisible();

  const size = keyboard.getByRole('textbox', { name: 'Selected math size percent' });
  await expect(size).toBeDisabled();
  await expect(keyboard.getByRole('button', { name: 'Cancel selected math diagonally' })).toBeDisabled();

  await field.evaluate((element) => {
    const mathField = element as unknown as {
      dispatchEvent: (event: Event) => boolean;
      executeCommand: (command: string) => boolean;
      focus: () => void;
      setValue: (value: string) => void;
      selection: { ranges: Array<[number, number]> };
    };
    mathField.setValue('z+\\frac{x^2+1}{x-1}+\\lim_{t\\to0}\\frac{\\sin t}{t}');
    mathField.focus();
    mathField.selection = { ranges: [[0, 1]] };
    mathField.dispatchEvent(new Event('selection-change'));
  });

  await expect(size).toBeEnabled();
  await size.fill('185');
  await size.press('Enter');
  await expect(keyboard.getByText(/Math uses 185%|Math size: 185%/)).toBeVisible();

  await keyboard.getByRole('button', { name: 'Cancel selected math diagonally' }).click();
  await expect.poll(() => field.evaluate((element) => (
    (element as unknown as { getValue: (format: string) => string }).getValue('latex')
  ))).toContain('\\cancel');
  await expect(page.getByRole('button', { name: 'Open in Tool' }).first()).toBeDisabled();

  await test.info().attach('notebook-typography-cancellation', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});
