import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  expectMathStaticLatex,
  openEquationSymbolic,
  renderAppMain,
  setMathFieldLatex,
} from './test/renderAppMain';

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  fireEvent(window, new Event('resize'));
}

async function waitForDisplayOutcomeSuccess() {
  await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
  await waitFor(() => {
    expect(screen.getByTestId('display-status')).not.toHaveTextContent('Rendering result');
  });
}

describe('AppMain workspace tabs', () => {
  beforeEach(() => {
    setViewportWidth(2400);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('keeps display outcomes scoped to their workspace tabs', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '56+76');
    await user.click(screen.getByTestId('keypad-execute'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), '132');

    await openEquationSymbolic(user);
    await waitFor(() => expect(screen.queryByTestId('display-outcome-success')).not.toBeInTheDocument());

    setMathFieldLatex('main-editor', 'x+1=3');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'x=2');

    await user.click(screen.getByRole('tab', { name: /Calculate/ }));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), '132');
    expect(screen.queryByTestId('display-outcome-valid-when')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Equation/ }));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'x=2');
  });
});
