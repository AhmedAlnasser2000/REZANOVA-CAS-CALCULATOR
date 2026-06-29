import { fireEvent, screen, waitFor, within } from '@testing-library/react';
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

describe('Calculus partial derivative editor source', () => {
  it('edits partial derivative bodies through the main editor and uses the selected target', async () => {
    const { user } = await renderAppMain();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');

    await openCalculusTool(user, 'Partials', 'First Order');

    expect(screen.getByTestId('soft-action-toEditor')).toHaveTextContent('Focus Editor');
    expect(screen.getByTestId('calculus-main-editor-context')).toHaveTextContent('partial/partial x');
    expect(screen.getByTestId('calculus-partial-derivative-context')).toHaveTextContent('f(x, ...)');
    expect(screen.getByTestId('calculus-partial-derivative-target')).toBeInTheDocument();
    expect(document.querySelector('math-field.secondary-mathfield')).not.toBeInTheDocument();

    const targetInput = screen.getByTestId('calculus-partial-derivative-target-input');
    await user.clear(targetInput);
    await user.type(targetInput, 'y');

    expect(screen.getByTestId('calculus-main-editor-context')).toHaveTextContent('partial/partial y');
    expect(screen.getByTestId('calculus-partial-derivative-context')).toHaveTextContent('f(y, ...)');

    setMathFieldLatex('main-editor', 'x^2y+y^3');

    const generatedPreview = document.querySelector('.generated-preview-card');
    expect(generatedPreview).toBeInTheDocument();
    await waitFor(() => {
      expect(within(generatedPreview as HTMLElement).getByRole('button', { name: 'Copy Expr' }))
        .toBeInTheDocument();
      expect(screen.queryByTestId('display-expression-preview-card')).not.toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Copy Expr' })).toHaveLength(1);
    });
    await user.click(within(generatedPreview as HTMLElement).getByRole('button', { name: 'Copy Expr' }));
    expect(writeTextSpy).toHaveBeenLastCalledWith(
      '\\frac{\\partial}{\\partial y}\\left(x^2y+y^3\\right)',
    );

    expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', 'x^2y+y^3');
    expect(fireEvent.keyDown(screen.getByTestId('main-editor'), { key: 'Enter' })).toBe(false);

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    await waitForDisplayQueueToSettle();
    expect(screen.queryByTestId('display-expression-preview-card')).not.toBeInTheDocument();
    expect(screen.queryByText('Resolved form')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('display-outcome-answer-block')).toHaveLength(1);
    expect(screen.getByTestId('display-outcome-answer-block')).toHaveTextContent('x');
  });
});
