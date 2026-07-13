import { runMatrixOperation } from '../linear-algebra/matrix';
import { runMatrixLinearSystem } from '../linear-algebra/matrix-system';
import {
  buildOoeInputRevisionId,
  type OoeJobContextOptions,
} from '../ooe/job-launch/job-contract';
import {
  runLinearAlgebraWithOoePilot,
  type LinearAlgebraHostExecution,
} from '../ooe/pilots/linear-algebra-pilot';
import {
  runMatrixModeViaIsolatedWorker,
  type CreateMatrixWorker,
} from './worker-clients/matrix-worker-client';
import { createMatrixResultOutcome } from './matrix-result-document';
import {
  matrixMathJsonRouteForRequest,
  matrixMathValuesFromOwnedLeaves,
  matrixOwnedMathJsonLeaves,
} from './matrix-math-values';
import {
  projectCanonicalRuntimeOutcomeToDisplayOutcome,
  projectDisplayOutcomeToCanonicalRuntimeOutcome,
  requireCanonicalResultAuthority,
} from '../result-contract';
import type {
  DisplayOutcome,
  ExactScalarWire,
  MatrixOperation,
  MatrixSystemForm,
} from '../../types/calculator';

export type RunMatrixModeRequest = {
  operation: MatrixOperation;
  matrixA: number[][];
  matrixB: number[][];
  systemRhs?: number[];
  coordinateVector?: number[];
  matrixPowerExponent?: number;
  systemForm?: MatrixSystemForm;
  exactMatrixA?: ExactScalarWire[][];
  exactMatrixB?: ExactScalarWire[][];
  exactSystemRhs?: ExactScalarWire[];
  exactCoordinateVector?: ExactScalarWire[];
  editorExpressionLatex?: string;
  matrixOperandLatexA?: string;
  matrixOperandLatexB?: string;
  systemRhsLatex?: string;
  coordinateVectorLatex?: string;
  matrixPowerExponentLatex?: string;
  matrixValues?: { id: string; name: string; value: number[][] }[];
  activeMatrixLeftId?: string;
  activeMatrixRightId?: string;
};

export function matrixOperationLabel(operation: MatrixOperation, form?: MatrixSystemForm) {
  switch (operation) {
    case 'add':
      return 'A+B';
    case 'subtract':
      return 'A-B';
    case 'multiply':
      return 'A×B';
    case 'transposeA':
      return 'Transpose A';
    case 'transposeB':
      return 'Transpose B';
    case 'detA':
      return 'det(A)';
    case 'detB':
      return 'det(B)';
    case 'inverseA':
      return 'Inverse A';
    case 'inverseB':
      return 'Inverse B';
    case 'rankA':
      return 'rank(A)';
    case 'rankB':
      return 'rank(B)';
    case 'rrefA':
      return 'rref(A)';
    case 'rrefB':
      return 'rref(B)';
    case 'nullSpaceA':
      return 'null(A)';
    case 'nullSpaceB':
      return 'null(B)';
    case 'columnSpaceA':
      return 'col(A)';
    case 'columnSpaceB':
      return 'col(B)';
    case 'basisA':
      return 'basis(A)';
    case 'basisB':
      return 'basis(B)';
    case 'coordinatesA':
      return 'coords(A, v)';
    case 'coordinatesB':
      return 'coords(B, v)';
    case 'changeBasis':
      return 'change(A,B)';
    case 'luA':
      return 'lu(A)';
    case 'luB':
      return 'lu(B)';
    case 'pluA':
      return 'plu(A)';
    case 'pluB':
      return 'plu(B)';
    case 'luSolveA':
      return 'lusolve(A,b)';
    case 'luSolveB':
      return 'lusolve(B,b)';
    case 'pluSolveA':
      return 'plusolve(A,b)';
    case 'pluSolveB':
      return 'plusolve(B,b)';
    case 'multiRhsSolve':
      return 'AX=B';
    case 'qrA':
      return 'qr(A)';
    case 'qrB':
      return 'qr(B)';
    case 'columnProjectionA':
      return 'projCol(A,b)';
    case 'columnProjectionB':
      return 'projCol(B,b)';
    case 'leastSquaresA':
      return 'ls(A,b)';
    case 'leastSquaresB':
      return 'ls(B,b)';
    case 'invertibilityA':
      return 'invertible(A)';
    case 'invertibilityB':
      return 'invertible(B)';
    case 'profileA':
      return 'profile(A)';
    case 'profileB':
      return 'profile(B)';
    case 'eigenA':
      return 'eigen(A)';
    case 'eigenB':
      return 'eigen(B)';
    case 'diagonalizeA':
      return 'diag(A)';
    case 'diagonalizeB':
      return 'diag(B)';
    case 'spectralPowerA':
      return 'mpow(A,n)';
    case 'spectralPowerB':
      return 'mpow(B,n)';
    case 'linearSystem':
      return form === 'Ax+b=0' ? 'Ax+b=0' : 'Ax=b';
    default:
      return 'Matrix';
  }
}

function matrixResultTitle(request: RunMatrixModeRequest) {
  const usesInlineOperand =
    (request.matrixOperandLatexA !== undefined && request.matrixOperandLatexA !== 'A')
    || (request.matrixOperandLatexB !== undefined && request.matrixOperandLatexB !== 'B')
    || request.systemRhsLatex !== undefined
    || request.coordinateVectorLatex !== undefined
    || request.matrixPowerExponentLatex !== undefined;
  return usesInlineOperand && request.editorExpressionLatex
    ? request.editorExpressionLatex
    : matrixOperationLabel(request.operation, request.systemForm);
}

function matrixUserFacingApproxText() {
  return undefined;
}

function runMatrixModeOutcome(request: RunMatrixModeRequest): DisplayOutcome {
  const {
    operation,
    matrixA,
    matrixB,
    systemRhs,
    coordinateVector,
    matrixPowerExponent,
    systemForm,
    exactMatrixA,
    exactMatrixB,
    exactSystemRhs,
    exactCoordinateVector,
    editorExpressionLatex,
    matrixOperandLatexA,
    matrixOperandLatexB,
    systemRhsLatex,
    coordinateVectorLatex,
    matrixPowerExponentLatex,
  } = request;
  if (operation === 'linearSystem') {
    return runMatrixLinearSystem({
      coefficients: matrixA,
      constants: systemRhs ?? [],
      form: systemForm ?? 'Ax=b',
      exactCoefficients: exactMatrixA,
      exactConstants: exactSystemRhs,
      editorExpressionLatex,
      coefficientMatrixLatex: matrixOperandLatexA,
      rhsVectorLatex: systemRhsLatex,
    });
  }

  const response = runMatrixOperation({
    operation,
    matrixA,
    matrixB,
    systemRhs,
    coordinateVector,
    matrixPowerExponent,
    exactSystemRhs,
    exactMatrixA,
    exactMatrixB,
    exactCoordinateVector,
    editorExpressionLatex,
    matrixOperandLatexA,
    matrixOperandLatexB,
    systemRhsLatex,
    coordinateVectorLatex,
    matrixPowerExponentLatex,
  });
  const actions = response.handoffEquationLatex
    ? [{ kind: 'send' as const, target: 'equation' as const, latex: response.handoffEquationLatex }]
    : undefined;
  if (response.error) {
    return {
      kind: 'error',
      title: matrixResultTitle(request),
      error: response.error,
      warnings: response.warnings,
      exactLatex: response.resultLatex,
      approxText: matrixUserFacingApproxText(),
      detailSections: response.detailSections,
      actions,
      sourceMode: 'matrix',
    };
  }

  return {
    kind: 'success',
    title: matrixResultTitle(request),
    exactLatex: response.resultLatex,
    answerRows: response.answerRows,
    approxText: matrixUserFacingApproxText(),
    detailSections: response.detailSections,
    warnings: response.warnings,
    actions,
    sourceMode: 'matrix',
  };
}

export function runMatrixMode(request: RunMatrixModeRequest): DisplayOutcome {
  const outcome = runMatrixModeOutcome(request);
  return requireCanonicalResultAuthority(
    outcome.kind === 'prompt'
      ? outcome
      : createMatrixResultOutcome(outcome, {
          mathValues: matrixMathValuesFromOwnedLeaves({
            outcome,
            routeId: matrixMathJsonRouteForRequest(request),
            leaves: matrixOwnedMathJsonLeaves(request),
          }),
        }),
    'Matrix',
  );
}

export function buildMatrixOoeSnapshot(request: RunMatrixModeRequest) {
  return {
    kind: 'matrix' as const,
    request: {
      operation: request.operation,
      rowsA: request.matrixA.length,
      rowsB: request.matrixB.length,
      matrixA: request.matrixA,
      matrixB: request.matrixB,
      systemRhs: request.systemRhs,
      coordinateVector: request.coordinateVector,
      matrixPowerExponent: request.matrixPowerExponent,
      systemForm: request.systemForm,
      exactMatrixA: request.exactMatrixA,
      exactMatrixB: request.exactMatrixB,
      exactSystemRhs: request.exactSystemRhs,
      exactCoordinateVector: request.exactCoordinateVector,
      editorExpressionLatex: request.editorExpressionLatex,
      matrixOperandLatexA: request.matrixOperandLatexA,
      matrixOperandLatexB: request.matrixOperandLatexB,
      systemRhsLatex: request.systemRhsLatex,
      coordinateVectorLatex: request.coordinateVectorLatex,
      matrixPowerExponentLatex: request.matrixPowerExponentLatex,
      matrixValues: request.matrixValues,
      activeMatrixLeftId: request.activeMatrixLeftId,
      activeMatrixRightId: request.activeMatrixRightId,
    },
  };
}

export function buildMatrixOoeInputRevisionId(request: RunMatrixModeRequest) {
  return buildOoeInputRevisionId('linearAlgebra.matrix', buildMatrixOoeSnapshot(request));
}

export async function runMatrixModeWithOoePilot(
  request: RunMatrixModeRequest,
  options?: OoeJobContextOptions & {
    createWorker?: CreateMatrixWorker;
  },
) {
  let hostExecution: LinearAlgebraHostExecution | undefined;
  const routeSnapshot = buildMatrixOoeSnapshot(request);
  const result = await runLinearAlgebraWithOoePilot(
    'matrix',
    async (control) => {
      const result = await runMatrixModeViaIsolatedWorker(
        request,
        control,
        {
          createWorker: options?.createWorker,
          fallback: () => projectDisplayOutcomeToCanonicalRuntimeOutcome(
            runMatrixMode(request),
            'Matrix fallback',
          ),
        },
      );
      hostExecution = result.hostExecution;
      return result.payload;
    },
    routeSnapshot,
    options,
    () => hostExecution,
    (payload) => projectCanonicalRuntimeOutcomeToDisplayOutcome(payload, {
      includeCanonicalMath: false,
    }),
  );
  return {
    ...result,
    payload: projectCanonicalRuntimeOutcomeToDisplayOutcome(result.payload, {
      includeCanonicalMath: false,
    }),
  };
}
