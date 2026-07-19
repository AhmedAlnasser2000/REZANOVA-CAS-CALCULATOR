import { expect, test, type Page } from '@playwright/test';

async function openGraph(page: Page) {
  await page.getByTestId('workspace-tab-add-menu').click();
  await page.getByRole('menuitem', { name: 'New Graph' }).click();
  await expect(page.getByTestId('graph-page')).toBeVisible();
}

async function enterExpression(page: Page, latex: string) {
  const field = page.locator('math-field').last();
  await field.evaluate((element, value) => {
    const mathField = element as HTMLElement & { setValue: (source: string) => void };
    mathField.setValue(value);
    mathField.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
    }));
  }, latex);
}

test.describe('GRAPHING-MINIMUM-VISIBLE1', () => {
  test('keeps one uninterrupted MathLive session when a trailing row is promoted', async ({ page }) => {
    await page.goto('/');
    await openGraph(page);

    const blankField = page.locator('math-field').last();
    await blankField.evaluate((element) => {
      element.dataset.promotionProbe = 'same-editor';
    });
    await blankField.evaluate((element) => element.focus());
    await blankField.pressSequentially('sin(x)', { delay: 8 });

    await expect(page.getByTestId('graph-expression-row')).toHaveCount(1);
    await expect(page.getByTestId('graph-expression-blank-row')).toHaveCount(1);
    await expect(page.locator('math-field').first()).toBeFocused();
    await expect(page.locator('math-field').first()).toHaveAttribute('data-promotion-probe', 'same-editor');
    await expect.poll(() => page.locator('math-field').first().evaluate((element) => (
      (element as HTMLElement & { getValue: (format: string) => string }).getValue('latex')
    ))).toMatch(/\\sin/u);

    const nextBlank = page.locator('math-field').last();
    await nextBlank.evaluate((element) => element.focus());
    await nextBlank.pressSequentially('infinity', { delay: 8 });
    await expect(page.getByTestId('graph-expression-row')).toHaveCount(2);
    await expect.poll(() => page.locator('math-field').nth(1).evaluate((element) => (
      (element as HTMLElement & { getValue: (format: string) => string }).getValue('latex')
    ))).toBe('\\infty');
  });

  test('plots real bare expressions and keeps the visible surface truthful', async ({ page }, testInfo) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await openGraph(page);

    await enterExpression(page, 'x^2-4');
    await enterExpression(page, '\\sin(x)');
    await enterExpression(page, '\\frac{1}{x}');

    await expect(page.getByTestId('graph-expression-row')).toHaveCount(3);
    await expect(page.getByTestId('graph-expression-blank-row')).toHaveCount(1);
    await expect(page.getByTestId('graph-scene-paths').locator('path')).toHaveCount(3);
    await expect(page.locator('.graph-status')).toContainText('Ready');
    await expect(page.getByRole('tab', { name: /Untitled Graph/ })).not.toContainText('running');
    await expect(page.getByRole('button', { name: /Analyze/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Export/i })).toHaveCount(0);
    await expect(page.getByText('Complex', { exact: true })).toHaveCount(0);

    const reciprocalPath = page.getByTestId('graph-scene-paths').locator('path').nth(2);
    await expect.poll(async () => (
      (await reciprocalPath.getAttribute('d'))?.match(/M/gu)?.length ?? 0
    )).toBeGreaterThan(1);

    await page.screenshot({
      path: testInfo.outputPath('graphing-1280x800.png'),
      fullPage: true,
    });
    expect(consoleErrors).toEqual([]);
  });

  test('coalesces pan and zoom, supports rail collapse, and preserves independent tabs', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 940 });
    await page.goto('/');
    await openGraph(page);
    await enterExpression(page, '\\sqrt{x}');
    await expect(page.getByTestId('graph-scene-paths').locator('path')).toHaveCount(1);

    const viewport = page.getByTestId('graph-viewport');
    const bounds = await viewport.boundingBox();
    if (!bounds) throw new Error('Graph viewport did not have layout bounds.');
    await page.evaluate(() => window.getSelection()?.removeAllRanges());
    await page.mouse.move(bounds.x + bounds.width * 0.55, bounds.y + bounds.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width * 0.68, bounds.y + bounds.height * 0.58, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => page.evaluate(() => {
      const selection = window.getSelection();
      if (!selection) return false;
      for (let index = 0; index < selection.rangeCount; index += 1) {
        if (!selection.getRangeAt(index).collapsed) return true;
      }
      return selection.toString().length > 0;
    })).toBe(false);
    await expect(viewport).toHaveAttribute('data-scene-pending', 'true');
    await expect(page.locator('.graph-status')).toContainText('Ready');

    await page.mouse.move(bounds.x + bounds.width * 0.6, bounds.y + bounds.height * 0.45);
    await page.mouse.wheel(0, -420);
    await expect(page.locator('.graph-status')).toContainText('Ready');
    await expect(page.getByTestId('graph-scene-paths').locator('path')).toHaveCount(1);

    await page.getByRole('button', { name: 'Collapse expression rail' }).click();
    await expect(page.locator('.graph-expression-rail')).toBeHidden();
    await page.getByRole('button', { name: 'Expand expression rail' }).click();
    await expect(page.locator('.graph-expression-rail')).toBeVisible();

    await openGraph(page);
    await expect(page.getByTestId('graph-expression-row')).toHaveCount(0);
    await page.locator(
      '[data-testid="workspace-tab"][data-workspace-kind="graphing"] [role="tab"]',
    ).first().click();
    await expect(page.getByTestId('graph-expression-row')).toHaveCount(1);
    await expect.poll(() => page.locator('math-field').first().evaluate((element) => (
      (element as HTMLElement & { getValue: (format: string) => string }).getValue('latex')
    ))).toBe('\\sqrt{x}');
  });

  test('honors typing grace and reduced motion without flashing stale geometry', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await openGraph(page);
    await enterExpression(page, 'x');
    await expect(page.getByTestId('graph-scene-paths').locator('path')).toHaveCount(1);

    const field = page.locator('math-field').first();
    await field.evaluate((element) => {
      const mathField = element as HTMLElement & { setValue: (source: string) => void };
      mathField.setValue('\\frac{1}{');
      mathField.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    });
    await expect(page.getByTestId('graph-viewport')).toHaveAttribute('data-scene-pending', 'true');
    await expect(page.getByTestId('graph-scene-paths').locator('path')).toHaveCount(1);
    await expect(page.getByText('Keep typing to finish the expression.')).toBeVisible();
    await expect(page.getByTestId('graph-scene-paths').locator('path')).toHaveCount(0);
  });

  test('renders explicit-x and point-set routes with relation-correct tracing', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 940 });
    await page.goto('/');
    await openGraph(page);

    await enterExpression(page, 'x=y^2');
    await enterExpression(page, '\\{(1,2),(3,4)\\}');
    await expect(page.getByTestId('graph-scene-paths').locator('path')).toHaveCount(1);
    await expect(page.getByTestId('graph-scene-points').locator('circle')).toHaveCount(2);
    await expect(page.locator('.graph-status')).toContainText('Ready');

    const viewport = page.getByTestId('graph-viewport');
    const bounds = await viewport.boundingBox();
    if (!bounds) throw new Error('Graph viewport did not have layout bounds.');
    const screen = (x: number, y: number) => ({
      x: bounds.x + (x + 10) / 20 * bounds.width,
      y: bounds.y + (6 - y) / 12 * bounds.height,
    });

    const firstPoint = screen(1, 2);
    await page.mouse.click(firstPoint.x, firstPoint.y);
    await expect(page.locator('.graph-trace-callout')).toContainText('(1, 2)');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.graph-trace-callout')).toContainText('(3, 4)');

    await page.keyboard.press('Escape');
    const curvePoint = screen(4, 2);
    await page.mouse.click(curvePoint.x, curvePoint.y);
    const yThree = screen(4, 3);
    await page.mouse.move(yThree.x, yThree.y);
    await expect.poll(() => page.locator('.graph-trace-callout').textContent()).toMatch(
      /^\(9(?:\.\d+)?, 3(?:\.\d+)?\)$/u,
    );
    await expect(page.getByRole('tab', { name: /Untitled Graph/ })).not.toContainText('running');
    await page.screenshot({
      path: testInfo.outputPath('graphing-relation-routes-1440x940.png'),
      fullPage: true,
    });
  });

  test('renders bounded implicit contours and strict/inclusive regions honestly', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 940 });
    await page.goto('/');
    await openGraph(page);

    await enterExpression(page, 'x^2+y^2\\le 9');
    await enterExpression(page, '-1<x<1');
    await expect(page.getByTestId('graph-scene-regions').locator('path')).toHaveCount(2);
    await expect(page.getByTestId('graph-scene-paths').locator('path')).toHaveCount(3);
    await expect(page.getByTestId('graph-scene-paths').locator('path').first())
      .not.toHaveAttribute('stroke-dasharray', '8 6');
    await expect(page.getByTestId('graph-scene-paths').locator('path').nth(1))
      .toHaveAttribute('stroke-dasharray', '8 6');
    await expect(page.getByTestId('graph-scene-paths').locator('path').nth(2))
      .toHaveAttribute('stroke-dasharray', '8 6');
    await expect(page.locator('.graph-status')).toContainText('Ready');

    const viewport = page.getByTestId('graph-viewport');
    const bounds = await viewport.boundingBox();
    if (!bounds) throw new Error('Graph viewport did not have layout bounds.');
    await page.mouse.click(
      bounds.x + 0.65 * bounds.width,
      bounds.y + 0.5 * bounds.height,
    );
    await expect.poll(async () => {
      const text = await page.locator('.graph-trace-callout').textContent();
      const coordinates = text?.match(/^\(([-\d.]+), ([-\d.]+)\)$/u);
      return coordinates
        ? { x: Number(coordinates[1]), y: Number(coordinates[2]) }
        : null;
    }).toEqual({ x: expect.closeTo(3, 1), y: expect.closeTo(0, 1) });

    await page.screenshot({
      path: testInfo.outputPath('graphing-implicit-regions-1440x940.png'),
      fullPage: true,
    });
  });

  test('renders structured piecewise branches with guided controls and endpoint semantics', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 940 });
    await page.goto('/');
    await openGraph(page);

    await enterExpression(page, 'y=\\begin{cases}x^2&x<0\\\\\\sqrt{x}&x\\ge0\\end{cases}');
    await expect(page.getByTestId('graph-scene-paths').locator('path')).toHaveCount(2);
    await expect(page.getByTestId('graph-scene-points').locator('circle')).toHaveCount(2);
    await expect(page.getByTestId('graph-scene-points').locator('circle').first())
      .toHaveAttribute('fill', '#071517');
    await page.getByRole('button', { name: 'Expand piecewise branches' }).click();
    await expect(page.getByText('Piecewise branches')).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Add branch' })).toBeVisible();
    await expect(page.locator('.graph-status')).toContainText('Ready');
    await page.screenshot({
      path: testInfo.outputPath('graphing-piecewise-1440x940.png'),
      fullPage: true,
    });
  });

  test('keeps high-degree and directed routes complete through rapid interaction', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 940 });
    await page.goto('/');
    await openGraph(page);

    await enterExpression(page, 'x^5');
    await enterExpression(page, 'x=y^6');
    await enterExpression(page, 'y<x');
    await expect(page.getByTestId('graph-scene-paths').locator('path')).toHaveCount(3);
    await expect(page.getByTestId('graph-scene-regions').locator('path')).toHaveCount(1);
    await expect(page.locator('.graph-status')).toContainText('Ready');
    await expect(page.getByText(/safe plotting limit/iu)).toHaveCount(0);

    const regionData = await page.getByTestId('graph-scene-regions').locator('path').getAttribute('d');
    expect(regionData?.length ?? Number.POSITIVE_INFINITY).toBeLessThan(20_000);

    const viewport = page.getByTestId('graph-viewport');
    const bounds = await viewport.boundingBox();
    if (!bounds) throw new Error('Graph viewport did not have layout bounds.');
    await page.mouse.move(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.5);
    for (let burst = 0; burst < 8; burst += 1) await page.mouse.wheel(0, burst % 2 ? 180 : -220);
    await expect(page.locator('.graph-status')).toContainText('Ready');
    await expect(page.getByTestId('graph-scene-paths').locator('path')).toHaveCount(3);
    await expect(page.getByTestId('graph-scene-regions').locator('path')).toHaveCount(1);
    await expect(page.getByTestId('graph-viewport')).not.toHaveCSS('user-select', 'auto');

    await page.screenshot({
      path: testInfo.outputPath('graphing-interaction-sampling-correction-1440x940.png'),
      fullPage: true,
    });
  });

  test('creates explicit graph-local parameters and keeps bindings while dependents are hidden', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 940 });
    await page.goto('/');
    await openGraph(page);

    await enterExpression(page, 'a x');
    await page.getByRole('button', { name: 'Create slider for a' }).click();
    const slider = page.getByRole('slider', { name: 'a slider' });
    await expect(slider).toHaveValue('1');
    await expect(page.getByTestId('graph-scene-paths').locator('path')).toHaveCount(1);
    const before = await page.getByTestId('graph-scene-paths').locator('path').getAttribute('d');
    await slider.fill('2');
    await slider.dispatchEvent('pointerup');
    await expect(slider).toHaveValue('2');
    await expect.poll(() => page.getByTestId('graph-scene-paths').locator('path').getAttribute('d'))
      .not.toBe(before);

    const dependentRow = page.getByTestId('graph-expression-row').first();
    await dependentRow.getByRole('button', { name: 'Hide graph' }).click();
    await expect(page.getByTestId('graph-scene-paths').locator('path')).toHaveCount(0);
    await expect(page.getByTestId('graph-parameter-a')).toBeVisible();
    await dependentRow.getByRole('button', { name: 'Show graph' }).click();
    await expect(page.getByTestId('graph-scene-paths').locator('path')).toHaveCount(1);

    await page.screenshot({
      path: testInfo.outputPath('graphing-parameters-1440x940.png'),
      fullPage: true,
    });
  });

  test('keeps manual parameter adjustment but disables autoplay under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await openGraph(page);
    await enterExpression(page, 'a x');
    await page.getByRole('button', { name: 'Create slider for a' }).click();
    await expect(page.getByRole('button', { name: 'Play a' })).toBeDisabled();
    const slider = page.getByRole('slider', { name: 'a slider' });
    await slider.fill('2');
    await expect(slider).toHaveValue('2');
  });
});
