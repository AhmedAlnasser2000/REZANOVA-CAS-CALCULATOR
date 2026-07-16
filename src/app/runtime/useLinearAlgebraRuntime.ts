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
  buildMatrixSoftActions,
  buildVectorSoftActions,
} from './linearAlgebraActiveOperands';
import { isOoeCommitAllowed } from '../../lib/ooe/job-launch/job-contract';
import {
  ooeJobContextFromHistoryTicket,
  type PendingHistoryTicketReservation,
} from '../../lib/ooe/job-launch/launch-tickets';
import {
  activeMatrixValuePair,
  activeVectorValuePair,
  dispatchMatrixEditorLatex,
  dispatchVectorEditorLatex,
  type LinearAlgebraEquationHandoff,
  DEFAULT_MATRIX_LEFT_ID,
  DEFAULT_MATRIX_RIGHT_ID,
  DEFAULT_VECTOR_LEFT_ID,
  DEFAULT_VECTOR_RIGHT_ID,
  isValidMatrixValueName,
  isValidVectorValueName,
  isScalarMatrixNamedValue,
  isScalarVectorNamedValue,
  matrixValueById,
  numericMatrixFromNamedValue,
  numericVectorFromNamedValue,
  parseLinearAlgebraScalarWire,
  resizeMatrixNamedValue,
  resizeVectorNamedValue,
  nextMatrixValueName,
  nextVectorValueName,
  normalizeMatrixValueName,
  normalizeVectorValueName,
  vectorValueById,
  withMatrixNamedValueScalarCell,
  withVectorNamedValueScalarCell,
  cloneMatrixNamedValues,
  cloneVectorNamedValues,
  clampLinearAlgebraEditingDimension,
} from '../../lib/linear-algebra/runtime-request';
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
import {
  matrixValueForCompatibility,
  resizeNumericMatrixValue,
  resizeNumericVectorValue,
  vectorValueForCompatibility,
} from './linearAlgebraRuntimeValues';
import type {
  MatrixSurfaceState,
  VectorSurfaceState,
} from './workspace-surface-state';
import type {
  AngleUnit,
  CanonicalRuntimeOutcome,
  CanonicalRuntimeActionV1,
  ComplexExactForm,
  LinearAlgebraScalarDomain,
  LinearAlgebraSubstitutionMode,
  MatrixOperation,
  ModeId,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
  VectorOperation,
} from '../../types/calculator';
import {
  canonicalMathValue,
  createCanonicalRuntimeError,
} from '../../lib/result-contract';
import { buildVectorActionRuntimeRequest } from './linearAlgebraVectorActionRequest';
import { buildMatrixActionRuntimeRequest } from './linearAlgebraMatrixActionRequest';

type CommitLinearAlgebraOutcome = (
  outcome: CanonicalRuntimeOutcome,
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
  approxDigits?: number;
  complexExactForm: ComplexExactForm;
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
  storedVariables: readonly StoredVariableValue[];
  syncEditorLatex?: (mode: 'matrix' | 'vector', latex: string) => void;
};

export function useLinearAlgebraRuntime({
  angleUnit,
  approxDigits = 6,
  complexExactForm,
  commitOutcome,
  discardHistoryTicket,
  getCurrentMode,
  reserveHistoryTicket,
  setRuntimeStatusOverride,
  storedVariables,
  syncEditorLatex,
}: UseLinearAlgebraRuntimeOptions) {
  const [matrixValues, setMatrixValues] = useState(defaultMatrixValues);
  const [activeMatrixLeftId, setActiveMatrixLeftId] = useState(DEFAULT_MATRIX_LEFT_ID);
  const [activeMatrixRightId, setActiveMatrixRightId] = useState(DEFAULT_MATRIX_RIGHT_ID);
  const [matrixEditorLatex, setMatrixEditorLatex] = useState('');
  const [matrixDomain, setMatrixDomain] = useState<LinearAlgebraScalarDomain>('real');
  const [matrixSubstitutionMode, setMatrixSubstitutionMode] = useState<LinearAlgebraSubstitutionMode>('symbolic');
  const [matrixSubstitutionSnapshot, setMatrixSubstitutionSnapshot] = useState<VariableSubstitutionSnapshot[] | null>(null);
  const [vectorValues, setVectorValues] = useState(defaultVectorValues);
  const [activeVectorLeftId, setActiveVectorLeftId] = useState(DEFAULT_VECTOR_LEFT_ID);
  const [activeVectorRightId, setActiveVectorRightId] = useState(DEFAULT_VECTOR_RIGHT_ID);
  const [vectorEditorLatex, setVectorEditorLatex] = useState('');
  const [vectorDomain, setVectorDomain] = useState<LinearAlgebraScalarDomain>('real');
  const [vectorSubstitutionMode, setVectorSubstitutionMode] = useState<LinearAlgebraSubstitutionMode>('symbolic');
  const [vectorSubstitutionSnapshot, setVectorSubstitutionSnapshot] = useState<VariableSubstitutionSnapshot[] | null>(null);
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
    approxDigits,
    complexExactForm,
    domain: matrixDomain,
    substitutionMode: matrixSubstitutionMode,
    storedVariables: matrixSubstitutionSnapshot ?? storedVariables,
  });
  const vectorStateRef = useRef({
    vectorA,
    vectorB,
    vectorValues,
    activeVectorLeftId,
    activeVectorRightId,
    angleUnit,
    approxDigits,
    complexExactForm,
    domain: vectorDomain,
    substitutionMode: vectorSubstitutionMode,
    storedVariables: vectorSubstitutionSnapshot ?? storedVariables,
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
      approxDigits,
      complexExactForm,
      domain: matrixDomain,
      substitutionMode: matrixSubstitutionMode,
      storedVariables: matrixSubstitutionSnapshot ?? storedVariables,
    };
  }, [activeMatrixLeftId, activeMatrixRightId, approxDigits, complexExactForm, matrixA, matrixB, matrixDomain, matrixSubstitutionMode, matrixSubstitutionSnapshot, matrixValues, storedVariables]);

  useEffect(() => {
    vectorStateRef.current = {
      vectorA,
      vectorB,
      vectorValues,
      activeVectorLeftId,
      activeVectorRightId,
      angleUnit,
      approxDigits,
      complexExactForm,
      domain: vectorDomain,
      substitutionMode: vectorSubstitutionMode,
      storedVariables: vectorSubstitutionSnapshot ?? storedVariables,
    };
  }, [activeVectorLeftId, activeVectorRightId, angleUnit, approxDigits, complexExactForm, storedVariables, vectorA, vectorB, vectorDomain, vectorSubstitutionMode, vectorSubstitutionSnapshot, vectorValues]);

  function handoffActions(handoff?: LinearAlgebraEquationHandoff): CanonicalRuntimeActionV1[] | undefined {
    return handoff
      ? [{ kind: 'send', target: 'equation', math: canonicalMathValue(handoff.latex) }]
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
      approxDigits: state.approxDigits,
      domain: state.domain,
      substitutionMode: state.substitutionMode,
      complexExactForm: state.complexExactForm,
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
      approxDigits: state.approxDigits,
      domain: state.domain,
      substitutionMode: state.substitutionMode,
      complexExactForm: state.complexExactForm,
    };
  }

  function commitMatrixEditorError(
    inputLatex: string,
    message: string,
    handoff?: LinearAlgebraEquationHandoff,
  ) {
    commitOutcome(createCanonicalRuntimeError('Matrix', message, {
      actions: handoffActions(handoff),
    }), inputLatex, 'matrix');
  }

  function commitVectorEditorError(
    inputLatex: string,
    message: string,
    handoff?: LinearAlgebraEquationHandoff,
  ) {
    commitOutcome(createCanonicalRuntimeError('Vector', message, {
      actions: handoffActions(handoff),
    }), inputLatex, 'vector');
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
      const loadError = createCanonicalRuntimeError(
        'Matrix',
        error instanceof Error
          ? `Could not load the Matrix runtime: ${error.message}`
          : 'Could not load the Matrix runtime.',
      );
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
    const launched = buildMatrixActionRuntimeRequest(operation, matrixStateRef.current);
    if ('error' in launched) {
      commitMatrixEditorError(launched.inputLatex, launched.error);
      return;
    }
    runMatrixRequest(
      launched.request,
      launched.inputLatex,
      () => {
        const rebuilt = buildMatrixActionRuntimeRequest(operation, matrixStateRef.current);
        return 'error' in rebuilt ? launched.request : rebuilt.request;
      },
    );
  }

  function runMatrixEditorAction() {
    const inputLatex = matrixEditorLatex;
    const active = matrixStateRef.current;
    const dispatched = dispatchMatrixEditorLatex({
      latex: inputLatex,
      matrixA: active.matrixA,
      matrixB: active.matrixB,
      matrixValues: active.matrixValues,
      activeMatrixLeftId: active.activeMatrixLeftId,
      activeMatrixRightId: active.activeMatrixRightId,
      domain: active.domain,
      substitutionMode: active.substitutionMode,
      storedVariables: active.storedVariables,
      complexExactForm: active.complexExactForm,
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
      const loadError = createCanonicalRuntimeError(
        'Vector',
        error instanceof Error
          ? `Could not load the Vector runtime: ${error.message}`
          : 'Could not load the Vector runtime.',
      );
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
    const launched = buildVectorActionRuntimeRequest(operation, vectorStateRef.current);
    if ('error' in launched) {
      commitVectorEditorError(launched.inputLatex, launched.error);
      return;
    }
    runVectorRequest(
      launched.request,
      launched.inputLatex,
      () => {
        const rebuilt = buildVectorActionRuntimeRequest(operation, vectorStateRef.current);
        return 'error' in rebuilt ? launched.request : rebuilt.request;
      },
    );
  }

  function runVectorEditorAction() {
    const inputLatex = vectorEditorLatex;
    const active = vectorStateRef.current;
    const dispatched = dispatchVectorEditorLatex({
      latex: inputLatex,
      vectorA: active.vectorA,
      vectorB: active.vectorB,
      vectorValues: active.vectorValues,
      angleUnit: active.angleUnit,
      domain: active.domain,
      substitutionMode: active.substitutionMode,
      storedVariables: active.storedVariables,
      complexExactForm: active.complexExactForm,
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
      activeMatrixLeftId: active.activeMatrixLeftId,
      activeMatrixRightId: active.activeMatrixRightId,
      domain: active.domain,
      substitutionMode: active.substitutionMode,
      storedVariables: active.storedVariables,
      complexExactForm: active.complexExactForm,
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
      domain: active.domain,
      substitutionMode: active.substitutionMode,
      storedVariables: active.storedVariables,
      complexExactForm: active.complexExactForm,
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
          ? {
              id: currentValue.id,
              name: currentValue.name,
              value: updater(numericMatrixFromNamedValue(currentValue) ?? cloneMatrix(fallbackValue)),
            }
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
          ? {
              id: currentValue.id,
              name: currentValue.name,
              value: updater(numericVectorFromNamedValue(currentValue) ?? cloneVector(fallbackValue)),
            }
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
      resizeNumericMatrixValue(currentMatrix, rows, columns),
    );
  }

  function resizeVector(which: 'A' | 'B', length: number) {
    const id = which === 'A' ? DEFAULT_VECTOR_LEFT_ID : DEFAULT_VECTOR_RIGHT_ID;
    const fallbackName = which === 'A' ? 'u' : 'v';
    const fallbackValue = which === 'A' ? DEFAULT_VECTOR_A : DEFAULT_VECTOR_B;
    updateVectorValue(id, fallbackName, fallbackValue, (currentVector) =>
      resizeNumericVectorValue(currentVector, length),
    );
  }

  function setMatrixValueCell(id: string, row: number, column: number, value: number) {
    setMatrixValues((currentValues) =>
      currentValues.map((currentValue) =>
        currentValue.id === id
          ? isScalarMatrixNamedValue(currentValue)
            ? currentValue
            : {
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
          ? isScalarVectorNamedValue(currentValue)
            ? currentValue
            : {
              ...currentValue,
              value: currentValue.value.map((cell, cellIndex) =>
                cellIndex === index ? (Number.isFinite(value) ? value : 0) : cell,
              ),
              }
          : currentValue,
      ),
    );
  }

  function setMatrixValueCellLatex(id: string, row: number, column: number, latex: string) {
    const parsed = parseLinearAlgebraScalarWire(latex, matrixDomain);
    if (!parsed.ok) return parsed.error;
    setMatrixSubstitutionSnapshot(null);
    setMatrixValues((currentValues) => currentValues.map((currentValue) =>
      currentValue.id === id
        ? withMatrixNamedValueScalarCell(currentValue, row, column, parsed.value)
        : currentValue));
    return null;
  }

  function setVectorValueCellLatex(id: string, index: number, latex: string) {
    const parsed = parseLinearAlgebraScalarWire(latex, vectorDomain);
    if (!parsed.ok) return parsed.error;
    setVectorSubstitutionSnapshot(null);
    setVectorValues((currentValues) => currentValues.map((currentValue) =>
      currentValue.id === id
        ? withVectorNamedValueScalarCell(currentValue, index, parsed.value)
        : currentValue));
    return null;
  }

  function resizeMatrixValueById(id: string, rows: number, columns: number) {
    setMatrixValues((currentValues) =>
      currentValues.map((currentValue) =>
        currentValue.id === id
          ? resizeMatrixNamedValue(currentValue, clampLinearAlgebraEditingDimension(rows), clampLinearAlgebraEditingDimension(columns))
          : currentValue,
      ),
    );
  }

  function resizeVectorValueById(id: string, length: number) {
    setVectorValues((currentValues) =>
      currentValues.map((currentValue) =>
        currentValue.id === id
          ? resizeVectorNamedValue(currentValue, clampLinearAlgebraEditingDimension(length))
          : currentValue,
      ),
    );
  }

  function addMatrixValue(preferredName?: string, value: number[][] = DEFAULT_MATRIX_A) {
    const name = nextMatrixValueName(matrixValues, preferredName);
    if (!name) {
      return '';
    }
    const id = `matrix-${nextMatrixValueIdRef.current}`;
    nextMatrixValueIdRef.current += 1;
    setMatrixValues((currentValues) => [...currentValues, { id, name, value: cloneMatrix(value) }]);
    setActiveMatrixLeftId(id);
    return id;
  }

  function addVectorValue(preferredName?: string, value: number[] = DEFAULT_VECTOR_A) {
    const name = nextVectorValueName(vectorValues, preferredName);
    if (!name) {
      return '';
    }
    const id = `vector-${nextVectorValueIdRef.current}`;
    nextVectorValueIdRef.current += 1;
    setVectorValues((currentValues) => [...currentValues, { id, name, value: cloneVector(value) }]);
    setActiveVectorLeftId(id);
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
    const source = matrixValueById(matrixValues, id);
    const name = source ? nextMatrixValueName(matrixValues, source.name) : null;
    if (!source || !name) {
      return '';
    }
    const newId = `matrix-${nextMatrixValueIdRef.current}`;
    nextMatrixValueIdRef.current += 1;
    setMatrixValues((currentValues) => [
      ...currentValues,
      { ...cloneMatrixNamedValues([source])[0], id: newId, name },
    ]);
    setActiveMatrixLeftId(newId);
    return newId;
  }

  function duplicateVectorValue(id: string) {
    const source = vectorValueById(vectorValues, id);
    const name = source ? nextVectorValueName(vectorValues, source.name) : null;
    if (!source || !name) {
      return '';
    }
    const newId = `vector-${nextVectorValueIdRef.current}`;
    nextVectorValueIdRef.current += 1;
    setVectorValues((currentValues) => [
      ...currentValues,
      { ...cloneVectorNamedValues([source])[0], id: newId, name },
    ]);
    setActiveVectorLeftId(newId);
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
    setMatrixDomain('real');
    setMatrixSubstitutionMode('symbolic');
    setMatrixSubstitutionSnapshot(null);
  }

  function resetVectorValues() {
    setVectorValues(defaultVectorValues());
    setActiveVectorLeftId(DEFAULT_VECTOR_LEFT_ID);
    setActiveVectorRightId(DEFAULT_VECTOR_RIGHT_ID);
    setVectorDomain('real');
    setVectorSubstitutionMode('symbolic');
    setVectorSubstitutionSnapshot(null);
  }

  function captureMatrixSurfaceState(): MatrixSurfaceState {
    return {
      matrixA: cloneMatrix(matrixA),
      matrixB: cloneMatrix(matrixB),
      matrixValues: cloneMatrixNamedValues(matrixValues),
      activeMatrixLeftId,
      activeMatrixRightId,
      matrixEditorLatex,
      matrixDomain,
      matrixSubstitutionMode,
      matrixSubstitutionSnapshot: matrixSubstitutionSnapshot?.map((entry) => ({ ...entry })),
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
    setMatrixDomain(state?.matrixDomain ?? 'real');
    setMatrixSubstitutionMode(state?.matrixSubstitutionMode ?? 'symbolic');
    setMatrixSubstitutionSnapshot(state?.matrixSubstitutionSnapshot?.map((entry) => ({ ...entry })) ?? null);
  }

  function captureVectorSurfaceState(): VectorSurfaceState {
    return {
      vectorA: cloneVector(vectorA),
      vectorB: cloneVector(vectorB),
      vectorValues: cloneVectorNamedValues(vectorValues),
      activeVectorLeftId,
      activeVectorRightId,
      vectorEditorLatex,
      vectorDomain,
      vectorSubstitutionMode,
      vectorSubstitutionSnapshot: vectorSubstitutionSnapshot?.map((entry) => ({ ...entry })),
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
    setVectorDomain(state?.vectorDomain ?? 'real');
    setVectorSubstitutionMode(state?.vectorSubstitutionMode ?? 'symbolic');
    setVectorSubstitutionSnapshot(state?.vectorSubstitutionSnapshot?.map((entry) => ({ ...entry })) ?? null);
  }

  function changeMatrixSubstitutionMode(mode: LinearAlgebraSubstitutionMode) {
    setMatrixSubstitutionSnapshot(null);
    setMatrixSubstitutionMode(mode);
  }

  function changeVectorSubstitutionMode(mode: LinearAlgebraSubstitutionMode) {
    setVectorSubstitutionSnapshot(null);
    setVectorSubstitutionMode(mode);
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
    matrixDomain,
    matrixSubstitutionMode,
    matrixStoredVariables: matrixSubstitutionSnapshot ?? storedVariables,
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
    setMatrixValueCellLatex,
    setMatrixDomain,
    setMatrixSubstitutionMode: changeMatrixSubstitutionMode,
    setVectorA,
    setVectorB,
    setVectorCell,
    setVectorEditorLatex,
    setVectorValueCell,
    setVectorValueCellLatex,
    setVectorDomain,
    setVectorSubstitutionMode: changeVectorSubstitutionMode,
    vectorA,
    vectorB,
    vectorEditorLatex,
    vectorDomain,
    vectorSubstitutionMode,
    vectorStoredVariables: vectorSubstitutionSnapshot ?? storedVariables,
    vectorSoftActions: buildVectorSoftActions(activeVectorValues.left.name, activeVectorValues.right.name),
    vectorValues: cloneVectorNamedValues(vectorValues),
  };
}
