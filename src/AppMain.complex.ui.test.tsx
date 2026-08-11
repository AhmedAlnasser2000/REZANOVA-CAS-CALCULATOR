import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  openEquationSymbolic,
  renderAppMain,
  setMathFieldLatex,
} from './test/renderAppMain';

async function waitForDisplayQueueToSettle() {
  await waitFor(() => {
    expect(screen.getByTestId('display-status')).not.toHaveTextContent('Rendering result');
  });
}

async function waitForDisplayOutcomeSuccess() {
  await waitFor(
    () => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument(),
    { timeout: 5_000 },
  );
  await waitForDisplayQueueToSettle();
}

function expectExactResultRawLatex(pattern: RegExp) {
  const exact = screen.getByTestId('display-outcome-exact');
  const rawLatexValues = Array.from(exact.querySelectorAll('[data-raw-latex]'))
    .map((element) => element.getAttribute('data-raw-latex') ?? '');
  expect(rawLatexValues.some((latex) => pattern.test(latex))).toBe(true);
}

describe('AppMain Complex exact stability', () => {
  it('replays Complex Exact history with the original exact form restored', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-complex-exact-form-cis'));
    await user.click(screen.getByTestId('settings-toggle'));
    await user.click(screen.getByTestId('quick-setting-equation-domain-intent'));
    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', 'x^4+i=0');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectExactResultRawLatex(/\\operatorname\{cis\}/);

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-complex-exact-form-rectangular'));
    await user.click(screen.getByTestId('settings-toggle'));
    await user.click(screen.getByTestId('history-toggle'));
    await user.click((await screen.findAllByTestId('history-entry'))[0]);
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectExactResultRawLatex(/\\operatorname\{cis\}/);
  });
});
