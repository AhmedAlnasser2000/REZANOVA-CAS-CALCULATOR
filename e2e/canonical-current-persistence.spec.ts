import {mkdir} from 'node:fs/promises';
import {expect, test} from '@playwright/test';
import {DEFAULT_SETTINGS} from '../src/types/calculator';
import {DEFAULT_INTEGRATION_LIMITS} from '../src/lib/calculus/new-integration/types';
import {DEFAULT_EQUATION_LIMITS} from '../src/lib/new-equation/types';
import {getMathFieldLatex, openLauncherApp} from './helpers';

test('focused migration cleans incompatible results and preserves independent workspace drafts', async ({page}) => {
  const directory = '.task_tmp/canonical-result-consolidation/persistence-browser';
  await mkdir(directory, {recursive: true});
  await page.addInitScript(({settings, integrationLimits, equationLimits}) => {
    if (sessionStorage.getItem('current-persistence-seeded')) return;
    localStorage.clear();
    sessionStorage.setItem('current-persistence-seeded', 'yes');
    const legacy = {id: 'deferred-result', mode: 'calculate', inputLatex: '2', timestamp: '2026-10-06T00:00:00Z',
      resultDocument: {version: 2, outcomeKind: 'success', title: 'Deferred result', primary: {kind: 'math', value: {canonicalLatex: '2', mathJson: 2}}, warnings: []}};
    const current = {...legacy, id: 'current-result', resultDocument: {...legacy.resultDocument, version: 7}};
    const invalid = {...legacy, id: 'incompatible-result', resultDocument: {version: 7}};
    const savedSettings = {...settings, calculatorMemoryEnabled: true};
    localStorage.setItem('rezanova-classwiz-calculator:app-state:v1', JSON.stringify({version: 1, currentMode: 'calculate',
      settings: savedSettings, history: [legacy, current], variableMemory: [], calculatorMemory: {
        version: 1, savedAt: '2026-10-06T00:00:00Z', settings: savedSettings, history: [legacy, current, invalid],
        variableMemory: [], ansLatex: '99', displayOutcome: {kind: 'success', canonicalResult: invalid.resultDocument}, session: {},
      }}));
    localStorage.setItem('rezanova.new-integration.drafts.v1', JSON.stringify([{title: 'Preserved integral', formulaView: 'full',
      draft: {source: '\\int \\frac{1}{x^2+1}\\,dx', limits: integrationLimits}}]));
    localStorage.setItem('rezanova.new-equation.drafts.v1', JSON.stringify([{title: 'Preserved equation',
      draft: {rows: ['x^2=2'], targets: null, domain: 'real', style: 'exact', limits: equationLimits}}]));
    localStorage.setItem('unrelated-document', 'untouched');
  }, {settings: DEFAULT_SETTINGS, integrationLimits: DEFAULT_INTEGRATION_LIMITS, equationLimits: DEFAULT_EQUATION_LIMITS});
  await page.goto('/');
  await expect(page.getByTestId('display-status')).toHaveText('1 incompatible History record was removed.');
  await page.screenshot({path: `${directory}/cleanup-notice.png`, fullPage: true});
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('rezanova-classwiz-calculator:app-state:v1') ?? '{}'));
  expect(stored.calculatorMemory.ansLatex).toBe('0');
  expect(stored.calculatorMemory.history.map((row: {id: string}) => row.id)).toEqual(['deferred-result', 'current-result']);
  expect(stored.history.map((row: {id: string}) => row.id)).toEqual(['deferred-result', 'current-result']);
  await openLauncherApp(page, 'Calculus', 'New Integration');
  const integral = page.getByTestId('new-integration-page');
  expect(await getMathFieldLatex(page, 'new-integration-editor')).toContain('x^2');
  await expect(integral.getByTestId('integration-result')).toHaveCount(0);
  await integral.getByRole('button', {name: 'Integrate', exact: true}).click();
  await expect(integral.getByRole('heading', {name: 'Verified antiderivative'})).toBeVisible();
  await expect(integral.getByRole('button', {name: 'Show compact formula'})).toBeVisible();
  await integral.getByText('Conditions', {exact: true}).click();
  await page.screenshot({path: `${directory}/restored-integral.png`, fullPage: true});
  await openLauncherApp(page, 'Core', 'New Equation');
  expect(await getMathFieldLatex(page, 'new-equation-row-1')).toContain('x^2');
  await expect(page.getByTestId('new-equation-answer')).toHaveCount(0);
  await page.getByTestId('new-equation-page').getByRole('button', {name: 'Solve', exact: true}).click();
  await expect(page.getByTestId('new-equation-answer')).toBeVisible();
  await page.screenshot({path: `${directory}/restored-equation.png`, fullPage: true});
  expect(await page.evaluate(() => localStorage.getItem('unrelated-document'))).toBe('untouched');
  await page.reload();
  await expect(page.getByTestId('display-status')).not.toContainText('incompatible History');
});
