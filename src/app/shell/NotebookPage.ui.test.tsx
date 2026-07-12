import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { MathNotationProvider } from '../../components/MathNotationContext';
import {
  createNotebookRichSurfaceState,
  type NotebookSurfaceState,
  type NotebookWorkspaceTarget,
} from '../../lib/notebook';
import { NotebookPage } from './NotebookPage';

beforeAll(() => {
  if (!Range.prototype.getClientRects) {
    Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  }
  if (!Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = () => new DOMRect();
  }
  if (!document.elementFromPoint) {
    document.elementFromPoint = () =>
      document.querySelector('.notebook-rich-editor') ?? document.body;
  }
  if (!ShadowRoot.prototype.elementFromPoint) {
    ShadowRoot.prototype.elementFromPoint = () => null;
  }
});

function NotebookHarness({
  onOpenMathInTool = vi.fn(),
}: {
  onOpenMathInTool?: (target: NotebookWorkspaceTarget, latex: string) => void;
}) {
  const [surfaceState, setSurfaceState] = useState<NotebookSurfaceState>(() =>
    createNotebookRichSurfaceState({
      idPrefix: 'test-notebook',
      now: () => new Date('2026-07-12T12:00:00.000Z'),
      title: 'Limits Notebook',
    }));

  return (
    <MathNotationProvider notationMode="latex">
      <NotebookPage
        instanceId="notebook.1"
        surfaceState={surfaceState}
        onOpenMathInTool={onOpenMathInTool}
        onUpdateSurfaceState={(_, nextState) => setSurfaceState(nextState)}
      />
    </MathNotationProvider>
  );
}

describe('NotebookPage', () => {
  it('renders a continuous document surface with outline, canvas, and inspector', async () => {
    render(<NotebookHarness />);

    expect(screen.getByTestId('notebook-page')).toBeInTheDocument();
    expect(screen.getByLabelText('Notebook outline')).toBeInTheDocument();
    expect(screen.getByTestId('notebook-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('notebook-inspector')).toBeInTheDocument();
    expect(screen.getByText('Session draft')).toBeInTheDocument();
    expect(await screen.findByLabelText('Notebook rich document')).toBeInTheDocument();
    expect(screen.queryByLabelText('Notebook text')).not.toBeInTheDocument();
  });

  it('offers four starter templates without creating a second tab system', async () => {
    const user = userEvent.setup();
    render(<NotebookHarness />);

    await user.click(await screen.findByRole('button', { name: 'Start from template' }));
    expect(screen.getByRole('button', { name: /Lecture Notes/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Worked Example/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Theorem Sheet/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exercise Set/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Theorem Sheet/ }));
    expect(await screen.findByText('Theorem')).toBeInTheDocument();
    expect(screen.queryByText('My notebooks')).not.toBeInTheDocument();
  });

  it('suggests likely math but converts it only after explicit acceptance', async () => {
    const user = userEvent.setup();
    render(<NotebookHarness />);
    const canvas = await screen.findByLabelText('Notebook rich document');

    await user.click(canvas);
    await user.type(canvas, 'Solve x^2-5x+6=0 before checking roots.');

    expect(screen.queryByTestId('notebook-inline-math-node')).not.toBeInTheDocument();
    const suggestion = await screen.findByTestId('notebook-math-suggestion');
    expect(suggestion).toHaveTextContent('x^2-5x+6=0');
    await user.click(within(suggestion).getByRole('button', { name: 'Convert selected text' }));

    expect(await screen.findByTestId('notebook-inline-math-node')).toBeInTheDocument();
    expect(screen.getByTestId('notebook-inline-math-field')).toHaveAttribute(
      'data-notebook-field-role',
      'inline',
    );
  });

  it('supports formatting and undo on the same rich canvas', async () => {
    const user = userEvent.setup();
    render(<NotebookHarness />);
    const canvas = await screen.findByLabelText('Notebook rich document');

    await user.click(canvas);
    await user.type(canvas, 'Important result');
    await user.keyboard('{Control>}a{/Control}');
    const toolbar = screen.getByLabelText('Notebook formatting toolbar');
    await user.click(within(toolbar).getByRole('button', { name: 'Bold' }));
    expect(canvas.querySelector('strong')).not.toBeNull();

    await user.click(within(toolbar).getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(canvas.querySelector('strong')).toBeNull());
  });

  it('opens supported display math in the selected workspace', async () => {
    const user = userEvent.setup();
    const onOpenMathInTool = vi.fn();
    render(<NotebookHarness onOpenMathInTool={onOpenMathInTool} />);

    await user.click(await screen.findByRole('button', { name: 'Insert display math' }));
    const field = await screen.findByTestId('notebook-display-math-field') as HTMLElement & {
      setValue: (value: string) => void;
    };
    field.focus();
    field.setValue('x+1=2');
    fireEvent.input(field);

    const inspector = screen.getByTestId('notebook-inspector');
    fireEvent.change(within(inspector).getByLabelText('Workspace'), {
      target: { value: 'equation' },
    });
    await user.click(within(inspector).getByRole('button', { name: 'Open in Tool' }));
    expect(onOpenMathInTool).toHaveBeenCalledWith('equation', 'x+1=2');
  });

  it('converts selected math explicitly between inline and display placement', async () => {
    const user = userEvent.setup();
    render(<NotebookHarness />);
    await user.click(await screen.findByRole('button', { name: 'Insert inline math' }));
    const inlineField = await screen.findByTestId('notebook-inline-math-field');
    await user.click(inlineField);

    const inspector = screen.getByTestId('notebook-inspector');
    await waitFor(() => {
      expect(within(inspector).getByRole('button', { name: 'Inline' })).toHaveClass('is-active');
    });
    await user.click(within(inspector).getByRole('button', { name: 'Display' }));

    expect(await screen.findByTestId('notebook-display-math-node')).toBeInTheDocument();
    expect(screen.queryByTestId('notebook-inline-math-node')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('notebook-display-math-field'));
    await user.click(within(inspector).getByRole('button', { name: 'Inline' }));
    expect(await screen.findByTestId('notebook-inline-math-node')).toBeInTheDocument();
    expect(screen.queryByTestId('notebook-display-math-node')).not.toBeInTheDocument();
  });

  it('keeps document-only structures in Notebook instead of sending them to a tool', async () => {
    const user = userEvent.setup();
    render(<NotebookHarness />);
    await user.click(await screen.findByRole('button', { name: 'Insert display math' }));
    const field = await screen.findByTestId('notebook-display-math-field') as HTMLElement & {
      setValue: (value: string) => void;
    };
    field.focus();
    field.setValue('\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}');
    fireEvent.input(field);

    const display = screen.getByTestId('notebook-display-math-node');
    expect(within(display).getByRole('button', { name: 'Open in Tool' })).toBeDisabled();
  });
});
