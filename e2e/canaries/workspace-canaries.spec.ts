import { expect, test, type Page } from '@playwright/test';
import {
  closeSidePanelIfOpen,
  openEquationSymbolic,
  openLauncherApp,
  openSettingsPanel,
  openTable,
  setMathFieldLatex,
} from '../helpers';
import {
  WORKSPACE_CANARIES,
  type CanaryCase,
  type CanaryExpectation,
  type CanarySettings,
} from './canary-registry';

async function clickVisibleMenuEntry(page: Page, label: string) {
  await page.locator('button.launcher-entry:visible')
    .filter({ has: page.locator('strong', { hasText: new RegExp(`^${label}$`, 'i') }) })
    .click();
}

async function applySettings(page: Page, settings: CanarySettings) {
  await openSettingsPanel(page);
  await page.getByTestId(`settings-angle-unit-${settings.angleUnit}`).click();
  await page.getByTestId(`settings-output-style-${settings.outputStyle}`).click();
  await closeSidePanelIfOpen(page);
}

async function fillNamedNumberInput(page: Page, label: string, value: number) {
  const input = page.getByRole('textbox', { name: label });
  await input.fill(String(value));
  await input.blur();
}

async function runCanary(page: Page, canary: CanaryCase) {
  const { driver } = canary;
  if (driver.kind === 'calculate') {
    await setMathFieldLatex(page, driver.inputLatex);
    await page.getByTestId('keypad-execute').click();
    return;
  }
  if (driver.kind === 'equation') {
    await openEquationSymbolic(page);
    await setMathFieldLatex(page, driver.inputLatex);
    await page.getByTestId('soft-action-solve').click();
    return;
  }
  if (driver.kind === 'calculus') {
    await openLauncherApp(page, 'Calculus', 'Calculus');
    const path = driver.tool === 'Derivative'
      ? ['Derivatives', 'Derivative']
      : ['Integrals', 'Indefinite'];
    for (const label of path) await clickVisibleMenuEntry(page, label);
    await setMathFieldLatex(page, driver.inputLatex);
    await page.getByTestId('soft-action-evaluate').click();
    return;
  }
  if (driver.kind === 'trigonometry') {
    await openLauncherApp(page, 'Shape Math', 'Trigonometry');
    for (const label of driver.path) await clickVisibleMenuEntry(page, label);
    await setMathFieldLatex(page, driver.inputLatex);
    await page.getByTestId('soft-action-evaluate').click();
    return;
  }
  if (driver.kind === 'geometry') {
    await openLauncherApp(page, 'Shape Math', 'Geometry');
    for (const label of driver.path) await clickVisibleMenuEntry(page, label);
    await setMathFieldLatex(page, driver.inputLatex);
    await page.getByTestId('soft-action-evaluate').click();
    return;
  }
  if (driver.kind === 'statistics') {
    await openLauncherApp(page, 'Data', 'Statistics');
    await page.getByRole('tab', { name: 'Data & Summary' }).click();
    await page.getByRole('radio', { name: 'Expression' }).click();
    const tool = driver.path.at(-1);
    const toolSelect = page.getByRole('combobox', { name: 'Statistics tool' });
    if (tool && await toolSelect.count() > 0) {
      await toolSelect.selectOption({ label: tool });
    }
    await setMathFieldLatex(page, driver.inputLatex);
    await page.getByTestId('soft-action-evaluate').click();
    return;
  }
  if (driver.kind === 'matrix' || driver.kind === 'vector') {
    await openLauncherApp(page, 'Linear', driver.kind === 'matrix' ? 'Matrix' : 'Vector');
    await setMathFieldLatex(page, driver.inputLatex);
    await page.getByTestId('editor-runtime-run').click();
    return;
  }
  if (driver.kind !== 'table') {
    throw new Error(`Unsupported canary driver: ${driver.kind}`);
  }

  await openTable(page);
  await setMathFieldLatex(page, driver.inputLatex, 'table-primary-editor');
  await fillNamedNumberInput(page, 'Start', driver.range.start);
  await fillNamedNumberInput(page, 'End', driver.range.end);
  await fillNamedNumberInput(page, 'Step', driver.range.step);
  await page.getByTestId('soft-action-build').click();
}

async function answerRawLatex(page: Page) {
  return page.getByTestId('display-outcome-answer-block').locator('[data-raw-latex]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-raw-latex') ?? '').join('\n'));
}

async function assertExpectation(page: Page, expectation: CanaryExpectation) {
  await expect(page.getByTestId('display-outcome-error')).toHaveCount(0);
  if (expectation.surface === 'table') {
    await expect(page.getByTestId('table-preview')).toBeVisible();
    for (const row of expectation.rows) {
      for (const text of row.textIncludes) {
        await expect(page.getByTestId(`table-row-${row.index}`)).toContainText(text);
      }
    }
    return;
  }

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  for (const latex of expectation.rawLatexIncludes) {
    await expect.poll(() => answerRawLatex(page)).toContain(latex);
  }
  for (const text of expectation.visibleTextIncludes ?? []) {
    await expect(page.getByTestId('display-outcome-root')).toContainText(text);
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.goto('/');
  await expect(page.getByTestId('main-editor')).toBeVisible();
});

for (const workspace of WORKSPACE_CANARIES) {
  test.describe(workspace.label, () => {
    for (const canary of workspace.cases) {
      test(canary.id, async ({ page }) => {
        await applySettings(page, canary.settings);
        await runCanary(page, canary);
        await assertExpectation(page, canary.expectation);
      });
    }
  });
}
