import { runMatrixOperation } from '../linear-algebra/matrix';
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
  MatrixOperation,
} from '../../types/calculator';

export type RunMatrixModeRequest = {
  operation: MatrixOperation;
  matrixA: number[][];
  matrixB: number[][];
};

export function matrixOperationLabel(operation: MatrixOperation) {
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
    default:
      return 'Matrix';
  }
}

export function runMatrixMode({ operation, matrixA, matrixB }: RunMatrixModeRequest): DisplayOutcome {
  const response = runMatrixOperation({ operation, matrixA, matrixB });
  if (response.error) {
    return {
      kind: 'error',
      title: matrixOperationLabel(operation),
      error: response.error,
      warnings: response.warnings,
      exactLatex: response.resultLatex,
      approxText: response.approxText,
    };
  }

  return {
    kind: 'success',
    title: matrixOperationLabel(operation),
    exactLatex: response.resultLatex,
    approxText: response.approxText,
    warnings: response.warnings,
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
