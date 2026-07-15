import { Matrix, SingularValueDecomposition } from 'ml-matrix';
import type {
  DisplayDetailSection,
  MatrixResponse,
} from '../../types/calculator';
import { clampApproxDigits } from '../display/notation/numeric-output';
import { profileLinearAlgebraResult } from '../display/printer';
import {
  mathPart,
  mixedDetailSection,
  textPart,
} from '../display/result-detail-lines';
import {
  attachLinearAlgebraCanonicalEvidence,
  canonicalLeafEvidence,
  labelMathJson,
  numericMatrixMathJson,
  numericVectorMathJson,
  operatorMathJson,
  type LinearAlgebraCanonicalDetailEvidence,
  type LinearAlgebraCanonicalLeafEvidence,
} from './canonical-evidence';
import {
  LINEAR_ALGEBRA_MATRIX_MAX_COLUMNS,
  LINEAR_ALGEBRA_MATRIX_MAX_ROWS,
} from './dimension-contract';
import { getMatrixShapeFacts } from './matrix-core';

export type MatrixNumericDecompositionOperation = 'svd' | 'pinv' | 'cond' | 'nrank';

export type MatrixNumericDecompositionInput = {
  operation: MatrixNumericDecompositionOperation;
  label: string;
  matrix: number[][];
  approxDigits?: number;
};

type MatrixNumericDecompositionAnalysis = {
  u: number[][];
  sigma: number[][];
  vTranspose: number[][];
  singularValues: number[];
  threshold: number;
  rank: number;
  condition: number;
  pseudoinverse: number[][];
  reconstructionResidual: number;
  pseudoinverseResidual: number;
};

type RoundedAnalysis = MatrixNumericDecompositionAnalysis;

const APPROXIMATE_WARNING =
  'SVD, pseudoinverse, condition number, and numerical rank are approximate; inspect the displayed threshold.';

function matrixStop(message: string): MatrixResponse {
  return { warnings: [], error: message };
}

function frobeniusResidual(left: Matrix, right: Matrix) {
  if (left.rows !== right.rows || left.columns !== right.columns) return Number.POSITIVE_INFINITY;
  let sum = 0;
  for (let row = 0; row < left.rows; row += 1) {
    for (let column = 0; column < left.columns; column += 1) {
      const difference = left.get(row, column) - right.get(row, column);
      sum += difference * difference;
    }
  }
  return Math.sqrt(sum);
}

function analyzeMatrix(matrix: number[][]): MatrixNumericDecompositionAnalysis | { error: string } {
  try {
    const source = new Matrix(matrix);
    const decomposition = new SingularValueDecomposition(source, { autoTranspose: true });
    const singularValues = decomposition.diagonal.slice(0, Math.min(source.rows, source.columns));
    const u = decomposition.leftSingularVectors;
    const v = decomposition.rightSingularVectors;
    const sigma = Matrix.diag(singularValues);
    const reconstruction = u.mmul(sigma).mmul(v.transpose());
    const pseudoinverse = decomposition.inverse();
    const pseudoinverseProjection = source.mmul(pseudoinverse).mmul(source);
    const rank = decomposition.rank;
    const condition = rank < Math.min(source.rows, source.columns)
      ? Number.POSITIVE_INFINITY
      : decomposition.condition;
    const scalarValues = [
      ...singularValues,
      decomposition.threshold,
      condition,
      frobeniusResidual(source, reconstruction),
      frobeniusResidual(source, pseudoinverseProjection),
    ];
    const matrixValues = [
      ...u.to1DArray(),
      ...sigma.to1DArray(),
      ...v.to1DArray(),
      ...pseudoinverse.to1DArray(),
    ];
    if (scalarValues.some((value) => Number.isNaN(value))
      || matrixValues.some((value) => !Number.isFinite(value))) {
      return { error: 'The numerical decomposition exceeded the finite-number range.' };
    }
    return {
      u: u.to2DArray(),
      sigma: sigma.to2DArray(),
      vTranspose: v.transpose().to2DArray(),
      singularValues,
      threshold: decomposition.threshold,
      rank,
      condition,
      pseudoinverse: pseudoinverse.to2DArray(),
      reconstructionResidual: frobeniusResidual(source, reconstruction),
      pseudoinverseResidual: frobeniusResidual(source, pseudoinverseProjection),
    };
  } catch {
    return { error: 'The bounded numerical singular-value decomposition did not complete.' };
  }
}

function roundedNumber(value: number, approxDigits: number) {
  if (!Number.isFinite(value) || value === 0) return value === 0 ? 0 : value;
  const absolute = Math.abs(value);
  const leadingFractionalZeros = absolute < 1
    ? Math.max(0, Math.ceil(-Math.log10(absolute)) - 1)
    : 0;
  const fractionalDigits = Math.min(100, leadingFractionalZeros + approxDigits);
  let rounded = Number(value.toFixed(fractionalDigits));
  if (rounded === 0) {
    rounded = Number(value.toPrecision(Math.max(1, approxDigits)));
  }
  return Object.is(rounded, -0) ? 0 : rounded;
}

function roundedMatrix(matrix: readonly (readonly number[])[], approxDigits: number) {
  return matrix.map((row) => row.map((value) => roundedNumber(value, approxDigits)));
}

function roundAnalysis(
  analysis: MatrixNumericDecompositionAnalysis,
  approxDigits: number,
): RoundedAnalysis {
  return {
    u: roundedMatrix(analysis.u, approxDigits),
    sigma: roundedMatrix(analysis.sigma, approxDigits),
    vTranspose: roundedMatrix(analysis.vTranspose, approxDigits),
    singularValues: analysis.singularValues.map((value) => roundedNumber(value, approxDigits)),
    threshold: roundedNumber(analysis.threshold, approxDigits),
    rank: analysis.rank,
    condition: roundedNumber(analysis.condition, approxDigits),
    pseudoinverse: roundedMatrix(analysis.pseudoinverse, approxDigits),
    reconstructionResidual: roundedNumber(analysis.reconstructionResidual, approxDigits),
    pseudoinverseResidual: roundedNumber(analysis.pseudoinverseResidual, approxDigits),
  };
}

function finiteNumberLatex(value: number) {
  if (value === 0) return '0';
  const text = `${value}`.toLowerCase();
  const [mantissa, exponent] = text.split('e');
  return exponent === undefined
    ? mantissa
    : `${mantissa}\\times 10^{${Number(exponent)}}`;
}

function numberLatex(value: number) {
  return value === Number.POSITIVE_INFINITY ? '\\infty' : finiteNumberLatex(value);
}

function matrixLatex(matrix: readonly (readonly number[])[]) {
  return `\\begin{bmatrix}${matrix
    .map((row) => row.map(numberLatex).join(' & '))
    .join('\\\\')}\\end{bmatrix}`;
}

function vectorLatex(vector: readonly number[]) {
  return matrixLatex(vector.map((value) => [value]));
}

function approximateNode(left: unknown, right: unknown) {
  return ['Approx', structuredClone(left), structuredClone(right)];
}

function equalNode(left: unknown, right: unknown) {
  return ['Equal', structuredClone(left), structuredClone(right)];
}

function primaryEvidence(
  input: MatrixNumericDecompositionInput,
  analysis: RoundedAnalysis,
): LinearAlgebraCanonicalLeafEvidence {
  const operand = labelMathJson(input.label, numericMatrixMathJson(input.matrix));
  const operation = operatorMathJson(input.operation, operand);
  if (input.operation === 'svd') {
    const valueLatex = vectorLatex(analysis.singularValues);
    return canonicalLeafEvidence(
      `\\operatorname{svd}\\left(${input.label}\\right)\\approx ${valueLatex}`,
      approximateNode(operation, numericVectorMathJson(analysis.singularValues)),
      'matrix.numeric-decomposition.native-svd-singular-values',
    );
  }
  if (input.operation === 'pinv') {
    const valueLatex = matrixLatex(analysis.pseudoinverse);
    return canonicalLeafEvidence(
      `\\operatorname{pinv}\\left(${input.label}\\right)\\approx ${valueLatex}`,
      approximateNode(operation, numericMatrixMathJson(analysis.pseudoinverse)),
      'matrix.numeric-decomposition.native-pseudoinverse',
    );
  }
  if (input.operation === 'cond') {
    const valueNode = analysis.condition === Number.POSITIVE_INFINITY
      ? 'PositiveInfinity'
      : analysis.condition;
    const relation = analysis.condition === Number.POSITIVE_INFINITY ? '=' : '\\approx';
    const node = analysis.condition === Number.POSITIVE_INFINITY
      ? equalNode(operation, valueNode)
      : approximateNode(operation, valueNode);
    return canonicalLeafEvidence(
      `\\operatorname{cond}\\left(${input.label}\\right)${relation} ${numberLatex(analysis.condition)}`,
      node,
      'matrix.numeric-decomposition.native-condition-number',
    );
  }
  return canonicalLeafEvidence(
    `\\operatorname{nrank}\\left(${input.label}\\right)=${analysis.rank}`,
    equalNode(operation, analysis.rank),
    'matrix.numeric-decomposition.native-numerical-rank',
  );
}

function decompositionDetails(
  input: MatrixNumericDecompositionInput,
  analysis: RoundedAnalysis,
): { sections: DisplayDetailSection[]; evidence: LinearAlgebraCanonicalDetailEvidence[] } {
  const evidence: LinearAlgebraCanonicalDetailEvidence[] = [];
  const math = (canonicalLatex: string, mathJson: unknown, source: string) => {
    evidence.push({ kind: 'math', value: canonicalLeafEvidence(canonicalLatex, mathJson, source) });
    return mathPart(canonicalLatex);
  };
  const operand = labelMathJson(input.label, numericMatrixMathJson(input.matrix));
  const svdOperation = operatorMathJson('svd', operand);
  const pinvOperation = operatorMathJson('pinv', operand);
  const condOperation = operatorMathJson('cond', operand);
  const rankOperation = operatorMathJson('nrank', operand);
  const singularLatex = vectorLatex(analysis.singularValues);
  const thresholdLatex = numberLatex(analysis.threshold);
  const conditionLatex = numberLatex(analysis.condition);
  const conditionNode = analysis.condition === Number.POSITIVE_INFINITY
    ? 'PositiveInfinity'
    : analysis.condition;
  const sections: DisplayDetailSection[] = [];

  if (input.operation === 'svd') {
    sections.push(mixedDetailSection('Numerical SVD Factors', [
      [textPart('Left singular vectors: '), math(
        `U\\approx ${matrixLatex(analysis.u)}`,
        approximateNode('U', numericMatrixMathJson(analysis.u)),
        'matrix.numeric-decomposition.native-left-singular-vectors',
      )],
      [textPart('Singular-value matrix: '), math(
        `\\Sigma\\approx ${matrixLatex(analysis.sigma)}`,
        approximateNode('Sigma', numericMatrixMathJson(analysis.sigma)),
        'matrix.numeric-decomposition.native-singular-value-matrix',
      )],
      [textPart('Transposed right singular vectors: '), math(
        `V^{\\top}\\approx ${matrixLatex(analysis.vTranspose)}`,
        approximateNode(['Transpose', 'V'], numericMatrixMathJson(analysis.vTranspose)),
        'matrix.numeric-decomposition.native-right-singular-vectors-transpose',
      )],
      [textPart('Reconstruction relation: '), math(
        `${input.label}\\approx U\\cdot\\Sigma\\cdot V^{\\top}`,
        approximateNode(operand, ['Multiply', 'U', 'Sigma', ['Transpose', 'V']]),
        'matrix.numeric-decomposition.native-reconstruction-relation',
      )],
      [textPart('Frobenius reconstruction residual: '), math(
        `\\rho_{\\mathrm{svd}}\\approx ${numberLatex(analysis.reconstructionResidual)}`,
        approximateNode(['Subscript', 'rho', 'svd'], analysis.reconstructionResidual),
        'matrix.numeric-decomposition.native-reconstruction-residual',
      )],
    ]));
  }

  const diagnosticsRows = [];
  if (input.operation !== 'svd') {
    diagnosticsRows.push([
      textPart('Singular values: '),
      math(
        `\\operatorname{svd}\\left(${input.label}\\right)\\approx ${singularLatex}`,
        approximateNode(svdOperation, numericVectorMathJson(analysis.singularValues)),
        'matrix.numeric-decomposition.native-diagnostic-singular-values',
      ),
    ]);
  }
  diagnosticsRows.push(
    [textPart('Automatic SVD threshold: '), math(
      `\\operatorname{threshold}\\left(${input.label}\\right)\\approx ${thresholdLatex}`,
      approximateNode(operatorMathJson('threshold', operand), analysis.threshold),
      'matrix.numeric-decomposition.native-threshold',
    )],
    [textPart('Numerical rank: '), math(
      `\\operatorname{nrank}\\left(${input.label}\\right)=${analysis.rank}`,
      equalNode(rankOperation, analysis.rank),
      'matrix.numeric-decomposition.native-rank',
    )],
    [textPart('2-norm condition number: '), math(
      `\\operatorname{cond}\\left(${input.label}\\right)${analysis.condition === Number.POSITIVE_INFINITY ? '=' : '\\approx'} ${conditionLatex}`,
      analysis.condition === Number.POSITIVE_INFINITY
        ? equalNode(condOperation, conditionNode)
        : approximateNode(condOperation, conditionNode),
      'matrix.numeric-decomposition.native-condition',
    )],
  );
  sections.push(mixedDetailSection('SVD Diagnostics', diagnosticsRows));

  sections.push(mixedDetailSection('Pseudoinverse Check', [
    [textPart('Moore-Penrose reconstruction relation: '), math(
      `${input.label}\\cdot\\operatorname{pinv}\\left(${input.label}\\right)\\cdot ${input.label}\\approx ${input.label}`,
      approximateNode(['Multiply', operand, pinvOperation, operand], operand),
      'matrix.numeric-decomposition.native-pseudoinverse-relation',
    )],
    [textPart('Frobenius pseudoinverse residual: '), math(
      `\\rho_{\\mathrm{pinv}}\\approx ${numberLatex(analysis.pseudoinverseResidual)}`,
      approximateNode(['Subscript', 'rho', 'pinv'], analysis.pseudoinverseResidual),
      'matrix.numeric-decomposition.native-pseudoinverse-residual',
    )],
  ]));

  return { sections, evidence };
}

export function runMatrixNumericDecomposition(
  input: MatrixNumericDecompositionInput,
): MatrixResponse {
  const shape = getMatrixShapeFacts(input.matrix);
  if (!shape.isRectangular) {
    return matrixStop(`${input.operation}(A) needs a complete rectangular Matrix.`);
  }
  if (shape.rows > LINEAR_ALGEBRA_MATRIX_MAX_ROWS
    || shape.columns > LINEAR_ALGEBRA_MATRIX_MAX_COLUMNS) {
    return matrixStop(`Numerical Matrix decompositions support up to ${LINEAR_ALGEBRA_MATRIX_MAX_ROWS} by ${LINEAR_ALGEBRA_MATRIX_MAX_COLUMNS}.`);
  }
  if (input.matrix.some((row) => row.some((value) => !Number.isFinite(value)))) {
    return matrixStop(`${input.operation}(A) needs finite real Matrix entries.`);
  }

  const analysis = analyzeMatrix(input.matrix);
  if ('error' in analysis) return matrixStop(analysis.error);
  const rounded = roundAnalysis(analysis, clampApproxDigits(input.approxDigits ?? 6));
  const primary = primaryEvidence(input, rounded);
  const details = decompositionDetails(input, rounded);
  return attachLinearAlgebraCanonicalEvidence(profileLinearAlgebraResult({
    resultLatex: primary.canonicalLatex,
    detailSections: details.sections,
    warnings: [APPROXIMATE_WARNING],
  }), {
    primary,
    details: details.evidence,
  });
}
