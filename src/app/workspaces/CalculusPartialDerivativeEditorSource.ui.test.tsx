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

async function openDerivativeStepsCard() {
  await screen.findByTestId('display-outcome-detail-section-0');
  let detail = screen.getByTestId('display-outcome-detail-section-0') as HTMLDetailsElement;
  expect(detail).toHaveTextContent('Derivative Steps');
  expect(detail.open).toBe(false);
  fireEvent.click(detail.querySelector('summary') as HTMLElement);
  await waitFor(() => {
    expect(screen.getByTestId('display-outcome-detail-section-0')).not.toHaveTextContent('Rendering...');
  });
  detail = screen.getByTestId('display-outcome-detail-section-0') as HTMLDetailsElement;
  const summary = detail.querySelector('summary');
  expect(summary).not.toBeNull();
  if (!detail.open) {
    fireEvent.click(summary as HTMLElement);
  }
  await waitFor(() => expect(detail.open).toBe(true));
  await waitFor(() => expect(detail.querySelectorAll('[data-raw-latex]').length).toBeGreaterThan(0));
  return detail;
}

describe('Calculus partial derivative editor source', () => {
  it('edits natural partial derivative requests through the main editor', async () => {
    const { user } = await renderAppMain();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');

    await openCalculusTool(user, 'Derivatives', 'Partial Derivative');

    expect(screen.getByTestId('soft-action-toEditor')).toHaveTextContent('Focus Editor');
    expect(screen.getByTestId('calculus-operator-rail')).toBeInTheDocument();
    expect(screen.getByTestId('calculus-main-editor-context')).toHaveTextContent('∂/∂x');
    expect(screen.getByTestId('calculus-operator-rail')).toHaveTextContent('f(x, ...)');
    expect(screen.queryByTestId('calculus-partial-derivative-target')).not.toBeInTheDocument();
    expect(document.querySelector('math-field.secondary-mathfield')).not.toBeInTheDocument();

    setMathFieldLatex('main-editor', '∂/∂y(x^2y+y^3)');
    expect(screen.getByTestId('calculus-main-editor-context')).toHaveTextContent('∂/∂y');
    expect(screen.getByTestId('calculus-operator-rail')).toHaveTextContent('f(y, ...)');

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

    expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', '∂/∂y(x^2y+y^3)');
    expect(fireEvent.keyDown(screen.getByTestId('main-editor'), { key: 'Enter' })).toBe(false);

    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    await waitForDisplayQueueToSettle();
    expect(screen.queryByTestId('display-expression-preview-card')).not.toBeInTheDocument();
    expect(screen.queryByText('Resolved form')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('display-outcome-answer-block')).toHaveLength(1);
    expect(screen.getByTestId('display-outcome-answer-block')).toHaveTextContent('x');

    const stepsCard = await openDerivativeStepsCard();
    const rawLatex = [...stepsCard.querySelectorAll('[data-raw-latex]')]
      .map((node) => node.getAttribute('data-raw-latex') ?? '');
    expect(rawLatex).toContain('\\operatorname{operator}\\quad \\frac{\\partial}{\\partial y}');
    expect(rawLatex).toContain('D_{1}=x^2+3y^2');
  });

  it('previews and evaluates mixed partial requests from the editor', async () => {
    const { user } = await renderAppMain();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');

    await openCalculusTool(user, 'Derivatives', 'Partial Derivative');

    setMathFieldLatex(
      'main-editor',
      '\\frac{\\partial^3}{\\partial x\\partial y^2}\\left(x^3y^2+z\\right)',
    );
    expect(screen.getByTestId('calculus-main-editor-context')).toHaveTextContent('∂³/∂x∂y²');

    const generatedPreview = document.querySelector('.generated-preview-card');
    expect(generatedPreview).toBeInTheDocument();
    await waitFor(() => {
      expect(within(generatedPreview as HTMLElement).getByRole('button', { name: 'Copy Expr' }))
        .toBeInTheDocument();
    });
    await user.click(within(generatedPreview as HTMLElement).getByRole('button', { name: 'Copy Expr' }));
    expect(writeTextSpy).toHaveBeenLastCalledWith(
      '\\frac{\\partial^{3}}{\\partial x\\partial y^{2}}\\left(x^3y^2+z\\right)',
    );

    expect(fireEvent.keyDown(screen.getByTestId('main-editor'), { key: 'Enter' })).toBe(false);
    await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
    await waitForDisplayQueueToSettle();
    expect(screen.queryByTestId('display-outcome-error')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('display-outcome-answer-block')).toHaveLength(1);
    expect(screen.getByTestId('display-outcome-answer-block')).toHaveTextContent('6');
    expect(screen.getByTestId('display-outcome-answer-block')).toHaveTextContent('x');

    const stepsCard = await openDerivativeStepsCard();
    const rawLatex = [...stepsCard.querySelectorAll('[data-raw-latex]')]
      .map((node) => node.getAttribute('data-raw-latex') ?? '');
    expect(rawLatex).toContain('\\operatorname{applied}\\quad y\\to y\\to x');
    expect(rawLatex).toContain('D_{3}=6x^2');
  });
});
