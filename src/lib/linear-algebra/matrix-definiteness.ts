import type {
  DisplayDetailSection,
  ExactScalarWire,
  MatrixResponse,
} from '../../types/calculator';
import {
  exactScalarEquals,
  type ExactScalar,
} from '../algebra/polynomial-core';
import { profileLinearAlgebraResult } from '../display/printer';
import {
  mathPart,
  mixedDetailSection,
  textPart,
} from '../display/result-detail-lines';
import {
  attachLinearAlgebraCanonicalEvidence,
  canonicalLeafEvidence,
  equationMathJson,
  exactMatrixMathJson,
  exactVectorMathJson,
  labelMathJson,
  numericMatrixMathJson,
  numericVectorMathJson,
  operatorMathJson,
  textMathJson,
  type LinearAlgebraCanonicalDetailEvidence,
} from './canonical-evidence';
import {
  determinantExactMatrix,
  scalar,
  type ExactMatrix,
  type ExactVector,
} from './exact-matrix-core';
import {
  exactMatrixFromNumeric,
  exactMatrixFromWire,
  exactVectorToColumnLatex,
} from './exact-matrix-format';
import {
  LINEAR_ALGEBRA_EXACT_MATRIX_MAX_DIMENSION,
  LINEAR_ALGEBRA_MATRIX_MAX_ROWS,
} from './dimension-contract';
import { getMatrixShapeFacts } from './matrix-core';

export type MatrixDefinitenessClassification =
  | 'positive-definite'
  | 'negative-definite'
  | 'positive-semidefinite'
  | 'negative-semidefinite'
  | 'zero-semidefinite'
  | 'indefinite'
  | 'nonsymmetric';

export type MatrixDefinitenessInput = {
  label: string;
  matrix: number[][];
  exactMatrix?: ExactScalarWire[][];
};

type ExactMinorEvidence = {
  order: number;
  determinant: ExactScalar;
};

type ExactAnalysis = {
  classification: MatrixDefinitenessClassification;
  matrix: ExactMatrix;
  principalMinors: ExactMinorEvidence[];
  leadingMinors: ExactVector;
};

type NumericAnalysis = {
  classification: MatrixDefinitenessClassification;
  eigenvalues?: number[];
  symmetryResidual: number;
  tolerance: number;
};

const NUMERIC_RELATIVE_TOLERANCE = 1e-10;
const JACOBI_CONVERGENCE_EPSILON = 1e-14;

function classificationLabel(classification: MatrixDefinitenessClassification) {
  switch (classification) {
    case 'positive-definite':
      return 'Positive definite';
    case 'negative-definite':
      return 'Negative definite';
    case 'positive-semidefinite':
      return 'Positive semidefinite';
    case 'negative-semidefinite':
      return 'Negative semidefinite';
    case 'zero-semidefinite':
      return 'Positive and negative semidefinite';
    case 'indefinite':
      return 'Indefinite';
    case 'nonsymmetric':
      return 'Nonsymmetric';
  }
}

function classificationExplanation(classification: MatrixDefinitenessClassification) {
  switch (classification) {
    case 'positive-definite':
      return 'The quadratic form is strictly positive for every nonzero real vector.';
    case 'negative-definite':
      return 'The quadratic form is strictly negative for every nonzero real vector.';
    case 'positive-semidefinite':
      return 'The quadratic form is nonnegative, with at least one zero direction.';
    case 'negative-semidefinite':
      return 'The quadratic form is nonpositive, with at least one zero direction.';
    case 'zero-semidefinite':
      return 'The quadratic form is identically zero, so the matrix is both positive and negative semidefinite.';
    case 'indefinite':
      return 'The quadratic form takes both positive and negative values.';
    case 'nonsymmetric':
      return 'Definiteness is reported only for real symmetric matrices.';
  }
}

function matrixStop(message: string): MatrixResponse {
  return { warnings: [], error: message };
}

function exactSign(value: ExactScalar) {
  return Math.sign(value.numerator);
}

function principalSubmatrix(matrix: ExactMatrix, mask: number): ExactMatrix {
  const indices = matrix.map((_, index) => index).filter((index) => (mask & (1 << index)) !== 0);
  return indices.map((row) => indices.map((column) => matrix[row][column]));
}

function firstExactSymmetryMismatch(matrix: ExactMatrix) {
  for (let row = 0; row < matrix.length; row += 1) {
    for (let column = row + 1; column < matrix.length; column += 1) {
      if (!exactScalarEquals(matrix[row][column], matrix[column][row])) {
        return {
          row,
          column,
          forward: matrix[row][column],
          reverse: matrix[column][row],
        };
      }
    }
  }
  return null;
}

function classifyExactMinors(minors: readonly ExactMinorEvidence[]): MatrixDefinitenessClassification {
  const signs = minors.map((minor) => exactSign(minor.determinant));
  const signedSigns = minors.map((minor, index) => (
    minor.order % 2 === 0 ? signs[index] : -signs[index]
  ));
  if (signs.every((sign) => sign > 0)) return 'positive-definite';
  if (signedSigns.every((sign) => sign > 0)) return 'negative-definite';

  const positiveSemidefinite = signs.every((sign) => sign >= 0);
  const negativeSemidefinite = signedSigns.every((sign) => sign >= 0);
  if (positiveSemidefinite && negativeSemidefinite) return 'zero-semidefinite';
  if (positiveSemidefinite) return 'positive-semidefinite';
  if (negativeSemidefinite) return 'negative-semidefinite';
  return 'indefinite';
}

function analyzeExactMatrix(matrix: ExactMatrix): ExactAnalysis | { error: string } {
  const mismatch = firstExactSymmetryMismatch(matrix);
  if (mismatch) {
    return {
      classification: 'nonsymmetric',
      matrix,
      principalMinors: [],
      leadingMinors: [mismatch.forward, mismatch.reverse],
    };
  }

  const principalMinors: ExactMinorEvidence[] = [];
  const leadingMinors: ExactVector = [];
  const finalMask = 1 << matrix.length;
  for (let mask = 1; mask < finalMask; mask += 1) {
    const determinant = determinantExactMatrix(principalSubmatrix(matrix, mask));
    if (determinant.kind === 'stop') {
      return {
        error: determinant.reason === 'scalar-growth-limit'
          ? 'Exact definiteness exceeded the rational scalar-growth limit. Use decimal Matrix entries for the tolerance-labelled numerical test.'
          : 'Exact definiteness could not evaluate every principal minor.',
      };
    }
    const order = mask.toString(2).replaceAll('0', '').length;
    principalMinors.push({ order, determinant: determinant.determinant });
    if (mask === (1 << order) - 1) {
      leadingMinors[order - 1] = determinant.determinant;
    }
  }

  return {
    classification: classifyExactMinors(principalMinors),
    matrix,
    principalMinors,
    leadingMinors,
  };
}

function maximumAbsoluteEntry(matrix: readonly (readonly number[])[]) {
  return matrix.reduce(
    (maximum, row) => row.reduce((rowMaximum, value) => Math.max(rowMaximum, Math.abs(value)), maximum),
    0,
  );
}

function maximumSymmetryResidual(matrix: readonly (readonly number[])[]) {
  let residual = 0;
  for (let row = 0; row < matrix.length; row += 1) {
    for (let column = row + 1; column < matrix.length; column += 1) {
      residual = Math.max(residual, Math.abs(matrix[row][column] - matrix[column][row]));
    }
  }
  return residual;
}

function jacobiEigenvalues(matrix: readonly (readonly number[])[]): number[] | null {
  const working = matrix.map((row) => [...row]);
  const size = working.length;
  const maxIterations = 64 * size * size;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let pivotRow = 0;
    let pivotColumn = 0;
    let maximum = 0;
    for (let row = 0; row < size; row += 1) {
      for (let column = row + 1; column < size; column += 1) {
        const candidate = Math.abs(working[row][column]);
        if (candidate > maximum) {
          maximum = candidate;
          pivotRow = row;
          pivotColumn = column;
        }
      }
    }
    if (maximum <= JACOBI_CONVERGENCE_EPSILON * Math.max(1, size)) {
      return working.map((row, index) => row[index]).sort((left, right) => left - right);
    }

    const app = working[pivotRow][pivotRow];
    const aqq = working[pivotColumn][pivotColumn];
    const apq = working[pivotRow][pivotColumn];
    const angle = 0.5 * Math.atan2(2 * apq, aqq - app);
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);

    for (let index = 0; index < size; index += 1) {
      if (index === pivotRow || index === pivotColumn) continue;
      const aip = working[index][pivotRow];
      const aiq = working[index][pivotColumn];
      const nextIp = cosine * aip - sine * aiq;
      const nextIq = sine * aip + cosine * aiq;
      working[index][pivotRow] = nextIp;
      working[pivotRow][index] = nextIp;
      working[index][pivotColumn] = nextIq;
      working[pivotColumn][index] = nextIq;
    }

    working[pivotRow][pivotRow] = cosine * cosine * app
      - 2 * sine * cosine * apq
      + sine * sine * aqq;
    working[pivotColumn][pivotColumn] = sine * sine * app
      + 2 * sine * cosine * apq
      + cosine * cosine * aqq;
    working[pivotRow][pivotColumn] = 0;
    working[pivotColumn][pivotRow] = 0;
  }

  return null;
}

function classifyNumericEigenvalues(
  eigenvalues: readonly number[],
  normalizedTolerance: number,
): MatrixDefinitenessClassification {
  if (eigenvalues.every((value) => value > normalizedTolerance)) return 'positive-definite';
  if (eigenvalues.every((value) => value < -normalizedTolerance)) return 'negative-definite';
  const hasPositive = eigenvalues.some((value) => value > normalizedTolerance);
  const hasNegative = eigenvalues.some((value) => value < -normalizedTolerance);
  if (!hasPositive && !hasNegative) return 'zero-semidefinite';
  if (!hasNegative) return 'positive-semidefinite';
  if (!hasPositive) return 'negative-semidefinite';
  return 'indefinite';
}

function analyzeNumericMatrix(matrix: number[][]): NumericAnalysis | { error: string } {
  const scale = Math.max(1, maximumAbsoluteEntry(matrix));
  const normalized = matrix.map((row) => row.map((value) => value / scale));
  const normalizedTolerance = NUMERIC_RELATIVE_TOLERANCE * Math.max(1, matrix.length);
  const normalizedSymmetryResidual = maximumSymmetryResidual(normalized);
  const tolerance = normalizedTolerance * scale;
  const symmetryResidual = normalizedSymmetryResidual * scale;
  if (normalizedSymmetryResidual > normalizedTolerance) {
    return { classification: 'nonsymmetric', symmetryResidual, tolerance };
  }

  const symmetric = normalized.map((row, rowIndex) => row.map((value, columnIndex) => (
    rowIndex === columnIndex ? value : (value + normalized[columnIndex][rowIndex]) / 2
  )));
  const normalizedEigenvalues = jacobiEigenvalues(symmetric);
  if (!normalizedEigenvalues) {
    return { error: 'The symmetric eigenvalue iteration did not converge within its bounded budget.' };
  }
  const eigenvalues = normalizedEigenvalues.map((value) => value * scale);
  if (eigenvalues.some((value) => !Number.isFinite(value))) {
    return { error: 'The numerical eigenvalue classification exceeded the finite-number range.' };
  }
  return {
    classification: classifyNumericEigenvalues(normalizedEigenvalues, normalizedTolerance),
    eigenvalues,
    symmetryResidual,
    tolerance,
  };
}

function roundedCanonicalNumber(value: number) {
  const rounded = Math.abs(value) < Number.EPSILON ? 0 : Number(value.toPrecision(12));
  const [mantissa, exponent] = `${rounded}`.toLowerCase().split('e');
  const latex = exponent === undefined
    ? mantissa
    : `${mantissa}\\times 10^{${Number(exponent)}}`;
  return {
    value: rounded,
    latex,
  };
}

function numericVectorReadback(values: readonly number[]) {
  const rounded = values.map(roundedCanonicalNumber);
  return {
    values: rounded.map((entry) => entry.value),
    latex: `\\begin{bmatrix}${rounded.map((entry) => entry.latex).join('\\\\')}\\end{bmatrix}`,
  };
}

function exactSignCounts(minors: readonly ExactMinorEvidence[], signedForNegative: boolean): ExactVector {
  const counts = [0, 0, 0];
  for (const minor of minors) {
    const sign = exactSign(minor.determinant) * (signedForNegative && minor.order % 2 === 1 ? -1 : 1);
    counts[sign > 0 ? 0 : sign === 0 ? 1 : 2] += 1;
  }
  return counts.map((value) => scalar(value));
}

function primaryEvidence(input: MatrixDefinitenessInput, classification: MatrixDefinitenessClassification) {
  const label = classificationLabel(classification);
  const resultLatex = `\\operatorname{definite}(${input.label})=\\text{${label}}`;
  const exactMatrix = exactMatrixFromWire(input.exactMatrix) ?? exactMatrixFromNumeric(input.matrix);
  const operand = labelMathJson(
    input.label,
    exactMatrix ? exactMatrixMathJson(exactMatrix) : numericMatrixMathJson(input.matrix),
  );
  return canonicalLeafEvidence(
    resultLatex,
    equationMathJson(operatorMathJson('definite', operand), textMathJson(label)),
    'matrix.definiteness.native-classification',
  );
}

function exactDetails(
  analysis: ExactAnalysis,
): { sections: DisplayDetailSection[]; evidence: LinearAlgebraCanonicalDetailEvidence[] } {
  const evidence: LinearAlgebraCanonicalDetailEvidence[] = [];
  const math = (canonicalLatex: string, mathJson: unknown, source: string) => {
    evidence.push({ kind: 'math', value: canonicalLeafEvidence(canonicalLatex, mathJson, source) });
    return mathPart(canonicalLatex);
  };

  if (analysis.classification === 'nonsymmetric') {
    const mismatchValues = analysis.leadingMinors;
    const mismatchLatex = exactVectorToColumnLatex(mismatchValues);
    return {
      sections: [
        mixedDetailSection('Symmetry Check', [
          [textPart('First unequal transposed entries: '), math(mismatchLatex, exactVectorMathJson(mismatchValues), 'matrix.definiteness.native-exact-symmetry-mismatch')],
          [textPart(classificationExplanation(analysis.classification))],
        ]),
      ],
      evidence,
    };
  }

  const leadingLatex = exactVectorToColumnLatex(analysis.leadingMinors);
  const principalCounts = exactSignCounts(analysis.principalMinors, false);
  const signedCounts = exactSignCounts(analysis.principalMinors, true);
  const principalCountsLatex = exactVectorToColumnLatex(principalCounts);
  const signedCountsLatex = exactVectorToColumnLatex(signedCounts);
  return {
    sections: [
      mixedDetailSection('Exact Principal-Minor Evidence', [
        [textPart('Leading principal minors: '), math(leadingLatex, exactVectorMathJson(analysis.leadingMinors), 'matrix.definiteness.native-exact-leading-minors')],
        [textPart('All-principal-minor counts [positive, zero, negative]: '), math(principalCountsLatex, exactVectorMathJson(principalCounts), 'matrix.definiteness.native-exact-principal-sign-counts')],
        [textPart('Signed counts for negative definiteness [positive, zero, negative]: '), math(signedCountsLatex, exactVectorMathJson(signedCounts), 'matrix.definiteness.native-exact-signed-principal-counts')],
      ]),
      mixedDetailSection('Classification Criterion', [
        [textPart(`All ${analysis.principalMinors.length} nonempty principal minors were evaluated exactly.`)],
        [textPart('Positive semidefiniteness requires every principal minor to be nonnegative; negative semidefiniteness applies the same test to -A.')],
        [textPart(classificationExplanation(analysis.classification))],
      ]),
    ],
    evidence,
  };
}

function numericDetails(
  analysis: NumericAnalysis,
): { sections: DisplayDetailSection[]; evidence: LinearAlgebraCanonicalDetailEvidence[] } {
  const evidence: LinearAlgebraCanonicalDetailEvidence[] = [];
  const math = (canonicalLatex: string, mathJson: unknown, source: string) => {
    evidence.push({ kind: 'math', value: canonicalLeafEvidence(canonicalLatex, mathJson, source) });
    return mathPart(canonicalLatex);
  };
  const tolerance = roundedCanonicalNumber(analysis.tolerance);
  const residual = roundedCanonicalNumber(analysis.symmetryResidual);
  const rows = [
    [textPart('Automatic scale-aware tolerance: '), math(tolerance.latex, tolerance.value, 'matrix.definiteness.native-numeric-tolerance')],
    [textPart('Maximum symmetry residual: '), math(residual.latex, residual.value, 'matrix.definiteness.native-numeric-symmetry-residual')],
  ];
  if (analysis.eigenvalues) {
    const eigenvalues = numericVectorReadback(analysis.eigenvalues);
    rows.push([
      textPart('Jacobi eigenvalue estimates: '),
      math(eigenvalues.latex, numericVectorMathJson(eigenvalues.values), 'matrix.definiteness.native-numeric-eigenvalues'),
    ]);
  }
  return {
    sections: [
      mixedDetailSection('Tolerance-Labeled Spectral Evidence', rows),
      mixedDetailSection('Classification Criterion', [
        [textPart('The matrix is scaled before the bounded symmetric Jacobi iteration; eigenvalue signs are compared with the displayed tolerance.')],
        [textPart(classificationExplanation(analysis.classification))],
      ]),
    ],
    evidence,
  };
}

export function runMatrixDefiniteness(input: MatrixDefinitenessInput): MatrixResponse {
  const shape = getMatrixShapeFacts(input.matrix);
  if (!shape.isRectangular) {
    return matrixStop('Definiteness needs a complete rectangular Matrix.');
  }
  if (!shape.isSquare) {
    return matrixStop('definite(A) requires a square matrix.');
  }
  if (shape.rows > LINEAR_ALGEBRA_MATRIX_MAX_ROWS) {
    return matrixStop(`Numerical definiteness supports square matrices through ${LINEAR_ALGEBRA_MATRIX_MAX_ROWS} by ${LINEAR_ALGEBRA_MATRIX_MAX_ROWS}.`);
  }
  if (input.matrix.some((row) => row.some((value) => !Number.isFinite(value)))) {
    return matrixStop('Numerical definiteness needs finite real Matrix entries.');
  }

  const exactMatrix = exactMatrixFromWire(input.exactMatrix) ?? exactMatrixFromNumeric(input.matrix);
  if (exactMatrix && shape.rows <= LINEAR_ALGEBRA_EXACT_MATRIX_MAX_DIMENSION) {
    const analysis = analyzeExactMatrix(exactMatrix);
    if ('error' in analysis) return matrixStop(analysis.error);
    const primary = primaryEvidence(input, analysis.classification);
    const details = exactDetails(analysis);
    return attachLinearAlgebraCanonicalEvidence(profileLinearAlgebraResult({
      resultLatex: primary.canonicalLatex,
      detailSections: details.sections,
      warnings: [],
    }), {
      primary,
      details: details.evidence,
    });
  }

  const analysis = analyzeNumericMatrix(input.matrix);
  if ('error' in analysis) return matrixStop(analysis.error);
  const primary = primaryEvidence(input, analysis.classification);
  const details = numericDetails(analysis);
  return attachLinearAlgebraCanonicalEvidence(profileLinearAlgebraResult({
    resultLatex: primary.canonicalLatex,
    detailSections: details.sections,
    warnings: ['Numerical definiteness is tolerance-based; inspect the displayed threshold near semidefinite boundaries.'],
  }), {
    primary,
    details: details.evidence,
  });
}
