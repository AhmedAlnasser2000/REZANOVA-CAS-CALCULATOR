import { beforeEach, describe, expect, it } from 'vitest';
import type { CanonicalRuntimeOutcome } from '../../types/calculator';
import { clearOoeJobRegistry, listRecentOoeJobs } from '../ooe/job-launch/active-job-registry';
import { clearOoeDiagnostics, listOoeDiagnostics } from '../ooe/diagnostics/diagnostics-buffer';
import type {
  LinearAlgebraWorkerInboundMessage,
  LinearAlgebraWorkerOutboundMessage,
} from './worker-entrypoints/linear-algebra-worker-contract';
import { runMatrixModeViaIsolatedWorker } from './worker-clients/matrix-worker-client';
import { runVectorModeViaIsolatedWorker } from './worker-clients/vector-worker-client';
import {
  buildMatrixOoeSnapshot,
  runMatrixMode,
  runMatrixModeWithOoePilot,
  type RunMatrixModeRequest,
} from './matrix';
import {
  buildVectorOoeSnapshot,
  runVectorMode,
  runVectorModeWithOoePilot,
  type RunVectorModeRequest,
} from './vector';
import { finalizeCanonicalRuntimeOutcomeFromProducer } from '../result-contract';
import { parseLinearAlgebraScalarWire } from '../linear-algebra/scalar-wire';

type Listener = (event: MessageEvent<LinearAlgebraWorkerOutboundMessage>) => void;
type ErrorListener = (event: Event) => void;

class FakeWorkspaceWorker<TRequest> {
  readonly listeners = new Set<Listener>();
  readonly errorListeners = new Set<ErrorListener>();
  terminated = false;
  private readonly behavior: 'complete' | 'fail' | 'silent';
  private readonly run: (request: TRequest) => CanonicalRuntimeOutcome;

  constructor(
    behavior: 'complete' | 'fail' | 'silent',
    run: (request: TRequest) => CanonicalRuntimeOutcome,
  ) {
    this.behavior = behavior;
    this.run = run;
  }

  addEventListener(type: 'message', listener: Listener): void;
  addEventListener(type: 'error', listener: ErrorListener): void;
  addEventListener(type: 'message' | 'error', listener: Listener | ErrorListener): void {
    if (type === 'message') this.listeners.add(listener as Listener);
    else this.errorListeners.add(listener as ErrorListener);
  }

  removeEventListener(type: 'message', listener: Listener): void;
  removeEventListener(type: 'error', listener: ErrorListener): void;
  removeEventListener(type: 'message' | 'error', listener: Listener | ErrorListener): void {
    if (type === 'message') this.listeners.delete(listener as Listener);
    else this.errorListeners.delete(listener as ErrorListener);
  }

  postMessage(message: LinearAlgebraWorkerInboundMessage<TRequest>) {
    if (this.behavior === 'silent') return;
    this.emit({ kind: 'started', requestId: message.requestId });
    if (this.behavior === 'fail') {
      this.emit({
        kind: 'failed',
        requestId: message.requestId,
        message: 'synthetic worker failure',
      });
      return;
    }
    this.emit({
      kind: 'completed',
      requestId: message.requestId,
      payload: this.run(message.request),
    });
  }

  terminate() {
    this.terminated = true;
  }

  private emit(message: LinearAlgebraWorkerOutboundMessage) {
    const event = { data: message } as MessageEvent<LinearAlgebraWorkerOutboundMessage>;
    for (const listener of this.listeners) listener(event);
  }
}

const matrixRequest: RunMatrixModeRequest = {
  operation: 'multiply',
  matrixA: [[1, 2], [3, 4]],
  matrixB: [[5, 6], [7, 8]],
  matrixValues: [
    { id: 'matrix-a', name: 'A', value: [[1, 2], [3, 4]] },
    { id: 'matrix-b', name: 'B', value: [[5, 6], [7, 8]] },
  ],
  activeMatrixLeftId: 'matrix-a',
  activeMatrixRightId: 'matrix-b',
};

const definitenessMatrixRequest: RunMatrixModeRequest = {
  operation: 'definiteA',
  matrixA: [[2, -1], [-1, 2]],
  matrixB: [[1, 0], [0, 1]],
  editorExpressionLatex: '\\operatorname{definite}\\left(A\\right)',
  matrixOperandLatexA: 'A',
};

const pseudoinverseMatrixRequest: RunMatrixModeRequest = {
  operation: 'pinvA',
  matrixA: [[3, 0], [4, 0]],
  matrixB: [[1, 0], [0, 1]],
  editorExpressionLatex: '\\operatorname{pinv}\\left(A\\right)',
  matrixOperandLatexA: 'A',
  approxDigits: 6,
};

const vectorRequest: RunVectorModeRequest = {
  operation: 'angle',
  vectorA: [1, 0],
  vectorB: [0, 1],
  angleUnit: 'deg',
  vectorValues: [
    { id: 'vector-u', name: 'u', value: [1, 0] },
    { id: 'vector-v', name: 'v', value: [0, 1] },
  ],
  activeVectorLeftId: 'vector-u',
  activeVectorRightId: 'vector-v',
};

const variadicVectorRequest: RunVectorModeRequest = {
  operation: 'gramSchmidtUV',
  vectorA: [1, 0, 0],
  vectorB: [1, 1, 0],
  vectorOperands: [[1, 0, 0], [1, 1, 0], [1, 1, 1]],
  vectorOperandLatexList: ['p', 'q', 'r'],
  editorExpressionLatex: '\\operatorname{gram}\\left(p,q,r\\right)',
  angleUnit: 'rad',
};

const geometricVectorRequest: RunVectorModeRequest = {
  operation: 'volume',
  vectorA: [1, 0, 0],
  vectorB: [0, 2, 0],
  vectorOperands: [[1, 0, 0], [0, 2, 0], [0, 0, 3]],
  vectorOperandLatexList: ['p', 'q', 'r'],
  editorExpressionLatex: '\\operatorname{volume}\\left(p,q,r\\right)',
  angleUnit: 'rad',
};

const complexScalar = (latex: string) => {
  const parsed = parseLinearAlgebraScalarWire(latex, 'complex');
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
};

const scalarVectorRequest: RunVectorModeRequest = {
  operation: 'orthogonalCheck',
  operandEncoding: 'scalar-v1',
  vectorA: {
    encoding: 'scalar-v1',
    source: [complexScalar('1'), complexScalar('i')],
    resolved: [complexScalar('1'), complexScalar('i')],
  },
  vectorB: {
    encoding: 'scalar-v1',
    source: [complexScalar('i'), complexScalar('1')],
    resolved: [complexScalar('i'), complexScalar('1')],
  },
  angleUnit: 'rad',
  domain: 'complex',
  substitutionMode: 'symbolic',
  substitutionSnapshot: [],
  complexExactForm: 'rectangular',
};

const scalarMatrixRequest: RunMatrixModeRequest = {
  operation: 'adjointA',
  operandEncoding: 'scalar-v1',
  matrixA: {
    encoding: 'scalar-v1',
    source: [[complexScalar('1'), complexScalar('i')]],
    resolved: [[complexScalar('1'), complexScalar('i')]],
  },
  matrixB: {
    encoding: 'scalar-v1',
    source: [[complexScalar('1')]],
    resolved: [[complexScalar('1')]],
  },
  domain: 'complex',
  substitutionMode: 'symbolic',
  substitutionSnapshot: [],
  complexExactForm: 'rectangular',
};

const scalarSpectralMatrixRequest: RunMatrixModeRequest = {
  ...scalarMatrixRequest,
  operation: 'eigenA',
  matrixA: {
    encoding: 'scalar-v1' as const,
    source: [
      [complexScalar('0'), complexScalar('-1')],
      [complexScalar('1'), complexScalar('0')],
    ],
    resolved: [
      [complexScalar('0'), complexScalar('-1')],
      [complexScalar('1'), complexScalar('0')],
    ],
  },
};

const runtimeContext = (shouldCancel: () => boolean) => ({
  registryId: 'test.linear-algebra.cancel',
  checkpoint: () => undefined,
  shouldCancel,
  yieldIfBudgetExceeded: async () => false,
});

const runCanonicalMatrixMode = (request: RunMatrixModeRequest) => (
  finalizeCanonicalRuntimeOutcomeFromProducer(runMatrixMode(request), 'Matrix test worker')
);

const runCanonicalVectorMode = (request: RunVectorModeRequest) => (
  finalizeCanonicalRuntimeOutcomeFromProducer(runVectorMode(request), 'Vector test worker')
);

beforeEach(() => {
  clearOoeJobRegistry();
  clearOoeDiagnostics();
});

describe('Matrix and Vector worker runtime shells', () => {
  it('includes named value snapshots in the separate OOE requests', () => {
    expect(buildMatrixOoeSnapshot(matrixRequest).request).toMatchObject({
      matrixValues: matrixRequest.matrixValues,
      activeMatrixLeftId: 'matrix-a',
      activeMatrixRightId: 'matrix-b',
    });
    expect(buildVectorOoeSnapshot(vectorRequest).request).toMatchObject({
      vectorValues: vectorRequest.vectorValues,
      activeVectorLeftId: 'vector-u',
      activeVectorRightId: 'vector-v',
    });
  });

  it('returns parity payloads through distinct primary hosts and shells', async () => {
    const matrix = await runMatrixModeWithOoePilot(matrixRequest, {
      commitPolicy: 'alwaysCommit',
      createWorker: () => new FakeWorkspaceWorker('complete', runCanonicalMatrixMode),
    });
    const vector = await runVectorModeWithOoePilot(vectorRequest, {
      commitPolicy: 'alwaysCommit',
      createWorker: () => new FakeWorkspaceWorker('complete', runCanonicalVectorMode),
    });

    expect(matrix.payload).toEqual(runCanonicalMatrixMode(matrixRequest));
    expect(vector.payload).toEqual(runCanonicalVectorMode(vectorRequest));
    expect(matrix.ooe.linearAlgebraHostExecution).toMatchObject({
      kind: 'worker',
      hostId: 'matrix-worker-runtime',
      terminalStatus: 'completed',
    });
    expect(matrix.ooe.runtimeShell).toMatchObject({
      shellId: 'matrix-worker-shell',
      selectedHostId: 'matrix-worker-runtime',
    });
    expect(vector.ooe.linearAlgebraHostExecution).toMatchObject({
      kind: 'worker',
      hostId: 'vector-worker-runtime',
      terminalStatus: 'completed',
    });
    expect(vector.ooe.runtimeShell).toMatchObject({
      shellId: 'vector-worker-shell',
      selectedHostId: 'vector-worker-runtime',
    });
  });

  it('carries scalar-v1 Complex Vector requests through the unchanged worker shell', async () => {
    expect(buildVectorOoeSnapshot(scalarVectorRequest).request).toMatchObject({
      operandEncoding: 'scalar-v1',
      domain: 'complex',
      lengthA: 2,
      lengthB: 2,
      substitutionSnapshot: [],
    });
    const result = await runVectorModeWithOoePilot(scalarVectorRequest, {
      commitPolicy: 'alwaysCommit',
      createWorker: () => new FakeWorkspaceWorker('complete', runCanonicalVectorMode),
    });
    expect(result.payload).toEqual(runCanonicalVectorMode(scalarVectorRequest));
    if (result.payload.kind === 'prompt') throw new Error('Expected completed Vector payload.');
    expect(result.payload.canonicalResult?.version).toBe(2);
    expect(result.ooe.linearAlgebraHostExecution).toMatchObject({
      kind: 'worker',
      hostId: 'vector-worker-runtime',
      terminalStatus: 'completed',
    });
  });

  it('carries scalar-v1 Complex Matrix requests through the unchanged worker shell', async () => {
    expect(buildMatrixOoeSnapshot(scalarMatrixRequest).request).toMatchObject({
      operandEncoding: 'scalar-v1',
      domain: 'complex',
      rowsA: 1,
      rowsB: 1,
      substitutionSnapshot: [],
    });
    const result = await runMatrixModeWithOoePilot(scalarMatrixRequest, {
      commitPolicy: 'alwaysCommit',
      createWorker: () => new FakeWorkspaceWorker('complete', runCanonicalMatrixMode),
    });
    expect(result.payload).toEqual(runCanonicalMatrixMode(scalarMatrixRequest));
    if (result.payload.kind === 'prompt') throw new Error('Expected completed Matrix payload.');
    expect(result.payload.canonicalResult?.version).toBe(2);
    expect(result.ooe.linearAlgebraHostExecution).toMatchObject({
      kind: 'worker',
      hostId: 'matrix-worker-runtime',
      terminalStatus: 'completed',
    });
  });

  it('carries bounded Complex spectral work through the Matrix worker shell', async () => {
    const result = await runMatrixModeWithOoePilot(scalarSpectralMatrixRequest, {
      commitPolicy: 'alwaysCommit',
      createWorker: () => new FakeWorkspaceWorker('complete', runCanonicalMatrixMode),
    });
    expect(result.payload).toEqual(runCanonicalMatrixMode(scalarSpectralMatrixRequest));
    expect(result.payload.kind).toBe('success');
    if (result.payload.kind !== 'success') throw new Error('Expected completed spectral payload.');
    expect(result.payload.canonicalResult?.version).toBe(2);
    expect(result.payload.canonicalResult?.answerRows?.rows.filter((row) => row.label === 'Eigenvalue'))
      .toHaveLength(2);
    expect(result.ooe.linearAlgebraHostExecution).toMatchObject({
      kind: 'worker',
      hostId: 'matrix-worker-runtime',
      terminalStatus: 'completed',
    });
  });

  it('carries variadic Gram-Schmidt through the Vector worker and OOE snapshot', async () => {
    expect(buildVectorOoeSnapshot(variadicVectorRequest).request).toMatchObject({
      vectorOperands: variadicVectorRequest.vectorOperands,
      vectorOperandLatexList: ['p', 'q', 'r'],
    });
    const result = await runVectorModeWithOoePilot(variadicVectorRequest, {
      commitPolicy: 'alwaysCommit',
      createWorker: () => new FakeWorkspaceWorker('complete', runCanonicalVectorMode),
    });
    expect(result.payload).toEqual(runCanonicalVectorMode(variadicVectorRequest));
    const canonical = result.payload.kind === 'success'
      && result.payload.canonicalResult?.version === 2
      ? result.payload.canonicalResult
      : undefined;
    expect(canonical?.primary)
      .toMatchObject({
        kind: 'math',
        value: {
          canonicalLatex: expect.stringContaining('\\begin{bmatrix}0\\\\0\\\\1\\end{bmatrix}'),
        },
      });
    expect(result.ooe.linearAlgebraHostExecution).toMatchObject({
      kind: 'worker',
      hostId: 'vector-worker-runtime',
      terminalStatus: 'completed',
    });
  });

  it('carries oriented volume through the unchanged Vector worker and OOE shell', async () => {
    expect(buildVectorOoeSnapshot(geometricVectorRequest).request).toMatchObject({
      operation: 'volume',
      vectorOperands: geometricVectorRequest.vectorOperands,
      vectorOperandLatexList: ['p', 'q', 'r'],
    });
    const result = await runVectorModeWithOoePilot(geometricVectorRequest, {
      commitPolicy: 'alwaysCommit',
      createWorker: () => new FakeWorkspaceWorker('complete', runCanonicalVectorMode),
    });
    expect(result.payload).toEqual(runCanonicalVectorMode(geometricVectorRequest));
    expect(result.payload).toMatchObject({
      kind: 'success',
      canonicalResult: {
        version: 2,
        primary: {
          kind: 'math',
          value: { canonicalLatex: '6' },
        },
      },
    });
    expect(result.ooe.linearAlgebraHostExecution).toMatchObject({
      kind: 'worker',
      hostId: 'vector-worker-runtime',
      terminalStatus: 'completed',
    });
  });

  it('carries definiteness through the unchanged Matrix worker and OOE shell', async () => {
    expect(buildMatrixOoeSnapshot(definitenessMatrixRequest).request).toMatchObject({
      operation: 'definiteA',
      matrixA: definitenessMatrixRequest.matrixA,
    });
    const result = await runMatrixModeWithOoePilot(definitenessMatrixRequest, {
      commitPolicy: 'alwaysCommit',
      createWorker: () => new FakeWorkspaceWorker('complete', runCanonicalMatrixMode),
    });
    expect(result.payload).toEqual(runCanonicalMatrixMode(definitenessMatrixRequest));
    expect(result.payload).toMatchObject({
      kind: 'success',
      canonicalResult: {
        version: 2,
        primary: {
          kind: 'math',
          value: { canonicalLatex: '\\operatorname{definite}(A)=\\text{Positive definite}' },
        },
      },
    });
    expect(result.ooe.linearAlgebraHostExecution).toMatchObject({
      kind: 'worker',
      hostId: 'matrix-worker-runtime',
      terminalStatus: 'completed',
    });
  });

  it('carries pseudoinverse through the unchanged Matrix worker and OOE shell', async () => {
    expect(buildMatrixOoeSnapshot(pseudoinverseMatrixRequest).request).toMatchObject({
      operation: 'pinvA',
      matrixA: pseudoinverseMatrixRequest.matrixA,
      approxDigits: 6,
    });
    const result = await runMatrixModeWithOoePilot(pseudoinverseMatrixRequest, {
      commitPolicy: 'alwaysCommit',
      createWorker: () => new FakeWorkspaceWorker('complete', runCanonicalMatrixMode),
    });
    expect(result.payload).toEqual(runCanonicalMatrixMode(pseudoinverseMatrixRequest));
    expect(result.payload).toMatchObject({
      kind: 'success',
      canonicalResult: {
        version: 2,
        primary: {
          kind: 'math',
          value: { canonicalLatex: '\\operatorname{pinv}\\left(A\\right)\\approx \\begin{bmatrix}0.12 & 0.16\\\\0 & 0\\end{bmatrix}' },
        },
      },
    });
    expect(result.ooe.linearAlgebraHostExecution).toMatchObject({
      kind: 'worker',
      hostId: 'matrix-worker-runtime',
      terminalStatus: 'completed',
    });
  });

  it('uses distinct fallback hosts only before worker startup', async () => {
    const matrix = await runMatrixModeWithOoePilot(matrixRequest, { commitPolicy: 'alwaysCommit' });
    const vector = await runVectorModeWithOoePilot(vectorRequest, { commitPolicy: 'alwaysCommit' });

    expect(matrix.ooe.linearAlgebraHostExecution).toMatchObject({
      kind: 'fallback',
      hostId: 'matrix-runtime',
      fallbackFromHostId: 'matrix-worker-runtime',
    });
    expect(vector.ooe.linearAlgebraHostExecution).toMatchObject({
      kind: 'fallback',
      hostId: 'vector-runtime',
      fallbackFromHostId: 'vector-worker-runtime',
    });
  });

  it('records Matrix and Vector worker failures without main-thread retry', async () => {
    await expect(runMatrixModeWithOoePilot(matrixRequest, {
      commitPolicy: 'alwaysCommit',
      createWorker: () => new FakeWorkspaceWorker('fail', runCanonicalMatrixMode),
    })).rejects.toThrow('Matrix worker runtime failed: synthetic worker failure');
    await expect(runVectorModeWithOoePilot(vectorRequest, {
      commitPolicy: 'alwaysCommit',
      createWorker: () => new FakeWorkspaceWorker('fail', runCanonicalVectorMode),
    })).rejects.toThrow('Vector worker runtime failed: synthetic worker failure');

    const diagnostics = listOoeDiagnostics().filter((record) => record.terminalStatus === 'failed');
    expect(listRecentOoeJobs().filter((job) => job.status === 'failed')).toHaveLength(2);
    expect(diagnostics.map((record) => record.provenance?.runtimeHost).sort()).toEqual([
      'matrix-worker-runtime',
      'vector-worker-runtime',
    ]);
  });

  it('rejects malformed canonical Matrix and Vector completions without retry', async () => {
    const invalid = () => ({ kind: 'success' } as unknown as CanonicalRuntimeOutcome);

    await expect(runMatrixModeWithOoePilot(matrixRequest, {
      commitPolicy: 'alwaysCommit',
      createWorker: () => new FakeWorkspaceWorker('complete', invalid),
    })).rejects.toThrow('Matrix worker runtime failed: invalid completed outcome');
    await expect(runVectorModeWithOoePilot(vectorRequest, {
      commitPolicy: 'alwaysCommit',
      createWorker: () => new FakeWorkspaceWorker('complete', invalid),
    })).rejects.toThrow('Vector worker runtime failed: invalid completed outcome');
  });

  it('hard-stops Matrix and Vector workers independently', async () => {
    const matrixWorker = new FakeWorkspaceWorker<RunMatrixModeRequest>('silent', runCanonicalMatrixMode);
    const vectorWorker = new FakeWorkspaceWorker<RunVectorModeRequest>('silent', runCanonicalVectorMode);
    let shouldCancel = false;
    const matrixPromise = runMatrixModeViaIsolatedWorker(
      matrixRequest,
      runtimeContext(() => shouldCancel),
      { createWorker: () => matrixWorker, fallback: () => runCanonicalMatrixMode(matrixRequest) },
    );
    const vectorPromise = runVectorModeViaIsolatedWorker(
      vectorRequest,
      runtimeContext(() => shouldCancel),
      { createWorker: () => vectorWorker, fallback: () => runCanonicalVectorMode(vectorRequest) },
    );

    await new Promise((resolve) => setTimeout(resolve, 5));
    shouldCancel = true;
    const [matrix, vector] = await Promise.all([matrixPromise, vectorPromise]);

    expect(matrixWorker.terminated).toBe(true);
    expect(vectorWorker.terminated).toBe(true);
    expect(matrix.hostExecution).toMatchObject({
      kind: 'worker-cancelled',
      hostId: 'matrix-worker-runtime',
      termination: 'hardStop',
    });
    expect(vector.hostExecution).toMatchObject({
      kind: 'worker-cancelled',
      hostId: 'vector-worker-runtime',
      termination: 'hardStop',
    });
  });
});
