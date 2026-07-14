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
import { profileLinearAlgebraResult } from '../display/printer';
import {
  attachLinearAlgebraCanonicalEvidence,
  canonicalLeafEvidence,
  equationMathJson,
  exactScalarMathJson,
  exactVectorMathJson,
  exactVectorSetMathJson,
  labelMathJson,
  linearAlgebraCanonicalEvidenceForResponse,
  numericVectorMathJson,
  numericVectorSetMathJson,
  operatorMathJson,
  textMathJson,
  type LinearAlgebraCanonicalDetailEvidence,
  type LinearAlgebraCanonicalEvidence,
} from './canonical-evidence';
import {
  parseLinearAlgebraEditorLatex,
  type LinearAlgebraEditorExpression,
} from './editor-parser';
import { buildExactScalarNode } from '../algebra/polynomial-core';

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

function mathDetail(
  canonicalLatex: string,
  mathJson: unknown,
  source: string,
): LinearAlgebraCanonicalDetailEvidence {
  return { kind: 'math', value: canonicalLeafEvidence(canonicalLatex, mathJson, source) };
}

function exactScalarResponse(
  value: ReturnType<typeof exactDotVectors>,
  source: string,
  approxDigits?: number,
): VectorResponse {
  const resultLatex = exactScalarToLatex(value);
  const response = profileLinearAlgebraResult({
    resultLatex,
    approxText: formatApproxNumber(exactScalarToNumber(value), { approxDigits }),
    warnings: [],
  });
  return attachLinearAlgebraCanonicalEvidence(response, {
    primary: canonicalLeafEvidence(resultLatex, exactScalarMathJson(value), source),
  });
}

function exactVectorResponse(req: VectorRequest, result: VectorCoreResult): VectorResponse | null {
  if (result.kind === 'error') {
    return null;
  }

  const { vectorA, vectorB } = exactVectorInputs(req);

  switch (req.operation) {
    case 'add': {
      if (!vectorA || !vectorB) return null;
      const vector = exactAddVectors(vectorA, vectorB);
      const resultLatex = exactVectorToColumnLatex(vector);
      return attachLinearAlgebraCanonicalEvidence(
        profileLinearAlgebraResult({ resultLatex, warnings: [] }),
        { primary: canonicalLeafEvidence(resultLatex, exactVectorMathJson(vector), 'vector.add.native-exact-vector') },
      );
    }
    case 'subtract': {
      if (!vectorA || !vectorB) return null;
      const vector = exactSubtractVectors(vectorA, vectorB);
      const resultLatex = exactVectorToColumnLatex(vector);
      return attachLinearAlgebraCanonicalEvidence(
        profileLinearAlgebraResult({ resultLatex, warnings: [] }),
        { primary: canonicalLeafEvidence(resultLatex, exactVectorMathJson(vector), 'vector.subtract.native-exact-vector') },
      );
    }
    case 'cross': {
      const vector = vectorA && vectorB ? exactCrossVectors(vectorA, vectorB) : null;
      if (!vector) return null;
      const resultLatex = exactVectorToColumnLatex(vector);
      return attachLinearAlgebraCanonicalEvidence(
        profileLinearAlgebraResult({ resultLatex, warnings: [] }),
        { primary: canonicalLeafEvidence(resultLatex, exactVectorMathJson(vector), 'vector.cross.native-exact-vector') },
      );
    }
    case 'dot':
      return vectorA && vectorB
        ? exactScalarResponse(
            exactDotVectors(vectorA, vectorB),
            'vector.dot.native-exact-scalar',
            req.approxDigits,
          )
        : null;
    case 'normA':
    case 'normB': {
      const vector = req.operation === 'normA' ? vectorA : vectorB;
      if (!vector) {
        return null;
      }

      const norm = exactScalarSquareRoot(exactDotVectors(vector, vector));
      return norm
        ? exactScalarResponse(norm, 'vector.norm.native-exact-radical', req.approxDigits)
        : null;
    }
    case 'projectionUofV': {
      const vector = vectorA && vectorB ? exactProjectionOntoVector(vectorA, vectorB) : null;
      if (!vector) return null;
      const resultLatex = exactVectorToColumnLatex(vector);
      return attachLinearAlgebraCanonicalEvidence(
        profileLinearAlgebraResult({ resultLatex, warnings: [] }),
        { primary: canonicalLeafEvidence(resultLatex, exactVectorMathJson(vector), 'vector.projection-u.native-exact-vector') },
      );
    }
    case 'projectionVofU': {
      const vector = vectorA && vectorB ? exactProjectionOntoVector(vectorB, vectorA) : null;
      if (!vector) return null;
      const resultLatex = exactVectorToColumnLatex(vector);
      return attachLinearAlgebraCanonicalEvidence(
        profileLinearAlgebraResult({ resultLatex, warnings: [] }),
        { primary: canonicalLeafEvidence(resultLatex, exactVectorMathJson(vector), 'vector.projection-v.native-exact-vector') },
      );
    }
    case 'orthogonalToU': {
      const vector = vectorA && vectorB ? exactOrthogonalComponentToVector(vectorA, vectorB) : null;
      if (!vector) return null;
      const resultLatex = exactVectorToColumnLatex(vector);
      return attachLinearAlgebraCanonicalEvidence(
        profileLinearAlgebraResult({ resultLatex, warnings: [] }),
        { primary: canonicalLeafEvidence(resultLatex, exactVectorMathJson(vector), 'vector.orthogonal-u.native-exact-vector') },
      );
    }
    case 'orthogonalToV': {
      const vector = vectorA && vectorB ? exactOrthogonalComponentToVector(vectorB, vectorA) : null;
      if (!vector) return null;
      const resultLatex = exactVectorToColumnLatex(vector);
      return attachLinearAlgebraCanonicalEvidence(
        profileLinearAlgebraResult({ resultLatex, warnings: [] }),
        { primary: canonicalLeafEvidence(resultLatex, exactVectorMathJson(vector), 'vector.orthogonal-v.native-exact-vector') },
      );
    }
    case 'unitA':
    case 'unitB': {
      const vector = req.operation === 'unitA' ? vectorA : vectorB;
      const unit = vector ? exactUnitVector(vector) : null;
      if (!unit) return null;
      const resultLatex = exactVectorToColumnLatex(unit);
      return attachLinearAlgebraCanonicalEvidence(
        profileLinearAlgebraResult({ resultLatex, warnings: [] }),
        { primary: canonicalLeafEvidence(resultLatex, exactVectorMathJson(unit), 'vector.unit.native-exact-vector') },
      );
    }
    case 'orthogonalCheck': {
      if (!vectorA || !vectorB) {
        return null;
      }
      const dot = exactDotVectors(vectorA, vectorB);
      const orthogonal = exactScalarIsZero(dot);
      const resultLatex = orthogonal ? '\\text{Orthogonal}' : '\\text{Not orthogonal}';
      return attachLinearAlgebraCanonicalEvidence(profileLinearAlgebraResult({
        resultLatex,
        approxText: `dot = ${exactScalarToLatex(dot)}`,
        warnings: [],
      }), {
        primary: canonicalLeafEvidence(
          resultLatex,
          textMathJson(orthogonal ? 'Orthogonal' : 'Not orthogonal'),
          'vector.orthogonality.native-exact-dot-classification',
        ),
      });
    }
    case 'gramSchmidtUV': {
      if (!vectorA || !vectorB || result.kind !== 'gramSchmidt') {
        return null;
      }
      const exactResult = exactGramSchmidtTwoVectors(vectorA, vectorB);
      if (!exactResult) return null;
      const resultLatex = exactVectorSetLatex('\\operatorname{orthogonal\\ basis}', exactResult.orthogonalBasis);
      const answerRows = exactVectorBasisAnswerRows(exactResult.orthogonalBasis);
      const detailEvidence: LinearAlgebraCanonicalDetailEvidence[] = [];
      if (exactResult.orthonormalBasis?.length === exactResult.orthogonalBasis.length) {
        const latex = exactVectorSetLatex('\\operatorname{orthonormal\\ basis}', exactResult.orthonormalBasis);
        detailEvidence.push(mathDetail(
          latex,
          equationMathJson('orthonormalbasis', exactVectorSetMathJson(exactResult.orthonormalBasis)),
          'vector.gram-schmidt.native-exact-orthonormal-basis',
        ));
      } else if (result.orthonormalBasis.length === result.orthogonalBasis.length) {
        const latex = vectorSetLatex('\\operatorname{orthonormal\\ basis}', result.orthonormalBasis);
        detailEvidence.push(mathDetail(
          latex,
          equationMathJson('orthonormalbasis', numericVectorSetMathJson(result.orthonormalBasis)),
          'vector.gram-schmidt.native-numeric-orthonormal-basis',
        ));
      }
      exactResult.orthogonalBasis.forEach((vector, index) => {
        if (index > 0) return;
        const latex = `w_{${index + 1}}=${exactVectorToColumnLatex(vector)}`;
        detailEvidence.push(mathDetail(
          latex,
          equationMathJson(`w_${index + 1}`, exactVectorMathJson(vector)),
          'vector.gram-schmidt.native-exact-orthogonal-vector',
        ));
      });
      if (exactResult.orthogonalBasis[1]) {
        const secondInputLatex = req.vectorOperandLatexB ?? 'v';
        const secondOperand = labelMathJson(secondInputLatex, exactVectorMathJson(vectorB));
        const vector = exactResult.orthogonalBasis[1];
        const latex = `w_{2}=${secondInputLatex}-\\operatorname{proj}_{w_{1}}(${secondInputLatex})=${exactVectorToColumnLatex(vector)}`;
        detailEvidence.push(mathDetail(
          latex,
          equationMathJson('w_2', equationMathJson(
            ['Subtract', secondOperand, operatorMathJson('proj_w_1', secondOperand)],
            exactVectorMathJson(vector),
          )),
          'vector.gram-schmidt.native-exact-projection-step',
        ));
        const dot = exactDotVectors(exactResult.orthogonalBasis[0], vector);
        const dotLatex = `w_{1}\\cdot w_{2}=${exactScalarToLatex(dot)}`;
        detailEvidence.push(mathDetail(
          dotLatex,
          equationMathJson(['Multiply', 'w_1', 'w_2'], exactScalarMathJson(dot)),
          'vector.gram-schmidt.native-exact-orthogonality-check',
        ));
      }
      const response = profileLinearAlgebraResult({
        resultLatex,
        answerRows,
        approxText: result.notes.length > 0
          ? `${exactResult.orthogonalBasis.length} basis direction${exactResult.orthogonalBasis.length === 1 ? '' : 's'}; dependent input skipped`
          : `${exactResult.orthogonalBasis.length} basis directions`,
        detailSections: exactGramSchmidtDetailSections(req, exactResult, result),
        warnings: [],
      });
      return attachLinearAlgebraCanonicalEvidence(response, {
        primary: canonicalLeafEvidence(
          resultLatex,
          equationMathJson('orthogonalbasis', exactVectorSetMathJson(exactResult.orthogonalBasis)),
          'vector.gram-schmidt.native-exact-basis',
        ),
        answerRows: exactResult.orthogonalBasis.map((vector, index) => canonicalLeafEvidence(
          answerRows.rows[index].latex,
          equationMathJson(`w_${index + 1}`, exactVectorMathJson(vector)),
          'vector.gram-schmidt.native-exact-answer-row',
        )),
        details: detailEvidence,
      });
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
    const magnitudeLatex = scalarToLatex(result.value);
    const resultLatex = `${magnitudeLatex}${suffix}`;
    const response = profileLinearAlgebraResult({
      resultLatex,
      approxText: formatApproxNumber(result.value, { approxDigits: req.approxDigits }),
      warnings: [],
    });
    const magnitude = canonicalLeafEvidence(
      magnitudeLatex,
      Number(magnitudeLatex),
      'vector.angle.native-dot-and-norm-magnitude',
    );
    return attachLinearAlgebraCanonicalEvidence(response, result.angleUnit === 'grad'
      ? {
          semanticPrimary: { kind: 'angle-quantity', magnitude, unit: 'grad' },
        }
      : {
          primary: canonicalLeafEvidence(
            resultLatex,
            result.angleUnit === 'deg' ? ['Degrees', Number(magnitudeLatex)] : Number(magnitudeLatex),
            'vector.scalar.native-numeric-evaluation',
          ),
        });
  }

  if (result.kind === 'orthogonality') {
    const resultLatex = result.orthogonal ? '\\text{Orthogonal}' : '\\text{Not orthogonal}';
    return attachLinearAlgebraCanonicalEvidence(profileLinearAlgebraResult({
      resultLatex,
      approxText: `dot = ${formatApproxNumber(result.dot, { approxDigits: req.approxDigits })}`,
      warnings: [],
    }), {
      primary: canonicalLeafEvidence(
        resultLatex,
        textMathJson(result.orthogonal ? 'Orthogonal' : 'Not orthogonal'),
        'vector.orthogonality.native-numeric-classification',
      ),
    });
  }

  if (result.kind === 'gramSchmidt') {
    const resultLatex = vectorSetLatex('\\operatorname{orthogonal\\ basis}', result.orthogonalBasis);
    const answerRows = vectorBasisAnswerRows(result.orthogonalBasis);
    const detailEvidence: LinearAlgebraCanonicalDetailEvidence[] = [];
    if (result.orthonormalBasis.length === result.orthogonalBasis.length) {
      const latex = vectorSetLatex('\\operatorname{orthonormal\\ basis}', result.orthonormalBasis);
      detailEvidence.push(mathDetail(
        latex,
        equationMathJson('orthonormalbasis', numericVectorSetMathJson(result.orthonormalBasis)),
        'vector.gram-schmidt.native-numeric-orthonormal-basis',
      ));
    }
    result.orthogonalBasis.forEach((vector, index) => {
      if (index > 0) return;
      const latex = `w_{${index + 1}}=${vectorToLatex(vector)}`;
      detailEvidence.push(mathDetail(
        latex,
        equationMathJson(`w_${index + 1}`, numericVectorMathJson(vector)),
        'vector.gram-schmidt.native-numeric-orthogonal-vector',
      ));
    });
    if (result.orthogonalBasis[1]) {
      const secondInputLatex = req.vectorOperandLatexB ?? 'v';
      const secondOperand = labelMathJson(secondInputLatex, numericVectorMathJson(req.vectorB ?? []));
      const vector = result.orthogonalBasis[1];
      const latex = `w_{2}=${secondInputLatex}-\\operatorname{proj}_{w_{1}}(${secondInputLatex})=${vectorToLatex(vector)}`;
      detailEvidence.push(mathDetail(
        latex,
        equationMathJson('w_2', equationMathJson(
          ['Subtract', secondOperand, operatorMathJson('proj_w_1', secondOperand)],
          numericVectorMathJson(vector),
        )),
        'vector.gram-schmidt.native-numeric-projection-step',
      ));
      const dot = dotVectors(result.orthogonalBasis[0], vector);
      const dotLatex = `w_{1}\\cdot w_{2}=${scalarToLatex(dot)}`;
      detailEvidence.push(mathDetail(
        dotLatex,
        equationMathJson(['Multiply', 'w_1', 'w_2'], Number(scalarToLatex(dot))),
        'vector.gram-schmidt.native-numeric-orthogonality-check',
      ));
    }
    return attachLinearAlgebraCanonicalEvidence(profileLinearAlgebraResult({
      resultLatex,
      answerRows,
      approxText: result.notes.length > 0
        ? `${result.orthogonalBasis.length} basis direction${result.orthogonalBasis.length === 1 ? '' : 's'}; dependent input skipped`
        : `${result.orthogonalBasis.length} basis directions`,
      detailSections: gramSchmidtDetailSections(req, result),
      warnings: [],
    }), {
      primary: canonicalLeafEvidence(
        resultLatex,
        equationMathJson('orthogonalbasis', numericVectorSetMathJson(result.orthogonalBasis)),
        'vector.gram-schmidt.native-numeric-basis',
      ),
      answerRows: result.orthogonalBasis.map((vector, index) => canonicalLeafEvidence(
        answerRows.rows[index].latex,
        equationMathJson(`w_${index + 1}`, numericVectorMathJson(vector)),
        'vector.gram-schmidt.native-numeric-answer-row',
      )),
      details: detailEvidence,
    });
  }

  const resultLatex = vectorToLatex(result.value);
  return attachLinearAlgebraCanonicalEvidence(profileLinearAlgebraResult({
    resultLatex,
    warnings: [],
  }), {
    primary: canonicalLeafEvidence(
      resultLatex,
      numericVectorMathJson(result.value),
      'vector.operation.native-numeric-vector',
    ),
  });
}

function runVectorOperationInternal(req: VectorRequest): VectorResponse {
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
    const response = {
      resultLatex,
      answerRows: { rows: [{ latex: answerLatex }] },
      warnings: [],
    };
    const vectorNode = exact ? exactVectorMathJson(exact) : numericVectorMathJson(req.vectorA);
    const expressionMathJson = req.editorExpressionLatex
      ? vectorExpressionMathJson(req.editorExpressionLatex)
      : undefined;
    if (req.editorExpressionLatex && expressionMathJson === undefined) {
      return {
        warnings: [],
        error: 'This Vector combination is missing producer-owned expression evidence.',
      };
    }
    return attachLinearAlgebraCanonicalEvidence(response, {
      primary: canonicalLeafEvidence(
        resultLatex,
        vectorNode,
        'vector.linear-combination.native-evaluated-vector',
      ),
      answerRows: [canonicalLeafEvidence(
        answerLatex,
        answerLatex === resultLatex
          ? vectorNode
          : equationMathJson(expressionMathJson, vectorNode),
        'vector.linear-combination.native-evaluated-answer-row',
      )],
    });
  }
  if (operation === 'span' || operation === 'independent') {
    return runVectorFamilyOperation(req);
  }

  const numericRequest: NumericVectorRequest = { ...req, operation };
  const result = runNumericVectorOperation(numericRequest);
  return exactVectorResponse(req, result) ?? vectorCoreResultToResponse(req, result);
}

function vectorExpressionNode(expression: LinearAlgebraEditorExpression): unknown | undefined {
  switch (expression.kind) {
    case 'named':
      return expression.name;
    case 'vectorLiteral':
      return exactVectorMathJson(expression.exactValue);
    case 'scalar':
      return buildExactScalarNode(expression.exactValue);
    case 'negate': {
      const value = vectorExpressionNode(expression.value);
      return value === undefined ? undefined : ['Negate', value];
    }
    case 'scale': {
      const value = vectorExpressionNode(expression.vector);
      if (value === undefined) return undefined;
      const operand = expression.vector.kind === 'binary'
        ? ['Delimiter', value]
        : value;
      return ['InvisibleOperator', buildExactScalarNode(expression.scalar.exactValue), operand];
    }
    case 'vectorDivide': {
      const value = vectorExpressionNode(expression.vector);
      return value === undefined
        ? undefined
        : ['Divide', value, buildExactScalarNode(expression.scalar.exactValue)];
    }
    case 'binary': {
      const left = vectorExpressionNode(expression.left);
      const right = vectorExpressionNode(expression.right);
      if (left === undefined || right === undefined) return undefined;
      if (expression.operator === 'add') return ['Add', left, right];
      if (expression.operator === 'subtract') return ['Subtract', left, right];
      if (expression.operator === 'dot') return ['Dot', left, right];
      if (expression.operator === 'cross') return ['Cross', left, right];
      return ['Multiply', left, right];
    }
    default:
      return undefined;
  }
}

function vectorExpressionMathJson(latex: string) {
  const parsed = parseLinearAlgebraEditorLatex(latex, {
    mode: 'vector',
    vectorNamedValues: 'abcdefghijklmnopqrstuvwxyz'.split(''),
  });
  return parsed.ok ? vectorExpressionNode(parsed.expression) : undefined;
}

export function runVectorOperationWithEvidence(req: VectorRequest): {
  response: VectorResponse;
  evidence: LinearAlgebraCanonicalEvidence;
} {
  const response = runVectorOperationInternal(req);
  return {
    response,
    evidence: linearAlgebraCanonicalEvidenceForResponse(response),
  };
}

export function runVectorOperation(req: VectorRequest): VectorResponse {
  return runVectorOperationWithEvidence(req).response;
}
