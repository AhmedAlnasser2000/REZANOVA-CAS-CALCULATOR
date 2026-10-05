import { test, expect, type Page } from '@playwright/test';
import { openLauncherApp, setMathFieldLatex, getMathFieldLatex } from './helpers';
import { installClipboardCapture } from './calculus-integral-evidence';

// EQUATION-ADOPTION1: the New Equation workspace on the real app (worker, presentation, drafts), with screenshots.
const open = async (page: Page) => {
  await page.goto('/');
  await openLauncherApp(page, 'Core', 'New Equation');
  const workspace = page.getByTestId('new-equation-page');
  await expect(workspace).toBeVisible();
  return workspace;
};
const row = (page: Page, i: number, latex: string) => setMathFieldLatex(page, latex, `new-equation-row-${i}`);
const answer = (page: Page) => page.getByTestId('new-equation-answer');
async function solve(page: Page) {
  await page.getByTestId('new-equation-page').getByRole('button', { name: 'Solve', exact: true }).click();
  await expect(answer(page)).toHaveAttribute('data-outdated', 'false', { timeout: 60000 });
  await expect(page.getByText('Solving and verifying…')).toBeHidden({ timeout: 60000 });
}

test('New Equation: answers, systems, assumptions, families, roots and styles', async ({ page }, testInfo) => {
  await installClipboardCapture(page);
  const workspace = await open(page);
  await expect(workspace.getByText('Enter to solve · Shift+Enter for a new row')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('empty.png'), fullPage: true });

  await row(page, 1, 'x^2-5x+6=0');
  await solve(page);
  await expect(answer(page)).toContainText('Answer');
  await workspace.getByText('Verified exactly').click();
  await expect(workspace.getByText(/substituted back into the original rows exactly/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('quadratic.png'), fullPage: true });
  await workspace.getByRole('button', { name: 'Copy text', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__calcwizClipboardText)).toBe('x = 2\nx = 3');

  // A system with an excluded point; the earlier answer stays, greyed, until solved again.
  await row(page, 1, 'x^2+y^2=5');
  await row(page, 2, 'xy=2');
  await workspace.getByRole('button', { name: '+ Add row' }).click();
  await row(page, 3, 'x\\ne-1');
  await expect(answer(page)).toHaveAttribute('data-outdated', 'true');
  await expect(workspace.getByText('Answer is for the previous problem —')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('outdated.png'), fullPage: true });
  await expect(workspace.getByRole('group', { name: 'Solve for' })).toContainText('y');
  await solve(page);
  await workspace.getByRole('button', { name: 'Copy text', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__calcwizClipboardText)).toBe('(x, y) = (-2, -1)\n(x, y) = (1, 2)\n(x, y) = (2, 1)');
  await page.screenshot({ path: testInfo.outputPath('system.png'), fullPage: true });

  // Assumptions: with a > 0 only x = ±√a; without it, every case.
  await workspace.getByRole('button', { name: 'Remove row 3' }).click();
  await row(page, 1, 'x^2=a');
  await row(page, 2, 'a>0');
  await expect(workspace.getByText('Assumption: cases where it fails are left out of the answer.')).toBeVisible();
  await solve(page);
  await workspace.getByRole('button', { name: 'Copy text', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__calcwizClipboardText)).toBe('Assuming a > 0\nx = √a\nx = -√a');
  await page.screenshot({ path: testInfo.outputPath('assumption.png'), fullPage: true });
  await row(page, 2, '');
  await solve(page);
  await expect(answer(page)).toContainText('If');
  await page.screenshot({ path: testInfo.outputPath('cases.png'), fullPage: true });

  // Families, and a root without a closed form in each style.
  await row(page, 1, '\\sin x=\\frac{1}{2}');
  await solve(page);
  await page.screenshot({ path: testInfo.outputPath('family.png'), fullPage: true });
  await row(page, 1, 'x^5-x-1=0');
  await solve(page);
  for (const style of ['Exact', 'Decimal', 'Both']) {
    await workspace.getByRole('button', { name: style, exact: true }).click();
    await page.screenshot({ path: testInfo.outputPath(`root-${style.toLowerCase()}.png`), fullPage: true });
  }
  await workspace.getByRole('button', { name: 'Decimal', exact: true }).click();
  await workspace.getByRole('button', { name: 'Copy text', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__calcwizClipboardText)).toBe('x ≈ 1.167304\n  the real root of x^5 - x - 1 = 0');

  // Domain conditions the engine applies.
  await row(page, 1, '\\ln(x-1)+\\sqrt{x}=\\sqrt{2}');
  await solve(page);
  await workspace.getByText('Conditions used').click();
  await page.screenshot({ path: testInfo.outputPath('conditions.png'), fullPage: true });
});

test('New Equation: plain non-answers, ℂ refusals, keys, Stop, tabs, drafts and narrow screens', async ({ page }, testInfo) => {
  const workspace = await open(page);
  await row(page, 1, '\\cos x=x');
  await solve(page);
  await expect(answer(page)).toContainText('Not solved yet:');
  await expect(workspace.getByTestId('new-equation-verified')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('unsolved.png'), fullPage: true });

  // Inequalities over ℂ are refused before solving, with Switch to Real.
  await row(page, 1, 'x^2-4\\le0');
  await workspace.getByRole('button', { name: 'Complex', exact: true }).click();
  await expect(workspace.getByRole('button', { name: 'Solve', exact: true })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath('complex-inequality.png'), fullPage: true });
  await workspace.getByRole('button', { name: 'Switch to Real' }).click();
  await solve(page);
  await page.screenshot({ path: testInfo.outputPath('inequality.png'), fullPage: true });

  // Shift+Enter adds a row below and focuses it; Enter solves.
  await page.getByTestId('new-equation-row-1').focus();
  await page.keyboard.press('Shift+Enter');
  await expect(workspace.locator('.ne-row')).toHaveCount(3);
  await expect(page.getByTestId('new-equation-row-2')).toBeFocused();
  await row(page, 1, 'x^3=8');
  await page.getByTestId('new-equation-row-1').focus();
  await page.keyboard.press('Enter');
  await expect(answer(page)).toHaveAttribute('data-outdated', 'false', { timeout: 60000 });

  // Stop ends a long run at once.
  await row(page, 1, 'x^{40}-x-1=0');
  await workspace.getByRole('button', { name: 'Complex', exact: true }).click();
  await workspace.getByRole('button', { name: 'Solve', exact: true }).click();
  await expect(workspace.getByRole('button', { name: 'Stop', exact: true })).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath('running.png'), fullPage: true });
  await workspace.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(workspace.getByRole('button', { name: 'Stop', exact: true })).toBeDisabled();
  await expect(workspace.getByText('Stopped.')).toBeVisible();

  // Tabs are independent; drafts come back after a reload, answers do not.
  await workspace.getByRole('button', { name: 'New tab', exact: true }).click();
  const tabs = page.locator('[data-testid="workspace-tab"][data-workspace-kind="new-equation"]');
  await expect(tabs).toHaveCount(2);
  expect(await getMathFieldLatex(page, 'new-equation-row-1')).toBe('');
  await row(page, 1, 'x+1=2');
  await page.reload();
  await openLauncherApp(page, 'Core', 'New Equation');
  await expect(tabs).toHaveCount(2);
  await expect(answer(page)).toHaveCount(0);
  expect(await getMathFieldLatex(page, 'new-equation-row-1')).toContain('x');

  // Narrow screens: nothing inside the workspace overflows it (the shell's tab strip is not this page's).
  await page.setViewportSize({ width: 390, height: 860 });
  await row(page, 1, 'x^2+y^2=5');
  await row(page, 2, 'xy=2');
  await solve(page);
  await page.screenshot({ path: testInfo.outputPath('narrow.png'), fullPage: true });
  const overflow = await workspace.evaluate(el => {
    const box = el.getBoundingClientRect();
    return [...el.querySelectorAll('*')].filter(c => c.getBoundingClientRect().right > box.right + 1 && !c.closest('.ne-rows-out, .ne-math')).length + Math.max(0, el.scrollWidth - el.clientWidth);
  });
  expect(overflow).toBe(0);
});
