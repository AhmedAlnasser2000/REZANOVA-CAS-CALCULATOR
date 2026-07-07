import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { MathNotationProvider } from '../../components/MathNotationContext';
import {
  createNotebookSurfaceState,
  type NotebookSurfaceState,
  type NotebookWorkspaceTarget,
} from '../../lib/notebook';
import { NotebookPage } from './NotebookPage';

function NotebookHarness({
  onOpenMathInTool = vi.fn(),
}: {
  onOpenMathInTool?: (target: NotebookWorkspaceTarget, latex: string) => void;
}) {
  const [surfaceState, setSurfaceState] = useState<NotebookSurfaceState>(() =>
    createNotebookSurfaceState({
      idPrefix: 'test-notebook',
      now: () => new Date('2026-07-06T12:00:00.000Z'),
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
  it('renders a mock-guided document surface with outline, canvas, and inspector', () => {
    render(<NotebookHarness />);

    expect(screen.getByTestId('notebook-page')).toBeInTheDocument();
    expect(screen.getByLabelText('Notebook outline')).toBeInTheDocument();
    expect(screen.getByTestId('notebook-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('notebook-inspector')).toBeInTheDocument();
    expect(screen.getByText('Session draft')).toBeInTheDocument();
  });

  it('accepts detected math spans without rewriting the original text', () => {
    render(<NotebookHarness />);

    const textarea = screen.getByLabelText('Notebook text');
    fireEvent.change(textarea, {
      target: { value: 'Solve x^2-5x+6=0 before checking roots.' },
    });

    expect(screen.getByTestId('notebook-math-candidates')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /Accept/ })[0]);

    expect(screen.getByLabelText('Notebook text')).toHaveValue(
      'Solve x^2-5x+6=0 before checking roots.',
    );
    expect(screen.getByTestId('notebook-inline-math-0')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /x\^2-5x\+6=0/ }).length)
      .toBeGreaterThan(0);
  });

  it('stores text treatments separately and reflects them in the preview', () => {
    render(<NotebookHarness />);

    fireEvent.click(screen.getByRole('button', { name: /Highlight/ }));

    const preview = screen.getByTestId('notebook-rich-preview');
    expect(preview.querySelector('span[style*="background-color"]')).not.toBeNull();
  });

  it('uses a scalable workspace selector for math blocks and only opens live v1 targets', () => {
    const onOpenMathInTool = vi.fn();
    render(<NotebookHarness onOpenMathInTool={onOpenMathInTool} />);

    const mathBlock = screen.getByTestId('notebook-math-editor-block');
    fireEvent.click(mathBlock);
    const inspector = screen.getByTestId('notebook-inspector');
    fireEvent.change(within(inspector).getByLabelText('Workspace'), {
      target: { value: 'equation' },
    });

    const field = screen.getByTestId('notebook-math-editor') as HTMLElement & {
      setValue: (value: string) => void;
    };
    field.setValue('x+1=2');
    fireEvent.input(field);

    fireEvent.click(screen.getByRole('button', { name: /Open in Tool/ }));
    expect(onOpenMathInTool).toHaveBeenCalledWith('equation', 'x+1=2');
  });
});
