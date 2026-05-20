import type {
  VectorRequest,
  VectorResponse,
} from '../types/calculator';
import { formatApproxNumber, scalarToLatex, vectorToLatex } from './format';
import {
  runNumericVectorOperation,
  type VectorCoreResult,
  type VectorCoreStopReason,
} from './linear-algebra/vector-core';

function vectorStopReasonToMessage(reason: VectorCoreStopReason): string {
  switch (reason) {
    case 'vector-a-incomplete':
      return 'Vector A is incomplete.';
    case 'vector-b-required':
      return 'Vector B is required for this operation.';
    case 'dimension-mismatch':
      return 'Vector dimensions must match.';
    case 'cross-requires-3d':
      return 'Cross product requires 3D vectors.';
    case 'angle-zero-vector':
      return 'Angle is undefined when one vector has zero length.';
    case 'unsupported-operation':
      return 'Unsupported vector operation.';
  }
}

function vectorCoreResultToResponse(result: VectorCoreResult): VectorResponse {
  if (result.kind === 'error') {
    return {
      warnings: [],
      error: vectorStopReasonToMessage(result.reason),
    };
  }

  if (result.kind === 'scalar') {
    const suffix = result.angleUnit === 'deg' ? '^{\\circ}' : result.angleUnit === 'grad' ? '^{g}' : '';
    return {
      resultLatex: `${scalarToLatex(result.value)}${suffix}`,
      approxText: formatApproxNumber(result.value),
      warnings: [],
    };
  }

  return {
    resultLatex: vectorToLatex(result.value),
    warnings: [],
  };
}

export function runVectorOperation(req: VectorRequest): VectorResponse {
  return vectorCoreResultToResponse(runNumericVectorOperation(req));
}
