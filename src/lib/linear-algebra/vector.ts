import type {
  VectorRequest,
  VectorResponse,
} from '../../types/calculator';
import { formatApproxNumber, scalarToLatex, vectorToLatex } from '../display/format';
import {
  runNumericVectorOperation,
  type VectorCoreResult,
  type VectorCoreStopReason,
} from './vector-core';

function vectorStopReasonToMessage(reason: VectorCoreStopReason): string {
  switch (reason) {
    case 'vector-a-incomplete':
      return 'Vector u is incomplete.';
    case 'vector-b-incomplete':
      return 'Vector v is incomplete.';
    case 'vector-b-required':
      return 'Vector v is required for this operation.';
    case 'dimension-mismatch':
      return 'Vector dimensions must match.';
    case 'cross-requires-3d':
      return 'Cross product requires 3D vectors.';
    case 'angle-zero-vector':
      return 'Angle is undefined when one vector has zero length.';
    case 'projection-zero-base':
      return 'Projection needs a nonzero vector to project onto.';
    case 'unit-zero-vector':
      return 'Unit vector is undefined for the zero vector.';
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

  if (result.kind === 'orthogonality') {
    return {
      resultLatex: result.orthogonal ? '\\text{Orthogonal}' : '\\text{Not orthogonal}',
      approxText: `dot = ${formatApproxNumber(result.dot)}`,
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
