import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function setMathFieldLatex(page: Page, latex: string, testId = 'main-editor') {
  const editor = page.getByTestId(testId);
  await editor.waitFor();
  await editor.evaluate((element, nextLatex) => {
    const field = element as HTMLElement & { setValue: (value: string) => void };
    field.focus();
    field.dispatchEvent(new Event('focus', { bubbles: false, composed: true }));
    field.setValue(nextLatex as string);
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }, latex);
}

export async function setVisibleSecondaryMathFieldLatex(page: Page, latex: string, index = 0) {
  const editor = page.locator('math-field.secondary-mathfield:visible').nth(index);
  await editor.waitFor();
  await editor.evaluate((element, nextLatex) => {
    const field = element as HTMLElement & { setValue: (value: string) => void };
    field.focus();
    field.dispatchEvent(new Event('focus', { bubbles: false, composed: true }));
    field.setValue(nextLatex as string);
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }, latex);
}

export async function getVisibleSecondaryMathFieldLatex(page: Page, index = 0) {
  const editor = page.locator('math-field.secondary-mathfield:visible').nth(index);
  await editor.waitFor();
  return editor.evaluate((element) => {
    const field = element as HTMLElement & { getValue?: (format?: string) => string };
    return typeof field.getValue === 'function' ? field.getValue('latex') : '';
  });
}

export async function getMathFieldLatex(page: Page, testId = 'main-editor') {
  const editor = page.getByTestId(testId);
  await editor.waitFor();
  return editor.evaluate((element) => {
    const field = element as HTMLElement & { getValue?: (format?: string) => string };
    return typeof field.getValue === 'function' ? field.getValue('latex') : '';
  });
}

export async function closeSidePanelIfOpen(page: Page) {
  const backdrop = page.getByTestId('side-surface-overlay-backdrop');
  if (await backdrop.isVisible()) {
    if (!await backdrop.isEnabled()) {
      await expect(backdrop).toBeHidden();
      return;
    }
    await backdrop.click();
    await expect(backdrop).toBeHidden();
  }
}

export async function openLauncherApp(page: Page, categoryLabel: string, appLabel: string) {
  await closeSidePanelIfOpen(page);
  await page.getByTestId('keypad-menu').click();
  await clickVisibleLauncherEntryByTitle(page, categoryLabel);
  await clickVisibleLauncherEntryByTitle(page, appLabel);
}

function exactText(label: string) {
  return new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}

async function clickVisibleLauncherEntryByTitle(page: Page, label: string) {
  await page.locator('button.launcher-entry:visible')
    .filter({ has: page.locator('strong', { hasText: exactText(label) }) })
    .click();
}

const calculusToolPaths: Record<string, string[]> = {
  Derivative: ['Derivatives', 'Derivative'],
  Integral: ['Integrals', 'Indefinite'],
  Limit: ['Limits', 'Limit'],
};

const calculusMainEditorTools = new Set([
  'Derivative',
  'Derivative at Point',
  'Implicit Derivative',
  'Partial Derivative',
  'Indefinite',
  'Definite',
  'Improper',
  'Limit',
  'Laplace Transform',
]);

function expandCalculusToolPath(labels: readonly string[]) {
  return labels.flatMap((label) => calculusToolPaths[label] ?? [label]);
}

export async function openCalculusTool(page: Page, toolLabel: string) {
  await openLauncherApp(page, 'Calculus', 'Calculus');
  const path = expandCalculusToolPath([toolLabel]);
  for (const label of path) {
    await clickVisibleLauncherEntryByTitle(page, label);
  }
  const finalTool = path.at(-1) ?? '';
  await expect(calculusMainEditorTools.has(finalTool)
    ? page.getByTestId('main-editor')
    : page.locator('math-field.secondary-mathfield:visible').first()).toBeVisible();
}

export async function openAdvancedCalcTool(page: Page, ...toolLabels: string[]) {
  await openLauncherApp(page, 'Calculus', 'Calculus');
  const path = expandCalculusToolPath(toolLabels);
  for (const toolLabel of path) {
    if (toolLabel === 'ODE') {
      await clickVisibleLauncherEntryByTitle(page, 'Differential Equations');
      continue;
    }
    await clickVisibleLauncherEntryByTitle(page, toolLabel);
  }
  const finalTool = path.at(-1) ?? '';
  await expect(calculusMainEditorTools.has(finalTool)
    ? page.getByTestId('main-editor')
    : page.locator('math-field.secondary-mathfield:visible').first()).toBeVisible();
}

export async function openEquationSymbolic(page: Page) {
  await openLauncherApp(page, 'Core', 'Equation');
  await page.getByRole('button', { name: /symbolic/i }).click();
  await expect(page.getByTestId('main-editor')).toBeVisible();
}

export async function openEquationNumericIntervalPanel(page: Page, inputLatex: string) {
  await openEquationSymbolic(page);
  await setMathFieldLatex(page, '\\left|x+1\\right|=e^x');
  await page.getByTestId('soft-action-solve').click();
  await expect(page.getByTestId('display-outcome-error')).toContainText(
    'absolute-value family is outside the current exact bounded solve set',
  );
  await page.getByRole('button', { name: 'Enable Numeric Interval', exact: true }).click();
  await expect(page.getByText('Numeric Interval Solve')).toBeVisible();
  await setMathFieldLatex(page, inputLatex);
  await page.getByTestId('main-editor').evaluate((element) => {
    (element as HTMLElement).blur();
  });
}

export async function fillNumericIntervalInput(page: Page, label: 'Start' | 'End' | 'Subdivisions', value: string) {
  const control = label === 'Subdivisions'
    ? page.getByRole('spinbutton', { name: label })
    : page.getByRole('textbox', { name: label });
  await control.evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (valueSetter) {
      valueSetter.call(input, nextValue);
    } else {
      input.value = nextValue as string;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
  }, value);
}

export async function openTable(page: Page) {
  await openLauncherApp(page, 'Core', 'Table');
  await expect(page.getByTestId('table-primary-editor')).toBeVisible();
}

export async function openTrigEquationSolve(page: Page) {
  await openLauncherApp(page, 'Shape Math', 'Trigonometry');
  await page.getByRole('button', { name: /equations/i }).click();
  await page.getByRole('button', { name: /solve trig equation/i }).click();
  await expect(page.getByTestId('main-editor')).toBeVisible();
}

export async function openGeometrySlope(page: Page) {
  await openLauncherApp(page, 'Shape Math', 'Geometry');
  await page.getByTestId('keypad-5').click();
  await page.getByTestId('keypad-3').click();
  await expect(page.getByTestId('main-editor')).toBeVisible();
}

export async function openStatisticsRegression(page: Page) {
  await openLauncherApp(page, 'Data', 'Statistics');
  await page.getByRole('tab', { name: 'Relationships' }).click();
  await page.getByRole('combobox', { name: 'Statistics tool' })
    .selectOption({ label: 'Regression' });
  await expect(page.getByTestId('main-editor')).toBeVisible();
}

export async function openSettingsPanel(page: Page) {
  await page.getByTestId('settings-toggle').click();
  await expect(page.getByTestId('settings-panel')).toBeVisible();
}
