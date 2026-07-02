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
  runLinearAlgebraModeViaIsolatedWorker,
  type CreateLinearAlgebraWorker,
} from './worker-clients/linear-algebra-worker-client';
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
  systemForm?: MatrixSystemForm;
  exactMatrixA?: ExactScalarWire[][];
  exactMatrixB?: ExactScalarWire[][];
  exactSystemRhs?: ExactScalarWire[];
  editorExpressionLatex?: string;
  matrixOperandLatexA?: string;
  matrixOperandLatexB?: string;
  systemRhsLatex?: string;
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
    case 'invertibilityA':
      return 'invertible(A)';
    case 'invertibilityB':
      return 'invertible(B)';
    case 'eigenA':
      return 'eigen(A)';
    case 'eigenB':
      return 'eigen(B)';
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
    || request.systemRhsLatex !== undefined;
  return usesInlineOperand && request.editorExpressionLatex
    ? request.editorExpressionLatex
    : matrixOperationLabel(request.operation, request.systemForm);
}

export function runMatrixMode(request: RunMatrixModeRequest): DisplayOutcome {
  const {
    operation,
    matrixA,
    matrixB,
    systemRhs,
    systemForm,
    exactMatrixA,
    exactMatrixB,
    exactSystemRhs,
    editorExpressionLatex,
    matrixOperandLatexA,
    matrixOperandLatexB,
    systemRhsLatex,
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
    exactMatrixA,
    exactMatrixB,
    editorExpressionLatex,
    matrixOperandLatexA,
    matrixOperandLatexB,
    systemRhsLatex,
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
      approxText: response.approxText,
      detailSections: response.detailSections,
      actions,
      sourceMode: 'matrix',
    };
  }

  return {
    kind: 'success',
    title: matrixResultTitle(request),
    exactLatex: response.resultLatex,
    approxText: response.approxText,
    detailSections: response.detailSections,
    warnings: response.warnings,
    actions,
    sourceMode: 'matrix',
  };
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
      systemForm: request.systemForm,
      exactMatrixA: request.exactMatrixA,
      exactMatrixB: request.exactMatrixB,
      exactSystemRhs: request.exactSystemRhs,
      editorExpressionLatex: request.editorExpressionLatex,
      matrixOperandLatexA: request.matrixOperandLatexA,
      matrixOperandLatexB: request.matrixOperandLatexB,
      systemRhsLatex: request.systemRhsLatex,
    },
  };
}

export function buildMatrixOoeInputRevisionId(request: RunMatrixModeRequest) {
  return buildOoeInputRevisionId('linearAlgebra.matrix', buildMatrixOoeSnapshot(request));
}

export async function runMatrixModeWithOoePilot(
  request: RunMatrixModeRequest,
  options?: OoeJobContextOptions & {
    createWorker?: CreateLinearAlgebraWorker;
  },
) {
  let hostExecution: LinearAlgebraHostExecution | undefined;
  const routeSnapshot = buildMatrixOoeSnapshot(request);
  return runLinearAlgebraWithOoePilot(
    'matrix',
    async (control) => {
      const result = await runLinearAlgebraModeViaIsolatedWorker(
        {
          kind: 'matrix',
          request,
        },
        control,
        {
          createWorker: options?.createWorker,
          fallback: () => runMatrixMode(request),
        },
      );
      hostExecution = result.hostExecution;
      return result.payload;
    },
    routeSnapshot,
    options,
    () => hostExecution,
  );
}
