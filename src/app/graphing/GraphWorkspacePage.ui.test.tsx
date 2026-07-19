import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphSampleRequestV1 } from '../../lib/graphing';
import { createGraphWorkspaceSessionState } from './graph-workspace-session';
import GraphWorkspacePage from './GraphWorkspacePage';
import '../../styles/app/shell.css';
import '../../styles/app/graphing.css';

const { runGraphSampleWithOoe } = vi.hoisted(() => ({
  runGraphSampleWithOoe: vi.fn(async (request: GraphSampleRequestV1) => ({
  payload: {
    version: 1 as const,
    requestId: request.requestId,
    workspaceInstanceId: request.workspaceInstanceId,
    documentId: request.documentId,
    revisions: request.revisions,
    viewport: request.viewport,
    quality: request.quality,
    status: 'complete' as const,
    scene: {
      sceneRevision: request.revisions.scene,
      documentRevision: request.revisions.document,
      viewportRevision: request.revisions.viewport,
      parameterRevision: request.revisions.parameter,
      paths: request.items.filter((item) => item.visible && item.kind === 'relation').map((item) => ({
        pathId: `${item.itemId}.path`,
        itemId: item.itemId,
        coordinates: new Float64Array([-2, -2, 0, 0, 2, 2]),
        segmentOffsets: new Uint32Array([0]),
        parameterValues: new Float64Array([-2, 0, 2]),
        closed: false,
        style: item.presentation,
      })),
      regions: [],
      pointBatches: request.items.filter((item) => item.visible && item.kind === 'point-set').map((item) => ({
        pointBatchId: `${item.itemId}.points`,
        itemId: item.itemId,
        coordinates: new Float64Array([1, 2, 3, 4]),
        style: item.presentation,
      })),
      labels: [],
      grid: { kind: 'none' as const, majorLines: [], minorLines: [], labels: [], hysteresisKey: 'none' },
    },
    snapshotHash: 'graph64:test',
    stopReasons: [],
    evidence: { sampleCount: 3, vertexCount: 3, elapsedMs: 1 },
  },
  ooe: {
    commitAssessment: { legality: 'commitAllowed' as const },
    releasedBufferBytes: 0,
  },
  })),
}));

vi.mock('../../lib/graphing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/graphing')>()),
  buildGraphSampleInputRevisionId: vi.fn((request: GraphSampleRequestV1) => (
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

  it('adds a guided Point Set item while retaining one trailing blank row', () => {
    render(
      <GraphWorkspacePage
        onUpdateSession={vi.fn()}
        session={createGraphWorkspaceSessionState('graphing.2', 'Untitled Graph')}
        workspaceContext={workspaceContext}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '+ Point Set' }));

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
    const request = runGraphSampleWithOoe.mock.calls.at(-1)?.[0];
    expect(request?.items.map((item) => item.presentation.colorToken)).toEqual([
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
