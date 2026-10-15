import type {
  LinearAlgebraScalarDomain,
  LinearAlgebraScalarWireV1,
  MatrixResponse,
  ScalarMatrixRequestV1,
} from '../../types/calculator';
import { RETIRED_ENGINE_MESSAGE } from '../kernel/retired-engine';
import { profileLinearAlgebraResult } from '../display/printer';
import {
  attachLinearAlgebraCanonicalEvidence,
  canonicalLeafEvidence,
  type LinearAlgebraCanonicalEvidence,
} from './canonical-evidence';
import {
  type SymbolicMatrix,
} from './symbolic-matrix';
import {
  symbolicScalarAdd,
  symbolicScalarFromMathJson,
  symbolicScalarMultiply,
  symbolicScalarNegate,
  symbolicScalarZeroStatus,
} from './symbolic-scalar-core';

const SPECTRAL_OPERATIONS = new Set<ScalarMatrixRequestV1['operation']>([
  'charpolyA', 'charpolyB', 'eigenA', 'eigenB', 'diagonalizeA', 'diagonalizeB',
]);
const MAX_SPECTRAL_DIMENSION = 4;

type ScalarPolynomial = LinearAlgebraScalarWireV1[];

type CharacteristicPolynomial = {
  target: string;
  targetLatex: string;
  coefficients: LinearAlgebraScalarWireV1[];
  expanded: LinearAlgebraScalarWireV1;
  presentation: LinearAlgebraScalarWireV1;
};

function scalar(node: unknown, domain: LinearAlgebraScalarDomain) {
  const parsed = symbolicScalarFromMathJson(node, domain);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

function zero(domain: LinearAlgebraScalarDomain) {
  return scalar(0, domain);
}

function one(domain: LinearAlgebraScalarDomain) {
  return scalar(1, domain);
}

function targetMatrix(request: ScalarMatrixRequestV1) {
  return request.operation.endsWith('B') ? request.matrixB?.resolved : request.matrixA.resolved;
}

function targetLabel(request: ScalarMatrixRequestV1) {
  return request.operation.endsWith('B')
    ? request.matrixOperandLatexB ?? 'B'
    : request.matrixOperandLatexA ?? 'A';
}

function collectSymbols(node: unknown, symbols: Set<string>, operatorPosition = false) {
  if (typeof node === 'string') {
    if (!operatorPosition) symbols.add(node);
    return;
  }
  if (!Array.isArray(node)) return;
  node.forEach((child, index) => collectSymbols(child, symbols, index === 0));
}

function spectralTarget(matrix: SymbolicMatrix) {
  const symbols = new Set<string>();
  matrix.forEach((row) => row.forEach((entry) => collectSymbols(entry.mathJson, symbols)));
  let index = 0;
  while (symbols.has(index === 0 ? 'lambda' : `lambda_${index}`)) index += 1;
  return {
    target: index === 0 ? 'lambda' : `lambda_${index}`,
    targetLatex: index === 0 ? '\\lambda' : `\\lambda_{${index}}`,
  };
}

function polynomialAdd(
  left: ScalarPolynomial,
  right: ScalarPolynomial,
  domain: LinearAlgebraScalarDomain,
) {
  const size = Math.max(left.length, right.length);
  return Array.from({ length: size }, (_, index) => symbolicScalarAdd(
    left[index] ?? zero(domain),
    right[index] ?? zero(domain),
    domain,
  ));
}

function polynomialNegate(polynomial: ScalarPolynomial, domain: LinearAlgebraScalarDomain) {
  return polynomial.map((coefficient) => symbolicScalarNegate(coefficient, domain));
}

function polynomialMultiply(
  left: ScalarPolynomial,
  right: ScalarPolynomial,
  domain: LinearAlgebraScalarDomain,
) {
  const result = Array.from({ length: left.length + right.length - 1 }, () => zero(domain));
  left.forEach((leftCoefficient, leftDegree) => {
    right.forEach((rightCoefficient, rightDegree) => {
      const degree = leftDegree + rightDegree;
      result[degree] = symbolicScalarAdd(
        result[degree],
        symbolicScalarMultiply(leftCoefficient, rightCoefficient, domain),
        domain,
      );
    });
  });
  return result;
}

function polynomialMinor(matrix: ScalarPolynomial[][], row: number, column: number) {
  return matrix.filter((_, rowIndex) => rowIndex !== row)
    .map((entry) => entry.filter((_, columnIndex) => columnIndex !== column));
}

function polynomialDeterminant(
  matrix: ScalarPolynomial[][],
  domain: LinearAlgebraScalarDomain,
): ScalarPolynomial {
  if (matrix.length === 1) return matrix[0][0];
  return matrix[0].reduce((total, entry, column) => {
    const term = polynomialMultiply(
      entry,
      polynomialDeterminant(polynomialMinor(matrix, 0, column), domain),
      domain,
    );
    return polynomialAdd(
      total,
      column % 2 === 0 ? term : polynomialNegate(term, domain),
      domain,
    );
  }, [zero(domain)]);
}

function polynomialMathJson(
  coefficients: readonly LinearAlgebraScalarWireV1[],
  target: string,
) {
  const degree = coefficients.length - 1;
  const terms: unknown[] = [];
  coefficients.forEach((coefficient, index) => {
    if (symbolicScalarZeroStatus(coefficient) === 'zero') return;
    const exponent = degree - index;
    if (exponent === 0) {
      terms.push(coefficient.mathJson);
      return;
    }
    const variable = exponent === 1 ? target : ['Power', target, exponent];
    terms.push(['Multiply', coefficient.mathJson, variable]);
  });
  return terms.length === 0 ? 0 : terms.length === 1 ? terms[0] : ['Add', ...terms];
}

function characteristicPolynomial(
  matrix: SymbolicMatrix,
  domain: LinearAlgebraScalarDomain,
): CharacteristicPolynomial {
  const { target, targetLatex } = spectralTarget(matrix);
  const polynomialMatrix = matrix.map((row, rowIndex) => row.map((entry, columnIndex) =>
    rowIndex === columnIndex
      ? [symbolicScalarNegate(entry, domain), one(domain)]
      : [symbolicScalarNegate(entry, domain)]));
  const lowToHigh = polynomialDeterminant(polynomialMatrix, domain);
  const coefficients = [...lowToHigh].reverse();
  const expanded = scalar(polynomialMathJson(coefficients, target), domain);
  const diagonal = matrix.every((row, rowIndex) => row.every((entry, columnIndex) =>
    rowIndex === columnIndex || symbolicScalarZeroStatus(entry) === 'zero'));
  const presentation = diagonal
    ? scalar(['Multiply', ...matrix.map((row, index) => [
        'Subtract', target, row[index].mathJson,
      ])], domain)
    : expanded;
  return { target, targetLatex, coefficients, expanded, presentation };
}

function responseWithEvidence(
  response: MatrixResponse,
  evidence: LinearAlgebraCanonicalEvidence,
) {
  return attachLinearAlgebraCanonicalEvidence(profileLinearAlgebraResult(response), evidence);
}

function characteristicRow(
  characteristic: CharacteristicPolynomial,
  label: string,
  source: string,
) {
  const safeLabel = /^[A-Za-z][A-Za-z0-9_]*$/u.test(label) ? label : null;
  const polynomialSymbol = safeLabel ? `chi_${safeLabel}` : 'chi';
  const polynomialLatex = safeLabel ? `\\chi_{${safeLabel}}` : '\\chi';
  const latex = `${polynomialLatex}=${characteristic.presentation.canonicalLatex}`;
  const mathJson = ['Equal', polynomialSymbol, characteristic.presentation.mathJson];
  return {
    row: { label: 'Characteristic polynomial', latex },
    evidence: canonicalLeafEvidence(latex, mathJson, `${source}.characteristic-polynomial`),
  };
}

function characteristicOnlyResponse(input: {
  characteristic: CharacteristicPolynomial;
  label: string;
  source: string;
  warning?: string;
}) {
  const characteristic = characteristicRow(input.characteristic, input.label, input.source);
  const extraRows: { label: string; latex: string; mathJson: unknown }[] = [];
  return responseWithEvidence({
    resultLatex: input.characteristic.presentation.canonicalLatex,
    answerRows: {
      label: 'Spectral evidence',
      rows: [characteristic.row, ...extraRows.map(({ label, latex }) => ({ label, latex }))],
    },
    warnings: input.warning ? [input.warning] : [],
  }, {
    primary: canonicalLeafEvidence(
      input.characteristic.presentation.canonicalLatex,
      input.characteristic.presentation.mathJson,
      `${input.source}.primary-characteristic-polynomial`,
    ),
    answerRows: [
      characteristic.evidence,
      ...extraRows.map((row, index) => canonicalLeafEvidence(
        row.latex,
        row.mathJson,
        `${input.source}.partial-row-${index + 1}`,
      )),
    ],
  });
}

export function runSymbolicMatrixSpectralOperation(
  request: ScalarMatrixRequestV1,
): MatrixResponse | null {
  if (!SPECTRAL_OPERATIONS.has(request.operation)) return null;
  const matrix = targetMatrix(request);
  if (!matrix) return { warnings: [], error: 'Matrix B is required for this spectral operation.' };
  if (matrix.length !== matrix[0]?.length) {
    return { warnings: [], error: 'Spectral operations require a square matrix.' };
  }
  if (matrix.length > MAX_SPECTRAL_DIMENSION) {
    return { warnings: [], error: `Symbolic spectral operations support square matrices through ${MAX_SPECTRAL_DIMENSION} by ${MAX_SPECTRAL_DIMENSION}.` };
  }
  const domain = request.domain ?? 'real';
  const label = targetLabel(request);
  const source = `matrix.${request.operation}.native-symbolic-spectral`;
  try {
    const characteristic = characteristicPolynomial(matrix, domain);
    if (request.operation === 'charpolyA' || request.operation === 'charpolyB') {
      return characteristicOnlyResponse({ characteristic, label, source });
    }
    // Eigenvalues came from the old Equation engine's polynomial boundary (retired); unavailable until Matrix is rebuilt.
    return { warnings: [], error: RETIRED_ENGINE_MESSAGE };
  } catch (error) {
    return {
      warnings: [],
      error: error instanceof Error
        ? error.message
        : 'This symbolic spectral expression exceeded the bounded policy.',
    };
  }
}

export const symbolicMatrixSpectralTesting = {
  characteristicPolynomial,
};
