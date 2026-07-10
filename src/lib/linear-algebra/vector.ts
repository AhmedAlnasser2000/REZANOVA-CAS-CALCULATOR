import type {
  DisplayDetailSection,
  VectorRequest,
  VectorResponse,
} from '../../types/calculator';
import { vectorEditingDimensionError } from './dimension-contract';
import {
  exactScalarIsZero,
  exactScalarToNumber,
} from '../algebra/polynomial-core';
import { formatApproxNumber, scalarToLatex, vectorToLatex } from '../display/format';
import type { ExactVector } from './exact-matrix-core';
import {
  exactScalarToLatex,
  exactVectorFromNumeric,
  exactVectorFromWire,
  exactVectorToColumnLatex,
} from './exact-matrix-format';
import {
  exactAddVectors,
  exactCrossVectors,
  exactDotVectors,
  exactGramSchmidtTwoVectors,
  exactOrthogonalComponentToVector,
  exactProjectionOntoVector,
  exactScalarSquareRoot,
  exactSubtractVectors,
  exactUnitVector,
} from './exact-vector-core';
import {
  dotVectors,
  runNumericVectorOperation,
  type NumericVectorRequest,
  type VectorCoreResult,
  type VectorCoreStopReason,
} from './vector-core';
import { runVectorFamilyOperation } from './vector-family';

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

function exactVectorSetLatex(label: string, vectors: readonly ExactVector[]) {
  return `${label}=\\left\\{${vectors.map(exactVectorToColumnLatex).join(',')}\\right\\}`;
}

function vectorBasisAnswerRows(vectors: readonly number[][]) {
  return {
    rows: vectors.map((vector, index) => ({
      latex: `w_{${index + 1}}=${vectorToLatex(vector)}`,
    })),
  };
}

function exactVectorBasisAnswerRows(vectors: readonly ExactVector[]) {
  return {
    rows: vectors.map((vector, index) => ({
      latex: `w_{${index + 1}}=${exactVectorToColumnLatex(vector)}`,
    })),
  };
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

function exactGramSchmidtDetailSections(
  req: VectorRequest,
  result: NonNullable<ReturnType<typeof exactGramSchmidtTwoVectors>>,
  numericResult: Extract<VectorCoreResult, { kind: 'gramSchmidt' }>,
): DisplayDetailSection[] {
  const sections: DisplayDetailSection[] = [];
  const secondInputLatex = req.vectorOperandLatexB ?? 'v';

  if (result.orthonormalBasis?.length === result.orthogonalBasis.length) {
    sections.push({
      title: 'Orthonormal Basis',
      lineKind: 'math',
      lines: [
        exactVectorSetLatex('\\operatorname{orthonormal\\ basis}', result.orthonormalBasis),
      ],
    });
  } else if (numericResult.orthonormalBasis.length === numericResult.orthogonalBasis.length) {
    sections.push({
      title: 'Orthonormal Basis',
      lineKind: 'math',
      lines: [
        vectorSetLatex('\\operatorname{orthonormal\\ basis}', numericResult.orthonormalBasis),
      ],
    });
  }

  const proofLines = [
    `w_{1}=${exactVectorToColumnLatex(result.orthogonalBasis[0])}`,
    ...(result.orthogonalBasis[1]
      ? [
          `w_{2}=${secondInputLatex}-\\operatorname{proj}_{w_{1}}(${secondInputLatex})=${exactVectorToColumnLatex(result.orthogonalBasis[1])}`,
          `w_{1}\\cdot w_{2}=${exactScalarToLatex(exactDotVectors(result.orthogonalBasis[0], result.orthogonalBasis[1]))}`,
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

function exactRequestVector(numericVector: number[] | undefined, exactWire: VectorRequest['exactVectorA']) {
  if (!numericVector) {
    return null;
  }

  const exactFromWire = exactVectorFromWire(exactWire);
  if (exactFromWire && exactVectorMatchesNumeric(exactFromWire, numericVector)) {
    return exactFromWire;
  }

  return exactVectorFromNumeric(numericVector);
}

function exactVectorMatchesNumeric(exactVector: ExactVector, numericVector: number[]) {
  return exactVector.length === numericVector.length
    && exactVector.every((value, index) => Math.abs(exactScalarToNumber(value) - numericVector[index]) <= 1e-12);
}

function exactVectorInputs(req: VectorRequest) {
  return {
    vectorA: exactRequestVector(req.vectorA, req.exactVectorA),
    vectorB: exactRequestVector(req.vectorB, req.exactVectorB),
  };
}

function exactScalarResponse(value: ReturnType<typeof exactDotVectors>): VectorResponse {
  return {
    resultLatex: exactScalarToLatex(value),
    approxText: formatApproxNumber(exactScalarToNumber(value)),
    warnings: [],
  };
}

function exactVectorResponse(req: VectorRequest, result: VectorCoreResult): VectorResponse | null {
  if (result.kind === 'error') {
    return null;
  }

  const { vectorA, vectorB } = exactVectorInputs(req);

  switch (req.operation) {
    case 'add':
      return vectorA && vectorB ? { resultLatex: exactVectorToColumnLatex(exactAddVectors(vectorA, vectorB)), warnings: [] } : null;
    case 'subtract':
      return vectorA && vectorB ? { resultLatex: exactVectorToColumnLatex(exactSubtractVectors(vectorA, vectorB)), warnings: [] } : null;
    case 'cross': {
      const vector = vectorA && vectorB ? exactCrossVectors(vectorA, vectorB) : null;
      return vector ? { resultLatex: exactVectorToColumnLatex(vector), warnings: [] } : null;
    }
    case 'dot':
      return vectorA && vectorB ? exactScalarResponse(exactDotVectors(vectorA, vectorB)) : null;
    case 'normA':
    case 'normB': {
      const vector = req.operation === 'normA' ? vectorA : vectorB;
      if (!vector) {
        return null;
      }

      const norm = exactScalarSquareRoot(exactDotVectors(vector, vector));
      return norm ? exactScalarResponse(norm) : null;
    }
    case 'projectionUofV': {
      const vector = vectorA && vectorB ? exactProjectionOntoVector(vectorA, vectorB) : null;
      return vector ? { resultLatex: exactVectorToColumnLatex(vector), warnings: [] } : null;
    }
    case 'projectionVofU': {
      const vector = vectorA && vectorB ? exactProjectionOntoVector(vectorB, vectorA) : null;
      return vector ? { resultLatex: exactVectorToColumnLatex(vector), warnings: [] } : null;
    }
    case 'orthogonalToU': {
      const vector = vectorA && vectorB ? exactOrthogonalComponentToVector(vectorA, vectorB) : null;
      return vector ? { resultLatex: exactVectorToColumnLatex(vector), warnings: [] } : null;
    }
    case 'orthogonalToV': {
      const vector = vectorA && vectorB ? exactOrthogonalComponentToVector(vectorB, vectorA) : null;
      return vector ? { resultLatex: exactVectorToColumnLatex(vector), warnings: [] } : null;
    }
    case 'unitA':
    case 'unitB': {
      const vector = req.operation === 'unitA' ? vectorA : vectorB;
      const unit = vector ? exactUnitVector(vector) : null;
      return unit ? { resultLatex: exactVectorToColumnLatex(unit), warnings: [] } : null;
    }
    case 'orthogonalCheck': {
      if (!vectorA || !vectorB) {
        return null;
      }
      const dot = exactDotVectors(vectorA, vectorB);
      return {
        resultLatex: exactScalarIsZero(dot) ? '\\text{Orthogonal}' : '\\text{Not orthogonal}',
        approxText: `dot = ${exactScalarToLatex(dot)}`,
        warnings: [],
      };
    }
    case 'gramSchmidtUV': {
      if (!vectorA || !vectorB || result.kind !== 'gramSchmidt') {
        return null;
      }
      const exactResult = exactGramSchmidtTwoVectors(vectorA, vectorB);
      return exactResult ? {
        resultLatex: exactVectorSetLatex('\\operatorname{orthogonal\\ basis}', exactResult.orthogonalBasis),
        answerRows: exactVectorBasisAnswerRows(exactResult.orthogonalBasis),
        approxText: result.notes.length > 0
          ? `${exactResult.orthogonalBasis.length} basis direction${exactResult.orthogonalBasis.length === 1 ? '' : 's'}; dependent input skipped`
          : `${exactResult.orthogonalBasis.length} basis directions`,
        detailSections: exactGramSchmidtDetailSections(req, exactResult, result),
        warnings: [],
      } : null;
    }
    default:
      return null;
  }
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
      answerRows: vectorBasisAnswerRows(result.orthogonalBasis),
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
  const dimensionError = vectorEditingDimensionError(req.vectorA)
    ?? (req.vectorB ? vectorEditingDimensionError(req.vectorB) : null);
  if (dimensionError) {
    return { warnings: [], error: dimensionError };
  }

  const operation = req.operation;
  if (operation === 'linearCombination') {
    const exact = exactVectorFromWire(req.exactVectorA) ?? exactVectorFromNumeric(req.vectorA);
    const resultLatex = exact ? exactVectorToColumnLatex(exact) : vectorToLatex(req.vectorA);
    const answerLatex = req.editorExpressionLatex
      ? `${req.editorExpressionLatex}=${resultLatex}`
      : resultLatex;
    return {
      resultLatex,
      answerRows: { rows: [{ latex: answerLatex }] },
      warnings: [],
    };
  }
  if (operation === 'span' || operation === 'independent') {
    return runVectorFamilyOperation(req);
  }

  const numericRequest: NumericVectorRequest = { ...req, operation };
  const result = runNumericVectorOperation(numericRequest);
  return exactVectorResponse(req, result) ?? vectorCoreResultToResponse(req, result);
}
