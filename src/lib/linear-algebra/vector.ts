import type {
  DisplayDetailSection,
  VectorRequest,
  VectorResponse,
} from '../../types/calculator';
import { formatApproxNumber, scalarToLatex, vectorToLatex } from '../display/format';
import {
  dotVectors,
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
    case 'gram-schmidt-zero-span':
      return 'Gram-Schmidt needs at least one nonzero vector.';
    case 'unsupported-operation':
      return 'Unsupported vector operation.';
  }
}

function vectorSetLatex(label: string, vectors: readonly number[][]) {
  return `${label}=\\left\\{${vectors.map(vectorToLatex).join(',')}\\right\\}`;
}

function gramSchmidtDetailSections(
  req: VectorRequest,
  result: Extract<VectorCoreResult, { kind: 'gramSchmidt' }>,
): DisplayDetailSection[] {
  const sections: DisplayDetailSection[] = [];
  const secondInputLatex = req.vectorOperandLatexB ?? 'v';

  if (result.orthonormalBasis.length === result.orthogonalBasis.length) {
    sections.push({
      title: 'Orthonormal Basis',
      lineKind: 'math',
      lines: [
        vectorSetLatex('\\operatorname{orthonormal\\ basis}', result.orthonormalBasis),
      ],
    });
  }

  const proofLines = [
    `w_{1}=${vectorToLatex(result.orthogonalBasis[0])}`,
    ...(result.orthogonalBasis[1]
      ? [
          `w_{2}=${secondInputLatex}-\\operatorname{proj}_{w_{1}}(${secondInputLatex})=${vectorToLatex(result.orthogonalBasis[1])}`,
          `w_{1}\\cdot w_{2}=${scalarToLatex(dotVectors(result.orthogonalBasis[0], result.orthogonalBasis[1]))}`,
        ]
      : []),
  ];

  sections.push({
    title: 'Gram-Schmidt Proof',
    lineKind: 'math',
    lines: proofLines,
  });

  if (result.notes.length > 0) {
    sections.push({
      title: 'Dependency Note',
      lineKind: 'text',
      lines: result.notes,
    });
  }

  return sections;
}

function vectorCoreResultToResponse(req: VectorRequest, result: VectorCoreResult): VectorResponse {
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

  if (result.kind === 'gramSchmidt') {
    return {
      resultLatex: vectorSetLatex('\\operatorname{orthogonal\\ basis}', result.orthogonalBasis),
      approxText: result.notes.length > 0
        ? `${result.orthogonalBasis.length} basis direction${result.orthogonalBasis.length === 1 ? '' : 's'}; dependent input skipped`
        : `${result.orthogonalBasis.length} basis directions`,
      detailSections: gramSchmidtDetailSections(req, result),
      warnings: [],
    };
  }

  return {
    resultLatex: vectorToLatex(result.value),
    warnings: [],
  };
}

export function runVectorOperation(req: VectorRequest): VectorResponse {
  return vectorCoreResultToResponse(req, runNumericVectorOperation(req));
}
