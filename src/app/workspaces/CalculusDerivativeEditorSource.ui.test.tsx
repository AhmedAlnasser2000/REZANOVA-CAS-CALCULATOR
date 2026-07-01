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

async function waitForDisplayOutcomeSuccess() {
  await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
  await waitForDisplayQueueToSettle();
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

describe('Calculus derivative editor source', () => {
  it('edits natural derivative requests through the main editor and copies the request', async () => {
    const { user } = await renderAppMain();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');

    await openCalculusTool(user, 'Derivatives', 'Derivative');

    expect(screen.getByTestId('soft-action-toEditor')).toHaveTextContent('Focus Editor');
    expect(screen.getByTestId('calculus-operator-rail')).toBeInTheDocument();
    expect(screen.getByTestId('calculus-main-editor-context')).toHaveTextContent('d/dx');
    expect(screen.getByTestId('calculus-operator-rail')).toHaveTextContent('f(x)');
    expect(screen.queryByTestId('calculus-derivative-target')).not.toBeInTheDocument();
    expect(document.querySelector('math-field.secondary-mathfield')).not.toBeInTheDocument();

    setMathFieldLatex('main-editor', 'd/dt(t^3+2t)');
    await waitFor(() => expect(screen.getByTestId('calculus-main-editor-context')).toHaveTextContent('d/dt'));

    const generatedPreview = document.querySelector('.generated-preview-card');
    expect(generatedPreview).toBeInTheDocument();
    await waitFor(() => {
      expect(within(generatedPreview as HTMLElement).getByRole('button', { name: 'Copy Expr' }))
        .toBeInTheDocument();
      expect(screen.queryByTestId('display-expression-preview-card')).not.toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Copy Expr' })).toHaveLength(1);
    });
    await user.click(within(generatedPreview as HTMLElement).getByRole('button', { name: 'Copy Expr' }));
    expect(writeTextSpy).toHaveBeenLastCalledWith('\\frac{d}{dt}\\left(t^3+2t\\right)');

    await user.click(screen.getByTestId('soft-action-toEditor'));
    expect(screen.getByTestId('display-status')).toHaveTextContent('Calculus editor focused');
    expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', 'd/dt(t^3+2t)');

    const editor = screen.getByTestId('main-editor');
    expect(fireEvent.keyDown(editor, { key: 'Enter' })).toBe(false);

    await waitForDisplayOutcomeSuccess();
    expect(screen.queryByTestId('display-expression-preview-card')).not.toBeInTheDocument();
    expect(screen.queryByText('Resolved form')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('display-outcome-answer-block')).toHaveLength(1);

    const stepsCard = await openDerivativeStepsCard();
    const rawLatex = [...stepsCard.querySelectorAll('[data-raw-latex]')]
      .map((node) => node.getAttribute('data-raw-latex') ?? '');
    expect(rawLatex).toContain('\\operatorname{operator}\\quad \\frac{d}{dt}');
    expect(rawLatex).toContain('D_{1}=3t^2+2');
  });

  it('keeps derivative-at-point request in the main editor while the point remains editable', async () => {
    const { user } = await renderAppMain();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');

    await openCalculusTool(user, 'Derivatives', 'Derivative at Point');

    expect(screen.getByTestId('soft-action-toEditor')).toHaveTextContent('Focus Editor');
    expect(screen.getByTestId('calculus-operator-rail')).toBeInTheDocument();
    expect(screen.getByTestId('calculus-main-editor-context')).toHaveTextContent('d/dx');
    expect(screen.getByTestId('calculus-operator-rail')).toHaveTextContent('f(x)');
    expect(document.querySelector('math-field.secondary-mathfield')).not.toBeInTheDocument();
    expect(screen.queryByTestId('calculus-derivative-point-target')).not.toBeInTheDocument();

    setMathFieldLatex('main-editor', 'd/dt(t^2)');
    await waitFor(() => expect(screen.getByTestId('calculus-main-editor-context')).toHaveTextContent('d/dt'));
    const pointInput = await screen.findByLabelText('Point t =');
    await user.clear(pointInput);
    await user.type(pointInput, '3');

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
      '\\left.\\frac{d}{dt}\\left(t^2\\right)\\right|_{t=3}',
    );

    expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', 'd/dt(t^2)');
    expect(pointInput).toHaveValue('3');

    const editor = screen.getByTestId('main-editor');
    expect(fireEvent.keyDown(editor, { key: 'Enter' })).toBe(false);

    await waitForDisplayOutcomeSuccess();
    expect(screen.queryByTestId('display-expression-preview-card')).not.toBeInTheDocument();
    expect(screen.queryByText('Resolved form')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('display-outcome-answer-block')).toHaveLength(1);

    const stepsCard = await openDerivativeStepsCard();
    const rawLatex = [...stepsCard.querySelectorAll('[data-raw-latex]')]
      .map((node) => node.getAttribute('data-raw-latex') ?? '');
    expect(rawLatex).toContain('D_{1}=2t');
    expect(rawLatex).toContain('D_{1}\\big|_{t=3}=6');
  });

  it('previews and evaluates higher-order natural derivative requests', async () => {
    const { user } = await renderAppMain();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');

    await openCalculusTool(user, 'Derivatives', 'Derivative');

    setMathFieldLatex('main-editor', 'd^3/dt^3(t^5)');
    expect(screen.getByTestId('calculus-main-editor-context')).toHaveTextContent('d³/dt³');
    expect(screen.getByTestId('calculus-operator-rail')).toHaveTextContent('f(t)');

    const generatedPreview = document.querySelector('.generated-preview-card');
    expect(generatedPreview).toBeInTheDocument();
    await waitFor(() => {
      expect(within(generatedPreview as HTMLElement).getByRole('button', { name: 'Copy Expr' }))
        .toBeInTheDocument();
    });
    await user.click(within(generatedPreview as HTMLElement).getByRole('button', { name: 'Copy Expr' }));
    expect(writeTextSpy).toHaveBeenLastCalledWith('\\frac{d^{3}}{dt^{3}}\\left(t^5\\right)');

    expect(fireEvent.keyDown(screen.getByTestId('main-editor'), { key: 'Enter' })).toBe(false);
    await waitForDisplayOutcomeSuccess();
    expect(screen.queryByTestId('display-outcome-error')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('display-outcome-answer-block')).toHaveLength(1);
    expect(screen.getByTestId('display-outcome-answer-block')).toHaveTextContent('60');
    expect(screen.getByTestId('display-outcome-answer-block')).toHaveTextContent('t');

    const stepsCard = await openDerivativeStepsCard();
    const rawLatex = [...stepsCard.querySelectorAll('[data-raw-latex]')]
      .map((node) => node.getAttribute('data-raw-latex') ?? '');
    expect(rawLatex).toContain('D_{1}=5t^4');
    expect(rawLatex).toContain('D_{2}=20t^3');
    expect(rawLatex).toContain('D_{3}=60t^2');
  });
});
