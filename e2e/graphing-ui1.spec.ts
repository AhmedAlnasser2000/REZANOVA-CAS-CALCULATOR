import { expect, test, type Page } from '@playwright/test';
import { openLauncherApp } from './helpers';

// GRAPHING-UI1: the Graph page fills the window at every size and zoom, its
// menus close on an outside press, Escape or Tab, a press on the graph that
// closes a menu does nothing else, and the expression list and Both split can
// be dragged and are remembered.

async function openGraph(page: Page) {
  await page.goto('/');
  await page.getByTestId('workspace-tab-add-menu').click();
  await page.getByRole('menuitem', { name: 'New Graph' }).click();
  await expect(page.getByTestId('graph-page')).toBeVisible();
}

async function enterExpression(page: Page, latex: string) {
  await page.locator('math-field').last().evaluate((element, value) => {
    const mathField = element as HTMLElement & { setValue: (source: string) => void };
    mathField.setValue(value);
    mathField.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    mathField.blur();
  }, latex);
  await page.waitForTimeout(900);
}

async function realPoint(page: Page, x: number, y: number) {
  const host = page.getByTestId('graph-viewport');
  let previous = '';
  await expect.poll(async () => {
    const current = await host.getAttribute('data-viewport') ?? '';
    const stable = current !== '' && current === previous; previous = current; return stable;
  }, { intervals: [150] }).toBe(true);
  const box = await host.boundingBox();
  const [xMin, xMax, yMin, yMax] = previous.split(',').map(Number) as [number, number, number, number];
  return { x: box!.x + (x - xMin) / (xMax - xMin) * box!.width, y: box!.y + (yMax - y) / (yMax - yMin) * box!.height };
}

const callout = (page: Page) => page.locator('.graph-trace-callout');

test.describe('GRAPHING-UI1 layout', () => {
  for (const [width, height] of [[1280, 720], [1920, 1080], [2560, 1440], [1024, 768]] as const) {
    // Browser zoom and the desktop's native UI scale both give the page fewer (or more) CSS pixels at a matching
    // device pixel ratio, which is exactly what this emulates.
    for (const zoom of [0.8, 1, 1.25, 1.5, 2]) {
      test(`fills ${width}x${height} at ${zoom * 100}% zoom without cropping or scrolling`, async ({ browser }, testInfo) => {
        // Browser zoom is a smaller (or larger) CSS viewport at a matching device pixel ratio.
        const context = await browser.newContext({
          viewport: { width: Math.round(width / zoom), height: Math.round(height / zoom) }, deviceScaleFactor: zoom,
        });
        const page = await context.newPage();
        await openGraph(page);
        await enterExpression(page, String.raw`\sin(x)`);
        const layout = await page.evaluate(() => {
          const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
          const bar = document.querySelector<HTMLElement>('.graph-toolbar')!;
          return {
            innerWidth, innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight,
            footerBottom: rect('.graph-page-footer').bottom, pageRight: rect('[data-testid="graph-page"]').right,
            footerHidden: getComputedStyle(document.querySelector('.graph-page-footer')!).display === 'none',
            panelBottom: rect('.graph-viewport-panel').bottom + scrollY,
            panel: rect('.graph-viewport-panel'), toolbarOverflow: bar.scrollWidth - bar.clientWidth,
            sizeClass: document.querySelector<HTMLElement>('[data-testid="graph-page"]')!.dataset.sizeClass,
            drawer: document.querySelector('.graph-workbench')!.classList.contains('is-rail-drawer'),
          };
        });
        // Material 3 classes on CSS pixels: the list docks from 840 px up and is a drawer below.
        expect(layout.drawer).toBe(layout.innerWidth < 840);
        expect(layout.sizeClass).toBe(layout.innerWidth < 600 ? 'compact' : layout.innerWidth < 840 ? 'medium'
          : layout.innerWidth < 1200 ? 'expanded' : layout.innerWidth < 1600 ? 'large' : 'extra-large');
        if (layout.innerHeight > 520) {
          expect(layout.footerBottom).toBeLessThanOrEqual(layout.innerHeight);
          expect(layout.scrollHeight).toBeLessThanOrEqual(layout.innerHeight);
        } else {
          // Very short: the header and status bar make room; past a 240 px minimum the window scrolls vertically only.
          expect(layout.footerHidden).toBe(true);
          expect(layout.panelBottom).toBeLessThanOrEqual(layout.scrollHeight);
        }
        expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth);
        expect(layout.toolbarOverflow).toBeLessThanOrEqual(0);
        // The page uses the window: no fixed maximum width or height leaves empty space around it.
        expect(layout.innerWidth - layout.pageRight).toBeLessThanOrEqual(30);
        if (layout.innerHeight > 520) expect(layout.innerHeight - layout.footerBottom).toBeLessThanOrEqual(32);
        expect(layout.panel.height).toBeGreaterThan(120);
        await page.screenshot({ path: testInfo.outputPath(`ui1-${width}x${height}-${zoom * 100}.png`) });
        await context.close();
      });
    }
  }

  test('moves toolbar controls into the … menu as the window narrows, and back', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await openGraph(page);
    await expect(page.getByTestId('graph-toolbar-more')).toHaveCount(0);
    await page.setViewportSize({ width: 820, height: 760 });
    await page.getByTestId('graph-toolbar-more').click();
    const menu = page.getByTestId('graph-toolbar-more-menu');
    await expect(menu.getByRole('button', { name: 'Grid & Axes' })).toBeVisible();
    await expect(menu.getByLabel('Graph theme')).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Equal axes' })).toBeVisible();
    // Grid & Axes opens from the menu, and the menu closes (one open at a time).
    await menu.getByRole('button', { name: 'Grid & Axes' }).click();
    await expect(page.getByLabel('Grid and axes settings')).toBeVisible();
    await expect(menu).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.getByLabel('Grid and axes settings')).toHaveCount(0);
    await expect(page.getByTestId('graph-toolbar-more')).toBeFocused();
    await page.setViewportSize({ width: 1600, height: 900 });
    await expect(page.getByTestId('graph-toolbar-more')).toHaveCount(0);
    await expect(page.locator('.graph-toolbar').getByRole('button', { name: 'Grid & Axes' })).toBeVisible();
  });
});

test('toolbar levels follow the width alone: monotonic, settling at every width, never flipping', async ({ page }) => {
  test.slow();
  await page.setViewportSize({ width: 2000, height: 900 });
  await openGraph(page);
  const levelAt = async (width: number) => {
    await page.setViewportSize({ width, height: 900 });
    // Two frames for the observers; a page stuck re-measuring would never answer.
    return page.evaluate(() => new Promise<{ level: number; changes: number }>((resolve) => {
      const bar = document.querySelector<HTMLElement>('.graph-toolbar')!;
      let changes = 0;
      const observer = new MutationObserver(() => { changes += 1; });
      observer.observe(bar, { attributes: true, attributeFilter: ['data-hidden-controls'] });
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => {
        observer.disconnect();
        resolve({ level: Number(bar.dataset.hiddenControls), changes });
      }, 50)));
    }));
  };
  for (const mode of ['Real', 'Both'] as const) {
    await page.setViewportSize({ width: 2000, height: 900 });
    await page.getByRole('group', { name: 'Graph number domain' }).getByRole('button', { name: mode }).click();
    let previous = -1;
    const coarse: Array<{ width: number; level: number }> = [];
    for (let width = 2000; width >= 560; width -= 40) {
      const { level, changes } = await levelAt(width);
      expect(changes, `${mode} at ${width}px settled`).toBeLessThanOrEqual(1);
      expect(level, `${mode} at ${width}px`).toBeGreaterThanOrEqual(previous);
      coarse.push({ width, level });
      previous = level;
    }
    // Pixel by pixel across every threshold found, both directions.
    for (let index = 1; index < coarse.length; index += 1) {
      if (coarse[index]!.level === coarse[index - 1]!.level) continue;
      let last = -1;
      for (let width = coarse[index - 1]!.width; width >= coarse[index]!.width; width -= 1) {
        const { level, changes } = await levelAt(width);
        expect(changes).toBeLessThanOrEqual(1);
        expect(level).toBeGreaterThanOrEqual(last);
        last = level;
      }
    }
  }
});

test.describe('GRAPHING-UI1 menus', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openGraph(page);
    await enterExpression(page, 'x');
  });

  test('closes Add item on an outside press, Escape (focus back) and Tab out', async ({ page }) => {
    const button = page.getByRole('button', { name: '+ Add item' });
    const menu = page.locator('.graph-add-item-menu');
    await button.click();
    await expect(menu).toBeVisible();
    await page.locator('.graph-page-header').click();
    await expect(menu).toHaveCount(0);
    await button.click();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(button).toBeFocused();
    await button.press('Enter');
    await expect(menu.getByRole('menuitem').first()).toBeFocused();
    for (let index = 0; index < 4; index += 1) await page.keyboard.press('Tab');
    await expect(menu).toHaveCount(0);
  });

  test('a press on the graph that closes a menu does not trace; the next one does', async ({ page }) => {
    await page.getByRole('button', { name: 'Grid & Axes' }).click();
    const panel = page.getByLabel('Grid and axes settings');
    await expect(panel).toBeVisible();
    const point = await realPoint(page, 3, 3);
    await page.mouse.click(point.x, point.y);
    await expect(panel).toHaveCount(0);
    // Hovering sweeps the trace without showing it; only a press pins one, and that press was swallowed.
    await page.waitForTimeout(300);
    await expect(callout(page)).toBeHidden();
    await page.mouse.click(point.x, point.y);
    await expect(callout(page)).toHaveText(/^\(3(?:\.\d+)?, 3(?:\.\d+)?\)$/u);
  });

  test('opening one menu closes another, and the curve style closes back to its swatch', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add item' }).click();
    await expect(page.locator('.graph-add-item-menu')).toBeVisible();
    await page.getByRole('button', { name: 'Grid & Axes' }).click();
    await expect(page.locator('.graph-add-item-menu')).toHaveCount(0);
    await expect(page.getByLabel('Grid and axes settings')).toBeVisible();
    const swatch = page.getByRole('button', { name: 'Style graph item' }).first();
    await swatch.click();
    await expect(page.getByLabel('Grid and axes settings')).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'Curve style' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Curve style' })).toHaveCount(0);
    await expect(swatch).toBeFocused();
    await swatch.click();
    await page.locator('.graph-page-footer').click();
    await expect(page.getByRole('dialog', { name: 'Curve style' })).toHaveCount(0);
  });
});

test.describe('GRAPHING-UI1 resizing', () => {
  test('drags the expression list wider, keeps it after switching tabs, and resets on double-click', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await openGraph(page);
    const rail = page.locator('.graph-expression-rail');
    const before = (await rail.boundingBox())!.width;
    const handle = page.getByRole('separator', { name: 'Resize expression list' });
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
    await expect.poll(async () => (await rail.boundingBox())!.width).toBeGreaterThan(before + 100);
    const widened = (await rail.boundingBox())!.width;
    await page.locator('[data-testid="workspace-tab"]').first().click();
    await page.locator('[data-testid="workspace-tab"][data-workspace-kind="graphing"]').click();
    await expect.poll(async () => Math.round((await rail.boundingBox())!.width)).toBe(Math.round(widened));
    await handle.dblclick();
    await expect.poll(async () => Math.round((await rail.boundingBox())!.width)).toBe(Math.round(before));
  });

  test('drags the Both divider and double-click returns to half and half', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await openGraph(page);
    await page.getByRole('group', { name: 'Graph number domain' }).getByRole('button', { name: 'Both' }).click();
    const real = page.locator('.graph-viewport-panel.is-both > .graph-viewport-host');
    const divider = page.getByRole('separator', { name: 'Resize Real and Complex panes' });
    const panel = (await page.locator('.graph-viewport-panel').boundingBox())!;
    const box = (await divider.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(panel.x + panel.width * 0.68, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
    await expect.poll(async () => (await real.boundingBox())!.width / panel.width).toBeGreaterThan(0.62);
    // Never past three quarters.
    await page.mouse.move(panel.x + panel.width * 0.66, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(panel.x + panel.width * 0.98, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
    await expect.poll(async () => (await real.boundingBox())!.width / panel.width).toBeLessThan(0.76);
    await divider.dblclick();
    await expect.poll(async () => Math.abs((await real.boundingBox())!.width / panel.width - 0.49)).toBeLessThan(0.03);
  });

  test('opens the expression list as a drawer in a medium window', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 768 });
    await openGraph(page);
    const rail = page.locator('.graph-expression-rail');
    await expect(rail).toBeHidden();
    await page.getByRole('button', { name: 'Expand expression rail' }).click();
    await expect(rail).toBeVisible();
    // A drawer over the graph: the graph keeps the full width.
    const panel = (await page.locator('.graph-viewport-panel').boundingBox())!;
    expect(panel.width).toBeGreaterThan(700);
    await page.getByRole('button', { name: 'Collapse expression rail' }).click();
    await expect(rail).toBeHidden();
  });
});

test('stacks the Both view in a compact window with its own remembered split', async ({ page }) => {
  await page.setViewportSize({ width: 560, height: 900 });
  await openGraph(page);
  await page.getByRole('group', { name: 'Graph number domain' }).getByRole('button', { name: 'Both' }).click();
  const panel = page.locator('.graph-viewport-panel.is-both.is-stacked');
  await expect(panel).toBeVisible();
  const real = page.locator('.graph-viewport-panel.is-both > .graph-viewport-host');
  const divider = page.getByRole('separator', { name: 'Resize Real and Complex panes' });
  await expect(divider).toHaveAttribute('aria-orientation', 'horizontal');
  const box = (await panel.boundingBox())!;
  const handle = (await divider.boundingBox())!;
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2, box.y + box.height * 0.3, { steps: 6 });
  await page.mouse.up();
  await expect.poll(async () => (await real.boundingBox())!.height / box.height).toBeLessThan(0.36);
  // Side by side again in a wider window, at its own (untouched) half and half.
  await page.setViewportSize({ width: 1400, height: 900 });
  await expect(page.locator('.graph-viewport-panel.is-stacked')).toHaveCount(0);
  const wide = (await page.locator('.graph-viewport-panel').boundingBox())!;
  await expect.poll(async () => Math.abs((await real.boundingBox())!.width / wide.width - 0.49)).toBeLessThan(0.03);
  await page.setViewportSize({ width: 560, height: 900 });
  await expect.poll(async () => (await real.boundingBox())!.height / box.height).toBeLessThan(0.36);
});

test('closes the New Equation Example picker on an outside press and Escape', async ({ page }) => {
  await page.goto('/');
  await openLauncherApp(page, 'Core', 'New Equation');
  const workspace = page.getByTestId('new-equation-page');
  const picker = workspace.locator('details.ne-examples');
  const summary = picker.locator('summary');
  await summary.click();
  await expect(picker).toHaveAttribute('open', '');
  // The native toggle event reaches React a moment after the attribute changes.
  await page.waitForTimeout(150);
  await workspace.locator('.ne-tip').click();
  await expect(picker).not.toHaveAttribute('open', '');
  await summary.click();
  await expect(picker).toHaveAttribute('open', '');
  await page.waitForTimeout(150);
  await page.keyboard.press('Escape');
  await expect(picker).not.toHaveAttribute('open', '');
  await expect(summary).toBeFocused();
});
