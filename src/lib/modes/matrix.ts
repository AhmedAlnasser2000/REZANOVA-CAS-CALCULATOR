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
    case 'linearSystem':
      return form === 'Ax+b=0' ? 'Ax+b=0' : 'Ax=b';
    default:
      return 'Matrix';
  }
}

export function runMatrixMode({
  operation,
  matrixA,
  matrixB,
  systemRhs,
  systemForm,
  exactMatrixA,
  exactMatrixB,
  exactSystemRhs,
}: RunMatrixModeRequest): DisplayOutcome {
  if (operation === 'linearSystem') {
    return runMatrixLinearSystem({
      coefficients: matrixA,
      constants: systemRhs ?? [],
      form: systemForm ?? 'Ax=b',
      exactCoefficients: exactMatrixA,
      exactConstants: exactSystemRhs,
    });
  }

  const response = runMatrixOperation({ operation, matrixA, matrixB, exactMatrixA, exactMatrixB });
  if (response.error) {
    return {
      kind: 'error',
      title: matrixOperationLabel(operation, systemForm),
      error: response.error,
      warnings: response.warnings,
      exactLatex: response.resultLatex,
      approxText: response.approxText,
    };
  }

  return {
    kind: 'success',
    title: matrixOperationLabel(operation, systemForm),
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
      systemRhs: request.systemRhs,
      systemForm: request.systemForm,
      exactMatrixA: request.exactMatrixA,
      exactMatrixB: request.exactMatrixB,
      exactSystemRhs: request.exactSystemRhs,
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
