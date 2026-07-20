import { expect, test, type Locator, type Page } from '@playwright/test';

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

  test('keeps nested MathLive group and text selection readable', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 940 });
    await page.goto('/');
    await openGraph(page);
    await enterExpression(page, '\\log(\\sin x)');

    const field = page.locator('math-field').first();
    await field.focus();
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => field.evaluate((element) => (
      Boolean(element.shadowRoot?.querySelector('.ML__contains-highlight'))
    ))).toBe(true);
    await expect.poll(() => field.evaluate((element) => {
      const nested = element.shadowRoot?.querySelector<HTMLElement>('.ML__contains-highlight');
      if (!nested) return null;
      const style = getComputedStyle(nested);
      return { background: style.backgroundColor, color: style.color };
    })).toEqual({
      background: 'rgba(85, 152, 255, 0.16)',
      color: 'rgb(239, 247, 240)',
    });
    await expect.poll(() => field.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        selectionBackground: style.getPropertyValue('--selection-background-color').trim(),
        selectionColor: style.getPropertyValue('--selection-color').trim(),
      };
    })).toEqual({
      selectionBackground: 'rgba(85, 152, 255, .38)',
      selectionColor: '#f7fbef',
    });

    await page.screenshot({
      path: testInfo.outputPath('graphing-mathlive-selection-1440x940.png'),
      fullPage: true,
    });
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
    await page.mouse.move(firstPoint.x, firstPoint.y);
    await expect(page.locator('.graph-trace-callout')).toBeHidden();
    await page.mouse.click(firstPoint.x, firstPoint.y);
    await expect(page.locator('.graph-trace-callout')).toContainText('(1, 2)');
    await viewport.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.graph-trace-callout')).toContainText('(3, 4)');

    await page.keyboard.press('Escape');
    const curvePoint = screen(4, 2);
    await page.mouse.click(curvePoint.x, curvePoint.y);
    const yThree = screen(9, 3);
    await page.mouse.move(yThree.x, yThree.y);
    await expect.poll(() => page.locator('.graph-trace-callout').textContent()).toMatch(
      /^\(9(?:\.\d+)?, 3(?:\.\d+)?\)$/u,
    );
    const emptyPoint = screen(-8, -5);
    await page.mouse.click(emptyPoint.x, emptyPoint.y);
    await expect(page.locator('.graph-trace-callout')).toBeHidden();
    await expect(page.getByRole('tab', { name: /Untitled Graph/ })).not.toContainText('running');
    await page.screenshot({
      path: testInfo.outputPath('graphing-relation-routes-1440x940.png'),
      fullPage: true,
    });
  });

  test('requires click acquisition then continuously sweeps the selected ordinary curve', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 940 });
    await page.goto('/');
    await openGraph(page);
    await enterExpression(page, '\\sin(x)');
    await enterExpression(page, 'x');
    await expect(page.getByTestId('graph-scene-paths').locator('path')).toHaveCount(2);

    const viewport = page.getByTestId('graph-viewport');
    const bounds = await viewport.boundingBox();
    if (!bounds) throw new Error('Graph viewport did not have layout bounds.');
    const screen = (x: number, y: number) => ({
      x: bounds.x + (x + 10) / 20 * bounds.width,
      y: bounds.y + (6 - y) / 12 * bounds.height,
    });
    const rows = page.getByTestId('graph-expression-row');
    const sineItemId = await rows.nth(0).getAttribute('data-graph-item-id');
    if (!sineItemId) throw new Error('Sine row did not expose its item identity.');

    const start = screen(2, Math.sin(2));
    await page.mouse.move(start.x, start.y);
    const callout = page.locator('.graph-trace-callout');
    await expect(callout).toBeHidden();
    await page.mouse.click(start.x, start.y);
    await expect(callout).toBeVisible();
    await expect(callout).toHaveAttribute('data-trace-item-id', sineItemId);

    for (let step = 0; step <= 20; step += 1) {
      const x = 2 - step * 0.15;
      const point = screen(x, Math.sin(x));
      await page.mouse.move(point.x, point.y);
      await expect(callout).toBeVisible();
      await expect(callout).toHaveAttribute('data-trace-item-id', sineItemId);
    }
    await expect(callout).toContainText('(-1');
  });

  test('aligns closest-point tracing with the final visible stroke under UI scaling', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await openGraph(page);
    await enterExpression(page, 'x');
    await expect(page.getByTestId('graph-scene-paths').locator('path')).toHaveCount(1);

    await page.getByTestId('active-surface-page').evaluate((element) => {
      element.style.setProperty('--page-ui-scale', '1.3');
    });
    const path = page.getByTestId('graph-scene-paths').locator('path');
    const visiblePoint = await path.evaluate((node: SVGPathElement) => {
      const length = node.getTotalLength();
      const center = node.getPointAtLength(length * 0.45);
      const before = node.getPointAtLength(length * 0.45 - 2);
      const after = node.getPointAtLength(length * 0.45 + 2);
      const matrix = node.getScreenCTM();
      if (!matrix) throw new Error('Visible graph path has no screen transform.');
      const project = (point: DOMPoint) => new DOMPoint(point.x, point.y).matrixTransform(matrix);
      const screen = project(center); const left = project(before); const right = project(after);
      const dx = right.x - left.x; const dy = right.y - left.y;
      const magnitude = Math.hypot(dx, dy) || 1;
      return {
        x: screen.x,
        y: screen.y,
        normalX: -dy / magnitude,
        normalY: dx / magnitude,
      };
    });
    const click = {
      x: visiblePoint.x + visiblePoint.normalX * 14,
      y: visiblePoint.y + visiblePoint.normalY * 14,
    };
    await page.mouse.click(click.x, click.y);
    const marker = page.locator('.graph-trace-marker');
    await expect(marker).toBeVisible();
    await expect.poll(async () => {
      const bounds = await marker.boundingBox();
      if (!bounds) return Number.POSITIVE_INFINITY;
      return Math.hypot(
        bounds.x + bounds.width / 2 - visiblePoint.x,
        bounds.y + bounds.height / 2 - visiblePoint.y,
      );
    }).toBeLessThanOrEqual(2);

    const itemId = await page.getByTestId('graph-expression-row').getAttribute('data-graph-item-id');
    await expect(marker).toHaveAttribute('data-trace-item-id', itemId ?? '');
    await page.keyboard.press('Escape');
    await page.mouse.click(
      visiblePoint.x - visiblePoint.normalX * 14,
      visiblePoint.y - visiblePoint.normalY * 14,
    );
    await expect.poll(async () => {
      const bounds = await marker.boundingBox();
      if (!bounds) return Number.POSITIVE_INFINITY;
      return Math.hypot(
        bounds.x + bounds.width / 2 - visiblePoint.x,
        bounds.y + bounds.height / 2 - visiblePoint.y,
      );
    }).toBeLessThanOrEqual(2);
    const nextPoint = await path.evaluate((node: SVGPathElement) => {
      const point = node.getPointAtLength(node.getTotalLength() * 0.6);
      const matrix = node.getScreenCTM();
      if (!matrix) throw new Error('Visible graph path has no screen transform.');
      const screen = new DOMPoint(point.x, point.y).matrixTransform(matrix);
      return { x: screen.x, y: screen.y };
    });
    await page.mouse.move(nextPoint.x, nextPoint.y, { steps: 12 });
    await expect.poll(async () => {
      const bounds = await marker.boundingBox();
      if (!bounds) return Number.POSITIVE_INFINITY;
      return Math.hypot(
        bounds.x + bounds.width / 2 - nextPoint.x,
        bounds.y + bounds.height / 2 - nextPoint.y,
      );
    }).toBeLessThanOrEqual(2);
    await expect(marker).toHaveAttribute('data-trace-item-id', itemId ?? '');
    await page.screenshot({
      path: testInfo.outputPath('graphing-scaled-closest-trace-1920x1080.png'),
      fullPage: true,
    });
  });

  test('extends logarithmic domain branches through the visible viewport edge', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 940 });
    await page.goto('/');
    await openGraph(page);
    await enterExpression(page, '\\log(\\sin(x))');
    const path = page.getByTestId('graph-scene-paths').locator('path');
    await expect(path).toHaveCount(1);
    const viewport = page.getByTestId('graph-viewport');
    const bounds = await viewport.boundingBox();
    if (!bounds) throw new Error('Graph viewport did not have layout bounds.');
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.wheel(0, 600);
    await expect(page.locator('.graph-status')).toContainText('Ready');

    await expect.poll(() => path.evaluate((node: SVGPathElement) => {
      const matrix = node.getScreenCTM();
      const viewportNode = document.querySelector<HTMLElement>('[data-testid="graph-viewport"]');
      if (!matrix || !viewportNode) return Number.POSITIVE_INFINITY;
      const viewportBottom = viewportNode.getBoundingClientRect().bottom;
      const length = node.getTotalLength();
      let maximumY = Number.NEGATIVE_INFINITY;
      for (let index = 0; index <= 800; index += 1) {
        const point = node.getPointAtLength(length * index / 800);
        const screen = new DOMPoint(point.x, point.y).matrixTransform(matrix);
        maximumY = Math.max(maximumY, screen.y);
      }
      return viewportBottom - maximumY;
    })).toBeLessThanOrEqual(2);
    const densestBranchVertices = await path.evaluate((node: SVGPathElement) => (
      (node.getAttribute('d') ?? '').split('M').slice(1)
        .reduce((largest, segment) => Math.max(largest, segment.split('L').length), 0)
    ));
    expect(densestBranchVertices).toBeGreaterThanOrEqual(20);
    await expect(page.getByText(/safe plotting limit/iu)).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath('graphing-log-sin-edge-completion-1440x940.png'),
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

  test('renders smooth stitched implicit circles and nonlinear contours', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 940 });
    await page.goto('/');
    await openGraph(page);

    await enterExpression(page, 'x^2+y^2=9');
    await enterExpression(page, '(x-3)^2+(y+2)^2=2.25');
    await enterExpression(page, 'x^2+y^3=9');
    await expect(page.locator('.graph-status')).toContainText('Ready');

    const paths = page.getByTestId('graph-scene-paths').locator('path');
    await expect(paths).toHaveCount(3);
    const readPathShape = async () => Promise.all(
      (await paths.all()).map(async (path) => {
        const data = await path.getAttribute('d') ?? '';
        return {
          moves: data.match(/M/gu)?.length ?? 0,
          lines: data.match(/L/gu)?.length ?? 0,
        };
      })
    );
    await expect.poll(readPathShape).toEqual([
      { moves: 1, lines: expect.any(Number) },
      { moves: 1, lines: expect.any(Number) },
      { moves: expect.any(Number), lines: expect.any(Number) },
    ]);
    const pathShape = await readPathShape();
    expect(pathShape[0]!.lines).toBeGreaterThan(40);
    expect(pathShape[1]!.lines).toBeGreaterThan(30);
    await expect(page.getByText(/safe plotting limit|Could not resolve this view/iu)).toHaveCount(0);

    await page.screenshot({
      path: testInfo.outputPath('graphing-implicit-contour-quality-1440x940.png'),
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
    const viewport = page.getByTestId('graph-viewport');
    const bounds = await viewport.boundingBox();
    if (!bounds) throw new Error('Graph viewport did not have layout bounds.');
    const screen = (x: number, y: number) => ({
      x: bounds.x + (x + 10) / 20 * bounds.width,
      y: bounds.y + (6 - y) / 12 * bounds.height,
    });
    const traceStart = screen(4, 2);
    await page.mouse.move(traceStart.x, traceStart.y);
    await expect(page.locator('.graph-trace-callout')).toBeHidden();
    await page.mouse.click(traceStart.x, traceStart.y);
    await expect(page.locator('.graph-trace-callout')).toContainText('(4.000');
    const swept = screen(9, 3);
    await page.mouse.move(swept.x, swept.y, { steps: 8 });
    await expect(page.locator('.graph-trace-callout')).toContainText('(9');
    await page.keyboard.press('Escape');
    await expect(page.locator('.graph-trace-callout')).toBeHidden();
    await page.getByRole('button', { name: 'Expand piecewise branches' }).click();
    await expect(page.getByText('Piecewise branches', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Add branch' })).toBeVisible();
    await expect(page.locator('.graph-status')).toContainText('Ready');
    await page.screenshot({
      path: testInfo.outputPath('graphing-piecewise-1440x940.png'),
      fullPage: true,
    });
  });

  test('keeps long expression rows horizontally scrollable with fixed actions', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1180, height: 760 });
    await page.goto('/');
    await openGraph(page);

    await enterExpression(
      page,
      '\\sin(x)+\\cos(x)+\\tan(x)+\\sin(2x)+\\cos(3x)+\\sin(4x)+\\cos(5x)',
    );
    const editorScroll = page.locator('.graph-expression-editor-scroll').first();
    await expect(editorScroll).toBeVisible();
    await expect(editorScroll).toHaveAttribute('data-overflowing', 'true');
    await expect(page.getByTestId('graph-expression-blank-row')
      .locator('.graph-expression-editor-scroll')).toHaveAttribute('data-overflowing', 'false');
    const overflow = await editorScroll.evaluate((element) => {
      const style = getComputedStyle(element);
      element.scrollLeft = element.scrollWidth;
      return {
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        scrollLeft: element.scrollLeft,
      };
    });
    expect(overflow.overflowX).toBe('auto');
    expect(overflow.overflowY).toBe('hidden');
    expect(overflow.scrollWidth).toBeGreaterThan(overflow.clientWidth);
    expect(overflow.scrollLeft).toBeGreaterThan(0);
    await expect(page.getByRole('button', { name: 'Hide graph' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete expression' })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('graphing-long-expression-horizontal-scroll-1180x760.png'),
      fullPage: true,
    });
  });

  test('creates a discoverable piecewise function from the keyboard-accessible Add Item menu', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 940 });
    await page.goto('/');
    await openGraph(page);

    const addItem = page.getByRole('button', { name: '+ Add item' });
    await addItem.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menuitem', { name: 'Piecewise Function' })).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('menuitem', { name: 'Piecewise Function' })).toBeFocused();
    await page.keyboard.press('Enter');
    const values = page.locator('[data-testid^="graph-piecewise-draft-value-"]');
    const conditions = page.locator('[data-testid^="graph-piecewise-draft-condition-"]');
    await expect(values.first()).toBeFocused();
    for (const [field, latex] of [
      [values.nth(0), 'x^2'], [conditions.nth(0), 'x<0'],
      [values.nth(1), '\\sqrt{x}'], [conditions.nth(1), 'x\\ge0'],
    ] as const) {
      await field.evaluate((element, source) => {
        const mathField = element as HTMLElement & { setValue: (value: string) => void };
        mathField.setValue(source);
        mathField.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
      }, latex);
    }
    await expect(page.getByTestId('graph-piecewise-authoring-draft')).toHaveCount(0);
    await expect(page.getByTestId('graph-expression-row')).toHaveCount(1);
    await expect(page.getByTestId('graph-scene-paths').locator('path')).toHaveCount(2);
    await page.screenshot({
      path: testInfo.outputPath('graphing-add-item-piecewise-1440x940.png'),
      fullPage: true,
    });
  });

  test('creates content-only Notes and reorders them without disturbing the trailing expression row', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 940 });
    await page.goto('/');
    await openGraph(page);

    for (const text of ['First note\nExplains the construction.', 'Second note']) {
      await page.getByRole('button', { name: '+ Add item' }).click();
      await page.getByRole('menuitem', { name: 'Note' }).click();
      const note = page.getByRole('textbox', { name: 'Graph note' }).last();
      await expect(note).toBeFocused();
      await note.fill(text);
    }
    await page.getByRole('button', { name: 'Reorder item 2' }).focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Space');
    await expect(page.getByRole('textbox', { name: 'Graph note' }).first()).toHaveValue('Second note');
    await expect(page.getByRole('textbox', { name: 'Graph note' }).nth(1))
      .toHaveValue('First note\nExplains the construction.');
    await expect(page.getByTestId('graph-expression-blank-row')).toHaveCount(1);
    await expect(page.locator('.graph-expression-list > :last-child math-field')).toBeVisible();
    await expect(page.locator('.graph-status')).toContainText('Ready');
    await page.screenshot({
      path: testInfo.outputPath('graphing-notes-ordering-1440x940.png'),
      fullPage: true,
    });
  });

  test('explains piecewise condition mistakes and renders refined gap endpoints consistently', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 940 });
    await page.goto('/');
    await openGraph(page);
    await page.getByRole('button', { name: '+ Add item' }).click();
    await page.getByRole('menuitem', { name: 'Piecewise Function' }).click();
    const values = page.locator('[data-testid^="graph-piecewise-draft-value-"]');
    const conditions = page.locator('[data-testid^="graph-piecewise-draft-condition-"]');
    const setField = async (field: Locator, latex: string) => field.evaluate((element, source) => {
      const mathField = element as HTMLElement & { setValue: (value: string) => void };
      mathField.setValue(source);
      mathField.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    }, latex);
    await setField(conditions.nth(0), 'x+1');
    await expect(page.getByText('A condition needs a comparison such as x < 2.')).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('graphing-piecewise-specific-error-1440x940.png'),
      fullPage: true,
    });
    await setField(values.nth(0), 'x');
    await setField(conditions.nth(0), 'x<0');
    await setField(values.nth(1), '-x');
    await setField(conditions.nth(1), 'x>0');
    await expect(page.getByTestId('graph-piecewise-authoring-draft')).toHaveCount(0);
    await expect(page.getByText('Piecewise branches leave gaps in the current view; gaps are allowed.')).toBeVisible();
    await expect(page.getByTestId('graph-scene-paths').locator('path')).toHaveCount(2);
    await expect(page.getByTestId('graph-scene-points').locator('circle')).toHaveCount(2);
    const piecewiseRow = page.locator('[data-testid="graph-expression-row"][data-piecewise-state]');
    const piecewiseSummary = page.getByTestId('graph-piecewise-summary');
    const expand = page.getByRole('button', { name: 'Expand piecewise branches' });
    await expect(piecewiseSummary).toBeVisible();
    await expect(piecewiseRow).toHaveAttribute('data-piecewise-state', 'summary');
    await expect(expand).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('button', { name: /Reorder item/u })).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath('graphing-piecewise-condition-evidence-1440x940.png'),
      fullPage: true,
    });
    await expand.click();
    await expect(page.getByText('Piecewise branches', { exact: true })).toBeVisible();
    await expect(piecewiseRow).toHaveAttribute('data-piecewise-state', 'expanded');
    await expect.poll(() => piecewiseSummary.locator('math-field').evaluate(
      (element) => Boolean((element as HTMLElement & { readOnly?: boolean }).readOnly),
    )).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath('graphing-piecewise-expanded-editor-1440x940.png'),
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Collapse piecewise branches' }).click();
    await expect(page.getByText('Piecewise branches', { exact: true })).toHaveCount(0);
    await expect(piecewiseRow).toHaveAttribute('data-piecewise-state', 'summary');
  });

  test('matches the compact piecewise target and keeps theme and style edits presentation-only', async ({ page }, testInfo) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.setViewportSize({ width: 2020, height: 1077 });
    await page.goto('/');
    await openGraph(page);
    await page.getByRole('button', { name: '+ Add item' }).click();
    await page.getByRole('menuitem', { name: 'Piecewise Function' }).click();
    const values = page.locator('[data-testid^="graph-piecewise-draft-value-"]');
    const conditions = page.locator('[data-testid^="graph-piecewise-draft-condition-"]');
    const setField = async (field: Locator, latex: string) => field.evaluate((element, source) => {
      const mathField = element as HTMLElement & { setValue: (value: string) => void };
      mathField.setValue(source);
      mathField.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    }, latex);
    await setField(values.nth(0), 'x');
    await setField(conditions.nth(0), 'x<0');
    await setField(values.nth(1), '-x');
    await setField(conditions.nth(1), 'x>0');

    const row = page.locator('[data-testid="graph-expression-row"][data-piecewise-state]');
    await expect(row).toHaveAttribute('data-piecewise-state', 'summary');
    await expect(page.getByRole('button', { name: 'Expand piecewise branches' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hide graph' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete expression' })).toBeVisible();
    await expect(page.getByText('Piecewise branches leave gaps in the current view; gaps are allowed.')).toBeVisible();
    expect((await row.boundingBox())?.height).toBeLessThan(190);
    await page.screenshot({
      path: testInfo.outputPath('graphing-move21-piecewise-reference-2020x1077.png'),
      fullPage: true,
    });

    await page.getByRole('button', { name: 'Style graph item' }).click();
    await page.getByRole('combobox', { name: 'Curve width' }).selectOption('strong');
    await page.getByRole('combobox', { name: 'Curve line style' }).selectOption('dotted');
    const paths = page.getByTestId('graph-scene-paths').locator('path');
    await expect(paths.first()).toHaveAttribute('stroke-width', '3');
    await expect(paths.first()).toHaveAttribute('stroke-dasharray', '2 5');
    await page.getByRole('button', { name: 'Close curve style' }).click();
    await page.getByRole('combobox', { name: 'Graph theme' }).selectOption('paper');
    await expect(page.getByTestId('graph-page')).toHaveAttribute('data-graph-theme', 'paper');
    await expect.poll(() => page.locator('.graph-viewport-panel').evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    )).toBe('rgb(244, 240, 230)');
    expect(consoleErrors).toEqual([]);
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

  test('plots polar and parametric domains with an explicit adaptive-grid choice', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 940 });
    await page.goto('/');
    await openGraph(page);

    await enterExpression(page, 'r=2\\cos(2\\theta)\\{0\\le\\theta\\le\\pi\\}');
    await expect(page.getByTestId('graph-scene-paths').locator('path')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Switch to Polar grid' })).toBeVisible();
    await expect(page.getByTestId('graph-scene-grid-labels')).not.toContainText('pi/');

    await page.getByRole('button', { name: 'Switch to Polar grid' }).click();
    await expect(page.getByTestId('graph-scene-grid').locator('[data-grid-line="spoke"]')).toHaveCount(1);
    await expect(page.getByTestId('graph-scene-grid-labels')).toContainText('pi/');
    await expect.poll(() => page.getByTestId('graph-scene-grid').locator('ellipse').evaluateAll((nodes) => (
      nodes.every((node) => node.getAttribute('fill') === 'none')
    ))).toBe(true);

    const viewportBounds = await page.getByTestId('graph-viewport').boundingBox();
    if (!viewportBounds) throw new Error('Graph viewport did not have layout bounds.');
    await page.mouse.move(viewportBounds.x + viewportBounds.width * 0.55, viewportBounds.y + viewportBounds.height * 0.55);
    await page.mouse.down();
    await page.mouse.move(viewportBounds.x + viewportBounds.width * 0.9, viewportBounds.y + viewportBounds.height * 0.82, { steps: 10 });
    await page.mouse.up();
    await expect(page.getByTestId('graph-scene-grid').locator('ellipse')).not.toHaveCount(0);
    await expect(page.getByTestId('graph-scene-grid').locator('[data-grid-line="spoke"]')).toHaveCount(1);
    await expect.poll(() => page.getByTestId('graph-scene-grid').locator('ellipse').evaluateAll((nodes) => (
      Math.max(...nodes.map((node) => Number(node.getAttribute('rx') ?? 0)))
    ))).toBeGreaterThan(viewportBounds.width * 0.45);

    await enterExpression(page, '(\\cos(u),\\sin(u))\\{-1\\le u\\le1\\}');
    await expect(page.getByTestId('graph-scene-paths').locator('path')).toHaveCount(2);
    await expect(page.locator('.graph-status')).toContainText('Ready');

    await page.getByRole('button', { name: 'Grid & Axes' }).click();
    await page.getByRole('checkbox', { name: 'Unit Circle overlay' }).check();
    await expect(page.getByTestId('graph-scene-paths').locator('[data-path-id="graph-overlay.unit-circle:path"]'))
      .toHaveCount(1);

    const viewport = page.getByTestId('graph-viewport');
    await viewport.focus();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Enter');
    await expect(page.locator('.graph-trace-callout')).toContainText('theta=');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.graph-trace-callout')).toContainText('theta=');
    await expect(page.getByRole('tab', { name: /Untitled Graph/ })).not.toContainText('running');

    await page.screenshot({
      path: testInfo.outputPath('graphing-polar-grid-1440x940.png'),
      fullPage: true,
    });
  });

  test('runs the private Three viewport with Unity controls and precise SVG recovery', async ({ page }, testInfo) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 940 });
    await page.goto('/');
    await openGraph(page);
    await enterExpression(page, 'x^2-4');
    await expect(page.getByTestId('graph-scene-paths').locator('path')).toHaveCount(1);

    await expect(page.getByRole('button', { name: '2D' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: '3D' }).click();
    const viewport = page.getByTestId('graph-three-viewport');
    await expect(viewport).toHaveAttribute('data-ready', 'true');
    await expect(viewport.locator('canvas.graph-three-canvas')).toBeVisible();
    await expect(viewport).toHaveAttribute('data-camera-projection', 'perspective');

    await page.getByRole('button', { name: 'Top' }).click();
    await expect(viewport).toHaveAttribute('data-camera-orientation', 'top');
    await page.getByRole('combobox', { name: '3D projection' }).selectOption('orthographic');
    await expect(viewport).toHaveAttribute('data-camera-projection', 'orthographic');
    await page.getByRole('combobox', { name: 'Vertical exaggeration' }).selectOption('2');
    await page.getByRole('button', { name: 'Wireframe' }).click();
    await expect(page.getByRole('button', { name: 'Wireframe' })).toHaveAttribute('aria-pressed', 'true');

    const bounds = await viewport.boundingBox();
    if (!bounds) throw new Error('Three viewport did not have layout bounds.');
    const beforePan = await viewport.getAttribute('data-camera-position');
    await page.mouse.move(bounds.x + bounds.width * 0.55, bounds.y + bounds.height * 0.55);
    await page.mouse.down({ button: 'middle' });
    await page.mouse.move(bounds.x + bounds.width * 0.62, bounds.y + bounds.height * 0.61, { steps: 5 });
    await page.mouse.up({ button: 'middle' });
    await expect(viewport).not.toHaveAttribute('data-camera-position', beforePan ?? '');

    const beforeOrbit = await viewport.getAttribute('data-camera-position');
    await page.keyboard.down('Alt');
    await page.mouse.down({ button: 'left' });
    await page.mouse.move(bounds.x + bounds.width * 0.69, bounds.y + bounds.height * 0.5, { steps: 5 });
    await page.mouse.up({ button: 'left' });
    await page.keyboard.up('Alt');
    await expect(viewport).not.toHaveAttribute('data-camera-position', beforeOrbit ?? '');
    await expect(viewport).toHaveAttribute('data-camera-orientation', 'free');

    const beforeZoom = await viewport.getAttribute('data-camera-position');
    await page.mouse.wheel(0, -260);
    await expect(viewport).not.toHaveAttribute('data-camera-position', beforeZoom ?? '');
    await viewport.focus();
    await page.keyboard.press('Home');
    await expect(viewport).toHaveAttribute('data-camera-orientation', 'isometric');

    const canvas = viewport.locator('canvas.graph-three-canvas');
    await canvas.evaluate((element) => {
      element.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    });
    await expect(page.getByText('Precise 2D fallback')).toBeVisible();
    await expect(page.getByText('WebGL2 context was lost. Your graph and camera are preserved.')).toBeVisible();
    await expect(page.getByTestId('graph-viewport')).toBeVisible();
    await expect(page.getByTestId('graph-scene-paths').locator('path')).toHaveCount(1);

    await canvas.evaluate((element) => {
      element.dispatchEvent(new Event('webglcontextrestored'));
    });
    await expect(page.getByText('Precise 2D fallback')).toHaveCount(0);
    await expect(viewport).toBeVisible();

    await page.getByRole('button', { name: '2D' }).click();
    await expect(page.locator('canvas.graph-three-canvas')).toHaveCount(0);
    await page.getByRole('button', { name: '3D' }).click();
    await expect(page.getByTestId('graph-three-viewport')).toHaveAttribute('data-camera-orientation', 'isometric');
    await expect(page.getByTestId('graph-three-viewport')).toHaveAttribute('data-camera-projection', 'orthographic');

    await page.screenshot({
      path: testInfo.outputPath('graphing-move22-three-viewport-1440x940.png'),
      fullPage: true,
    });
    expect(consoleErrors).toEqual([]);
  });

  test('keeps Analyze floating, evidence-honest, persistent, and explicitly navigated', async ({ page }, testInfo) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 940 });
    await page.goto('/');
    await openGraph(page);
    await enterExpression(page, 'x^2-4');
    await expect(page.getByTestId('graph-scene-paths').locator('path')).toHaveCount(1);

    const graphViewport = page.getByRole('region', { name: 'Graph viewport' });
    const viewportBefore = await graphViewport.boundingBox();
    await page.getByRole('button', { name: 'Analyze' }).click();
    const overlay = page.getByRole('complementary', { name: 'Analyze graph' });
    await expect(overlay).toBeVisible();
    await expect(overlay.getByRole('heading', { name: 'Root' })).toBeVisible();
    const viewportAfter = await graphViewport.boundingBox();
    expect(viewportAfter).toEqual(viewportBefore);

    const rootCard = overlay.locator('.graph-feature-card').filter({ hasText: 'x -2' }).first();
    await rootCard.hover();
    await expect(page.locator('.graph-analysis-marker.is-preview')).toBeVisible();
    await rootCard.getByRole('button', { name: 'Pin' }).click();
    await expect(page.locator('.graph-analysis-marker:not(.is-preview)')).toBeVisible();
    await overlay.getByRole('tab', { name: 'Evidence' }).click();
    await expect(overlay.getByText('degree-at-most-two polynomial identity').first()).toBeVisible();
    await overlay.getByRole('tab', { name: 'Style' }).click();
    await expect(overlay.getByRole('dialog', { name: 'Curve style' })).toBeVisible();
    await overlay.getByRole('tab', { name: 'Features' }).click();

    const beforeRecenter = await page.getByTestId('graph-scene-grid').locator('[data-grid-line="axis"]').first().getAttribute('d');
    await overlay.locator('.graph-feature-card').filter({ hasText: 'x -2' }).first().getByRole('button', { name: 'Recenter' }).click();
    await expect.poll(() => page.getByTestId('graph-scene-grid').locator('[data-grid-line="axis"]').first().getAttribute('d')).not.toBe(beforeRecenter);

    const resize = overlay.getByRole('separator', { name: 'Resize Analyze panel' });
    const resizeBox = await resize.boundingBox();
    const overlayWidth = (await overlay.boundingBox())?.width ?? 0;
    if (!resizeBox) throw new Error('Analyze resize handle had no layout bounds.');
    await page.mouse.move(resizeBox.x + 4, resizeBox.y + 20);
    await page.mouse.down();
    await page.mouse.move(resizeBox.x - 70, resizeBox.y + 20, { steps: 5 });
    await page.mouse.up();
    await expect.poll(async () => (await overlay.boundingBox())?.width ?? 0).toBeGreaterThan(overlayWidth + 40);

    await page.setViewportSize({ width: 760, height: 800 });
    const narrowOverlay = await overlay.boundingBox();
    expect(narrowOverlay?.x).toBeGreaterThanOrEqual(0);
    expect((narrowOverlay?.x ?? 0) + (narrowOverlay?.width ?? 0)).toBeLessThanOrEqual(760);
    await page.screenshot({ path: testInfo.outputPath('graphing-move24-analyze-overlay-760x800.png'), fullPage: true });
    expect(consoleErrors).toEqual([]);
  });
});
