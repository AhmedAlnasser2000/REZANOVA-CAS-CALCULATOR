import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { MathNotationProvider } from '../../components/MathNotationContext';
import {
  createNotebookPerformanceFixture,
  createNotebookRichSurfaceState,
  type NotebookSurfaceState,
  type NotebookWorkspaceTarget,
} from '../../lib/notebook';
import { NotebookPage } from './NotebookPage';
import {
  getNotebookNodeViewRenderStats,
  resetNotebookNodeViewRenderStats,
} from './notebook/canvas';

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
  initialState,
  onOpenMathInTool = vi.fn(),
}: {
  initialState?: NotebookSurfaceState;
  onOpenMathInTool?: (target: NotebookWorkspaceTarget, latex: string) => void;
}) {
  const [surfaceState, setSurfaceState] = useState<NotebookSurfaceState>(() =>
    initialState ?? createNotebookRichSurfaceState({
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
  it('renders a continuous document surface with outline and canvas while the inspector stays collapsed for ordinary prose', async () => {
    render(<NotebookHarness />);

    expect(screen.getByTestId('notebook-page')).toBeInTheDocument();
    expect(screen.getByLabelText('Notebook outline')).toBeInTheDocument();
    expect(screen.getByTestId('notebook-canvas')).toBeInTheDocument();
    expect(screen.queryByTestId('notebook-inspector')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restore block inspector' })).toBeInTheDocument();
    expect(screen.getAllByText('Session draft')).not.toHaveLength(0);
    expect(await screen.findByLabelText('Notebook rich document')).toBeInTheDocument();
    expect(document.querySelector('.notebook-rich-scroll-region')).not.toBeNull();
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
    expect(await screen.findByTestId('notebook-semantic-theorem')).toBeInTheDocument();
    expect(screen.queryByText('My notebooks')).not.toBeInTheDocument();
  });

  it('inserts and configures every academic container through one catalog', async () => {
    const user = userEvent.setup();
    render(<NotebookHarness />);

    await user.click(await screen.findByRole('button', { name: 'Insert academic container' }));
    const menu = screen.getByRole('menu', { name: 'Academic containers' });
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(12);
    await user.click(within(menu).getByRole('menuitem', { name: /Theorem/ }));

    const theorem = await screen.findByTestId('notebook-semantic-theorem');
    await user.click(within(theorem).getByText('Theorem'));
    const inspector = screen.getByTestId('notebook-inspector');
    const kindSelect = await within(inspector).findByLabelText('Academic container type');
    fireEvent.change(kindSelect, {
      target: { value: 'hint' },
    });
    fireEvent.change(within(inspector).getByLabelText('Container number'), {
      target: { value: '2.3' },
    });
    fireEvent.change(within(inspector).getByLabelText('Container label'), {
      target: { value: 'Try substitution' },
    });
    await user.click(within(inspector).getByRole('switch', { name: 'Start container collapsed' }));

    const hint = await screen.findByTestId('notebook-semantic-hint');
    expect(hint).toHaveTextContent('Hint 2.3 Try substitution');
    expect(within(inspector).getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    expect(within(hint).getByRole('button', { name: /Expand Hint 2.3/ })).toBeInTheDocument();
  });

  it('keeps the inspector contextual, allows pinning, and restores the last relevant block after collapse', async () => {
    const user = userEvent.setup();
    render(<NotebookHarness />);

    await user.click(await screen.findByRole('button', { name: 'Insert academic container' }));
    const menu = screen.getByRole('menu', { name: 'Academic containers' });
    await user.click(within(menu).getByRole('menuitem', { name: /Theorem/ }));

    const theorem = await screen.findByTestId('notebook-semantic-theorem');
    await user.click(within(theorem).getByText('Theorem'));
    const inspector = screen.getByTestId('notebook-inspector');
    await user.click(within(inspector).getByRole('button', { name: 'Pin block inspector' }));

    await user.click(await screen.findByLabelText('Notebook rich document'));
    expect(screen.getByTestId('notebook-inspector')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('notebook-inspector'))
        .getByRole('button', { name: 'Use automatic block inspector' }),
    ).toBeInTheDocument();

    await user.click(within(screen.getByTestId('notebook-inspector'))
      .getByRole('button', { name: 'Close block inspector' }));
    expect(screen.queryByTestId('notebook-inspector')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Restore block inspector' }));
    expect(await screen.findByTestId('notebook-inspector')).toHaveTextContent('Academic container');
  });

  it('synchronizes the outline and reorders top-level containers accessibly', async () => {
    const user = userEvent.setup();
    render(<NotebookHarness />);
    await user.click(await screen.findByRole('button', { name: 'Start from template' }));
    await user.click(screen.getByRole('button', { name: /Worked Example/ }));

    let entries = await screen.findAllByTestId('notebook-outline-entry');
    expect(entries.map((entry) => entry.textContent)).toEqual([
      expect.stringContaining('Quadratic Equations'),
      expect.stringContaining('Example'),
      expect.stringContaining('Solution'),
      expect.stringContaining('Note'),
    ]);
    await user.click(entries[2]!);
    await user.click(within(screen.getByTestId('notebook-inspector'))
      .getByRole('button', { name: 'Move Up' }));

    entries = screen.getAllByTestId('notebook-outline-entry');
    expect(entries[0]).toHaveTextContent('Quadratic Equations');
    expect(entries[1]).toHaveTextContent('Solution');
    expect(entries[2]).toHaveTextContent('Example');

    const transfer = new Map<string, string>();
    const dataTransfer = {
      dropEffect: 'none',
      effectAllowed: 'all',
      getData: (type: string) => transfer.get(type) ?? '',
      setData: (type: string, value: string) => transfer.set(type, value),
    };
    fireEvent.dragStart(entries[3]!, { dataTransfer });
    fireEvent.dragOver(entries[0]!, { dataTransfer, clientY: -1 });
    fireEvent.drop(entries[0]!, { dataTransfer, clientY: -1 });
    expect(screen.getAllByTestId('notebook-outline-entry')[0]).toHaveTextContent('Note');
  });

  it('exposes outline and inspector as mutually exclusive narrow drawers', async () => {
    const user = userEvent.setup();
    render(<NotebookHarness />);

    await user.click(screen.getByRole('button', { name: 'Toggle Notebook outline' }));
    expect(screen.getByLabelText('Notebook outline')).toHaveClass('is-drawer-open');
    await user.click(screen.getByRole('button', { name: 'Close Notebook drawer' }));
    expect(screen.getByLabelText('Notebook outline')).not.toHaveClass('is-drawer-open');

    await user.click(screen.getByRole('button', { name: 'Toggle block inspector' }));
    expect(screen.getByTestId('notebook-inspector')).toHaveClass('is-drawer-open');
    expect(screen.getByLabelText('Notebook outline')).not.toHaveClass('is-drawer-open');
  });

  it('keeps typing uninterrupted and suggests math only after explicit selection', async () => {
    const user = userEvent.setup();
    render(<NotebookHarness />);
    const canvas = await screen.findByLabelText('Notebook rich document');

    await user.click(canvas);
    await user.type(canvas, 'Solve x^2-5x+6=0 before checking roots.');

    expect(screen.queryByTestId('notebook-inline-math-node')).not.toBeInTheDocument();
    expect(screen.queryByTestId('notebook-math-suggestion')).not.toBeInTheDocument();
    expect(canvas).toHaveTextContent('Solve x^2-5x+6=0 before checking roots.');

    await user.keyboard('{Control>}a{/Control}');
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

  it('organizes authoring controls into the visible Notebook ribbon', async () => {
    render(<NotebookHarness />);

    const toolbar = await screen.findByLabelText('Notebook formatting toolbar');
    expect(within(toolbar).getByRole('region', { name: 'Font' })).toBeVisible();
    expect(within(toolbar).getByRole('region', { name: 'Paragraph' })).toBeVisible();
    expect(within(toolbar).getByRole('region', { name: 'Structure' })).toBeVisible();
    expect(within(toolbar).getByRole('region', { name: 'Math' })).toBeVisible();
    expect(within(toolbar).getByRole('region', { name: 'Edit' })).toBeVisible();
    expect(within(toolbar).getByRole('button', { name: 'In text' })).toBeVisible();
    expect(within(toolbar).getByRole('button', { name: 'Separate equation' })).toBeVisible();
    expect(within(toolbar).getByRole('button', { name: 'Add section' })).toBeVisible();
  });

  it('keeps the Outline and Inspector independent when either desktop rail closes', async () => {
    const user = userEvent.setup();
    render(<NotebookHarness />);

    await user.click(await screen.findByRole('button', { name: 'Insert academic container' }));
    await user.click(within(screen.getByRole('menu', { name: 'Academic containers' }))
      .getByRole('menuitem', { name: /Theorem/ }));
    await user.click(within(await screen.findByTestId('notebook-semantic-theorem')).getByText('Theorem'));

    const workbench = screen.getByTestId('notebook-canvas').parentElement!;
    expect(screen.getByTestId('notebook-inspector')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close Notebook outline' }));
    expect(workbench).toHaveClass('is-outline-collapsed');
    expect(screen.queryByRole('separator', { name: 'Resize Notebook outline' })).not.toBeInTheDocument();
    expect(screen.getByTestId('notebook-inspector')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restore Notebook outline' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Restore Notebook outline' }));
    expect(workbench).not.toHaveClass('is-outline-collapsed');
    expect(screen.getByRole('separator', { name: 'Resize Notebook outline' })).toBeInTheDocument();

    await user.click(within(screen.getByTestId('notebook-inspector'))
      .getByRole('button', { name: 'Close block inspector' }));
    expect(workbench).toHaveClass('is-inspector-collapsed');
    expect(screen.getByLabelText('Notebook outline')).toBeInTheDocument();
  });

  it('uses one selection-preserving paragraph style menu for Normal and heading levels', async () => {
    const user = userEvent.setup();
    render(<NotebookHarness />);
    const canvas = await screen.findByLabelText('Notebook rich document');
    const toolbar = screen.getByLabelText('Notebook formatting toolbar');

    await user.click(canvas);
    await user.type(canvas, 'Chapter title');
    await user.click(within(toolbar).getByRole('button', { name: 'Paragraph style: Normal' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Heading 2' }));
    expect(canvas.querySelector('h2')).toHaveTextContent('Chapter title');
    expect(within(toolbar).getByRole('button', { name: 'Paragraph style: Heading 2' })).toBeInTheDocument();

    await user.keyboard('{Enter}Body text');
    await user.keyboard('{Control>}a{/Control}');
    expect(within(toolbar).getByRole('button', { name: 'Paragraph style: Mixed' })).toBeInTheDocument();
    await user.click(within(toolbar).getByRole('button', { name: 'Paragraph style: Mixed' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Normal' }));
    expect(canvas.querySelector('h1, h2, h3')).toBeNull();
    expect(canvas).toHaveTextContent('Chapter titleBody text');
  });

  it('opens supported display math in the selected workspace', async () => {
    const user = userEvent.setup();
    const onOpenMathInTool = vi.fn();
    render(<NotebookHarness onOpenMathInTool={onOpenMathInTool} />);

    await user.click(await screen.findByRole('button', { name: 'Separate equation' }));
    const field = await screen.findByTestId('notebook-display-math-field') as HTMLElement & {
      setValue: (value: string) => void;
    };
    field.focus();
    field.setValue('x+1=2');
    fireEvent.input(field);

    expect(screen.getByTestId('notebook-canvas')).toContainElement(
      screen.getByTestId('notebook-authoring-keyboard'),
    );

    const inspector = screen.getByTestId('notebook-inspector');
    fireEvent.change(within(inspector).getByLabelText('Workspace'), {
      target: { value: 'equation' },
    });
    await user.click(within(inspector).getByRole('button', { name: 'Open in Tool' }));
    expect(onOpenMathInTool).toHaveBeenCalledWith('equation', 'x+1=2');
  });

  it('keeps a focused math inspector closed until another relevant block is selected', async () => {
    const user = userEvent.setup();
    render(<NotebookHarness />);

    await user.click(await screen.findByRole('button', { name: 'Separate equation' }));
    const field = await screen.findByTestId('notebook-display-math-field');
    await user.click(field);

    const inspector = screen.getByTestId('notebook-inspector');
    await user.click(within(inspector).getByRole('button', { name: 'Close block inspector' }));
    await waitFor(() => {
      expect(screen.queryByTestId('notebook-inspector')).not.toBeInTheDocument();
    });

    await user.click(await screen.findByRole('button', { name: 'Insert academic container' }));
    const menu = screen.getByRole('menu', { name: 'Academic containers' });
    await user.click(within(menu).getByRole('menuitem', { name: /Definition/ }));
    const definition = await screen.findByTestId('notebook-semantic-definition');
    await user.click(within(definition).getByText('Definition'));

    expect(await screen.findByTestId('notebook-inspector')).toHaveTextContent('Academic container');
  });

  it('converts selected math explicitly between inline and display placement', async () => {
    const user = userEvent.setup();
    render(<NotebookHarness />);
    await user.click(await screen.findByRole('button', { name: 'In text' }));
    const inlineField = await screen.findByTestId('notebook-inline-math-field');
    await user.click(inlineField);

    const inspector = screen.getByTestId('notebook-inspector');
    await waitFor(() => {
      expect(within(inspector).getByRole('button', { name: 'In text' })).toHaveClass('is-active');
    });
    await user.click(within(inspector).getByRole('button', { name: 'Separate equation' }));

    expect(await screen.findByTestId('notebook-display-math-node')).toBeInTheDocument();
    expect(screen.queryByTestId('notebook-inline-math-node')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('notebook-display-math-field'));
    await user.click(within(inspector).getByRole('button', { name: 'In text' }));
    expect(await screen.findByTestId('notebook-inline-math-node')).toBeInTheDocument();
    expect(screen.queryByTestId('notebook-display-math-node')).not.toBeInTheDocument();
  });

  it('keeps document-only structures in Notebook instead of sending them to a tool', async () => {
    const user = userEvent.setup();
    render(<NotebookHarness />);
    await user.click(await screen.findByRole('button', { name: 'Separate equation' }));
    const field = await screen.findByTestId('notebook-display-math-field') as HTMLElement & {
      setValue: (value: string) => void;
    };
    field.focus();
    field.setValue('\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}');
    fireEvent.input(field);

    const display = screen.getByTestId('notebook-display-math-node');
    expect(within(display).getByRole('button', { name: 'Open in Tool' })).toBeDisabled();
  });

  it('keeps math node rerenders bounded for the 100-block stress document', async () => {
    const user = userEvent.setup();
    render(<NotebookHarness initialState={{
      kind: 'notebook-surface-state',
      document: createNotebookPerformanceFixture(),
    }} />);

    const fields = await screen.findAllByTestId('notebook-inline-math-field');
    expect(fields).toHaveLength(150);
    resetNotebookNodeViewRenderStats();
    await user.click(fields[0]!);
    await waitFor(() => {
      expect(getNotebookNodeViewRenderStats().totalRenders).toBeLessThanOrEqual(4);
    });
  });

  it('creates, nests, renames, and collapses visible document sections', async () => {
    const user = userEvent.setup();
    render(<NotebookHarness />);

    await user.click(screen.getByRole('button', { name: 'Add top-level section' }));
    let sectionEntries = screen.getAllByTestId('notebook-outline-entry')
      .filter((entry) => entry.dataset.outlineKind === 'section');
    expect(sectionEntries).toHaveLength(1);
    expect(screen.getAllByTestId('notebook-section')).toHaveLength(1);

    await user.click(within(sectionEntries[0]!).getByRole('button', { name: /actions/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Add subsection' }));
    sectionEntries = screen.getAllByTestId('notebook-outline-entry')
      .filter((entry) => entry.dataset.outlineKind === 'section');
    expect(sectionEntries).toHaveLength(2);
    expect(sectionEntries[1]).toHaveAttribute('data-outline-depth', '1');

    const transfer = new Map<string, string>();
    const dataTransfer = {
      dropEffect: 'none',
      effectAllowed: 'all',
      getData: (type: string) => transfer.get(type) ?? '',
      setData: (type: string, value: string) => transfer.set(type, value),
    };
    fireEvent.dragStart(sectionEntries[0]!, { dataTransfer });
    fireEvent.dragOver(sectionEntries[1]!, { dataTransfer, clientX: 100 });
    fireEvent.drop(sectionEntries[1]!, { dataTransfer, clientX: 100 });
    sectionEntries = screen.getAllByTestId('notebook-outline-entry')
      .filter((entry) => entry.dataset.outlineKind === 'section');
    expect(sectionEntries[0]).toHaveAttribute('data-outline-depth', '0');
    expect(sectionEntries[1]).toHaveAttribute('data-outline-depth', '1');

    await user.click(within(sectionEntries[1]!).getByRole('button', { name: /actions/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Rename' }));
    const rename = screen.getByRole('textbox', { name: 'Rename section' });
    await user.clear(rename);
    await user.type(rename, 'Worked examples{Enter}');
    expect(screen.getByText('Worked examples')).toBeInTheDocument();

    const outline = screen.getByLabelText('Notebook outline');
    await user.click(within(outline).getByRole('button', { name: 'Collapse Untitled section' }));
    expect(screen.queryByText('Worked examples')).not.toBeInTheDocument();
    expect(within(outline).getByRole('button', { name: 'Expand Untitled section' })).toBeInTheDocument();
  });
});
