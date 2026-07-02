import { expect, type Locator, type Page } from '@playwright/test';
import {
  getMathFieldLatex,
  openLauncherApp,
  setMathFieldLatex,
} from './helpers';

declare global {
  interface Window {
    __calcwizClipboardText?: string;
  }
}

function exactText(label: string) {
  return new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}

async function clickVisibleLauncherEntry(page: Page, label: string) {
  await page.locator('button.launcher-entry:visible')
    .filter({ has: page.locator('strong', { hasText: exactText(label) }) })
    .click();
}

export async function installClipboardCapture(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        readText: async () => window.__calcwizClipboardText ?? '',
        writeText: async (text: string) => {
          window.__calcwizClipboardText = String(text);
        },
      },
    });
  });
}

export async function openIndefiniteIntegral(page: Page) {
  await openLauncherApp(page, 'Calculus', 'Calculus');
  await clickVisibleLauncherEntry(page, 'Integrals');
  await clickVisibleLauncherEntry(page, 'Indefinite');
  await expect(page.getByText('Indefinite Integral').first()).toBeVisible();
  await expect(page.getByTestId('main-editor')).toBeVisible();
}

export async function runIndefiniteIntegral(page: Page, latex: string) {
  await setMathFieldLatex(page, latex);
  await page.getByTestId('keypad-execute').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
}

async function rawLatexIn(locator: Locator) {
  return locator.locator('[data-raw-latex]').evaluateAll((nodes) =>
    nodes
      .map((node) => node.getAttribute('data-raw-latex') ?? '')
      .join('\n')
      .replace(/\\,/g, '')
      .replace(/\s+/g, ''),
  );
}

export async function expectAnswerLatex(page: Page, ...snippets: string[]) {
  const exact = page.getByTestId('display-outcome-exact');
  await expect(exact).toBeVisible();
  for (const snippet of snippets) {
    await expect.poll(() => rawLatexIn(exact)).toContain(snippet);
  }
}

export async function expectValidWhenLatex(page: Page, ...snippets: string[]) {
  const block = page.getByTestId('display-outcome-valid-when');
  await expect(block).toBeVisible();
  const isCollapsed = await block.evaluate((element) =>
    element instanceof HTMLDetailsElement ? !element.open : false,
  );
  if (isCollapsed) {
    await block.locator('summary').click();
  }
  const validWhen = page.locator('[data-testid^="display-outcome-supplement"]');
  await expect(validWhen.first()).toBeVisible();
  for (const snippet of snippets) {
    await expect.poll(() => rawLatexIn(validWhen)).toContain(snippet);
  }
}

export async function openDetailCard(page: Page, title: string) {
  const collapsible = page.locator('details.result-summary-block', { hasText: title }).first();
  if (await collapsible.count()) {
    await expect(collapsible).toBeVisible();
    const isOpen = await collapsible.evaluate((element) => (element as HTMLDetailsElement).open);
    if (!isOpen) {
      await collapsible.locator('summary').click();
    }
    await expect(collapsible.locator('.result-collapsible-body')).toBeVisible();
    return collapsible;
  }

  const staticBlock = page.locator('.result-summary-block', { hasText: title }).first();
  await expect(staticBlock).toBeVisible();
  return staticBlock;
}

export async function copyResult(page: Page) {
  await page.getByTestId('display-outcome-action-copy-result').click();
  return page.evaluate(() => window.__calcwizClipboardText ?? '');
}

export async function replayLatestHistoryEntry(page: Page) {
  await page.getByTestId('history-toggle').click();
  await expect(page.getByTestId('history-panel')).toBeVisible();
  await page.getByTestId('history-entry-replay').first().click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  return getMathFieldLatex(page);
}

export async function expectAnswerOverflowReady(page: Page) {
  const answer = page.getByTestId('display-outcome-answer-block');
  await expect(answer).toBeVisible();
  const metrics = await answer.evaluate((element) => {
    const block = element as HTMLElement;
    const exact = block.querySelector('[data-testid="display-outcome-exact"]') as HTMLElement | null;
    const target = exact ?? block;
    const style = window.getComputedStyle(target);
    return {
      clientWidth: target.clientWidth,
      overflowX: style.overflowX,
      scrollWidth: target.scrollWidth,
    };
  });
  expect(metrics.scrollWidth).toBeGreaterThan(0);
  if (metrics.scrollWidth > metrics.clientWidth) {
    expect(['auto', 'scroll', 'visible']).toContain(metrics.overflowX);
  }
}
