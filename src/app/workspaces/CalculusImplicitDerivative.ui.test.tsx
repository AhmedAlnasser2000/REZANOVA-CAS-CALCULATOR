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

describe('Calculus implicit derivative workspace', () => {
  it('edits one relation in the main editor and evaluates through the Equation seam', async () => {
    const { user } = await renderAppMain();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');

    await openCalculusTool(user, 'Derivatives', 'Implicit Derivative');

    expect(screen.getByTestId('soft-action-toEditor')).toHaveTextContent('Focus Editor');
    expect(screen.getByTestId('calculus-operator-rail')).toBeInTheDocument();
    expect(screen.getByTestId('calculus-main-editor-context')).toHaveTextContent('dy/dx');
    expect(screen.getByTestId('calculus-operator-rail')).toHaveTextContent('F(x, y)=0');
    expect(screen.getByTestId('calculus-operator-rail')).toHaveTextContent('Differentiate with respect to');
    expect(screen.getByTestId('calculus-implicit-independent-input')).toHaveValue('x');
    expect(screen.getByTestId('calculus-implicit-dependent-input')).toHaveValue('y');
    expect(document.querySelector('math-field.secondary-mathfield')).not.toBeInTheDocument();

    setMathFieldLatex('main-editor', 'x^2+y^2=25');

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
      '\\operatorname{implicitD}_{y,x}\\left(x^2+y^2=25\\right)',
    );

    expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', 'x^2+y^2=25');
    expect(fireEvent.keyDown(screen.getByTestId('main-editor'), { key: 'Enter' })).toBe(false);

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    await waitForDisplayQueueToSettle();
    expect(screen.queryByTestId('display-expression-preview-card')).not.toBeInTheDocument();
    expect(screen.queryByText('Resolved form')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('display-outcome-answer-block')).toHaveLength(1);
    expect(screen.getByTestId('display-outcome-answer-block')).toHaveTextContent('dy');
    expect(screen.getByTestId('display-outcome-answer-block')).toHaveTextContent('dx');
    expect(screen.getByTestId('display-outcome-answer-block')).toHaveTextContent('x');
    expect(screen.getByTestId('display-outcome-answer-block')).toHaveTextContent('y');
    expect(screen.getByText('Implicit Differentiation')).toBeInTheDocument();
  });
});
