import { runVectorOperation } from '../linear-algebra/vector';
import {
  buildOoeInputRevisionId,
  type OoeJobContextOptions,
} from '../ooe/job-contract';
import {
  runLinearAlgebraWithOoePilot,
  type LinearAlgebraHostExecution,
} from '../ooe/linear-algebra-pilot';
import {
  runLinearAlgebraModeViaIsolatedWorker,
  type CreateLinearAlgebraWorker,
} from './linear-algebra-worker-client';
import type {
  AngleUnit,
  DisplayOutcome,
  VectorOperation,
} from '../../types/calculator';

export type RunVectorModeRequest = {
  operation: VectorOperation;
  vectorA: number[];
  vectorB: number[];
  angleUnit: AngleUnit;
};

export function vectorOperationLabel(operation: VectorOperation) {
  switch (operation) {
    case 'dot':
      return 'Dot';
    case 'cross':
      return 'Cross';
    case 'normA':
      return 'Norm A';
    case 'normB':
      return 'Norm B';
    case 'angle':
      return 'Angle';
    case 'add':
      return 'A+B';
    case 'subtract':
      return 'A-B';
    default:
      return 'Vector';
  }
}

export function runVectorMode({ operation, vectorA, vectorB, angleUnit }: RunVectorModeRequest): DisplayOutcome {
  const response = runVectorOperation({ operation, vectorA, vectorB, angleUnit });
  if (response.error) {
    return {
      kind: 'error',
      title: vectorOperationLabel(operation),
      error: response.error,
      warnings: response.warnings,
      exactLatex: response.resultLatex,
      approxText: response.approxText,
    };
  }

  return {
    kind: 'success',
    title: vectorOperationLabel(operation),
    exactLatex: response.resultLatex,
    approxText: response.approxText,
    warnings: response.warnings,
  };
}

export function buildVectorOoeSnapshot(request: RunVectorModeRequest) {
  return {
    kind: 'vector' as const,
    request: {
      operation: request.operation,
      lengthA: request.vectorA.length,
      lengthB: request.vectorB.length,
      angleUnit: request.angleUnit,
      vectorA: request.vectorA,
      vectorB: request.vectorB,
    },
  };
}

export function buildVectorOoeInputRevisionId(request: RunVectorModeRequest) {
  return buildOoeInputRevisionId('linearAlgebra.vector', buildVectorOoeSnapshot(request));
}

export async function runVectorModeWithOoePilot(
  request: RunVectorModeRequest,
  options?: OoeJobContextOptions & {
    createWorker?: CreateLinearAlgebraWorker;
  },
) {
  let hostExecution: LinearAlgebraHostExecution | undefined;
  const routeSnapshot = buildVectorOoeSnapshot(request);
  return runLinearAlgebraWithOoePilot(
    'vector',
    async (control) => {
      const result = await runLinearAlgebraModeViaIsolatedWorker(
        {
          kind: 'vector',
          request,
        },
        control,
        {
          createWorker: options?.createWorker,
          fallback: () => runVectorMode(request),
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
