import { useEffect, useRef, useState } from 'react';
import {
  buildMatrixOoeInputRevisionId,
  runMatrixModeWithOoePilot,
  type RunMatrixModeRequest,
} from '../../lib/modes/matrix';
import {
  buildVectorOoeInputRevisionId,
  runVectorModeWithOoePilot,
  type RunVectorModeRequest,
} from '../../lib/modes/vector';
import {
  activeMatrixValuePair,
  activeVectorValuePair,
  buildActiveMatrixRequest,
  buildActiveVectorRequest,
  buildMatrixSoftActions,
  buildVectorSoftActions,
} from './linearAlgebraActiveOperands';
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
import {
  DEFAULT_MATRIX_LEFT_ID,
  DEFAULT_MATRIX_RIGHT_ID,
  DEFAULT_VECTOR_LEFT_ID,
  DEFAULT_VECTOR_RIGHT_ID,
  isValidMatrixValueName,
  isValidVectorValueName,
  matrixValueById,
  nextMatrixValueName,
  nextVectorValueName,
  normalizeMatrixValueName,
  normalizeVectorValueName,
  vectorValueById,
  cloneMatrixNamedValues,
  cloneVectorNamedValues,
  type LinearAlgebraMatrixNamedValue,
  type LinearAlgebraVectorNamedValue,
} from '../../lib/linear-algebra/named-values';
import {
  DEFAULT_MATRIX_A,
  DEFAULT_MATRIX_B,
  DEFAULT_VECTOR_A,
  DEFAULT_VECTOR_B,
  cloneMatrix,
  cloneVector,
  defaultMatrixValues,
  defaultVectorValues,
  matrixValuesFromCompatibility,
  vectorValuesFromCompatibility,
} from './linearAlgebraRuntimeDefaults';
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
  syncEditorLatex?: (mode: 'matrix' | 'vector', latex: string) => void;
};

const MIN_LINEAR_ALGEBRA_DIMENSION = 1;
const MAX_LINEAR_ALGEBRA_DIMENSION = 8;

function matrixValueForCompatibility(
  values: readonly LinearAlgebraMatrixNamedValue[],
  id: string,
  fallback: number[][],
) {
  return cloneMatrix(matrixValueById(values, id)?.value ?? fallback);
}

function vectorValueForCompatibility(
  values: readonly LinearAlgebraVectorNamedValue[],
  id: string,
  fallback: number[],
) {
  return cloneVector(vectorValueById(values, id)?.value ?? fallback);
}

function clampLinearAlgebraDimension(value: number) {
  if (!Number.isFinite(value)) {
    return MIN_LINEAR_ALGEBRA_DIMENSION;
  }
  return Math.min(
    MAX_LINEAR_ALGEBRA_DIMENSION,
    Math.max(MIN_LINEAR_ALGEBRA_DIMENSION, Math.trunc(value)),
  );
}

function resizeMatrixValue(matrix: number[][], rowCount: number, columnCount: number) {
  const rows = clampLinearAlgebraDimension(rowCount);
  const columns = clampLinearAlgebraDimension(columnCount);
  return Array.from({ length: rows }, (_, rowIndex) =>
    Array.from({ length: columns }, (_, columnIndex) => {
      const currentValue = matrix[rowIndex]?.[columnIndex];
      return Number.isFinite(currentValue) ? currentValue : 0;
    }),
  );
}

function resizeVectorValue(vector: number[], length: number) {
  const nextLength = clampLinearAlgebraDimension(length);
  return Array.from({ length: nextLength }, (_, index) =>
    Number.isFinite(vector[index]) ? vector[index] : 0,
  );
}

export function useLinearAlgebraRuntime({
  angleUnit,
  commitOutcome,
  discardHistoryTicket,
  getCurrentMode,
  reserveHistoryTicket,
  setRuntimeStatusOverride,
  syncEditorLatex,
}: UseLinearAlgebraRuntimeOptions) {
  const [matrixValues, setMatrixValues] = useState(defaultMatrixValues);
  const [activeMatrixLeftId, setActiveMatrixLeftId] = useState(DEFAULT_MATRIX_LEFT_ID);
  const [activeMatrixRightId, setActiveMatrixRightId] = useState(DEFAULT_MATRIX_RIGHT_ID);
  const [matrixEditorLatex, setMatrixEditorLatex] = useState('');
  const [vectorValues, setVectorValues] = useState(defaultVectorValues);
  const [activeVectorLeftId, setActiveVectorLeftId] = useState(DEFAULT_VECTOR_LEFT_ID);
  const [activeVectorRightId, setActiveVectorRightId] = useState(DEFAULT_VECTOR_RIGHT_ID);
  const [vectorEditorLatex, setVectorEditorLatex] = useState('');
  const nextMatrixValueIdRef = useRef(1);
  const nextVectorValueIdRef = useRef(1);
  const matrixA = matrixValueForCompatibility(matrixValues, DEFAULT_MATRIX_LEFT_ID, DEFAULT_MATRIX_A);
  const matrixB = matrixValueForCompatibility(matrixValues, DEFAULT_MATRIX_RIGHT_ID, DEFAULT_MATRIX_B);
  const vectorA = vectorValueForCompatibility(vectorValues, DEFAULT_VECTOR_LEFT_ID, DEFAULT_VECTOR_A);
  const vectorB = vectorValueForCompatibility(vectorValues, DEFAULT_VECTOR_RIGHT_ID, DEFAULT_VECTOR_B);
  const matrixStateRef = useRef({
    matrixA,
    matrixB,
    matrixValues,
    activeMatrixLeftId,
    activeMatrixRightId,
  });
  const vectorStateRef = useRef({
    vectorA,
    vectorB,
    vectorValues,
    activeVectorLeftId,
    activeVectorRightId,
    angleUnit,
  });
  const latestMatrixRunRevisionRef = useRef<string | null>(null);
  const latestVectorRunRevisionRef = useRef<string | null>(null);

  useEffect(() => {
    matrixStateRef.current = {
      matrixA,
      matrixB,
      matrixValues,
      activeMatrixLeftId,
      activeMatrixRightId,
    };
  }, [activeMatrixLeftId, activeMatrixRightId, matrixA, matrixB, matrixValues]);

  useEffect(() => {
    vectorStateRef.current = {
      vectorA,
      vectorB,
      vectorValues,
      activeVectorLeftId,
      activeVectorRightId,
      angleUnit,
    };
  }, [activeVectorLeftId, activeVectorRightId, angleUnit, vectorA, vectorB, vectorValues]);

  function handoffActions(handoff?: LinearAlgebraEquationHandoff): DisplayOutcomeAction[] | undefined {
    return handoff
      ? [{ kind: 'send', target: 'equation', latex: handoff.latex }]
      : undefined;
  }

  function withMatrixValueSnapshot(
    request: RunMatrixModeRequest,
    state = matrixStateRef.current,
  ): RunMatrixModeRequest {
    return {
      ...request,
      matrixValues: cloneMatrixNamedValues(state.matrixValues),
      activeMatrixLeftId: state.activeMatrixLeftId,
      activeMatrixRightId: state.activeMatrixRightId,
    };
  }

  function withVectorValueSnapshot(
    request: RunVectorModeRequest,
    state = vectorStateRef.current,
  ): RunVectorModeRequest {
    return {
      ...request,
      vectorValues: cloneVectorNamedValues(state.vectorValues),
      activeVectorLeftId: state.activeVectorLeftId,
      activeVectorRightId: state.activeVectorRightId,
    };
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
    const launchedSnapshot = withMatrixValueSnapshot(launchedRequest);
    const inputRevisionId = buildMatrixOoeInputRevisionId(launchedSnapshot);
    const launchToken = `${inputRevisionId}:${inputLatex}`;
    latestMatrixRunRevisionRef.current = launchToken;
    const historyTicket = reserveHistoryTicket?.({
      mode: 'matrix',
      inputLatex,
      capabilityId: 'linearAlgebra.matrix',
      inputRevisionId,
    });

    void runMatrixModeWithOoePilot(launchedSnapshot, {
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

      const activeRevision = buildMatrixOoeInputRevisionId(withMatrixValueSnapshot(visibleRequestForCommit()));
      const visibleStillMatrix =
        (getCurrentMode?.() ?? 'matrix') === 'matrix'
        && activeRevision === inputRevisionId
        && latestMatrixRunRevisionRef.current === launchToken;

      commitOutcome(result.payload, inputLatex, 'matrix', {
        matrixSeed: launchedSnapshot,
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
    const launched = buildActiveMatrixRequest(operation, matrixValues, activeMatrixLeftId, activeMatrixRightId);
    runMatrixRequest(
      launched.request,
      launched.inputLatex,
      () => {
        const active = matrixStateRef.current;
        return buildActiveMatrixRequest(
          operation,
          active.matrixValues,
          active.activeMatrixLeftId,
          active.activeMatrixRightId,
        ).request;
      },
    );
  }

  function runMatrixEditorAction() {
    const inputLatex = matrixEditorLatex;
    const dispatched = dispatchMatrixEditorLatex({
      latex: inputLatex,
      matrixA,
      matrixB,
      matrixValues,
    });
    if (!dispatched.ok) {
      commitMatrixEditorError(inputLatex, dispatched.message, dispatched.handoff);
      return;
    }

    const canonicalInputLatex = dispatched.request.editorExpressionLatex ?? inputLatex;
    if (canonicalInputLatex !== inputLatex) {
      setMatrixEditorLatex(canonicalInputLatex);
      syncEditorLatex?.('matrix', canonicalInputLatex);
    }
    runMatrixRequest(dispatched.request, canonicalInputLatex, () => dispatched.request);
  }

  function runVectorRequest(
    launchedRequest: RunVectorModeRequest,
    inputLatex: string,
    visibleRequestForCommit: () => RunVectorModeRequest,
  ) {
    const launchedSnapshot = withVectorValueSnapshot(launchedRequest);
    const inputRevisionId = buildVectorOoeInputRevisionId(launchedSnapshot);
    const launchToken = `${inputRevisionId}:${inputLatex}`;
    latestVectorRunRevisionRef.current = launchToken;
    const historyTicket = reserveHistoryTicket?.({
      mode: 'vector',
      inputLatex,
      capabilityId: 'linearAlgebra.vector',
      inputRevisionId,
    });

    void runVectorModeWithOoePilot(launchedSnapshot, {
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

      const activeRevision = buildVectorOoeInputRevisionId(withVectorValueSnapshot(visibleRequestForCommit()));
      const visibleStillVector =
        (getCurrentMode?.() ?? 'vector') === 'vector'
        && activeRevision === inputRevisionId
        && latestVectorRunRevisionRef.current === launchToken;

      commitOutcome(result.payload, inputLatex, 'vector', {
        vectorSeed: launchedSnapshot,
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
    const launched = buildActiveVectorRequest(operation, vectorValues, activeVectorLeftId, activeVectorRightId, angleUnit);
    runVectorRequest(
      launched.request,
      launched.inputLatex,
      () => {
        const active = vectorStateRef.current;
        return buildActiveVectorRequest(
          operation,
          active.vectorValues,
          active.activeVectorLeftId,
          active.activeVectorRightId,
          active.angleUnit,
        ).request;
      },
    );
  }

  function runVectorEditorAction() {
    const inputLatex = vectorEditorLatex;
    const dispatched = dispatchVectorEditorLatex({
      latex: inputLatex,
      vectorA,
      vectorB,
      vectorValues,
      angleUnit,
    });
    if (!dispatched.ok) {
      commitVectorEditorError(inputLatex, dispatched.message, dispatched.handoff);
      return;
    }

    const canonicalInputLatex = dispatched.request.editorExpressionLatex ?? inputLatex;
    if (canonicalInputLatex !== inputLatex) {
      setVectorEditorLatex(canonicalInputLatex);
      syncEditorLatex?.('vector', canonicalInputLatex);
    }
    runVectorRequest(dispatched.request, canonicalInputLatex, () => dispatched.request);
  }

  function canonicalizeMatrixEditorPaste(text: string) {
    const active = matrixStateRef.current;
    const dispatched = dispatchMatrixEditorLatex({
      latex: text,
      matrixA: active.matrixA,
      matrixB: active.matrixB,
      matrixValues: active.matrixValues,
    });
    return dispatched.ok
      ? dispatched.request.editorExpressionLatex ?? null
      : null;
  }

  function canonicalizeVectorEditorPaste(text: string) {
    const active = vectorStateRef.current;
    const dispatched = dispatchVectorEditorLatex({
      latex: text,
      vectorA: active.vectorA,
      vectorB: active.vectorB,
      vectorValues: active.vectorValues,
      angleUnit: active.angleUnit,
    });
    return dispatched.ok
      ? dispatched.request.editorExpressionLatex ?? null
      : null;
  }

  function updateMatrixValue(
    id: string,
    fallbackName: string,
    fallbackValue: number[][],
    updater: (matrix: number[][]) => number[][],
  ) {
    setMatrixValues((currentValues) => {
      const existing = matrixValueById(currentValues, id);
      if (!existing) {
        return [
          ...currentValues,
          { id, name: fallbackName, value: updater(cloneMatrix(fallbackValue)) },
        ];
      }
      return currentValues.map((currentValue) =>
        currentValue.id === id
          ? { ...currentValue, value: updater(cloneMatrix(currentValue.value)) }
          : currentValue,
      );
    });
  }

  function updateVectorValue(
    id: string,
    fallbackName: string,
    fallbackValue: number[],
    updater: (vector: number[]) => number[],
  ) {
    setVectorValues((currentValues) => {
      const existing = vectorValueById(currentValues, id);
      if (!existing) {
        return [
          ...currentValues,
          { id, name: fallbackName, value: updater(cloneVector(fallbackValue)) },
        ];
      }
      return currentValues.map((currentValue) =>
        currentValue.id === id
          ? { ...currentValue, value: updater(cloneVector(currentValue.value)) }
          : currentValue,
      );
    });
  }

  function setMatrixA(nextMatrix: number[][]) {
    updateMatrixValue(DEFAULT_MATRIX_LEFT_ID, 'A', DEFAULT_MATRIX_A, () => cloneMatrix(nextMatrix));
  }

  function setMatrixB(nextMatrix: number[][]) {
    updateMatrixValue(DEFAULT_MATRIX_RIGHT_ID, 'B', DEFAULT_MATRIX_B, () => cloneMatrix(nextMatrix));
  }

  function setVectorA(nextVector: number[]) {
    updateVectorValue(DEFAULT_VECTOR_LEFT_ID, 'u', DEFAULT_VECTOR_A, () => cloneVector(nextVector));
  }

  function setVectorB(nextVector: number[]) {
    updateVectorValue(DEFAULT_VECTOR_RIGHT_ID, 'v', DEFAULT_VECTOR_B, () => cloneVector(nextVector));
  }

  function setMatrixCell(which: 'A' | 'B', row: number, column: number, value: number) {
    const id = which === 'A' ? DEFAULT_MATRIX_LEFT_ID : DEFAULT_MATRIX_RIGHT_ID;
    const fallbackName = which === 'A' ? 'A' : 'B';
    const fallbackValue = which === 'A' ? DEFAULT_MATRIX_A : DEFAULT_MATRIX_B;
    updateMatrixValue(id, fallbackName, fallbackValue, (currentMatrix) =>
      currentMatrix.map((currentRow, rowIndex) =>
        currentRow.map((cell, columnIndex) =>
          rowIndex === row && columnIndex === column ? (Number.isFinite(value) ? value : 0) : cell,
        ),
      ),
    );
  }

  function setVectorCell(which: 'A' | 'B', index: number, value: number) {
    const id = which === 'A' ? DEFAULT_VECTOR_LEFT_ID : DEFAULT_VECTOR_RIGHT_ID;
    const fallbackName = which === 'A' ? 'u' : 'v';
    const fallbackValue = which === 'A' ? DEFAULT_VECTOR_A : DEFAULT_VECTOR_B;
    updateVectorValue(id, fallbackName, fallbackValue, (currentVector) =>
      currentVector.map((cell, cellIndex) =>
        cellIndex === index ? (Number.isFinite(value) ? value : 0) : cell,
      ),
    );
  }

  function resizeMatrix(which: 'A' | 'B', rows: number, columns: number) {
    const id = which === 'A' ? DEFAULT_MATRIX_LEFT_ID : DEFAULT_MATRIX_RIGHT_ID;
    const fallbackName = which === 'A' ? 'A' : 'B';
    const fallbackValue = which === 'A' ? DEFAULT_MATRIX_A : DEFAULT_MATRIX_B;
    updateMatrixValue(id, fallbackName, fallbackValue, (currentMatrix) =>
      resizeMatrixValue(currentMatrix, rows, columns),
    );
  }

  function resizeVector(which: 'A' | 'B', length: number) {
    const id = which === 'A' ? DEFAULT_VECTOR_LEFT_ID : DEFAULT_VECTOR_RIGHT_ID;
    const fallbackName = which === 'A' ? 'u' : 'v';
    const fallbackValue = which === 'A' ? DEFAULT_VECTOR_A : DEFAULT_VECTOR_B;
    updateVectorValue(id, fallbackName, fallbackValue, (currentVector) =>
      resizeVectorValue(currentVector, length),
    );
  }

  function setMatrixValueCell(id: string, row: number, column: number, value: number) {
    setMatrixValues((currentValues) =>
      currentValues.map((currentValue) =>
        currentValue.id === id
          ? {
              ...currentValue,
              value: currentValue.value.map((currentRow, rowIndex) =>
                currentRow.map((cell, columnIndex) =>
                  rowIndex === row && columnIndex === column
                    ? (Number.isFinite(value) ? value : 0)
                    : cell,
                ),
              ),
            }
          : currentValue,
      ),
    );
  }

  function setVectorValueCell(id: string, index: number, value: number) {
    setVectorValues((currentValues) =>
      currentValues.map((currentValue) =>
        currentValue.id === id
          ? {
              ...currentValue,
              value: currentValue.value.map((cell, cellIndex) =>
                cellIndex === index ? (Number.isFinite(value) ? value : 0) : cell,
              ),
            }
          : currentValue,
      ),
    );
  }

  function resizeMatrixValueById(id: string, rows: number, columns: number) {
    setMatrixValues((currentValues) =>
      currentValues.map((currentValue) =>
        currentValue.id === id
          ? { ...currentValue, value: resizeMatrixValue(currentValue.value, rows, columns) }
          : currentValue,
      ),
    );
  }

  function resizeVectorValueById(id: string, length: number) {
    setVectorValues((currentValues) =>
      currentValues.map((currentValue) =>
        currentValue.id === id
          ? { ...currentValue, value: resizeVectorValue(currentValue.value, length) }
          : currentValue,
      ),
    );
  }

  function addMatrixValue(preferredName?: string, value: number[][] = DEFAULT_MATRIX_A) {
    const id = `matrix-${nextMatrixValueIdRef.current}`;
    nextMatrixValueIdRef.current += 1;
    setMatrixValues((currentValues) => {
      const name = nextMatrixValueName(currentValues, preferredName);
      return name
        ? [...currentValues, { id, name, value: cloneMatrix(value) }]
        : currentValues;
    });
    return id;
  }

  function addVectorValue(preferredName?: string, value: number[] = DEFAULT_VECTOR_A) {
    const id = `vector-${nextVectorValueIdRef.current}`;
    nextVectorValueIdRef.current += 1;
    setVectorValues((currentValues) => {
      const name = nextVectorValueName(currentValues, preferredName);
      return name
        ? [...currentValues, { id, name, value: cloneVector(value) }]
        : currentValues;
    });
    return id;
  }

  function renameMatrixValue(id: string, nextName: string) {
    const normalizedName = normalizeMatrixValueName(nextName);
    setMatrixValues((currentValues) => {
      if (!isValidMatrixValueName(normalizedName)) {
        return currentValues;
      }
      const duplicate = currentValues.some((value) => value.id !== id && value.name === normalizedName);
      if (duplicate) {
        return currentValues;
      }
      return currentValues.map((value) =>
        value.id === id ? { ...value, name: normalizedName } : value,
      );
    });
  }

  function renameVectorValue(id: string, nextName: string) {
    const normalizedName = normalizeVectorValueName(nextName);
    setVectorValues((currentValues) => {
      if (!isValidVectorValueName(normalizedName)) {
        return currentValues;
      }
      const duplicate = currentValues.some((value) => value.id !== id && value.name === normalizedName);
      if (duplicate) {
        return currentValues;
      }
      return currentValues.map((value) =>
        value.id === id ? { ...value, name: normalizedName } : value,
      );
    });
  }

  function duplicateMatrixValue(id: string) {
    const newId = `matrix-${nextMatrixValueIdRef.current}`;
    nextMatrixValueIdRef.current += 1;
    setMatrixValues((currentValues) => {
      const source = matrixValueById(currentValues, id);
      const name = source ? nextMatrixValueName(currentValues, source.name) : null;
      return source && name
        ? [...currentValues, { id: newId, name, value: cloneMatrix(source.value) }]
        : currentValues;
    });
    return newId;
  }

  function duplicateVectorValue(id: string) {
    const newId = `vector-${nextVectorValueIdRef.current}`;
    nextVectorValueIdRef.current += 1;
    setVectorValues((currentValues) => {
      const source = vectorValueById(currentValues, id);
      const name = source ? nextVectorValueName(currentValues, source.name) : null;
      return source && name
        ? [...currentValues, { id: newId, name, value: cloneVector(source.value) }]
        : currentValues;
    });
    return newId;
  }

  function deleteMatrixValue(id: string) {
    const canDelete = matrixValues.length > 1 && matrixValueById(matrixValues, id);
    const fallbackId = matrixValues.find((value) => value.id !== id)?.id ?? DEFAULT_MATRIX_LEFT_ID;
    if (!canDelete) {
      return;
    }
    setMatrixValues((currentValues) => {
      if (currentValues.length <= 1 || !matrixValueById(currentValues, id)) {
        return currentValues;
      }
      return currentValues.filter((value) => value.id !== id);
    });
    setActiveMatrixLeftId((currentId) => (currentId === id ? fallbackId : currentId));
    setActiveMatrixRightId((currentId) => (currentId === id ? fallbackId : currentId));
  }

  function deleteVectorValue(id: string) {
    const canDelete = vectorValues.length > 1 && vectorValueById(vectorValues, id);
    const fallbackId = vectorValues.find((value) => value.id !== id)?.id ?? DEFAULT_VECTOR_LEFT_ID;
    if (!canDelete) {
      return;
    }
    setVectorValues((currentValues) => {
      if (currentValues.length <= 1 || !vectorValueById(currentValues, id)) {
        return currentValues;
      }
      return currentValues.filter((value) => value.id !== id);
    });
    setActiveVectorLeftId((currentId) => (currentId === id ? fallbackId : currentId));
    setActiveVectorRightId((currentId) => (currentId === id ? fallbackId : currentId));
  }

  function setActiveMatrixValueIds(leftId: string, rightId: string) {
    setActiveMatrixLeftId(leftId);
    setActiveMatrixRightId(rightId);
  }

  function setActiveVectorValueIds(leftId: string, rightId: string) {
    setActiveVectorLeftId(leftId);
    setActiveVectorRightId(rightId);
  }

  function resetMatrixValues() {
    setMatrixValues(defaultMatrixValues());
    setActiveMatrixLeftId(DEFAULT_MATRIX_LEFT_ID);
    setActiveMatrixRightId(DEFAULT_MATRIX_RIGHT_ID);
  }

  function resetVectorValues() {
    setVectorValues(defaultVectorValues());
    setActiveVectorLeftId(DEFAULT_VECTOR_LEFT_ID);
    setActiveVectorRightId(DEFAULT_VECTOR_RIGHT_ID);
  }

  function captureMatrixSurfaceState(): MatrixSurfaceState {
    return {
      matrixA: cloneMatrix(matrixA),
      matrixB: cloneMatrix(matrixB),
      matrixValues: cloneMatrixNamedValues(matrixValues),
      activeMatrixLeftId,
      activeMatrixRightId,
      matrixEditorLatex,
    };
  }

  function restoreMatrixSurfaceState(state: MatrixSurfaceState | null) {
    const restoredValues = state?.matrixValues
      ? cloneMatrixNamedValues(state.matrixValues)
      : matrixValuesFromCompatibility(
          state?.matrixA ?? DEFAULT_MATRIX_A,
          state?.matrixB ?? DEFAULT_MATRIX_B,
        );
    setMatrixValues(restoredValues);
    setActiveMatrixLeftId(state?.activeMatrixLeftId ?? DEFAULT_MATRIX_LEFT_ID);
    setActiveMatrixRightId(state?.activeMatrixRightId ?? DEFAULT_MATRIX_RIGHT_ID);
    setMatrixEditorLatex(state?.matrixEditorLatex ?? '');
  }

  function captureVectorSurfaceState(): VectorSurfaceState {
    return {
      vectorA: cloneVector(vectorA),
      vectorB: cloneVector(vectorB),
      vectorValues: cloneVectorNamedValues(vectorValues),
      activeVectorLeftId,
      activeVectorRightId,
      vectorEditorLatex,
    };
  }

  function restoreVectorSurfaceState(state: VectorSurfaceState | null) {
    const restoredValues = state?.vectorValues
      ? cloneVectorNamedValues(state.vectorValues)
      : vectorValuesFromCompatibility(
          state?.vectorA ?? DEFAULT_VECTOR_A,
          state?.vectorB ?? DEFAULT_VECTOR_B,
        );
    setVectorValues(restoredValues);
    setActiveVectorLeftId(state?.activeVectorLeftId ?? DEFAULT_VECTOR_LEFT_ID);
    setActiveVectorRightId(state?.activeVectorRightId ?? DEFAULT_VECTOR_RIGHT_ID);
    setVectorEditorLatex(state?.vectorEditorLatex ?? '');
  }

  const activeMatrixValues = activeMatrixValuePair(matrixValues, activeMatrixLeftId, activeMatrixRightId);
  const activeVectorValues = activeVectorValuePair(vectorValues, activeVectorLeftId, activeVectorRightId);

  return {
    activeMatrixLeftId,
    activeMatrixRightId,
    activeVectorLeftId,
    activeVectorRightId,
    addMatrixValue,
    addVectorValue,
    canonicalizeMatrixEditorPaste,
    canonicalizeVectorEditorPaste,
    captureMatrixSurfaceState,
    captureVectorSurfaceState,
    deleteMatrixValue,
    deleteVectorValue,
    duplicateMatrixValue,
    duplicateVectorValue,
    matrixA,
    matrixB,
    matrixEditorLatex,
    matrixSoftActions: buildMatrixSoftActions(activeMatrixValues.left.name, activeMatrixValues.right.name),
    matrixValues: cloneMatrixNamedValues(matrixValues),
    renameMatrixValue,
    renameVectorValue,
    runMatrixEditorAction,
    runMatrixAction,
    runVectorEditorAction,
    runVectorAction,
    restoreMatrixSurfaceState,
    restoreVectorSurfaceState,
    resizeMatrix,
    resizeMatrixValueById,
    resizeVector,
    resizeVectorValueById,
    resetMatrixValues,
    resetVectorValues,
    setActiveMatrixValueIds,
    setActiveVectorValueIds,
    setMatrixA,
    setMatrixB,
    setMatrixCell,
    setMatrixEditorLatex,
    setMatrixValueCell,
    setVectorA,
    setVectorB,
    setVectorCell,
    setVectorEditorLatex,
    setVectorValueCell,
    vectorA,
    vectorB,
    vectorEditorLatex,
    vectorSoftActions: buildVectorSoftActions(activeVectorValues.left.name, activeVectorValues.right.name),
    vectorValues: cloneVectorNamedValues(vectorValues),
  };
}
