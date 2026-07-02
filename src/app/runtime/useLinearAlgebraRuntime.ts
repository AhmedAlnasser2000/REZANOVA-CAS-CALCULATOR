import { useEffect, useRef, useState } from 'react';
import {
  buildMatrixOoeInputRevisionId,
  matrixOperationLabel,
  runMatrixModeWithOoePilot,
  type RunMatrixModeRequest,
} from '../../lib/modes/matrix';
import {
  buildVectorOoeInputRevisionId,
  runVectorModeWithOoePilot,
  vectorOperationLabel,
  type RunVectorModeRequest,
} from '../../lib/modes/vector';
import { isOoeCommitAllowed } from '../../lib/ooe/job-launch/job-contract';
import {
  ooeJobContextFromHistoryTicket,
  type PendingHistoryTicketReservation,
} from '../../lib/ooe/job-launch/launch-tickets';
import {
  dispatchMatrixEditorLatex,
  dispatchVectorEditorLatex,
} from '../../lib/linear-algebra/editor-dispatch';
import type { LinearAlgebraEquationHandoff } from '../../lib/linear-algebra/equation-handoff';
import type {
  MatrixSurfaceState,
  VectorSurfaceState,
} from './workspace-surface-state';
import type {
  AngleUnit,
  DisplayOutcome,
  DisplayOutcomeAction,
  MatrixOperation,
  ModeId,
  VectorOperation,
} from '../../types/calculator';

type CommitLinearAlgebraOutcome = (
  outcome: DisplayOutcome,
  inputLatex: string,
  mode: 'matrix' | 'vector',
  context?: {
    matrixSeed?: RunMatrixModeRequest;
    vectorSeed?: RunVectorModeRequest;
    historyTicketId?: string | null;
    historyLaunchOrder?: number;
    suppressDisplayCommit?: boolean;
  },
) => void;

type UseLinearAlgebraRuntimeOptions = {
  angleUnit: AngleUnit;
  commitOutcome: CommitLinearAlgebraOutcome;
  discardHistoryTicket?: (ticketId?: string | null) => void;
  getCurrentMode?: () => ModeId;
  reserveHistoryTicket?: (input: {
    mode: ModeId;
    inputLatex: string;
    capabilityId?: string;
    inputRevisionId?: string;
  }) => PendingHistoryTicketReservation | null;
  setRuntimeStatusOverride?: (status: string | null) => void;
};

function cloneMatrix(matrix: number[][]) {
  return matrix.map((row) => [...row]);
}

function cloneVector(vector: number[]) {
  return [...vector];
}

const DEFAULT_MATRIX_A = [
  [1, 2],
  [3, 4],
];

const DEFAULT_MATRIX_B = [
  [5, 6],
  [7, 8],
];

const DEFAULT_VECTOR_A = [1, 2, 3];
const DEFAULT_VECTOR_B = [4, 5, 6];

export function useLinearAlgebraRuntime({
  angleUnit,
  commitOutcome,
  discardHistoryTicket,
  getCurrentMode,
  reserveHistoryTicket,
  setRuntimeStatusOverride,
}: UseLinearAlgebraRuntimeOptions) {
  const [matrixA, setMatrixA] = useState(() => cloneMatrix(DEFAULT_MATRIX_A));
  const [matrixB, setMatrixB] = useState(() => cloneMatrix(DEFAULT_MATRIX_B));
  const [matrixEditorLatex, setMatrixEditorLatex] = useState('');
  const [vectorA, setVectorA] = useState(() => cloneVector(DEFAULT_VECTOR_A));
  const [vectorB, setVectorB] = useState(() => cloneVector(DEFAULT_VECTOR_B));
  const [vectorEditorLatex, setVectorEditorLatex] = useState('');
  const matrixStateRef = useRef({ matrixA, matrixB });
  const vectorStateRef = useRef({ vectorA, vectorB, angleUnit });
  const latestMatrixRunRevisionRef = useRef<string | null>(null);
  const latestVectorRunRevisionRef = useRef<string | null>(null);

  useEffect(() => {
    matrixStateRef.current = { matrixA, matrixB };
  }, [matrixA, matrixB]);

  useEffect(() => {
    vectorStateRef.current = { vectorA, vectorB, angleUnit };
  }, [angleUnit, vectorA, vectorB]);

  function handoffActions(handoff?: LinearAlgebraEquationHandoff): DisplayOutcomeAction[] | undefined {
    return handoff
      ? [{ kind: 'send', target: 'equation', latex: handoff.latex }]
      : undefined;
  }

  function commitMatrixEditorError(
    inputLatex: string,
    message: string,
    handoff?: LinearAlgebraEquationHandoff,
  ) {
    commitOutcome({
      kind: 'error',
      title: 'Matrix',
      error: message,
      warnings: [],
      actions: handoffActions(handoff),
    }, inputLatex, 'matrix');
  }

  function commitVectorEditorError(
    inputLatex: string,
    message: string,
    handoff?: LinearAlgebraEquationHandoff,
  ) {
    commitOutcome({
      kind: 'error',
      title: 'Vector',
      error: message,
      warnings: [],
      actions: handoffActions(handoff),
    }, inputLatex, 'vector');
  }

  function runMatrixRequest(
    launchedRequest: RunMatrixModeRequest,
    inputLatex: string,
    visibleRequestForCommit: () => RunMatrixModeRequest,
  ) {
    const inputRevisionId = buildMatrixOoeInputRevisionId(launchedRequest);
    const launchToken = `${inputRevisionId}:${inputLatex}`;
    latestMatrixRunRevisionRef.current = launchToken;
    const historyTicket = reserveHistoryTicket?.({
      mode: 'matrix',
      inputLatex,
      capabilityId: 'linearAlgebra.matrix',
      inputRevisionId,
    });

    void runMatrixModeWithOoePilot(launchedRequest, {
      commitPolicy: 'alwaysCommit',
      ...ooeJobContextFromHistoryTicket(historyTicket),
    }).then((result) => {
      if (result.ooe.completion?.kind === 'cancelled') {
        discardHistoryTicket?.(historyTicket?.id);
        setRuntimeStatusOverride?.('Matrix operation stopped');
        return;
      }

      if (!isOoeCommitAllowed(result.ooe.commitAssessment)) {
        discardHistoryTicket?.(historyTicket?.id);
        return;
      }

      const activeRevision = buildMatrixOoeInputRevisionId(visibleRequestForCommit());
      const visibleStillMatrix =
        (getCurrentMode?.() ?? 'matrix') === 'matrix'
        && activeRevision === inputRevisionId
        && latestMatrixRunRevisionRef.current === launchToken;

      commitOutcome(result.payload, inputLatex, 'matrix', {
        matrixSeed: launchedRequest,
        historyTicketId: historyTicket?.id,
        historyLaunchOrder: historyTicket?.historyLaunchOrder,
        suppressDisplayCommit: !visibleStillMatrix,
      });
    }).catch((error: unknown) => {
      discardHistoryTicket?.(historyTicket?.id);
      const loadError: DisplayOutcome = {
        kind: 'error',
        title: 'Matrix',
        error: error instanceof Error
          ? `Could not load the Matrix runtime: ${error.message}`
          : 'Could not load the Matrix runtime.',
        warnings: [],
      };
      const visibleStillMatrix = (getCurrentMode?.() ?? 'matrix') === 'matrix';
      commitOutcome(loadError, inputLatex, 'matrix', {
        historyTicketId: historyTicket?.id,
        historyLaunchOrder: historyTicket?.historyLaunchOrder,
        suppressDisplayCommit: !visibleStillMatrix,
      });
      setRuntimeStatusOverride?.('Matrix runtime failed');
    });
  }

  function runMatrixAction(operation: MatrixOperation) {
    const launchedRequest: RunMatrixModeRequest = {
      operation,
      matrixA: cloneMatrix(matrixA),
      matrixB: cloneMatrix(matrixB),
    };
    runMatrixRequest(
      launchedRequest,
      matrixOperationLabel(operation),
      () => {
        const active = matrixStateRef.current;
        return {
          operation,
          matrixA: active.matrixA,
          matrixB: active.matrixB,
        };
      },
    );
  }

  function runMatrixEditorAction() {
    const inputLatex = matrixEditorLatex;
    const dispatched = dispatchMatrixEditorLatex({
      latex: inputLatex,
      matrixA,
      matrixB,
    });
    if (!dispatched.ok) {
      commitMatrixEditorError(inputLatex, dispatched.message, dispatched.handoff);
      return;
    }

    runMatrixRequest(dispatched.request, inputLatex, () => dispatched.request);
  }

  function runVectorRequest(
    launchedRequest: RunVectorModeRequest,
    inputLatex: string,
    visibleRequestForCommit: () => RunVectorModeRequest,
  ) {
    const inputRevisionId = buildVectorOoeInputRevisionId(launchedRequest);
    const launchToken = `${inputRevisionId}:${inputLatex}`;
    latestVectorRunRevisionRef.current = launchToken;
    const historyTicket = reserveHistoryTicket?.({
      mode: 'vector',
      inputLatex,
      capabilityId: 'linearAlgebra.vector',
      inputRevisionId,
    });

    void runVectorModeWithOoePilot(launchedRequest, {
      commitPolicy: 'alwaysCommit',
      ...ooeJobContextFromHistoryTicket(historyTicket),
    }).then((result) => {
      if (result.ooe.completion?.kind === 'cancelled') {
        discardHistoryTicket?.(historyTicket?.id);
        setRuntimeStatusOverride?.('Vector operation stopped');
        return;
      }

      if (!isOoeCommitAllowed(result.ooe.commitAssessment)) {
        discardHistoryTicket?.(historyTicket?.id);
        return;
      }

      const activeRevision = buildVectorOoeInputRevisionId(visibleRequestForCommit());
      const visibleStillVector =
        (getCurrentMode?.() ?? 'vector') === 'vector'
        && activeRevision === inputRevisionId
        && latestVectorRunRevisionRef.current === launchToken;

      commitOutcome(result.payload, inputLatex, 'vector', {
        vectorSeed: launchedRequest,
        historyTicketId: historyTicket?.id,
        historyLaunchOrder: historyTicket?.historyLaunchOrder,
        suppressDisplayCommit: !visibleStillVector,
      });
    }).catch((error: unknown) => {
      discardHistoryTicket?.(historyTicket?.id);
      const loadError: DisplayOutcome = {
        kind: 'error',
        title: 'Vector',
        error: error instanceof Error
          ? `Could not load the Vector runtime: ${error.message}`
          : 'Could not load the Vector runtime.',
        warnings: [],
      };
      const visibleStillVector = (getCurrentMode?.() ?? 'vector') === 'vector';
      commitOutcome(loadError, inputLatex, 'vector', {
        historyTicketId: historyTicket?.id,
        historyLaunchOrder: historyTicket?.historyLaunchOrder,
        suppressDisplayCommit: !visibleStillVector,
      });
      setRuntimeStatusOverride?.('Vector runtime failed');
    });
  }

  function runVectorAction(operation: VectorOperation) {
    const launchedRequest: RunVectorModeRequest = {
      operation,
      vectorA: cloneVector(vectorA),
      vectorB: cloneVector(vectorB),
      angleUnit,
    };
    runVectorRequest(
      launchedRequest,
      vectorOperationLabel(operation),
      () => {
        const active = vectorStateRef.current;
        return {
          operation,
          vectorA: active.vectorA,
          vectorB: active.vectorB,
          angleUnit: active.angleUnit,
        };
      },
    );
  }

  function runVectorEditorAction() {
    const inputLatex = vectorEditorLatex;
    const dispatched = dispatchVectorEditorLatex({
      latex: inputLatex,
      vectorA,
      vectorB,
      angleUnit,
    });
    if (!dispatched.ok) {
      commitVectorEditorError(inputLatex, dispatched.message, dispatched.handoff);
      return;
    }

    runVectorRequest(dispatched.request, inputLatex, () => dispatched.request);
  }

  function setMatrixCell(which: 'A' | 'B', row: number, column: number, value: number) {
    const setter = which === 'A' ? setMatrixA : setMatrixB;
    setter((currentMatrix) =>
      currentMatrix.map((currentRow, rowIndex) =>
        currentRow.map((cell, columnIndex) =>
          rowIndex === row && columnIndex === column ? (Number.isFinite(value) ? value : 0) : cell,
        ),
      ),
    );
  }

  function setVectorCell(which: 'A' | 'B', index: number, value: number) {
    const setter = which === 'A' ? setVectorA : setVectorB;
    setter((currentVector) =>
      currentVector.map((cell, cellIndex) =>
        cellIndex === index ? (Number.isFinite(value) ? value : 0) : cell,
      ),
    );
  }

  function captureMatrixSurfaceState(): MatrixSurfaceState {
    return {
      matrixA: cloneMatrix(matrixA),
      matrixB: cloneMatrix(matrixB),
      matrixEditorLatex,
    };
  }

  function restoreMatrixSurfaceState(state: MatrixSurfaceState | null) {
    setMatrixA(cloneMatrix(state?.matrixA ?? DEFAULT_MATRIX_A));
    setMatrixB(cloneMatrix(state?.matrixB ?? DEFAULT_MATRIX_B));
    setMatrixEditorLatex(state?.matrixEditorLatex ?? '');
  }

  function captureVectorSurfaceState(): VectorSurfaceState {
    return {
      vectorA: cloneVector(vectorA),
      vectorB: cloneVector(vectorB),
      vectorEditorLatex,
    };
  }

  function restoreVectorSurfaceState(state: VectorSurfaceState | null) {
    setVectorA(cloneVector(state?.vectorA ?? DEFAULT_VECTOR_A));
    setVectorB(cloneVector(state?.vectorB ?? DEFAULT_VECTOR_B));
    setVectorEditorLatex(state?.vectorEditorLatex ?? '');
  }

  return {
    captureMatrixSurfaceState,
    captureVectorSurfaceState,
    matrixA,
    matrixB,
    matrixEditorLatex,
    runMatrixEditorAction,
    runMatrixAction,
    runVectorEditorAction,
    runVectorAction,
    restoreMatrixSurfaceState,
    restoreVectorSurfaceState,
    setMatrixA,
    setMatrixB,
    setMatrixCell,
    setMatrixEditorLatex,
    setVectorA,
    setVectorB,
    setVectorCell,
    setVectorEditorLatex,
    vectorA,
    vectorB,
    vectorEditorLatex,
  };
}
