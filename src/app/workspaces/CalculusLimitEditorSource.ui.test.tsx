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
    expect(screen.getByTestId('keypad-limit-piecewise-template')).toHaveTextContent('Piecewise');
    expect(screen.queryByTestId('keypad-limit-piecewise-branch')).not.toBeInTheDocument();
    expect(screen.queryByTestId('keypad-limit-if-text')).not.toBeInTheDocument();
    expect(screen.queryByTestId('keypad-limit-otherwise-text')).not.toBeInTheDocument();
    expect(screen.queryByTestId('keypad-00')).not.toBeInTheDocument();

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

  it('renders friendly piecewise input as editable rows and cases readback', async () => {
    const { user } = await renderAppMain();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');

    await openCalculusTool(user, 'Limits', 'Limit');
    setMathFieldLatex('main-editor', 'lim x -> 0 piecewise(x if x<0; x^2 otherwise)');

    const rowEditor = await screen.findByTestId('limit-piecewise-row-editor');
    expect(rowEditor).toBeInTheDocument();
    expect(screen.getByTestId('limit-piecewise-row-1')).toHaveTextContent('1');
    expect(screen.getByTestId('limit-piecewise-row-2')).toHaveTextContent('2');
    expect(within(screen.getByTestId('limit-piecewise-row-2')).getByDisplayValue('Otherwise'))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Row/i })).toBeInTheDocument();

    await waitFor(() => {
      const readback = screen.getByTestId('calculus-limit-readback');
      const rawLatexValues = Array.from(readback.querySelectorAll('[data-raw-latex]'))
        .map((element) => element.getAttribute('data-raw-latex') ?? '');
      expect(rawLatexValues).toContain('\\begin{cases}x&x<0\\\\x^2&\\text{otherwise}\\end{cases}');
      expect(readback).not.toHaveTextContent('piecewise(x if');
    });

    const generatedPreview = document.querySelector('.generated-preview-card') as HTMLElement;
    await user.click(within(generatedPreview).getByRole('button', { name: 'Copy Expr' }));
    expect(writeTextSpy).toHaveBeenLastCalledWith(
      '\\lim_{x\\to 0}\\begin{cases}x&x<0\\\\x^2&\\text{otherwise}\\end{cases}',
    );
  });

  it('opens the Piecewise template with empty editable rows, not raw placeholder tokens', async () => {
    const { user } = await renderAppMain();

    await openCalculusTool(user, 'Limits', 'Limit');
    await user.click(screen.getByTestId('keypad-limit-piecewise-template'));

    await waitFor(() => expect(screen.getAllByTestId(/^limit-piecewise-row-\d+$/u)).toHaveLength(2));
    expect(screen.getByTestId('limit-piecewise-row-editor')).not.toHaveTextContent('placeholder');
    expect(within(screen.getByTestId('limit-piecewise-row-1')).getByLabelText('Expression row 1'))
      .toHaveValue('');
    expect(within(screen.getByTestId('limit-piecewise-row-1')).getByLabelText('Condition row 1'))
      .toHaveValue('x<0');
    expect(within(screen.getByTestId('limit-piecewise-row-2')).getByLabelText('Expression row 2'))
      .toHaveValue('');
    expect(within(screen.getByTestId('limit-piecewise-row-2')).getByLabelText('Condition row 2'))
      .toHaveValue('Otherwise');
    expect(screen.getByTestId('limit-piecewise-row-editor')).not.toHaveTextContent('Enter an expression for this row.');
  });

  it('recovers pasted piecewise text when MathLive strips branch spacing', async () => {
    const { user } = await renderAppMain();

    await openCalculusTool(user, 'Limits', 'Limit');
    setMathFieldLatex('main-editor', 'lim x -> 0 piecewise(-1ifx<0;1otherwise)');

    await waitFor(() => {
      expect(within(screen.getByTestId('limit-piecewise-row-1')).getByDisplayValue('-1'))
        .toBeInTheDocument();
      expect(within(screen.getByTestId('limit-piecewise-row-1')).getByDisplayValue('x<0'))
        .toBeInTheDocument();
      expect(within(screen.getByTestId('limit-piecewise-row-2')).getByDisplayValue('1'))
        .toBeInTheDocument();
      expect(within(screen.getByTestId('limit-piecewise-row-2')).getByDisplayValue('Otherwise'))
        .toBeInTheDocument();
    });
  });

  it('reorders piecewise rows from the drag handle while keeping Otherwise last', async () => {
    const { user } = await renderAppMain();

    await openCalculusTool(user, 'Limits', 'Limit');
    setMathFieldLatex('main-editor', 'lim x -> 0 piecewise(x if x<0; x^2 if x<1; 3 otherwise)');

    await waitFor(() => expect(screen.getAllByTestId(/^limit-piecewise-row-\d+$/u)).toHaveLength(3));

    const dataTransfer = {
      effectAllowed: 'move',
      setData: vi.fn(),
    };
    fireEvent.dragStart(screen.getByTestId('limit-piecewise-drag-2'), { dataTransfer });
    fireEvent.dragOver(screen.getByTestId('limit-piecewise-row-1'));
    fireEvent.drop(screen.getByTestId('limit-piecewise-row-1'), { dataTransfer });

    await waitFor(() => {
      expect(within(screen.getByTestId('limit-piecewise-row-1')).getByDisplayValue('x^2'))
        .toBeInTheDocument();
      expect(within(screen.getByTestId('limit-piecewise-row-2')).getByDisplayValue('x'))
        .toBeInTheDocument();
      expect(within(screen.getByTestId('limit-piecewise-row-3')).getByDisplayValue('Otherwise'))
        .toBeInTheDocument();
    });

    await user.click(screen.getByTestId('soft-action-evaluate'));
    await waitForDisplayOutcomeSuccess();
    expect(screen.getAllByTestId('display-outcome-answer-block')).toHaveLength(1);
  });

  it('swaps a regular row with the Otherwise row while preserving the fallback position', async () => {
    const { user } = await renderAppMain();

    await openCalculusTool(user, 'Limits', 'Limit');
    setMathFieldLatex('main-editor', 'lim x -> 0 piecewise(x if x<0; -x otherwise)');

    await waitFor(() => expect(screen.getAllByTestId(/^limit-piecewise-row-\d+$/u)).toHaveLength(2));

    const dataTransfer = {
      effectAllowed: 'move',
      setData: vi.fn(),
    };
    fireEvent.dragStart(screen.getByTestId('limit-piecewise-drag-1'), { dataTransfer });
    fireEvent.dragOver(screen.getByTestId('limit-piecewise-row-2'));
    fireEvent.drop(screen.getByTestId('limit-piecewise-row-2'), { dataTransfer });

    await waitFor(() => {
      expect(within(screen.getByTestId('limit-piecewise-row-1')).getByDisplayValue('-x'))
        .toBeInTheDocument();
      expect(within(screen.getByTestId('limit-piecewise-row-1')).getByDisplayValue('x<0'))
        .toBeInTheDocument();
      expect(within(screen.getByTestId('limit-piecewise-row-2')).getByDisplayValue('x'))
        .toBeInTheDocument();
      expect(within(screen.getByTestId('limit-piecewise-row-2')).getByDisplayValue('Otherwise'))
        .toBeInTheDocument();
    });

    await user.click(screen.getByTestId('soft-action-evaluate'));
    await waitForDisplayOutcomeSuccess();
    expect(screen.getAllByTestId('display-outcome-answer-block')).toHaveLength(1);
    expect(screen.getByTestId('display-outcome-answer-block')).toHaveTextContent('0');
  });

  it('keeps focus on the active piecewise row input instead of jumping back to row one', async () => {
    const { user } = await renderAppMain();

    await openCalculusTool(user, 'Limits', 'Limit');
    setMathFieldLatex('main-editor', 'lim x -> 0 piecewise(x if x<0; -x otherwise)');

    await waitFor(() => expect(screen.getAllByTestId(/^limit-piecewise-row-\d+$/u)).toHaveLength(2));
    const rowTwoExpression = within(screen.getByTestId('limit-piecewise-row-2'))
      .getByLabelText('Expression row 2');

    await user.click(rowTwoExpression);
    await user.type(rowTwoExpression, '+1');
    expect(rowTwoExpression).toHaveFocus();

    await user.click(screen.getByTestId('soft-action-toEditor'));
    expect(rowTwoExpression).toHaveFocus();
    expect(rowTwoExpression).toHaveValue('-x+1');
  });

  it('allows the Otherwise row to be edited into an explicit condition row', async () => {
    const { user } = await renderAppMain();

    await openCalculusTool(user, 'Limits', 'Limit');
    setMathFieldLatex('main-editor', 'lim x -> 0 piecewise(x if x<0; -x otherwise)');

    await waitFor(() => expect(screen.getAllByTestId(/^limit-piecewise-row-\d+$/u)).toHaveLength(2));
    const otherwiseInput = within(screen.getByTestId('limit-piecewise-row-2'))
      .getByLabelText('Condition row 2');

    await user.clear(otherwiseInput);
    await user.type(otherwiseInput, 'x>=0');

    expect(otherwiseInput).toHaveValue('x>=0');
    expect(within(screen.getByTestId('limit-piecewise-row-2')).queryByDisplayValue('Otherwise'))
      .not.toBeInTheDocument();
  });

  it('edits the piecewise limit approach controls without leaving the row editor', async () => {
    const { user } = await renderAppMain();

    await openCalculusTool(user, 'Limits', 'Limit');
    setMathFieldLatex('main-editor', 'lim x -> 0 piecewise(x if x<0; -x otherwise)');

    await waitFor(() => expect(screen.getAllByTestId(/^limit-piecewise-row-\d+$/u)).toHaveLength(2));
    const variableInput = screen.getByLabelText('Limit variable');

    await user.clear(variableInput);
    await user.type(variableInput, 't');
    fireEvent.blur(variableInput);

    await waitFor(() => expect(screen.getByLabelText('Limit variable')).toHaveValue('t'));
    await user.clear(screen.getByLabelText('Limit approaches'));
    await user.type(screen.getByLabelText('Limit approaches'), '2');
    fireEvent.blur(screen.getByLabelText('Limit approaches'));

    await waitFor(() => {
      expect(screen.getByTestId('limit-piecewise-row-editor')).toBeInTheDocument();
      expect(screen.getByTestId('main-editor')).toHaveAttribute(
        'data-value',
        '\\lim_{t\\to 2}\\begin{cases}x&x<0\\\\-x&\\text{otherwise}\\end{cases}',
      );
    });
    expect(screen.getByTestId('main-editor').getAttribute('data-value')).toContain('\\lim_{t\\to 2}');
  });

  it('removes the whole piecewise block from the structured editor', async () => {
    const { user } = await renderAppMain();

    await openCalculusTool(user, 'Limits', 'Limit');
    setMathFieldLatex('main-editor', 'lim x -> 0 piecewise(x if x<0; -x otherwise)');

    await waitFor(() => expect(screen.getByTestId('limit-piecewise-row-editor')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Remove Piecewise/i }));

    await waitFor(() => {
      expect(screen.queryByTestId('limit-piecewise-row-editor')).not.toBeInTheDocument();
      expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', '');
    });
  });

  it('adds and deletes piecewise rows without exposing loose branch keypad keys', async () => {
    const { user } = await renderAppMain();

    await openCalculusTool(user, 'Limits', 'Limit');
    setMathFieldLatex('main-editor', 'lim x -> 0 piecewise(x if x<0; x^2 otherwise)');

    await user.click(await screen.findByRole('button', { name: /Add Row/i }));
    await waitFor(() => expect(screen.getAllByTestId(/^limit-piecewise-row-\d+$/u)).toHaveLength(3));
    expect(within(screen.getByTestId('limit-piecewise-row-3')).getByDisplayValue('Otherwise'))
      .toBeInTheDocument();

    await user.click(within(screen.getByTestId('limit-piecewise-row-2')).getByRole('button', { name: /Delete row/i }));
    await waitFor(() => expect(screen.getAllByTestId(/^limit-piecewise-row-\d+$/u)).toHaveLength(2));
    expect(within(screen.getByTestId('limit-piecewise-row-2')).getByDisplayValue('Otherwise'))
      .toBeInTheDocument();
  });

  it('highlights malformed piecewise rows instead of hiding the problem', async () => {
    const { user } = await renderAppMain();

    await openCalculusTool(user, 'Limits', 'Limit');
    setMathFieldLatex('main-editor', 'lim x -> 0 piecewise(x if ; x^2 otherwise)');

    await waitFor(() => {
      expect(screen.getByTestId('limit-piecewise-row-1')).toHaveTextContent(
        'Enter a simple condition for this row.',
      );
    });
  });
});
