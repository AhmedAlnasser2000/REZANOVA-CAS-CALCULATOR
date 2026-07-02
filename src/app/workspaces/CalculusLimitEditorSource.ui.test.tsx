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

async function waitForDisplayOutcomeError() {
  await waitFor(() => expect(screen.getByTestId('display-outcome-error')).toBeInTheDocument());
  await waitForDisplayQueueToSettle();
}

describe('Calculus limit editor source', () => {
  it('uses one merged Limit screen with the full request in the main editor', async () => {
    const { user } = await renderAppMain();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');

    await openLauncherApp(user, 'Calculus', 'Calculus');
    await user.click(await screen.findByRole('button', { name: /Limits/i }));
    expect(screen.queryByRole('button', { name: /Finite Target/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Infinite Target/i })).not.toBeInTheDocument();
    const limitEntries = (await screen.findAllByRole('button', { name: /Limit/i })).filter((candidate) =>
      candidate.querySelector('strong')?.textContent?.trim() === 'Limit',
    );
    expect(limitEntries).toHaveLength(1);
    await user.click(limitEntries[0]);

    expect(screen.getByTestId('soft-action-toEditor')).toHaveTextContent('Focus Editor');
    expect(document.querySelector('math-field.secondary-mathfield')).not.toBeInTheDocument();
    expect(screen.getByTestId('main-editor')).toHaveAttribute('data-placeholder', '\\text{Enter a limit expression}');
    expect(screen.getByTestId('main-editor').getAttribute('data-placeholder')).not.toContain('integrand');
    expect(screen.getByText('Enter a full limit expression such as lim x -> 0 sin(x)/x.')).toBeInTheDocument();
    expect(screen.queryByText(/limit request/iu)).not.toBeInTheDocument();
    expect(screen.queryByText(/lim x->0/u)).not.toBeInTheDocument();

    setMathFieldLatex('main-editor', '\\lim_{t\\to \\infty}\\frac{3t^2+1}{2t^2-5}');
    await waitFor(() => {
      expect(screen.getByTestId('main-editor')).toHaveAttribute(
        'data-value',
        '\\lim_{t\\to \\infty}\\frac{3t^2+1}{2t^2-5}',
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId('calculus-limit-readback')).toHaveTextContent('Written');
      expect(screen.getByTestId('calculus-limit-readback')).toHaveTextContent('Approaches');
      expect(screen.getByTestId('calculus-limit-readback')).toHaveTextContent('Body');
    });
    expect(screen.getByTestId('calculus-limit-readback').querySelectorAll('.calculus-limit-readback__cell'))
      .toHaveLength(3);
    expect(screen.getByTestId('calculus-limit-readback')).not.toHaveTextContent('\\frac{3t^2+1}{2t^2-5}');

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
      '\\lim_{t\\to \\infty}\\left(\\frac{3t^2+1}{2t^2-5}\\right)',
    );

    await user.click(screen.getByTestId('soft-action-toEditor'));
    expect(screen.getByTestId('display-status')).toHaveTextContent('Calculus editor focused');

    const editor = screen.getByTestId('main-editor');
    expect(fireEvent.keyDown(editor, { key: 'Enter' })).toBe(false);

    await waitForDisplayOutcomeSuccess();
    expect(screen.getAllByTestId('display-outcome-answer-block')).toHaveLength(1);
    await waitFor(() => {
      const renderedLatex = screen
        .getByTestId('display-outcome-answer-block')
        .querySelector('[data-raw-latex]')
        ?.getAttribute('data-raw-latex') ?? '';
      expect(renderedLatex).toBe('\\frac{3}{2}');
    });
  });

  it('opens the merged Limit screen from the helper', async () => {
    const { user } = await renderAppMain();

    await openCalculusTool(user, 'Limits', 'Limit');

    expect(screen.getByText('Evaluate a full natural limit expression.')).toBeInTheDocument();
    expect(screen.getByTestId('soft-action-toEditor')).toHaveTextContent('Focus Editor');
  });

  it('shows a proof detail card when a two-sided limit fails', async () => {
    const { user } = await renderAppMain();

    await openCalculusTool(user, 'Limits', 'Limit');
    setMathFieldLatex('main-editor', 'lim x -> 0 1/x');
    await user.click(screen.getByTestId('soft-action-evaluate'));

    await waitForDisplayOutcomeError();
    expect(screen.getByTestId('display-outcome-error')).toHaveTextContent(
      'Left and right behavior do not agree near the target.',
    );
    const detail = await screen.findByTestId('display-outcome-detail-section-0');
    expect(detail).toHaveTextContent('Why This Limit Fails');
    fireEvent.click(detail.querySelector('summary') as HTMLElement);
    await waitFor(() => expect(detail).toHaveTextContent('Left side tends to'));
    expect(detail).toHaveTextContent('Left side tends to');
    expect(detail).toHaveTextContent('Right side tends to');
    expect(detail).toHaveTextContent('two-sided limit does not exist');
  });
});
