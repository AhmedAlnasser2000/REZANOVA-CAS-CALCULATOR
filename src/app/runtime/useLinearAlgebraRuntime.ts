import { useEffect, useRef, useState } from 'react';
import {
  buildMatrixNotationLatex,
  buildVectorNotationLatex,
  type MatrixNotationPreset,
  type VectorNotationPreset,
} from '../../lib/linear-algebra/linear-algebra-workbench';
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
import { isOoeCommitAllowed } from '../../lib/ooe/job-contract';
import type { PendingHistoryTicketReservation } from '../../lib/ooe/launch-tickets';
import type {
  AngleUnit,
  DisplayOutcome,
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
  onMatrixNotationLoaded: () => void;
  onVectorNotationLoaded: () => void;
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

export function useLinearAlgebraRuntime({
  angleUnit,
  commitOutcome,
  discardHistoryTicket,
  getCurrentMode,
  onMatrixNotationLoaded,
  onVectorNotationLoaded,
  reserveHistoryTicket,
  setRuntimeStatusOverride,
}: UseLinearAlgebraRuntimeOptions) {
  const [matrixA, setMatrixA] = useState([
    [1, 2],
    [3, 4],
  ]);
  const [matrixB, setMatrixB] = useState([
    [5, 6],
    [7, 8],
  ]);
  const [matrixNotationLatex, setMatrixNotationLatex] = useState('');
  const [vectorA, setVectorA] = useState([1, 2, 3]);
  const [vectorB, setVectorB] = useState([4, 5, 6]);
  const [vectorNotationLatex, setVectorNotationLatex] = useState('');
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

  function runMatrixAction(operation: MatrixOperation) {
    const launchedRequest: RunMatrixModeRequest = {
      operation,
      matrixA: cloneMatrix(matrixA),
      matrixB: cloneMatrix(matrixB),
    };
    const inputLatex = matrixOperationLabel(operation);
    const inputRevisionId = buildMatrixOoeInputRevisionId(launchedRequest);
    latestMatrixRunRevisionRef.current = inputRevisionId;
    const historyTicket = reserveHistoryTicket?.({
      mode: 'matrix',
      inputLatex,
      capabilityId: 'linearAlgebra.matrix',
      inputRevisionId,
    });

    void runMatrixModeWithOoePilot(launchedRequest, {
      commitPolicy: 'alwaysCommit',
      ...(historyTicket ? { launchTicket: historyTicket } : {}),
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

      const active = matrixStateRef.current;
      const activeRevision = buildMatrixOoeInputRevisionId({
        operation,
        matrixA: active.matrixA,
        matrixB: active.matrixB,
      });
      const visibleStillMatrix =
        (getCurrentMode?.() ?? 'matrix') === 'matrix'
        && activeRevision === inputRevisionId
        && latestMatrixRunRevisionRef.current === inputRevisionId;

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

  function runVectorAction(operation: VectorOperation) {
    const launchedRequest: RunVectorModeRequest = {
      operation,
      vectorA: cloneVector(vectorA),
      vectorB: cloneVector(vectorB),
      angleUnit,
    };
    const inputLatex = vectorOperationLabel(operation);
    const inputRevisionId = buildVectorOoeInputRevisionId(launchedRequest);
    latestVectorRunRevisionRef.current = inputRevisionId;
    const historyTicket = reserveHistoryTicket?.({
      mode: 'vector',
      inputLatex,
      capabilityId: 'linearAlgebra.vector',
      inputRevisionId,
    });

    void runVectorModeWithOoePilot(launchedRequest, {
      commitPolicy: 'alwaysCommit',
      ...(historyTicket ? { launchTicket: historyTicket } : {}),
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

      const active = vectorStateRef.current;
      const activeRevision = buildVectorOoeInputRevisionId({
        operation,
        vectorA: active.vectorA,
        vectorB: active.vectorB,
        angleUnit: active.angleUnit,
      });
      const visibleStillVector =
        (getCurrentMode?.() ?? 'vector') === 'vector'
        && activeRevision === inputRevisionId
        && latestVectorRunRevisionRef.current === inputRevisionId;

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

  function loadMatrixNotationPreset(preset: MatrixNotationPreset) {
    setMatrixNotationLatex(buildMatrixNotationLatex(preset, matrixA, matrixB));
    onMatrixNotationLoaded();
  }

  function loadVectorNotationPreset(preset: VectorNotationPreset) {
    setVectorNotationLatex(buildVectorNotationLatex(preset, vectorA, vectorB));
    onVectorNotationLoaded();
  }

  return {
    loadMatrixNotationPreset,
    loadVectorNotationPreset,
    matrixA,
    matrixB,
    matrixNotationLatex,
    runMatrixAction,
    runVectorAction,
    setMatrixA,
    setMatrixB,
    setMatrixCell,
    setMatrixNotationLatex,
    setVectorA,
    setVectorB,
    setVectorCell,
    setVectorNotationLatex,
    vectorA,
    vectorB,
    vectorNotationLatex,
  };
}
