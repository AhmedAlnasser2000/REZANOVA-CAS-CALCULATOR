import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { MathNotationProvider } from '../../../components/MathNotationContext';
import {
  createNotebookRichSurfaceState,
  type NotebookSurfaceState,
} from '../../../lib/notebook';
import { NotebookPage } from '../NotebookPage';

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

function NotebookWorkbenchHarness({ instanceId }: { instanceId: string }) {
  const [surfaceState, setSurfaceState] = useState<NotebookSurfaceState>(() =>
    createNotebookRichSurfaceState({
      idPrefix: instanceId,
      now: () => new Date('2026-07-12T12:00:00.000Z'),
      title: 'Workbench Notebook',
    }));

  return (
    <MathNotationProvider notationMode="latex">
      <NotebookPage
        instanceId={instanceId}
        surfaceState={surfaceState}
        onOpenMathInTool={vi.fn()}
        onUpdateSurfaceState={(_, nextState) => setSurfaceState(nextState)}
      />
    </MathNotationProvider>
  );
}

function NotebookTabSwitchHarness({ instanceId }: { instanceId: string }) {
  const [surfaceState, setSurfaceState] = useState<NotebookSurfaceState>(() =>
    createNotebookRichSurfaceState({
      idPrefix: instanceId,
      now: () => new Date('2026-07-14T03:00:00.000Z'),
      title: 'Selection Notebook',
    }));
  const [active, setActive] = useState(true);

  return (
    <MathNotationProvider notationMode="latex">
      <button type="button" onClick={() => setActive((current) => !current)}>
        {active ? 'Switch workspace tab' : 'Return to Notebook tab'}
      </button>
      {active ? (
        <NotebookPage
          instanceId={instanceId}
          surfaceState={surfaceState}
          onOpenMathInTool={vi.fn()}
          onUpdateSurfaceState={(_, nextState) => setSurfaceState(nextState)}
        />
      ) : <div>Another workspace</div>}
    </MathNotationProvider>
  );
}

function setDesktopWorkbenchWidth() {
  Object.defineProperty(document.querySelector('.notebook-page-workbench'), 'clientWidth', {
    configurable: true,
    value: 1440,
  });
}

describe('Notebook workbench', () => {
  it('focuses an empty writing region before presenting templates below it', async () => {
    render(<NotebookWorkbenchHarness instanceId="workbench-empty" />);

    const editor = await screen.findByLabelText('Notebook rich document');
    await waitFor(() => expect(editor).toHaveFocus());
    expect(screen.getByText('Start writing your explanation...')).toBeVisible();
    const template = screen.getByTestId('notebook-template-start');
    expect(editor.compareDocumentPosition(template) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(screen.getByRole('button', { name: 'Start from template' })).toBeVisible();
  });

  it('resizes both panes accessibly and restores their defaults on double-click', async () => {
    const user = userEvent.setup();
    render(<NotebookWorkbenchHarness instanceId="workbench-resize" />);
    await screen.findByLabelText('Notebook rich document');
    await user.click(screen.getByRole('button', { name: 'Separate equation' }));
    await screen.findByTestId('notebook-display-math-field');
    setDesktopWorkbenchWidth();

    const outline = screen.getByRole('separator', { name: 'Resize Notebook outline' });
    const inspector = screen.getByRole('separator', { name: 'Resize Notebook inspector' });
    expect(outline).toHaveAttribute('aria-valuenow', '320');
    expect(inspector).toHaveAttribute('aria-valuenow', '300');

    fireEvent.keyDown(outline, { key: 'ArrowRight' });
    fireEvent.keyDown(inspector, { key: 'ArrowLeft' });
    expect(outline).toHaveAttribute('aria-valuenow', '332');
    expect(inspector).toHaveAttribute('aria-valuenow', '312');

    fireEvent.doubleClick(outline);
    fireEvent.doubleClick(inspector);
    expect(outline).toHaveAttribute('aria-valuenow', '320');
    expect(inspector).toHaveAttribute('aria-valuenow', '300');
  });

  it('retains pane widths for one Notebook tab without sharing them with another', async () => {
    const first = render(<NotebookWorkbenchHarness instanceId="workbench-tab-a" />);
    await screen.findByLabelText('Notebook rich document');
    setDesktopWorkbenchWidth();
    fireEvent.keyDown(
      screen.getByRole('separator', { name: 'Resize Notebook outline' }),
      { key: 'ArrowRight' },
    );
    expect(screen.getByRole('separator', { name: 'Resize Notebook outline' }))
      .toHaveAttribute('aria-valuenow', '332');
    first.unmount();

    const restored = render(<NotebookWorkbenchHarness instanceId="workbench-tab-a" />);
    await screen.findByLabelText('Notebook rich document');
    expect(screen.getByRole('separator', { name: 'Resize Notebook outline' }))
      .toHaveAttribute('aria-valuenow', '332');
    restored.unmount();

    render(<NotebookWorkbenchHarness instanceId="workbench-tab-b" />);
    await screen.findByLabelText('Notebook rich document');
    expect(screen.getByRole('separator', { name: 'Resize Notebook outline' }))
      .toHaveAttribute('aria-valuenow', '320');
  });

  it('restores a prose range after switching away from and back to one Notebook tab', async () => {
    const user = userEvent.setup();
    render(<NotebookTabSwitchHarness instanceId="workbench-selection-tab" />);
    let canvas = await screen.findByLabelText('Notebook rich document');
    await user.click(canvas);
    await user.type(canvas, 'Alpha{Enter}Beta');
    await user.keyboard('{Control>}a{/Control}');
    expect(await screen.findByTestId('notebook-selection-toolbar')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Switch workspace tab' }));
    expect(screen.getByText('Another workspace')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Return to Notebook tab' }));
    canvas = await screen.findByLabelText('Notebook rich document');
    expect(await screen.findByTestId('notebook-selection-toolbar')).toBeInTheDocument();

    await user.click(within(screen.getByLabelText('Notebook formatting toolbar'))
      .getByRole('button', { name: 'Align right' }));
    expect(canvas.querySelectorAll("p[data-notebook-alignment='right']")).toHaveLength(2);
  });
});
