import { expect, test, type Page } from '@playwright/test';
import {
  closeSidePanelIfOpen,
  openEquationSymbolic,
  openLauncherApp,
  openSettingsPanel,
  openTable,
  setMathFieldLatex,
} from './helpers';
import {
  WORKSPACE_CANARIES,
  type CanaryCase,
} from './canaries/canary-registry';

const APP_STATE_KEY = 'rezanova-classwiz-calculator:app-state:v1';

async function clickVisibleMenuEntry(page: Page, label: string) {
  await page.locator('button.launcher-entry:visible')
    .filter({ has: page.locator('strong', { hasText: new RegExp(`^${label}$`, 'i') }) })
    .click();
}

async function fillNamedNumberInput(page: Page, label: string, value: number) {
  const input = page.getByRole('textbox', { name: label });
  await input.fill(String(value));
  await input.blur();
}

async function runWorkspaceCase(page: Page, canary: CanaryCase) {
  await openSettingsPanel(page);
  await page.getByTestId(`settings-angle-unit-${canary.settings.angleUnit}`).click();
  await page.getByTestId(`settings-output-style-${canary.settings.outputStyle}`).click();
  await closeSidePanelIfOpen(page);

  const { driver } = canary;
  if (driver.kind === 'calculate') {
    await setMathFieldLatex(page, driver.inputLatex);
    await page.getByTestId('keypad-execute').click();
  } else if (driver.kind === 'equation') {
    await openEquationSymbolic(page);
    await setMathFieldLatex(page, driver.inputLatex);
    await page.getByTestId('soft-action-solve').click();
  } else if (driver.kind === 'calculus') {
    await openLauncherApp(page, 'Calculus', 'Calculus');
    const path = driver.tool === 'Derivative'
      ? ['Derivatives', 'Derivative']
      : ['Integrals', 'Indefinite'];
    for (const label of path) await clickVisibleMenuEntry(page, label);
    await setMathFieldLatex(page, driver.inputLatex);
    await page.getByTestId('soft-action-evaluate').click();
  } else if (driver.kind === 'trigonometry') {
    await openLauncherApp(page, 'Shape Math', 'Trigonometry');
    for (const label of driver.path) await clickVisibleMenuEntry(page, label);
    await setMathFieldLatex(page, driver.inputLatex);
    await page.getByTestId('soft-action-evaluate').click();
  } else if (driver.kind === 'geometry') {
    await openLauncherApp(page, 'Shape Math', 'Geometry');
    for (const label of driver.path) await clickVisibleMenuEntry(page, label);
    await setMathFieldLatex(page, driver.inputLatex);
    await page.getByTestId('soft-action-evaluate').click();
  } else if (driver.kind === 'statistics') {
    await openLauncherApp(page, 'Data', 'Statistics');
    for (const label of driver.path) await clickVisibleMenuEntry(page, label);
    await setMathFieldLatex(page, driver.inputLatex);
    await page.getByTestId('soft-action-evaluate').click();
  } else if (driver.kind === 'matrix' || driver.kind === 'vector') {
    await openLauncherApp(page, 'Linear', driver.kind === 'matrix' ? 'Matrix' : 'Vector');
    await setMathFieldLatex(page, driver.inputLatex);
    await page.getByTestId('editor-runtime-run').click();
  } else {
    if (driver.kind !== 'table') {
      throw new Error(`Unsupported History replay driver: ${driver.kind}`);
    }
    await openTable(page);
    await setMathFieldLatex(page, driver.inputLatex, 'table-primary-editor');
    await fillNamedNumberInput(page, 'Start', driver.range.start);
    await fillNamedNumberInput(page, 'End', driver.range.end);
    await fillNamedNumberInput(page, 'Step', driver.range.step);
    await page.getByTestId('soft-action-build').click();
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
  test(`${workspace.label} creates and replays a versioned History entry`, async ({ page }) => {
    const canary = workspace.cases[0];
    await runWorkspaceCase(page, canary);
    await expect(page.getByTestId('display-outcome-error')).toHaveCount(0);
    if (canary.expectation.surface === 'table') {
      await expect(page.getByTestId('table-preview')).toBeVisible();
    } else {
      await expect(page.getByTestId('display-outcome-success')).toBeVisible();
    }

    const originalDisplayTitle = await page.getByTestId('display-outcome-title').count() > 0
      ? await page.getByTestId('display-outcome-title').textContent()
      : null;
    const originalTableText = canary.expectation.surface === 'table'
      ? await page.getByTestId('table-preview').innerText()
      : null;
    await expect.poll(async () => page.evaluate((storageKey) => {
      const state = JSON.parse(window.localStorage.getItem(storageKey) ?? '{}') as {
        history?: Array<{
          replaySnapshot?: { version?: unknown };
          resultDocument?: { version?: unknown; title?: unknown };
        }>;
      };
      return state.history?.at(-1)?.resultDocument?.version;
    }, APP_STATE_KEY)).toBe(1);
    const persistedResult = await page.evaluate((storageKey) => {
      const state = JSON.parse(window.localStorage.getItem(storageKey) ?? '{}') as {
        history?: Array<{
          replaySnapshot?: { version?: unknown };
          resultDocument?: { version?: unknown; title?: unknown };
        }>;
      };
      const entry = state.history?.at(-1);
      return {
        replayVersion: entry?.replaySnapshot?.version,
        resultDocument: entry?.resultDocument,
      };
    }, APP_STATE_KEY);
    const resultDocument = persistedResult.resultDocument;
    expect(resultDocument).toMatchObject({
      version: 1,
      title: expect.any(String),
    });
    expect(persistedResult.replayVersion).toBe(1);
    expect(JSON.stringify(resultDocument)).not.toContain('"actions"');
    expect(typeof resultDocument?.title).toBe('string');

    await page.getByTestId('history-toggle').click();
    await expect(page.getByTestId('history-panel')).toBeVisible();
    await expect(page.getByTestId('history-entry').first()).toBeVisible();
    await page.getByTestId('history-entry').first().click();

    await expect(page.getByTestId('history-panel')).toHaveCount(0);
    await expect(page.getByTestId('display-outcome-error')).toHaveCount(0);
    if (canary.expectation.surface === 'table') {
      await expect(page.getByTestId('display-outcome-success')).toBeVisible();
      expect(await page.getByTestId('table-preview').innerText()).toBe(originalTableText);
    } else {
      await expect(page.getByTestId('display-outcome-success')).toBeVisible();
    }
    if (originalDisplayTitle === null) {
      await expect(page.getByTestId('display-outcome-title')).toHaveCount(0);
    } else {
      await expect(page.getByTestId('display-outcome-title')).toHaveText(originalDisplayTitle);
    }
    if (process.env.HISTORY_REPLAY_EVIDENCE_DIR) {
      await page.screenshot({
        path: `${process.env.HISTORY_REPLAY_EVIDENCE_DIR}/${workspace.workspace}.png`,
        fullPage: true,
      });
    }
  });
}
