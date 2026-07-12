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
      canvas: measure('[data-testid="notebook-canvas"]'),
      field: measure('.notebook-rich-display-field'),
      keyboard: measure('[data-testid="notebook-authoring-keyboard"]'),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });

  expect(bounds.canvas).not.toBeNull();
  expect(bounds.field).not.toBeNull();
  expect(bounds.keyboard).not.toBeNull();
  expect(bounds.keyboard!.left).toBeGreaterThanOrEqual(bounds.canvas!.left);
  expect(bounds.keyboard!.right).toBeLessThanOrEqual(bounds.canvas!.right);
  expect(bounds.keyboard!.bottom).toBeLessThanOrEqual(bounds.canvas!.bottom);
  expect(bounds.field!.bottom).toBeLessThanOrEqual(bounds.keyboard!.top - 12);
  expect(bounds.overflow).toBeLessThanOrEqual(0);
}

test('Notebook keeps its math keyboard visible without covering the active field', async ({ page }) => {
  await page.setViewportSize({ width: 1487, height: 1058 });
  await openWorkedExample(page);

  await expect(page.getByRole('complementary', { name: 'Notebook outline' })).toBeVisible();
  await expect(page.getByTestId('notebook-outline-entry').first()).toContainText('Section 1');
  await expectKeyboardClearance(page);

  await test.info().attach('notebook-desktop-keyboard', {
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

  const outline = page.getByRole('complementary', { name: 'Notebook outline' });
  await outlineSections.first().getByRole('button', { name: 'Collapse Untitled section' }).click();
  await expect(outlineSections).toHaveCount(1);
  await expect(page.getByTestId('notebook-section').first()).toHaveClass(/is-collapsed/);

  await test.info().attach('notebook-nested-section-hierarchy', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});
