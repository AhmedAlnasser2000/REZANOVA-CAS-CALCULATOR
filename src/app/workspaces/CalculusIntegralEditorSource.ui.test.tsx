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
