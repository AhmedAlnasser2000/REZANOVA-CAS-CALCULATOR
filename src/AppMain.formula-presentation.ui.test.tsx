import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
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

async function waitForDisplayQueueToSettle() {
  await waitFor(() => {
    expect(screen.getByTestId('display-status')).not.toHaveTextContent('Rendering result');
  });
}

async function waitForDisplayOutcomeSuccess() {
  await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
  await waitForDisplayQueueToSettle();
}

describe('AppMain formula presentation responsiveness', () => {
  beforeEach(() => {
    setViewportWidth(2400);
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('keeps editor hints responsive while a heavy formula case answer is compacted', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\ln\\left(x^4+x+1\\right)=b');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByTestId('display-outcome-exact-compact-preview')).toHaveTextContent(
      'Formula cases paused for responsiveness',
    );
    expect(screen.queryByTestId('display-outcome-exact-case-list')).not.toBeInTheDocument();

    setMathFieldLatex('main-editor', 'hello');
    await waitFor(() =>
      expect(screen.getByTestId('variable-hint-strip')).toHaveTextContent('hello'),
    );
  });

  it('compacts heavy direct substituted Cardano cases before mounting formula rows', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', 'x^3+p*x^2*q+x=1');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByTestId('display-outcome-exact-compact-preview')).toHaveTextContent(
      'Formula cases paused for responsiveness',
    );
    expect(screen.queryByTestId('display-outcome-exact-case-list')).not.toBeInTheDocument();
    expect([
      ...screen.getByTestId('display-outcome-exact').querySelectorAll('[data-raw-latex]'),
    ]).toHaveLength(0);
  });

  it('keeps smaller direct formula cases fully visible', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', 'x^3+p*x+2=0');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.queryByTestId('display-outcome-exact-compact-preview')).not.toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact-case-list')).toBeInTheDocument();
  });
});
