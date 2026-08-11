import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect } from 'vitest';
import AppMain from '../AppMain';

export type AppUser = ReturnType<typeof userEvent.setup>;

export async function renderAppMain() {
  const user = userEvent.setup();
  const utils = render(<AppMain />);
  await screen.findByTestId('main-editor');
  await waitFor(() => {
    expect(screen.getByTestId('display-status')).not.toHaveTextContent('Loading');
  });
  return {
    user,
    ...utils,
  };
}

export function setMathFieldLatex(testId: string, latex: string) {
  const field = screen.getByTestId(testId) as HTMLElement & { setValue: (value: string) => void };
  field.focus();
  fireEvent.focus(field);
  field.setValue(latex);
  fireEvent.input(field, { bubbles: true });
}

export function setVisibleSecondaryMathFieldLatex(latex: string, index = 0) {
  const fields = Array.from(
    document.querySelectorAll('math-field.secondary-mathfield'),
  ) as Array<HTMLElement & { setValue: (value: string) => void }>;
  const field = fields[index];
  if (!field) {
    throw new Error(`Missing visible secondary math-field at index ${index}`);
  }
  field.focus();
  fireEvent.focus(field);
  field.setValue(latex);
  fireEvent.input(field, { bubbles: true });
}

export async function openLauncherApp(user: AppUser, categoryLabel: string, appLabel: string) {
  await user.click(screen.getByTestId('keypad-menu'));
  const menuInspector = await screen.findByTestId('left-menu-inspector');
  await user.click(await within(menuInspector).findByRole('button', { name: new RegExp(categoryLabel, 'i') }));
  await user.click(await within(menuInspector).findByRole('button', { name: new RegExp(appLabel, 'i') }));
}

export async function openEquationSymbolic(user: AppUser) {
  await openLauncherApp(user, 'Core', 'Equation');
  const equationMenu = await waitFor(() => {
    const menu = document.querySelector('.equation-menu-list');
    expect(menu).toBeInTheDocument();
    return menu as HTMLElement;
  }, { timeout: 5_000 });
  await user.click(await within(equationMenu).findByRole('button', { name: /symbolic/i }));
  await screen.findByTestId('equation-answer-mode-control', {}, { timeout: 5_000 });
}

export async function openCalculusTool(user: AppUser, ...toolLabels: string[]) {
  await openLauncherApp(user, 'Calculus', 'Calculus');
  for (const toolLabel of toolLabels) {
    const exactLabelCandidate = await waitFor(() => {
      const menu = document.querySelector('.calculus-menu-list');
      expect(menu).toBeInTheDocument();
      const candidates = within(menu as HTMLElement)
        .getAllByRole('button', { name: new RegExp(toolLabel, 'i') });
      const exact = candidates.find((candidate) =>
        candidate.querySelector('strong')?.textContent?.trim().toLowerCase()
          === toolLabel.toLowerCase());
      expect(exact).toBeDefined();
      return exact as HTMLElement;
    }, { timeout: 5_000 });
    await user.click(exactLabelCandidate);
  }
  await screen.findByTestId('soft-action-toEditor', {}, { timeout: 5_000 });
}

export async function openTable(user: AppUser) {
  await openLauncherApp(user, 'Core', 'Table');
  await screen.findByTestId('table-primary-editor');
}

export async function openTrigEquationSolve(user: AppUser) {
  await openLauncherApp(user, 'Shape Math', 'Trigonometry');
  await user.click(await screen.findByRole('button', { name: /equations/i }));
  await user.click(await screen.findByRole('button', { name: /solve trig equation/i }));
  await screen.findByTestId('main-editor');
}

export async function openGeometrySlope(user: AppUser) {
  await openLauncherApp(user, 'Shape Math', 'Geometry');
  await user.click(screen.getByTestId('keypad-5'));
  await user.click(screen.getByTestId('keypad-3'));
  await screen.findByTestId('main-editor');
}

export async function openStatisticsRegression(user: AppUser) {
  await openLauncherApp(user, 'Data', 'Statistics');
  await user.click(await screen.findByRole('tab', { name: 'Relationships' }));
  await user.click(await screen.findByRole('radio', { name: 'Regression' }));
  await user.click(await screen.findByRole('radio', { name: 'Expression' }));
  await screen.findByTestId('main-editor');
}

export function expectMathStaticLatex(container: HTMLElement, latex: string | RegExp) {
  const containerLabel = container.getAttribute('aria-label') ?? '';
  const matchesContainer = typeof latex === 'string'
    ? containerLabel === latex
    : latex.test(containerLabel);
  if (matchesContainer) {
    expect(container).toBeInTheDocument();
    return;
  }

  expect(within(container).getByLabelText(latex)).toBeInTheDocument();
}
