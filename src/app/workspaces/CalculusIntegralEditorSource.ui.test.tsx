import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  openLauncherApp,
  renderAppMain,
  setMathFieldLatex,
} from '../../test/renderAppMain';

async function openCalculusTool(
  user: Awaited<ReturnType<typeof renderAppMain>>['user'],
  ...toolLabels: string[]
) {
  await openLauncherApp(user, 'Calculus', 'Calculus');
  for (const toolLabel of toolLabels) {
    const candidates = await screen.findAllByRole('button', { name: new RegExp(toolLabel, 'i') });
    const exactLabelCandidate = candidates.find((candidate) =>
      candidate.querySelector('strong')?.textContent?.trim().toLowerCase() === toolLabel.toLowerCase(),
    );
    await user.click(exactLabelCandidate ?? candidates[0]);
  }
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

describe('Calculus integral editor source', () => {
  it('edits indefinite integrands through the main editor with a single result answer', async () => {
    const { user } = await renderAppMain();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');

    await openCalculusTool(user, 'Integrals', 'Indefinite');

    expect(screen.getByTestId('soft-action-toEditor')).toHaveTextContent('Focus Editor');
    expect(document.querySelector('math-field.secondary-mathfield')).not.toBeInTheDocument();

    setMathFieldLatex('main-editor', 'x^2');

    await waitFor(() => {
      expect(screen.queryByTestId('display-expression-preview-card')).not.toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Copy Expr' })).toHaveLength(1);
    });
    await waitFor(() => {
      expect(document.querySelector('.generated-preview-card .polynomial-preview-math')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Copy Expr' }));
    expect(writeTextSpy).toHaveBeenLastCalledWith('\\int x^2\\,dx');

    const variableInput = screen.getByLabelText('Variable');
    await user.clear(variableInput);
    await user.type(variableInput, 't');
    setMathFieldLatex('main-editor', 't^2');
    await user.click(screen.getByRole('button', { name: 'Copy Expr' }));
    expect(writeTextSpy).toHaveBeenLastCalledWith('\\int t^2\\,dt');

    await user.click(screen.getByTestId('soft-action-toEditor'));
    expect(screen.getByTestId('display-status')).toHaveTextContent('Calculus editor focused');

    const editor = screen.getByTestId('main-editor');
    expect(fireEvent.keyDown(editor, { key: 'Enter' })).toBe(false);

    await waitForDisplayOutcomeSuccess();
    const answerBlocks = screen.getAllByTestId('display-outcome-answer-block');
    expect(answerBlocks).toHaveLength(1);
    expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', 't^2');

    await user.click(screen.getByRole('button', { name: 'Copy Result' }));
    expect(writeTextSpy).toHaveBeenLastCalledWith('\\frac{t^{3}}{3}');
  });

  it('runs typed symbolic quotient products from the main integral editor', async () => {
    const { user } = await renderAppMain();

    await openCalculusTool(user, 'Integrals', 'Indefinite');
    setMathFieldLatex('main-editor', 'k*(2a*x+b)/(a*x^2+b*x+c)');
    await user.click(screen.getByTestId('soft-action-evaluate'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByText('Partial fractions')).toBeInTheDocument();
    const answer = screen.getByTestId('display-outcome-answer-block');
    await waitFor(() => {
      const renderedLatex = answer.querySelector('[data-raw-latex]')?.getAttribute('data-raw-latex') ?? '';
      expect(renderedLatex).toContain('k\\cdot \\ln');
      expect(renderedLatex).toContain('ax^2+bx+c');
    });
  });

  it('canonicalizes special-function names in the main integral editor before evaluation', async () => {
    const { user } = await renderAppMain();

    await openCalculusTool(user, 'Integrals', 'Indefinite');
    setMathFieldLatex('main-editor', 'Si(2x+1)');
    await waitFor(() => {
      expect(screen.getByTestId('main-editor')).toHaveAttribute(
        'data-value',
        '\\operatorname{Si}(2x+1)',
      );
    });
    await user.click(screen.getByTestId('soft-action-evaluate'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-error')).toBeInTheDocument());
    expect(screen.getByTestId('display-outcome-error')).toHaveTextContent(
      'This antiderivative could not be determined symbolically in Calculus.',
    );
    expect(screen.getByTestId('main-editor')).toHaveAttribute(
      'data-value',
      '\\operatorname{Si}(2x+1)',
    );
  });

  it('copies and replays special-function integral answers without degrading notation', async () => {
    const { user } = await renderAppMain();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');

    await openCalculusTool(user, 'Integrals', 'Indefinite');
    setMathFieldLatex('main-editor', 'e^{-x^2}');
    await user.click(screen.getByRole('button', { name: 'Copy Expr' }));
    expect(writeTextSpy).toHaveBeenLastCalledWith('\\int e^{-x^2}\\,dx');
    await user.click(screen.getByTestId('soft-action-evaluate'));

    await waitForDisplayOutcomeSuccess();
    await waitFor(() => {
      const renderedLatex = screen
        .getByTestId('display-outcome-answer-block')
        .querySelector('[data-raw-latex]')
        ?.getAttribute('data-raw-latex') ?? '';
      expect(renderedLatex).toContain('\\operatorname{erf}');
      expect(renderedLatex).toContain('\\sqrt{\\pi}');
    });

    await user.click(screen.getByRole('button', { name: 'Copy Result' }));
    expect(writeTextSpy).toHaveBeenLastCalledWith(expect.stringContaining('\\operatorname{erf}'));
    expect(writeTextSpy).toHaveBeenLastCalledWith(expect.stringContaining('\\sqrt{\\pi}'));

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-math-notation-plainText'));
    await user.click(screen.getByRole('button', { name: 'Copy Result' }));
    const plainCopy = writeTextSpy.mock.calls[writeTextSpy.mock.calls.length - 1]?.[0] ?? '';
    expect(plainCopy).toContain('erf');
    expect(plainCopy).toContain('√(π)');
    expect(plainCopy).not.toContain('\\operatorname');

    await user.click(screen.getByTestId('settings-math-notation-latex'));
    setMathFieldLatex('main-editor', 'e^{a*x^2+b*x+c}');
    await user.click(screen.getByTestId('soft-action-evaluate'));
    await waitForDisplayOutcomeSuccess();

    await user.click(screen.getByRole('button', { name: 'Copy Result' }));
    expect(writeTextSpy).toHaveBeenLastCalledWith(expect.stringContaining('\\begin{cases}'));
    expect(writeTextSpy).toHaveBeenLastCalledWith(expect.stringContaining('\\operatorname{erf}'));
    expect(writeTextSpy).toHaveBeenLastCalledWith(expect.stringContaining('\\operatorname{erfi}'));

    await user.click(screen.getByTestId('history-toggle'));
    await user.click((await screen.findAllByTestId('history-entry'))[0]);
    await waitForDisplayOutcomeSuccess();
    await user.click(screen.getByRole('button', { name: 'Copy Result' }));
    expect(writeTextSpy).toHaveBeenLastCalledWith(expect.stringContaining('\\operatorname{erfi}'));
  });

  it('keeps definite and improper bounds editable while the body uses the main editor', async () => {
    const { user } = await renderAppMain();

    await openCalculusTool(user, 'Integrals', 'Definite');
    setMathFieldLatex('main-editor', 'x^2');

    const lowerInput = screen.getByLabelText('Lower');
    const upperInput = screen.getByLabelText('Upper');
    await user.clear(lowerInput);
    await user.type(lowerInput, '-1');
    fireEvent.blur(lowerInput);
    await user.clear(upperInput);
    await user.type(upperInput, '2');
    fireEvent.blur(upperInput);

    expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', 'x^2');
    expect(screen.getByLabelText('Lower')).toHaveValue('-1');
    expect(screen.getByLabelText('Upper')).toHaveValue('2');
    expect(document.querySelector('math-field.secondary-mathfield')).not.toBeInTheDocument();

    await openCalculusTool(user, 'Integrals', 'Improper');
    setMathFieldLatex('main-editor', '\\frac{1}{1+x^2}');
    await user.click(screen.getByRole('button', { name: 'Finite lower' }));

    expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', '\\frac{1}{1+x^2}');
    expect(screen.getByRole('button', { name: '+∞ upper' })).toHaveClass('is-active');
  });
});
