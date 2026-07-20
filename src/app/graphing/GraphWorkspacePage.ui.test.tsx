import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphSampleRequestV4 } from '../../lib/graphing';
import { createGraphWorkspaceSessionState } from './graph-workspace-session';
import { createGraphNoteItem, replaceGraphDocumentNote } from './graph-document';
import GraphWorkspacePage from './GraphWorkspacePage';
import '../../styles/app/shell.css';
import '../../styles/app/graphing.css';

const { runGraphSampleWithOoe } = vi.hoisted(() => ({
  runGraphSampleWithOoe: vi.fn(async (request: GraphSampleRequestV4) => ({
  payload: {
    version: 4 as const,
    requestId: request.requestId,
    workspaceInstanceId: request.workspaceInstanceId,
    documentId: request.documentId,
    revisions: request.revisions,
    viewport: request.viewport,
    quality: request.quality,
    status: 'complete' as const,
    scene: {
      sceneRevision: request.revisions.scene,
      mathematicsRevision: request.revisions.mathematics,
      viewportRevision: request.revisions.viewport,
      parameterRevision: request.revisions.parameter,
      paths: request.items.filter((item) => item.visible && (item.kind === 'relation' || item.kind === 'piecewise')).map((item) => ({
        pathId: `${item.itemId}.path`,
        itemId: item.itemId,
        coordinates: new Float64Array([-2, -2, 0, 0, 2, 2]),
        segmentOffsets: new Uint32Array([0]),
        parameterValues: new Float64Array([-2, 0, 2]),
        closed: false,
      })),
      regions: [],
      pointBatches: request.items.filter((item) => item.visible && item.kind === 'point-set').map((item) => ({
        pointBatchId: `${item.itemId}.points`,
        itemId: item.itemId,
        coordinates: new Float64Array([1, 2, 3, 4]),
      })),
      labels: [],
    },
    snapshotHash: 'graph64:test',
    stopReasons: [],
    itemEvidence: request.items.filter((item) => item.visible).map((item) => ({
      itemId: item.itemId,
      route: item.kind === 'relation' ? item.relation.kind : item.kind,
      achievedQuality: request.quality === 'preview' ? 'coarse' as const : request.quality === 'settled' ? 'settled' as const : 'polished' as const,
      estimatedMaximumErrorPixels: 0.2,
      cache: 'miss' as const,
      refinable: request.quality !== 'polish',
    })),
    evidence: { sampleCount: 3, vertexCount: 3, elapsedMs: 1, cacheBytes: 0, schedulerPasses: 1 },
  },
  ooe: {
    commitAssessment: { legality: 'commitAllowed' as const },
    releasedBufferBytes: 0,
  },
  })),
}));

vi.mock('../../lib/graphing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/graphing')>()),
  buildGraphSampleInputRevisionId: vi.fn((request: GraphSampleRequestV4) => (
    `input.graph.sample.${request.revisions.scene}`
  )),
  releaseGraphSampleResultBuffers: vi.fn(() => 0),
  runGraphSampleWithOoe,
}));

const workspaceContext = {
  workspaceInstanceId: 'graphing.2',
  workspaceInstanceLabel: 'Untitled Graph',
  workspaceInstanceRevision: 1,
  workspaceKind: 'graphing',
  compartmentId: 'graphing',
  compartmentLabel: 'Graphing',
} as const;

function setMathFieldValue(field: HTMLElement, value: string) {
  (field as HTMLElement & { setValue: (latex: string) => void }).setValue(value);
  fireEvent.input(field);
}

describe('GraphWorkspacePage', () => {
  beforeEach(() => {
    runGraphSampleWithOoe.mockClear();
  });

  it('creates focused Notes, reorders them, and never samples content-only edits', async () => {
    const onUpdateSession = vi.fn();
    render(
      <GraphWorkspacePage
        onUpdateSession={onUpdateSession}
        session={createGraphWorkspaceSessionState('graphing.2', 'Untitled Graph')}
        workspaceContext={workspaceContext}
      />,
    );
    await waitFor(() => expect(runGraphSampleWithOoe).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 600));
    runGraphSampleWithOoe.mockClear();

    fireEvent.click(screen.getByRole('button', { name: '+ Add item' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Note' }));
    const first = await screen.findByRole('textbox', { name: 'Graph note' });
    await waitFor(() => expect(first).toHaveFocus());
    fireEvent.change(first, { target: { value: 'First note' } });
    await new Promise((resolve) => setTimeout(resolve, 260));
    expect(runGraphSampleWithOoe).not.toHaveBeenCalled();
    expect(onUpdateSession.mock.calls.at(-1)?.[0].document).toMatchObject({
      version: 2, mathematicsRevision: 0,
    });

    fireEvent.click(screen.getByRole('button', { name: '+ Add item' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Note' }));
    const notes = screen.getAllByRole('textbox', { name: 'Graph note' });
    fireEvent.change(notes[1]!, { target: { value: 'Second note' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move item 2 up' }));
    expect(screen.getAllByRole('textbox', { name: 'Graph note' }).map((note) => (
      (note as HTMLTextAreaElement).value
    ))).toEqual(['Second note', 'First note']);

    const firstHandle = screen.getByRole('button', { name: 'Reorder item 1' });
    fireEvent.keyDown(firstHandle, { key: ' ' });
    fireEvent.keyDown(firstHandle, { key: 'ArrowDown' });
    fireEvent.keyDown(firstHandle, { key: ' ' });
    expect(screen.getAllByRole('textbox', { name: 'Graph note' }).map((note) => (
      (note as HTMLTextAreaElement).value
    ))).toEqual(['First note', 'Second note']);

    const transfer = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: 'none',
      getData: (type: string) => transfer.get(type) ?? '',
      setData: (type: string, value: string) => transfer.set(type, value),
    };
    fireEvent.dragStart(screen.getByRole('button', { name: 'Reorder item 2' }), { dataTransfer });
    fireEvent.drop(screen.getAllByTestId('graph-persisted-row')[0]!, { dataTransfer });
    expect(screen.getAllByRole('textbox', { name: 'Graph note' }).map((note) => (
      (note as HTMLTextAreaElement).value
    ))).toEqual(['Second note', 'First note']);

    fireEvent.change(screen.getAllByRole('textbox', { name: 'Graph note' })[0]!, {
      target: { value: 'x'.repeat(16_385) },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('No text was removed');
    expect((screen.getAllByRole('textbox', { name: 'Graph note' })[0] as HTMLTextAreaElement).value)
      .toBe('Second note');
  });

  it('renders Notes read-only when the presentation rail is active', () => {
    const base = createGraphWorkspaceSessionState('graphing.2', 'Untitled Graph');
    const note = { ...createGraphNoteItem('note.1'), text: 'Presentation note' };
    const session = {
      ...base,
      document: replaceGraphDocumentNote(base.document, note),
      surface: { ...base.surface, presentationMode: true },
    };
    render(
      <GraphWorkspacePage
        onUpdateSession={vi.fn()}
        session={session}
        workspaceContext={workspaceContext}
      />,
    );
    const textarea = screen.getByRole('textbox', { name: 'Graph note' });
    expect(textarea).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: 'Delete note' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reorder item 1' })).not.toBeInTheDocument();
  });

  it('keeps one trailing blank row and plots a bare x expression without requiring y=', async () => {
    render(
      <GraphWorkspacePage
        onUpdateSession={vi.fn()}
        session={createGraphWorkspaceSessionState('graphing.2', 'Untitled Graph')}
        workspaceContext={workspaceContext}
      />,
    );

    expect(screen.getAllByTestId('graph-expression-blank-row')).toHaveLength(1);
    const blankField = screen.getByTestId('graph-expression-editor-graphing.2.item.1');
    setMathFieldValue(blankField, '\\sin(x)');

    expect(screen.getAllByTestId('graph-expression-row')).toHaveLength(1);
    expect(screen.getAllByTestId('graph-expression-blank-row')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Reorder item/u })).not.toBeInTheDocument();
    await waitFor(() => expect(runGraphSampleWithOoe).toHaveBeenCalled());
    const request = runGraphSampleWithOoe.mock.calls.at(-1)?.[0];
    expect(request?.items[0]).toMatchObject({
      source: { sourceLatex: '\\sin(x)' },
      relation: { kind: 'explicit-y', origin: 'bare-expression' },
    });
    await waitFor(() => expect(screen.getByTestId('graph-scene-paths').querySelector('path')).not.toBeNull());
  });

  it('preserves the exact MathLive element when the first character promotes its row', () => {
    render(
      <GraphWorkspacePage
        onUpdateSession={vi.fn()}
        session={createGraphWorkspaceSessionState('graphing.2', 'Untitled Graph')}
        workspaceContext={workspaceContext}
      />,
    );

    const blankField = screen.getByTestId('graph-expression-editor-graphing.2.item.1');
    blankField.focus();
    setMathFieldValue(blankField, 's');

    expect(screen.getByTestId('graph-expression-editor-graphing.2.item.1')).toBe(blankField);
    expect(screen.getAllByTestId('graph-expression-row')).toHaveLength(1);
    expect(screen.getAllByTestId('graph-expression-blank-row')).toHaveLength(1);
  });

  it('renders explicit-x relations and finite point sets through distinct scene routes', async () => {
    render(
      <GraphWorkspacePage
        onUpdateSession={vi.fn()}
        session={createGraphWorkspaceSessionState('graphing.2', 'Untitled Graph')}
        workspaceContext={workspaceContext}
      />,
    );

    setMathFieldValue(screen.getByTestId('graph-expression-editor-graphing.2.item.1'), 'x=y^2');
    setMathFieldValue(
      screen.getByTestId('graph-expression-editor-graphing.2.item.2'),
      '\\{(1,2),(3,4)\\}',
    );

    await waitFor(() => expect(runGraphSampleWithOoe).toHaveBeenCalled());
    const request = runGraphSampleWithOoe.mock.calls.at(-1)?.[0];
    expect(request?.items.map((item) => item.kind)).toEqual(['relation', 'point-set']);
    expect(request?.items[0]).toMatchObject({ relation: { kind: 'explicit-x' } });
    await waitFor(() => expect(screen.getByTestId('graph-scene-paths').querySelectorAll('path')).toHaveLength(1));
    expect(screen.getByTestId('graph-scene-points').querySelectorAll('circle')).toHaveLength(2);
  });

  it('sends implicit inequalities as structured relation authority', async () => {
    render(
      <GraphWorkspacePage
        onUpdateSession={vi.fn()}
        session={createGraphWorkspaceSessionState('graphing.2', 'Untitled Graph')}
        workspaceContext={workspaceContext}
      />,
    );

    setMathFieldValue(
      screen.getByTestId('graph-expression-editor-graphing.2.item.1'),
      'x^2+y^2\\le 9',
    );

    await waitFor(() => expect(runGraphSampleWithOoe).toHaveBeenCalled());
    expect(runGraphSampleWithOoe.mock.calls.at(-1)?.[0].items[0]).toMatchObject({
      kind: 'relation',
      relation: { kind: 'inequality', operator: '<=' },
    });
  });

  it('plots polar and parametric authority while offering an explicit polar-grid switch', async () => {
    render(
      <GraphWorkspacePage
        onUpdateSession={vi.fn()}
        session={createGraphWorkspaceSessionState('graphing.2', 'Untitled Graph')}
        workspaceContext={workspaceContext}
      />,
    );
    setMathFieldValue(
      screen.getByTestId('graph-expression-editor-graphing.2.item.1'),
      'r=2\\cos(2\\theta)',
    );
    expect(await screen.findByRole('button', { name: 'Switch to Polar grid' })).toBeVisible();
    await waitFor(() => expect(runGraphSampleWithOoe.mock.calls.some(
      ([request]) => request.items[0]?.kind === 'relation'
        && request.items[0].relation.kind === 'polar-radius',
    )).toBe(true), { timeout: 2_500 });
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Polar grid' }));
    expect(screen.getByRole('region', { name: /Interactive polar graph/u })).toBeVisible();
    setMathFieldValue(
      screen.getByTestId('graph-expression-editor-graphing.2.item.2'),
      '(\\cos(t),\\sin(t))',
    );
    await waitFor(() => expect(runGraphSampleWithOoe.mock.calls.at(-1)?.[0].items[1])
      .toMatchObject({ relation: { kind: 'parametric-curve', parameterSymbol: 't' } }));

    fireEvent.click(screen.getByRole('button', { name: 'Grid & Axes' }));
    expect(screen.getByRole('region', { name: 'Grid and axes settings' })).toBeVisible();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Unit Circle overlay' }));
    await waitFor(() => expect(runGraphSampleWithOoe.mock.calls.some(
      ([request]) => request.overlays.unitCircle,
    )).toBe(true));
  });

  it('opens guided piecewise branches while retaining structured direct-entry authority', async () => {
    render(
      <GraphWorkspacePage
        onUpdateSession={vi.fn()}
        session={createGraphWorkspaceSessionState('graphing.2', 'Untitled Graph')}
        workspaceContext={workspaceContext}
      />,
    );
    setMathFieldValue(
      screen.getByTestId('graph-expression-editor-graphing.2.item.1'),
      'y=\\begin{cases}x^2&x<0\\\\\\sqrt{x}&x\\ge0\\end{cases}',
    );
    await waitFor(() => expect(runGraphSampleWithOoe).toHaveBeenCalled());
    expect(runGraphSampleWithOoe.mock.calls.at(-1)?.[0].items[0]).toMatchObject({
      kind: 'piecewise',
      piecewise: { branches: [{ condition: { kind: 'comparison' } }, { condition: { kind: 'comparison' } }] },
    });
    const summary = screen.getByTestId('graph-piecewise-summary');
    const summaryEditor = screen.getByTestId('graph-expression-editor-graphing.2.item.1');
    const row = summary.closest('[data-testid="graph-expression-row"]');
    const expand = screen.getByRole('button', { name: 'Expand piecewise branches' });
    expect(summary).toBeVisible();
    expect(row).toHaveAttribute('data-piecewise-state', 'summary');
    expect(expand).toHaveAttribute('aria-expanded', 'false');
    expect(summaryEditor).toHaveAttribute('tabindex', '0');
    expect(screen.queryByRole('button', { name: /Reorder item/u })).not.toBeInTheDocument();
    fireEvent.click(expand);
    expect(screen.getByText('Piecewise branches')).toBeInTheDocument();
    expect(row).toHaveAttribute('data-piecewise-state', 'expanded');
    expect(screen.getByRole('button', { name: 'Collapse piecewise branches' }))
      .toHaveAttribute('aria-expanded', 'true');
    expect(summaryEditor).toHaveAttribute('tabindex', '-1');
    fireEvent.click(screen.getByRole('button', { name: 'Collapse piecewise branches' }));
    expect(screen.queryByText('Piecewise branches')).not.toBeInTheDocument();
    expect(row).toHaveAttribute('data-piecewise-state', 'summary');
    expect(summaryEditor).toHaveAttribute('tabindex', '0');
    fireEvent.click(screen.getByRole('button', { name: 'Expand piecewise branches' }));
    expect(screen.queryByRole('button', { name: /Move branch/u })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove branch/u })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '+ Add branch' }));
    expect(screen.queryByRole('button', { name: /Move branch/u })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Remove branch/u })).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Remove branch 3' }));
    const firstValue = screen.getByTestId(/graph-piecewise-draft-value-.*branch\.1/u);
    setMathFieldValue(firstValue, 'x^3');
    fireEvent.click(screen.getByRole('button', { name: 'Apply branch changes' }));
    await waitFor(() => expect(screen.queryByText('Piecewise branches')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Undo graph edit' }));
    expect(screen.getByTestId('graph-expression-editor-graphing.2.item.1')).toHaveAttribute(
      'data-value', expect.stringContaining('x^2'),
    );
  });

  it('explains an unrecognized piecewise condition and clears the guidance after correction', async () => {
    render(
      <GraphWorkspacePage
        onUpdateSession={vi.fn()}
        session={createGraphWorkspaceSessionState('graphing.2', 'Untitled Graph')}
        workspaceContext={workspaceContext}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '+ Add item' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Piecewise Function' }));
    const condition = screen.getByTestId(/graph-piecewise-draft-condition-.*branch\.1/u);
    setMathFieldValue(condition, 'x+1');
    expect(await screen.findByText('A condition needs a comparison such as x < 2.')).toBeVisible();
    setMathFieldValue(condition, 'x<0');
    await waitFor(() => expect(screen.queryByText('A condition needs a comparison such as x < 2.'))
      .not.toBeInTheDocument(), { timeout: 800 });
  });

  it('creates piecewise authority only after the Add Item draft is complete', async () => {
    render(
      <GraphWorkspacePage
        onUpdateSession={vi.fn()}
        session={createGraphWorkspaceSessionState('graphing.2', 'Untitled Graph')}
        workspaceContext={workspaceContext}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '+ Add item' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Piecewise Function' }));
    expect(screen.getByTestId('graph-piecewise-authoring-draft')).toBeVisible();
    expect(screen.queryAllByTestId('graph-expression-row')).toHaveLength(0);
    const valueOne = screen.getByTestId(/graph-piecewise-draft-value-.*branch\.1/u);
    await waitFor(() => expect(document.activeElement).toBe(valueOne));
    setMathFieldValue(valueOne, 'x^2');
    setMathFieldValue(screen.getByTestId(/graph-piecewise-draft-condition-.*branch\.1/u), 'x<0');
    setMathFieldValue(screen.getByTestId(/graph-piecewise-draft-value-.*branch\.2/u), '\\sqrt{x}');
    expect(screen.getByTestId('graph-piecewise-authoring-draft')).toBeVisible();
    setMathFieldValue(screen.getByTestId(/graph-piecewise-draft-condition-.*branch\.2/u), 'x\\ge0');
    await waitFor(() => expect(screen.queryByTestId('graph-piecewise-authoring-draft')).not.toBeInTheDocument());
    expect(screen.getAllByTestId('graph-expression-row')).toHaveLength(1);
    await waitFor(() => expect(runGraphSampleWithOoe.mock.calls.some(
      ([request]) => request.items[0]?.kind === 'piecewise',
    )).toBe(true));
  });

  it('retains incomplete piecewise authoring across an inactive-tab unmount', () => {
    const onUpdateSession = vi.fn();
    const rendered = render(
      <GraphWorkspacePage
        onUpdateSession={onUpdateSession}
        session={createGraphWorkspaceSessionState('graphing.2', 'Untitled Graph')}
        workspaceContext={workspaceContext}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '+ Add item' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Piecewise Function' }));
    setMathFieldValue(screen.getByTestId(/graph-piecewise-draft-value-.*branch\.1/u), 'x^2');
    rendered.unmount();
    const persisted = onUpdateSession.mock.calls.at(-1)?.[0];
    expect(persisted?.authoring.piecewiseDrafts[0].branches[0].valueLatex).toBe('x^2');

    render(
      <GraphWorkspacePage
        onUpdateSession={vi.fn()}
        session={persisted}
        workspaceContext={workspaceContext}
      />,
    );
    expect(screen.getByTestId(/graph-piecewise-draft-value-.*branch\.1/u)).toHaveAttribute('data-value', 'x^2');
    expect(screen.getAllByTestId('graph-expression-blank-row')).toHaveLength(1);
  });

  it('hides outdated piecewise geometry after invalid-edit grace until atomic recovery', async () => {
    render(
      <GraphWorkspacePage
        onUpdateSession={vi.fn()}
        session={createGraphWorkspaceSessionState('graphing.2', 'Untitled Graph')}
        workspaceContext={workspaceContext}
      />,
    );
    setMathFieldValue(
      screen.getByTestId('graph-expression-editor-graphing.2.item.1'),
      'y=\\begin{cases}x^2&x<0\\\\\\sqrt{x}&x\\ge0\\end{cases}',
    );
    await waitFor(() => expect(screen.getByTestId('graph-scene-paths').querySelectorAll('path')).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: 'Expand piecewise branches' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Add branch' }));
    await waitFor(() => expect(screen.getByText('Complete piecewise branches')).toBeVisible(), { timeout: 1_000 });
    expect(screen.getByTestId('graph-scene-paths').querySelectorAll('path')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Remove branch 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply branch changes' }));
    await waitFor(() => expect(screen.queryByText('Complete piecewise branches')).not.toBeInTheDocument());
    expect(screen.getByTestId('graph-scene-paths').querySelectorAll('path')).toHaveLength(1);
  });

  it('creates graph-local sliders explicitly and samples dependents through one parameter environment', async () => {
    render(
      <GraphWorkspacePage
        onUpdateSession={vi.fn()}
        session={createGraphWorkspaceSessionState('graphing.2', 'Untitled Graph')}
        workspaceContext={workspaceContext}
      />,
    );
    setMathFieldValue(
      screen.getByTestId('graph-expression-editor-graphing.2.item.1'),
      'a x',
    );
    expect(await screen.findByRole('button', { name: 'Create slider for a' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create slider for a' }));
    const slider = await screen.findByRole('slider', { name: 'a slider' });
    expect(slider).toHaveValue('1');
    fireEvent.change(slider, { target: { value: '2' } });
    await waitFor(() => expect(runGraphSampleWithOoe.mock.calls.some(
      ([request]) => request.parameterEnvironment.a === 2 && request.revisions.parameter >= 2,
    )).toBe(true));
    expect(screen.queryByRole('button', { name: 'Create slider for a' })).not.toBeInTheDocument();
  });

  it('renders authored finite definitions as editable graph-local parameter rows', async () => {
    render(
      <GraphWorkspacePage
        onUpdateSession={vi.fn()}
        session={createGraphWorkspaceSessionState('graphing.2', 'Untitled Graph')}
        workspaceContext={workspaceContext}
      />,
    );
    setMathFieldValue(
      screen.getByTestId('graph-expression-editor-graphing.2.item.1'),
      'a=2',
    );
    expect(await screen.findByTestId('graph-parameter-a')).toBeInTheDocument();
    expect(screen.getByText('Authored parameter')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'a slider' })).toHaveValue('2');
  });

  it('advances parameter animation only after sampling becomes ready again', async () => {
    render(
      <GraphWorkspacePage
        onUpdateSession={vi.fn()}
        session={createGraphWorkspaceSessionState('graphing.2', 'Untitled Graph')}
        workspaceContext={workspaceContext}
      />,
    );
    setMathFieldValue(
      screen.getByTestId('graph-expression-editor-graphing.2.item.1'),
      'a x',
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Create slider for a' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Play a' }));
    await waitFor(() => expect(
      screen.getByTestId('graph-parameter-a').querySelector('output'),
    ).not.toHaveTextContent('1.00'));
    fireEvent.click(screen.getByRole('button', { name: 'Pause a' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Play a' })).toBeEnabled());
  });

  it('adds a guided Point Set item while retaining one trailing blank row', () => {
    render(
      <GraphWorkspacePage
        onUpdateSession={vi.fn()}
        session={createGraphWorkspaceSessionState('graphing.2', 'Untitled Graph')}
        workspaceContext={workspaceContext}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '+ Add item' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Point Set' }));

    expect(screen.getAllByTestId('graph-expression-row')).toHaveLength(1);
    expect(screen.getAllByTestId('graph-expression-blank-row')).toHaveLength(1);
    expect(screen.getByTestId('graph-expression-editor-graphing.2.item.1')).toBeInTheDocument();
  });

  it('assigns a stable distinguishing palette to successive expression rows', async () => {
    render(
      <GraphWorkspacePage
        onUpdateSession={vi.fn()}
        session={createGraphWorkspaceSessionState('graphing.2', 'Untitled Graph')}
        workspaceContext={workspaceContext}
      />,
    );

    setMathFieldValue(screen.getByTestId('graph-expression-editor-graphing.2.item.1'), 'x');
    setMathFieldValue(screen.getByTestId('graph-expression-editor-graphing.2.item.2'), 'x^2');

    await waitFor(() => expect(runGraphSampleWithOoe).toHaveBeenCalled());
    expect(screen.getAllByTestId('graph-expression-row').map((row) => row.dataset.colorToken)).toEqual([
      'graph-blue',
      'graph-green',
    ]);
  });

  it('keeps old geometry pending during typing grace, then clears an invalid settled draft', async () => {
    render(
      <GraphWorkspacePage
        onUpdateSession={vi.fn()}
        session={createGraphWorkspaceSessionState('graphing.2', 'Untitled Graph')}
        workspaceContext={workspaceContext}
      />,
    );
    const blankField = screen.getByTestId('graph-expression-editor-graphing.2.item.1');
    setMathFieldValue(blankField, 'x');
    await waitFor(() => expect(screen.getByTestId('graph-scene-paths').querySelector('path')).not.toBeNull());

    const expressionField = screen.getByTestId('graph-expression-editor-graphing.2.item.1');
    setMathFieldValue(expressionField, '\\frac{1}{');
    expect(screen.getByTestId('graph-viewport')).toHaveAttribute('data-scene-pending', 'true');
    expect(screen.getByTestId('graph-scene-paths').querySelector('path')).not.toBeNull();

    expect(await screen.findByText('Keep typing to finish the expression.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('graph-scene-paths').querySelector('path')).toBeNull());
  });

  it('supports visibility, delete, and document undo without adding nonworking controls', async () => {
    render(
      <GraphWorkspacePage
        onUpdateSession={vi.fn()}
        session={createGraphWorkspaceSessionState('graphing.2', 'Untitled Graph')}
        workspaceContext={workspaceContext}
      />,
    );
    setMathFieldValue(screen.getByTestId('graph-expression-editor-graphing.2.item.1'), 'x^2');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Hide graph' })).toBeEnabled());

    fireEvent.click(screen.getByRole('button', { name: 'Hide graph' }));
    expect(screen.getByRole('button', { name: 'Show graph' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete expression' }));
    expect(screen.queryByTestId('graph-expression-row')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Undo graph edit' }));
    expect(screen.getByTestId('graph-expression-row')).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: /Analyze/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Export/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Complex')).not.toBeInTheDocument();
  });

  it('does not resample when only the expression rail presentation changes', async () => {
    render(
      <GraphWorkspacePage
        onUpdateSession={vi.fn()}
        session={createGraphWorkspaceSessionState('graphing.2', 'Untitled Graph')}
        workspaceContext={workspaceContext}
      />,
    );
    setMathFieldValue(screen.getByTestId('graph-expression-editor-graphing.2.item.1'), 'x');
    await waitFor(() => expect(runGraphSampleWithOoe.mock.calls.some(
      ([request]) => request.quality === 'settled',
    )).toBe(true));
    runGraphSampleWithOoe.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Collapse expression rail' }));
    await new Promise((resolve) => setTimeout(resolve, 220));
    expect(runGraphSampleWithOoe).not.toHaveBeenCalled();
  });
});
