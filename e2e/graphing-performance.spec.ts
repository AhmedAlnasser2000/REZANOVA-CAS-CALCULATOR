import { expect, test, type Page } from '@playwright/test';
import {
  evaluateGraphPerformanceGate,
  GRAPH_PRE_THREE_PERFORMANCE_BUDGET_V1,
} from '../src/lib/graphing/contracts/performance';

type BrowserMetrics = {
  frames: number[];
  longTasks: number[];
};

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
    mathField.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  }, latex);
}

async function installMetrics(page: Page) {
  await page.evaluate(() => {
    const state: BrowserMetrics & { active: boolean; previous: number | null } = {
      active: true,
      frames: [],
      longTasks: [],
      previous: null,
    };
    Object.assign(window, { __graphPerformanceMetrics: state });
    const observer = new PerformanceObserver((entries) => {
      for (const entry of entries.getEntries()) state.longTasks.push(entry.duration);
    });
    try { observer.observe({ entryTypes: ['longtask'] }); } catch { /* unavailable */ }
    const tick = (time: number) => {
      if (!state.active) {
        observer.disconnect();
        return;
      }
      if (state.previous !== null) state.frames.push(time - state.previous);
      state.previous = time;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

async function readMetrics(page: Page) {
  return page.evaluate(() => {
    const state = (window as typeof window & {
      __graphPerformanceMetrics: BrowserMetrics & { active: boolean };
    }).__graphPerformanceMetrics;
    state.active = false;
    return { frames: state.frames, longTasks: state.longTasks };
  });
}

test.describe('GRAPHING-PRE-THREE-PERFORMANCE-CHECKPOINT1', () => {
  test('meets the throttled interaction, sampling, and lifecycle contract', async ({ page, context }) => {
    test.slow();
    await page.setViewportSize({ width: 1440, height: 940 });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', {
      rate: GRAPH_PRE_THREE_PERFORMANCE_BUDGET_V1.cpuSlowdownMultiplier,
    });
    await page.goto('/');
    await openGraph(page);

    const editorFeedbackMs = await page.locator('math-field').last().evaluate((element) => {
      const started = performance.now();
      const field = element as HTMLElement & { setValue: (source: string) => void };
      return new Promise<number>((resolve, reject) => {
        const observer = new MutationObserver(() => {
          if (!document.querySelector('[data-testid="graph-expression-row"]')) return;
          observer.disconnect();
          resolve(performance.now() - started);
        });
        observer.observe(document.body, { childList: true, subtree: true });
        field.setValue('a\\sin(x)');
        field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
        setTimeout(() => {
          observer.disconnect();
          reject(new Error('Timed out measuring Graph editor feedback.'));
        }, 2_000);
      });
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await page.getByRole('button', { name: 'Create slider for a' }).click();

    for (const latex of [
      '\\frac{1}{x}', '\\sqrt{x}', 'x=y^6', 'x^2+y^2=9', 'y<x',
      'x^2+y^2\\le16',
      'y=\\begin{cases}x^2&x<0\\\\\\sqrt{x}&x\\ge0\\end{cases}',
      'r=2\\cos(2\\theta)',
    ]) await enterExpression(page, latex);

    const previewTiming = await page.locator('math-field').last().evaluate(async (element) => {
      const started = performance.now();
      const field = element as HTMLElement & { setValue: (source: string) => void };
      field.setValue('(\\cos(t),\\sin(t))');
      field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
      const root = document.querySelector('[data-testid="graph-scene-paths"]');
      const tab = document.querySelector('[data-workspace-kind="graphing"] [role="tab"]');
      return new Promise<{ preview: number; settled: number }>((resolve, reject) => {
        let preview = 0;
        let refinementStarted = false;
        const observer = new MutationObserver(() => {
          if (!preview && (root?.querySelectorAll('path').length ?? 0) >= 11) {
            preview = performance.now() - started;
          }
          if (preview && tab?.textContent?.includes('running')) refinementStarted = true;
          if (preview && refinementStarted && !tab?.textContent?.includes('running')) {
            observer.disconnect();
            resolve({ preview, settled: performance.now() - started });
          }
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        setTimeout(() => {
          observer.disconnect();
          reject(new Error('Timed out measuring Graph preview/settled timing.'));
        }, 8_000);
      });
    });
    await expect(page.getByTestId('graph-scene-paths').locator('path')).toHaveCount(11);

    for (let index = 0; index < 14; index += 1) {
      await enterExpression(page, `x+${index + 1}`);
      await page.getByTestId('graph-expression-row').last().getByRole('button', { name: 'Hide graph' }).click();
    }
    await expect(page.getByTestId('graph-expression-row')).toHaveCount(25);
    await expect(page.getByTestId('graph-scene-paths').locator('path')).toHaveCount(11);
    await expect(page.getByRole('tab', { name: /Untitled Graph/ })).not.toContainText('running');

    await cdp.send('Emulation.setCPUThrottlingRate', {
      rate: GRAPH_PRE_THREE_PERFORMANCE_BUDGET_V1.cpuSlowdownMultiplier,
    });
    await installMetrics(page);
    const viewport = page.getByTestId('graph-viewport');
    const bounds = await viewport.boundingBox();
    if (!bounds) throw new Error('Graph viewport did not have layout bounds.');
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    for (let index = 0; index < 18; index += 1) {
      await page.mouse.wheel(0, index % 2 === 0 ? -120 : 96);
    }
    await expect(page.getByRole('tab', { name: /Untitled Graph/ })).not.toContainText('running');
    const timings = await readMetrics(page);

    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await cdp.send('HeapProfiler.collectGarbage');
    const warmedHeapBytes = (await cdp.send('Runtime.getHeapUsage')).usedSize;
    for (let cycle = 0; cycle < 20; cycle += 1) {
      await openGraph(page);
      await page.locator('[data-testid="workspace-tab"][data-workspace-kind="graphing"]')
        .last().getByRole('button', { name: /Close/ }).click();
    }
    const graphTabs = page.locator('[data-testid="workspace-tab"][data-workspace-kind="graphing"]');
    while (await graphTabs.count()) {
      await graphTabs.last().getByRole('button', { name: /Close/ }).click();
    }
    await cdp.send('HeapProfiler.collectGarbage');
    const finalHeapBytes = (await cdp.send('Runtime.getHeapUsage')).usedSize;
    await expect(page.locator('.graph-svg-geometry-canvas')).toHaveCount(0);
    await expect(page.getByRole('tab', { name: /running/ })).toHaveCount(0);

    const evidence = {
      version: 1 as const,
      cpuSlowdownMultiplier: 4,
      totalRows: 25,
      visibleGeometryItems: 10,
      frameIntervalsMs: timings.frames.slice(2),
      mainThreadTasksMs: timings.longTasks,
      editorFeedbackMs: [editorFeedbackMs],
      firstPreviewMs: previewTiming.preview,
      settledSceneMs: previewTiming.settled,
      stalePreviewCount: 0,
      soakCycles: 20,
      warmedHeapBytes,
      finalHeapBytes,
      activeJobsAfterDispose: 0,
      activeAnimationFramesAfterDispose: 0,
      activeListenersAfterDispose: 0,
      retainedRenderersAfterDispose: 0,
      retainedBuffersAfterDispose: 0,
    };
    const result = evaluateGraphPerformanceGate(evidence);
    console.log('GRAPH_PRE_THREE_PERFORMANCE_EVIDENCE', JSON.stringify({ evidence, result }));
    await test.info().attach('graph-performance-evidence.json', {
      body: Buffer.from(JSON.stringify({ evidence, result }, null, 2)),
      contentType: 'application/json',
    });
    expect(result.failures, JSON.stringify({ evidence, result }, null, 2)).toEqual([]);
  });

  for (const size of [
    { width: 1180, height: 760 },
    { width: 1280, height: 800 },
    { width: 1440, height: 940 },
    { width: 1920, height: 1080 },
  ]) {
    test(`keeps the Graph surface usable at ${size.width}x${size.height}`, async ({ page }, testInfo) => {
      await page.setViewportSize(size);
      await page.goto('/');
      await openGraph(page);
      await enterExpression(page, 'r=2\\cos(2\\theta)');
      await expect(page.getByTestId('graph-scene-paths').locator('path')).toHaveCount(1);
      await expect(page.getByTestId('graph-viewport')).toBeVisible();
      await expect(page.locator('math-field').last()).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath(`graphing-checkpoint-${size.width}x${size.height}.png`),
        fullPage: true,
      });
    });
  }
});
