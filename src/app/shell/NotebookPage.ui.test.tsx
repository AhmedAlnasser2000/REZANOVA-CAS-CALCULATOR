import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { MathNotationProvider } from '../../components/MathNotationContext';
import {
  createNotebookLibraryService,
  createNotebookPerformanceFixture,
  createNotebookRichSurfaceState,
  type NotebookLibraryService,
  type NotebookRichDocument,
  type NotebookSurfaceState,
  type NotebookWorkspaceTarget,
} from '../../lib/notebook';
import { NotebookPage } from './NotebookPage';
import {
  getNotebookNodeViewRenderStats,
  resetNotebookNodeViewRenderStats,
} from './notebook/canvas';

let notebookHarnessSequence = 0;

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
  if (!URL.createObjectURL) {
    URL.createObjectURL = vi.fn(() => 'blob:notebook-image');
    URL.revokeObjectURL = vi.fn();
  }
});

function NotebookHarness({
  initialState,
  libraryService,
  onOpenMathInTool = vi.fn(),
  onSurfaceState = vi.fn(),
}: {
  initialState?: NotebookSurfaceState;
  libraryService?: NotebookLibraryService;
  onOpenMathInTool?: (target: NotebookWorkspaceTarget, latex: string) => void;
  onSurfaceState?: (state: NotebookSurfaceState) => void;
}) {
  const [instanceId] = useState(() => `notebook.ui.${++notebookHarnessSequence}`);
  const [fallbackLibraryService] = useState(() => createNotebookLibraryService());
  const [surfaceState, setSurfaceState] = useState<NotebookSurfaceState>(() =>
    initialState ?? createNotebookRichSurfaceState({
      idPrefix: 'test-notebook',
      now: () => new Date('2026-07-12T12:00:00.000Z'),
      title: 'Limits Notebook',
    }));

  return (
    <MathNotationProvider notationMode="latex">
      <NotebookPage
        instanceId={instanceId}
        libraryService={libraryService ?? fallbackLibraryService}
        surfaceState={surfaceState}
        onOpenMathInTool={onOpenMathInTool}
        onUpdateSurfaceState={(_, nextState) => {
          setSurfaceState(nextState);
          onSurfaceState(nextState);
        }}
      />
    </MathNotationProvider>
  );
}

async function readOnlyStoredDocument(
  service: NotebookLibraryService,
): Promise<NotebookRichDocument> {
  const [summary] = await service.library.list();
  expect(summary).toBeDefined();
  const stored = await service.library.load(summary!.libraryId);
  expect(stored).not.toBeNull();
  return stored!.document;
}

function notebookSvgFile(name = 'limit-diagram.svg') {
  const bytes = new TextEncoder().encode(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 30"><path d="M0 20 L40 10"/></svg>',
  );
  const file = new File([bytes], name, { type: 'image/svg+xml' });
  Object.defineProperty(file, 'arrayBuffer', {
    configurable: true,
    value: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  });
  return file;
}

describe('NotebookPage', () => {
  it('renders a continuous document surface with outline and canvas while the inspector stays collapsed for ordinary prose', async () => {
    render(<NotebookHarness />);

    expect(screen.getByTestId('notebook-page')).toBeInTheDocument();
    expect(await screen.findByLabelText('Notebook outline')).toBeInTheDocument();
    expect(screen.getByTestId('notebook-canvas')).toBeInTheDocument();
    expect(screen.queryByTestId('notebook-inspector')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restore block inspector' })).toBeInTheDocument();
    expect(screen.getAllByText('Saved locally')).not.toHaveLength(0);
    expect(await screen.findByText('0 words')).toBeInTheDocument();
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
    const onSurfaceState = vi.fn();
    const libraryService = createNotebookLibraryService();
    render(<NotebookHarness libraryService={libraryService} onSurfaceState={onSurfaceState} />);

    await user.click(await screen.findByRole('tab', { name: 'Insert' }));
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
    expect(within(inspector).getAllByRole('radio')).toHaveLength(7);
    await new Promise((resolve) => setTimeout(resolve, 550));
    await user.click(within(inspector).getByRole('radio', { name: /Violet accent/ }));

    let hint = await screen.findByTestId('notebook-semantic-hint');
    expect(hint).toHaveTextContent('Hint 2.3 Try substitution');
    expect(hint).toHaveAttribute('data-notebook-accent', '#b8a0e6');
    expect(hint).toHaveStyle({ '--notebook-accent': '#b8a0e6' });
    await user.click(screen.getByRole('tab', { name: 'Home' }));
    const toolbar = screen.getByLabelText('Notebook formatting toolbar');
    await user.click(within(toolbar).getByRole('button', { name: 'Undo' }));
    expect(screen.getByTestId('notebook-semantic-hint'))
      .toHaveAttribute('data-notebook-accent', 'automatic');
    await user.click(within(toolbar).getByRole('button', { name: 'Redo' }));
    expect(screen.getByTestId('notebook-semantic-hint'))
      .toHaveAttribute('data-notebook-accent', '#b8a0e6');
    hint = screen.getByTestId('notebook-semantic-hint');

    fireEvent.change(within(inspector).getByLabelText('Custom accent color'), {
      target: { value: '#000000' },
    });
    expect(await within(inspector).findByTestId('notebook-accent-warning')).toHaveTextContent('below 3:1');
    expect(screen.getByTestId('notebook-semantic-hint'))
      .toHaveAttribute('data-notebook-accent', '#000000');
    await user.click(within(inspector).getByRole('button', { name: 'Reset accent color' }));
    expect(hint).toHaveAttribute('data-notebook-accent', 'automatic');
    await user.click(within(inspector).getByRole('radio', { name: /Violet accent/ }));

    expect(within(inspector).getByRole('switch', { name: 'Collapsible' }))
      .toHaveAttribute('aria-checked', 'true');
    await user.click(within(hint).getByRole('button', { name: /Collapse Hint 2.3/ }));
    expect(within(hint).getByRole('button', { name: /Expand Hint 2.3/ })).toBeInTheDocument();

    fireEvent.change(kindSelect, { target: { value: 'theorem' } });
    const restoredTheorem = await screen.findByTestId('notebook-semantic-theorem');
    expect(restoredTheorem).toHaveAttribute('data-notebook-accent', '#b8a0e6');
    expect(within(restoredTheorem).queryByRole('button', { name: /Expand|Collapse/ })).toBeNull();
    expect(within(inspector).getByRole('switch', { name: 'Collapsible' }))
      .toHaveAttribute('aria-checked', 'false');

    await user.click(within(inspector).getByRole('switch', { name: 'Collapsible' }));
    expect(within(restoredTheorem).getByRole('button', { name: /Collapse Theorem 2.3/ }))
      .toBeInTheDocument();
    await user.click(within(restoredTheorem).getByRole('button', { name: /Collapse Theorem 2.3/ }));
    await user.click(within(inspector).getByRole('switch', { name: 'Collapsible' }));
    expect(within(restoredTheorem).queryByRole('button', { name: /Expand|Collapse/ })).toBeNull();
    expect(restoredTheorem.querySelector('.notebook-semantic-content')).not.toHaveAttribute('hidden');
    expect(within(inspector).queryByText('Start collapsed')).toBeNull();

    fireEvent.change(kindSelect, { target: { value: 'hint' } });
    const overriddenHint = await screen.findByTestId('notebook-semantic-hint');
    expect(overriddenHint).toHaveAttribute('data-notebook-accent', '#b8a0e6');
    expect(within(overriddenHint).queryByRole('button', { name: /Expand|Collapse/ })).toBeNull();
    expect(within(inspector).getByRole('switch', { name: 'Collapsible' }))
      .toHaveAttribute('aria-checked', 'false');
    fireEvent.change(kindSelect, { target: { value: 'theorem' } });

    await user.keyboard('{Control>}s{/Control}');
    await waitFor(() => expect(screen.getAllByText('Saved locally').length).toBeGreaterThan(0));
    const storedDocument = await readOnlyStoredDocument(libraryService);
    expect(storedDocument.version).toBe(7);
    const persistedContainer = storedDocument.content.find((node) => node.type === 'semanticBlock');
    expect(persistedContainer).toMatchObject({
      type: 'semanticBlock',
      variant: 'theorem',
      accentColor: '#b8a0e6',
      collapsible: false,
    });
    expect(persistedContainer).not.toHaveProperty('collapsed', true);
  });

  it('keeps the inspector contextual and supports pinned, collapsed, and manual-empty modes', async () => {
    const user = userEvent.setup();
    render(<NotebookHarness />);

    await user.click(await screen.findByRole('tab', { name: 'Insert' }));
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
    expect(await screen.findByTestId('notebook-inspector-empty')).toHaveTextContent(
      'Select a container, section, or equation to inspect its settings.',
    );

    await user.click(within(theorem).getByText('Theorem'));
    expect(screen.getByTestId('notebook-inspector')).toHaveTextContent('Academic container');
    const outsideParagraph = screen.getByLabelText('Notebook rich document').querySelector('p');
    expect(outsideParagraph).not.toBeNull();
    await user.click(outsideParagraph!);
    expect(screen.getByTestId('notebook-inspector')).toBeInTheDocument();
    expect(screen.getByTestId('notebook-inspector-empty')).toBeInTheDocument();
  });

  it('inspects a container body with one click while preserving direct prose editing', async () => {
    const user = userEvent.setup();
    render(<NotebookHarness />);

    await user.click(await screen.findByRole('tab', { name: 'Insert' }));
    await user.click(await screen.findByRole('button', { name: 'Insert academic container' }));
    await user.click(within(screen.getByRole('menu', { name: 'Academic containers' }))
      .getByRole('menuitem', { name: /Definition/ }));
    const definition = await screen.findByTestId('notebook-semantic-definition');
    const canvas = screen.getByLabelText('Notebook rich document');
    const outsideParagraph = canvas.querySelector('p');
    const insideParagraph = definition.querySelector('p');
    expect(outsideParagraph).not.toBeNull();
    expect(insideParagraph).not.toBeNull();

    await user.click(outsideParagraph!);
    expect(screen.queryByTestId('notebook-inspector')).not.toBeInTheDocument();
    await user.click(insideParagraph!);
    expect(await screen.findByTestId('notebook-inspector')).toHaveTextContent('Academic container');
    expect(definition).not.toHaveClass('ProseMirror-selectednode');
    expect(canvas).toHaveFocus();
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

    await user.click(await screen.findByRole('button', { name: 'Toggle Notebook outline' }));
    expect(screen.getByLabelText('Notebook outline')).toHaveClass('is-drawer-open');
    await user.click(screen.getByRole('button', { name: 'Close Notebook drawer' }));
    expect(screen.getByLabelText('Notebook outline')).not.toHaveClass('is-drawer-open');

    await user.click(screen.getByRole('button', { name: 'Toggle block inspector' }));
    expect(screen.getByTestId('notebook-inspector')).toHaveClass('is-drawer-open');
    expect(screen.getByTestId('notebook-inspector-empty')).toBeInTheDocument();
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

  it('persists underline, alignment, and line/paragraph spacing with undo and reset', async () => {
    const user = userEvent.setup();
    const onSurfaceState = vi.fn();
    const libraryService = createNotebookLibraryService();
    render(<NotebookHarness libraryService={libraryService} onSurfaceState={onSurfaceState} />);
    const canvas = await screen.findByLabelText('Notebook rich document');
    const toolbar = screen.getByLabelText('Notebook formatting toolbar');

    await user.click(canvas);
    await user.type(canvas, 'Alpha{Enter}Beta');
    await user.keyboard('{Control>}a{/Control}');
    await user.keyboard('{Control>}u{/Control}');
    expect(within(toolbar).getByRole('button', { name: 'Underline' }))
      .toHaveAttribute('aria-pressed', 'true');
    await user.click(within(toolbar).getByRole('button', { name: 'Justify' }));
    await user.click(within(toolbar).getByRole('button', { name: /Line and paragraph spacing/ }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Line spacing 2' }));
    await user.click(within(toolbar).getByRole('button', { name: /Line and paragraph spacing/ }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Before 12 pt' }));

    expect(canvas.querySelectorAll('u')).toHaveLength(2);
    expect(canvas.querySelectorAll("p[data-notebook-alignment='justify']")).toHaveLength(2);
    expect(canvas.querySelectorAll("p[data-notebook-line-spacing='2']")).toHaveLength(2);
    expect(canvas.querySelectorAll("p[data-notebook-space-before-pt='12']")).toHaveLength(2);
    await user.keyboard('{Control>}s{/Control}');
    await waitFor(() => expect(screen.getAllByText('Saved locally').length).toBeGreaterThan(0));
    const storedDocument = await readOnlyStoredDocument(libraryService);
    expect(storedDocument.content).toEqual([
      expect.objectContaining({
        type: 'paragraph',
        format: expect.objectContaining({
          alignment: 'justify',
          lineSpacing: 2,
          spaceBeforePt: 12,
        }),
      }),
      expect.objectContaining({
        type: 'paragraph',
        format: expect.objectContaining({
          alignment: 'justify',
          lineSpacing: 2,
          spaceBeforePt: 12,
        }),
      }),
    ]);

    await user.click(within(toolbar).getByRole('button', { name: 'Undo' }));
    expect(canvas.querySelector("p[data-notebook-space-before-pt='12']")).toBeNull();
    await user.click(within(toolbar).getByRole('button', { name: 'Redo' }));
    expect(canvas.querySelectorAll("p[data-notebook-space-before-pt='12']")).toHaveLength(2);
    await user.click(within(toolbar).getByRole('button', { name: /Line and paragraph spacing/ }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Default spacing' }));
    expect(canvas.querySelector('[data-notebook-line-spacing]')).toBeNull();
    expect(canvas.querySelector('[data-notebook-space-before-pt]')).toBeNull();
    expect(canvas.querySelectorAll("p[data-notebook-alignment='justify']")).toHaveLength(2);
  });

  it('creates and converts visibly styled lists while preserving serialized list style', async () => {
    const user = userEvent.setup();
    const onSurfaceState = vi.fn();
    const libraryService = createNotebookLibraryService();
    render(<NotebookHarness libraryService={libraryService} onSurfaceState={onSurfaceState} />);
    const canvas = await screen.findByLabelText('Notebook rich document');
    const toolbar = screen.getByLabelText('Notebook formatting toolbar');

    await user.click(canvas);
    await user.type(canvas, 'First{Enter}Second');
    await user.keyboard('{Control>}a{/Control}');
    await user.click(within(toolbar).getByRole('button', { name: 'Bullet styles' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Dash bullets' }));
    expect(canvas.querySelector("ul[data-notebook-list-style='dash']")).not.toBeNull();

    await user.click(within(toolbar).getByRole('button', { name: 'Numbering styles' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Lower-alpha numbering' }));
    expect(canvas.querySelector("ol[data-notebook-list-style='lower-alpha']")).not.toBeNull();
    await user.keyboard('{Control>}s{/Control}');
    await waitFor(() => expect(screen.getAllByText('Saved locally').length).toBeGreaterThan(0));
    const storedDocument = await readOnlyStoredDocument(libraryService);
    expect(storedDocument.content[0]).toMatchObject({
      type: 'orderedList',
      style: 'lower-alpha',
      content: [expect.any(Object), expect.any(Object)],
    });
  });

  it('formats eligible prose nested inside sections and academic containers, not their shells', async () => {
    const user = userEvent.setup();
    render(<NotebookHarness />);
    await user.click(await screen.findByRole('button', { name: 'Start from template' }));
    await user.click(screen.getByRole('button', { name: /Theorem Sheet/ }));
    const canvas = screen.getByLabelText('Notebook rich document');
    await user.click(canvas);
    await user.keyboard('{Control>}a{/Control}');
    await user.click(within(screen.getByLabelText('Notebook formatting toolbar'))
      .getByRole('button', { name: 'Align center' }));

    expect(canvas.querySelectorAll('p, h1, h2, h3').length).toBeGreaterThan(1);
    expect(canvas.querySelectorAll("p[data-notebook-alignment='center'], h1[data-notebook-alignment='center'], h2[data-notebook-alignment='center'], h3[data-notebook-alignment='center']"))
      .toHaveLength(canvas.querySelectorAll('p, h1, h2, h3').length);
    expect(canvas.querySelector('[data-notebook-semantic][data-notebook-alignment]')).toBeNull();
    expect(canvas.querySelector('[data-notebook-section][data-notebook-alignment]')).toBeNull();
  });

  it('organizes authoring controls into the visible Notebook ribbon', async () => {
    const user = userEvent.setup();
    render(<NotebookHarness />);

    const tabs = await screen.findByRole('tablist', { name: 'Notebook ribbon tabs' });
    expect(screen.getByRole('button', { name: 'File' })).toBeVisible();
    expect(within(tabs).getByRole('tab', { name: 'Home' })).toHaveAttribute('aria-selected', 'true');
    expect(within(tabs).getByRole('tab', { name: 'Insert' })).toHaveAttribute('aria-selected', 'false');
    expect(within(tabs).queryByRole('tab', { name: 'Layout' })).toBeNull();
    const toolbar = await screen.findByLabelText('Notebook formatting toolbar');
    expect(within(toolbar).getByRole('region', { name: 'Font' })).toBeVisible();
    expect(within(toolbar).getByRole('region', { name: 'Paragraph' })).toBeVisible();
    expect(within(toolbar).getByRole('region', { name: 'Styles' })).toBeVisible();
    expect(within(toolbar).getByRole('region', { name: 'Edit' })).toBeVisible();

    await user.click(within(tabs).getByRole('tab', { name: 'Insert' }));
    expect(within(toolbar).getByRole('region', { name: 'Structure' })).toBeVisible();
    expect(within(toolbar).getByRole('region', { name: 'Math' })).toBeVisible();
    expect(within(toolbar).getByRole('region', { name: 'Media' })).toBeVisible();
    expect(within(toolbar).getByRole('region', { name: 'Document' })).toBeVisible();
    expect(within(toolbar).getByRole('button', { name: 'In text' })).toBeVisible();
    expect(within(toolbar).getByRole('button', { name: 'Separate equation' })).toBeVisible();
    expect(within(toolbar).getByRole('button', { name: 'Add section' })).toBeVisible();
    expect(within(toolbar).getByRole('button', { name: /Image/ })).toBeEnabled();
    expect(within(toolbar).getByRole('button', { name: /Video/ })).toBeDisabled();
    expect(within(toolbar).getByRole('button', { name: 'Insert evidence' })).toBeVisible();
    expect(within(toolbar).getByRole('button', { name: 'Insert divider' })).toBeVisible();
  });

  it('preserves the prose range across ribbon tabs and inserts document blocks with undo and redo', async () => {
    const user = userEvent.setup();
    render(<NotebookHarness />);
    const canvas = await screen.findByLabelText('Notebook rich document');
    const toolbar = screen.getByLabelText('Notebook formatting toolbar');

    await user.click(canvas);
    await user.type(canvas, 'Ribbon selection');
    await user.keyboard('{Control>}a{/Control}');
    await user.click(within(toolbar).getByRole('button', { name: 'Paragraph style: Normal' }));
    expect(screen.getByRole('menu', { name: 'Paragraph styles' })).toBeVisible();
    await user.click(screen.getByRole('tab', { name: 'Insert' }));
    expect(screen.queryByRole('menu', { name: 'Paragraph styles' })).toBeNull();

    await user.click(screen.getByRole('tab', { name: 'Home' }));
    await user.click(within(toolbar).getByRole('button', { name: 'Bold' }));
    expect(canvas.querySelector('strong')).toHaveTextContent('Ribbon selection');

    await user.click(screen.getByRole('tab', { name: 'Insert' }));
    await user.click(within(toolbar).getByRole('button', { name: 'Insert evidence' }));
    expect(screen.getByTestId('notebook-evidence-node')).toBeInTheDocument();
    await user.click(within(toolbar).getByRole('button', { name: 'Insert divider' }));
    expect(canvas.querySelector('hr')).not.toBeNull();

    await user.click(screen.getByRole('tab', { name: 'Home' }));
    await user.click(within(toolbar).getByRole('button', { name: 'Undo' }));
    expect(canvas.querySelector('hr')).toBeNull();
    await user.click(within(toolbar).getByRole('button', { name: 'Undo' }));
    expect(screen.queryByTestId('notebook-evidence-node')).toBeNull();
    await user.click(within(toolbar).getByRole('button', { name: 'Redo' }));
    await user.click(within(toolbar).getByRole('button', { name: 'Redo' }));
    expect(screen.getByTestId('notebook-evidence-node')).toBeInTheDocument();
    expect(canvas.querySelector('hr')).not.toBeNull();
  });

  it('keeps the Outline and Inspector independent when either desktop rail closes', async () => {
    const user = userEvent.setup();
    render(<NotebookHarness />);

    await user.click(await screen.findByRole('tab', { name: 'Insert' }));
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
    expect(screen.getByRole('menuitemradio', { name: 'Normal' })).toHaveTextContent('Body text');
    expect(screen.getByRole('menuitemradio', { name: 'Heading 1' })).toHaveTextContent('Main topic');
    expect(screen.getByRole('menuitemradio', { name: 'Heading 2' })).toHaveTextContent('Section');
    expect(screen.getByRole('menuitemradio', { name: 'Heading 3' })).toHaveTextContent('Subsection');
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

    await user.click(await screen.findByRole('tab', { name: 'Insert' }));
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

    await user.click(await screen.findByRole('tab', { name: 'Insert' }));
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
    await user.click(await screen.findByRole('tab', { name: 'Insert' }));
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
    await user.click(await screen.findByRole('tab', { name: 'Insert' }));
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

  it('reports authored words instead of presenting the internal block count as a limit', async () => {
    render(<NotebookHarness initialState={{
      kind: 'notebook-surface-state',
      document: createNotebookPerformanceFixture('medium'),
    }} />);

    expect(await screen.findByText('6,400 words')).toBeInTheDocument();
    expect(screen.queryByText(/1,000 blocks/)).not.toBeInTheDocument();
  });

  it('inserts a safe image as one durable figure with accessibility and caption metadata', async () => {
    const user = userEvent.setup();
    const libraryService = createNotebookLibraryService();
    render(<NotebookHarness libraryService={libraryService} />);

    await user.click(await screen.findByRole('tab', { name: 'Insert' }));
    await user.upload(screen.getByLabelText('Choose image'), notebookSvgFile());
    const dialog = await screen.findByRole('dialog', { name: 'Insert image' });
    await user.click(within(dialog).getByRole('button', { name: 'Insert image' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Alternative text is empty');
    await user.type(within(dialog).getByLabelText('Alternative text'), 'A line approaching a finite limit.');
    await user.type(within(dialog).getByLabelText(/Caption/), 'Limit diagram');
    await user.click(within(dialog).getByRole('button', { name: 'Insert image' }));

    const figure = await screen.findByTestId('notebook-image-figure');
    expect(within(figure).getByRole('img', { name: 'A line approaching a finite limit.' }))
      .toBeInTheDocument();
    expect(figure).toHaveTextContent('Figure 1. Limit diagram');
    expect(screen.getByRole('tab', { name: 'Picture Format' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const figureOutline = screen.getAllByTestId('notebook-outline-entry')
      .find((entry) => entry.dataset.outlineKind === 'imageFigure');
    expect(figureOutline).toHaveTextContent('Limit diagram');

    await user.keyboard('{Control>}s{/Control}');
    await waitFor(() => expect(screen.getAllByText('Saved locally').length).toBeGreaterThan(0));
    const [summary] = await libraryService.library.list();
    const stored = await libraryService.library.load(summary!.libraryId);
    expect(stored?.assetIds).toHaveLength(1);
    expect(stored?.document.content).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'imageFigure',
        altText: 'A line approaching a finite limit.',
        caption: 'Limit diagram',
        numbered: true,
      }),
    ]));
    expect(await libraryService.asset.load(stored!.assetIds[0]!)).not.toBeNull();

    await user.click(screen.getByRole('tab', { name: 'Home' }));
    await user.click(within(screen.getByLabelText('Notebook formatting toolbar'))
      .getByRole('button', { name: 'Undo' }));
    expect(screen.queryByTestId('notebook-image-figure')).not.toBeInTheDocument();
    await user.click(within(screen.getByLabelText('Notebook formatting toolbar'))
      .getByRole('button', { name: 'Redo' }));
    const restoredFigure = await screen.findByTestId('notebook-image-figure');
    expect(screen.getByRole('tab', { name: 'Home' })).toHaveAttribute('aria-selected', 'true');
    await user.click(restoredFigure);
    expect(screen.getByRole('tab', { name: 'Home' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: 'Picture Format' }));
    await user.click(within(screen.getByLabelText('Notebook formatting toolbar')).getByRole(
      'button',
      { name: 'Edit image alternative text and decorative state' },
    ));
    const details = await screen.findByRole('dialog', { name: 'Picture details' });
    await user.click(within(details).getByRole('checkbox', { name: /Decorative image/ }));
    await user.clear(within(details).getByLabelText(/Caption/));
    await user.click(within(details).getByRole('button', { name: 'Save details' }));
    expect(restoredFigure.querySelector('img')).toHaveAttribute('alt', '');
    expect(screen.queryAllByTestId('notebook-outline-entry')
      .some((entry) => entry.dataset.outlineKind === 'imageFigure')).toBe(false);
  });

  it('accepts image paste and drop paths while rejecting GIF before asset storage', async () => {
    const user = userEvent.setup();
    const libraryService = createNotebookLibraryService();
    render(<NotebookHarness libraryService={libraryService} />);
    await screen.findByLabelText('Notebook rich document');
    const scrollRegion = document.querySelector('.notebook-rich-scroll-region')!;

    fireEvent.paste(scrollRegion, {
      clipboardData: { files: [notebookSvgFile('pasted.svg')] },
    });
    let dialog = await screen.findByRole('dialog', { name: 'Insert image' });
    await user.click(within(dialog).getByRole('checkbox', { name: /Decorative image/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Insert image' }));
    expect(await screen.findAllByTestId('notebook-image-figure')).toHaveLength(1);

    const dropped = notebookSvgFile('dropped.svg');
    fireEvent.drop(scrollRegion, {
      clientX: 40,
      clientY: 40,
      dataTransfer: {
        files: { length: 1, item: () => dropped },
      },
    });
    dialog = await screen.findByRole('dialog', { name: 'Insert image' });
    await user.click(within(dialog).getByRole('checkbox', { name: /Decorative image/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Insert image' }));
    expect(await screen.findAllByTestId('notebook-image-figure')).toHaveLength(2);

    await user.click(screen.getByRole('tab', { name: 'Insert' }));
    const gifBytes = new TextEncoder().encode('GIF89a');
    const gif = new File([gifBytes], 'animated.gif', { type: 'image/gif' });
    Object.defineProperty(gif, 'arrayBuffer', { value: async () => gifBytes.buffer });
    fireEvent.change(screen.getByLabelText('Choose image'), { target: { files: [gif] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('GIF images are not supported');
    expect(screen.getAllByTestId('notebook-image-figure')).toHaveLength(2);
  });

  it('dismisses image staging with Escape and creates no node when durable storage fails', async () => {
    const user = userEvent.setup();
    const libraryService = createNotebookLibraryService();
    render(<NotebookHarness libraryService={libraryService} />);

    await user.click(await screen.findByRole('tab', { name: 'Insert' }));
    await user.upload(screen.getByLabelText('Choose image'), notebookSvgFile('cancelled.svg'));
    expect(await screen.findByRole('dialog', { name: 'Insert image' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(
      screen.queryByRole('dialog', { name: 'Insert image' }),
    ).not.toBeInTheDocument());
    expect(screen.queryByTestId('notebook-image-figure')).not.toBeInTheDocument();

    vi.spyOn(libraryService.asset, 'put')
      .mockRejectedValueOnce(new Error('Notebook storage quota is unavailable.'));
    await user.upload(screen.getByLabelText('Choose image'), notebookSvgFile('quota.svg'));
    const dialog = await screen.findByRole('dialog', { name: 'Insert image' });
    await user.click(within(dialog).getByRole('checkbox', { name: /Decorative image/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Insert image' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('storage quota is unavailable');
    expect(screen.queryByTestId('notebook-image-figure')).not.toBeInTheDocument();
    expect((await libraryService.library.list())[0]?.assetCount).toBe(0);
  });

  it('creates, nests, renames, and collapses visible document sections', async () => {
    const user = userEvent.setup();
    render(<NotebookHarness />);

    await user.click(await screen.findByRole('button', { name: 'Add top-level section' }));
    let sectionEntries = screen.getAllByTestId('notebook-outline-entry')
      .filter((entry) => entry.dataset.outlineKind === 'section');
    expect(sectionEntries).toHaveLength(1);
    expect(screen.getAllByTestId('notebook-section')).toHaveLength(1);
    const firstSection = screen.getAllByTestId('notebook-section')[0]!;
    const sectionInspector = screen.getByTestId('notebook-inspector');
    expect(within(sectionInspector).getByLabelText('Inspector section title'))
      .toHaveValue('Untitled section');
    fireEvent.change(within(sectionInspector).getByLabelText('Inspector section title'), {
      target: { value: 'Foundations' },
    });
    expect(within(firstSection).getByLabelText('Section title')).toHaveValue('Foundations');
    fireEvent.change(within(sectionInspector).getByLabelText('Inspector section title'), {
      target: { value: 'Untitled section' },
    });
    await user.click(within(sectionInspector).getByRole('radio', { name: /Amber accent/ }));
    expect(firstSection).toHaveAttribute('data-notebook-accent', '#d3ad63');
    const sectionCollapsible = within(sectionInspector).getByRole('switch', { name: 'Collapsible' });
    await user.click(sectionCollapsible);
    expect(within(firstSection).queryByRole('button', { name: 'Collapse Untitled section' })).toBeNull();
    await user.click(sectionCollapsible);
    expect(within(firstSection).getByRole('button', { name: 'Collapse Untitled section' }))
      .toBeInTheDocument();

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
    expect(screen.getAllByText('Worked examples')).not.toHaveLength(0);

    await user.click(within(firstSection).getByRole('button', { name: 'Collapse Untitled section' }));
    expect(screen.getAllByTestId('notebook-outline-entry')
      .filter((entry) => entry.textContent?.includes('Worked examples'))).toHaveLength(0);
    expect(within(firstSection).getByRole('button', { name: 'Expand Untitled section' }))
      .toBeInTheDocument();
    expect(within(screen.getByLabelText('Notebook outline'))
      .queryByRole('button', { name: /Expand Untitled section|Collapse Untitled section/ }))
      .toBeNull();
  });
});
