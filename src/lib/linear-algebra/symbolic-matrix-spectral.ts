import type {
  LinearAlgebraScalarDomain,
  LinearAlgebraScalarWireV1,
  MatrixResponse,
  ScalarMatrixRequestV1,
} from '../../types/calculator';
import {
  solveEquationPolynomialBoundary,
  type EquationPolynomialResultV1,
  type ProvenRoot,
} from '../equation/polynomial-boundary';
import { profileLinearAlgebraResult } from '../display/printer';
import {
  attachLinearAlgebraCanonicalEvidence,
  canonicalLeafEvidence,
  type LinearAlgebraCanonicalEvidence,
} from './canonical-evidence';
import {
  classifySymbolicRref,
  nullSpaceBasisForCase,
  symbolicMathJsonLatex,
} from './symbolic-elimination';
import {
  inverseSymbolicMatrix,
  multiplySymbolicMatrices,
  symbolicMatrixLatex,
  symbolicMatrixMathJson,
  type SymbolicMatrix,
} from './symbolic-matrix';
import {
  symbolicScalarAdd,
  symbolicScalarFromMathJson,
  symbolicScalarMultiply,
  symbolicScalarNegate,
  symbolicScalarSubtract,
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

type RootSpace = {
  root: ProvenRoot;
  value: LinearAlgebraScalarWireV1;
  basis: SymbolicMatrix[number][];
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

function vectorMathJson(vector: readonly LinearAlgebraScalarWireV1[]) {
  return symbolicMatrixMathJson(vector.map((value) => [value]));
}

function vectorSetMathJson(vectors: readonly (readonly LinearAlgebraScalarWireV1[])[]) {
  return vectors.length > 0 ? ['Set', ...vectors.map(vectorMathJson)] : 'EmptySet';
}

function conditionEvidence(result: EquationPolynomialResultV1, source: string) {
  return result.kind === 'proved'
    ? result.conditions.map((condition, index) => canonicalLeafEvidence(
        condition.canonicalLatex,
        condition.mathJson,
        `${source}.condition-${index + 1}`,
      ))
    : [];
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

function rootSpaces(
  matrix: SymbolicMatrix,
  roots: readonly ProvenRoot[],
  domain: LinearAlgebraScalarDomain,
): RootSpace[] | null {
  const spaces: RootSpace[] = [];
  for (const root of roots) {
    const value = scalar(root.value.mathJson, domain);
    const shifted = matrix.map((row, rowIndex) => row.map((entry, columnIndex) =>
      rowIndex === columnIndex ? symbolicScalarSubtract(entry, value, domain) : entry));
    const classified = classifySymbolicRref(shifted, domain);
    if (!classified.ok || classified.cases.length !== 1 || classified.cases[0].conditions.length) {
      return null;
    }
    spaces.push({
      root,
      value,
      basis: nullSpaceBasisForCase(classified.cases[0], matrix.length, domain),
    });
  }
  return spaces;
}

function characteristicOnlyResponse(input: {
  characteristic: CharacteristicPolynomial;
  label: string;
  source: string;
  warning?: string;
  roots?: readonly ProvenRoot[];
  unresolved?: { canonicalLatex: string; mathJson: unknown };
}) {
  const characteristic = characteristicRow(input.characteristic, input.label, input.source);
  const extraRows = [
    ...(input.roots ?? []).map((root) => ({
      label: root.multiplicity > 1 ? `Known root (multiplicity ${root.multiplicity})` : 'Known root',
      latex: `${input.characteristic.targetLatex}=${root.value.canonicalLatex}`,
      mathJson: ['Equal', input.characteristic.target, root.value.mathJson],
    })),
    ...(input.unresolved ? [{
      label: 'Unresolved factor',
      latex: input.unresolved.canonicalLatex,
      mathJson: input.unresolved.mathJson,
    }] : []),
  ];
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

function eigenResponse(input: {
  matrix: SymbolicMatrix;
  characteristic: CharacteristicPolynomial;
  boundary: Extract<EquationPolynomialResultV1, { kind: 'proved' }>;
  domain: LinearAlgebraScalarDomain;
  label: string;
  source: string;
}) {
  const spaces = input.boundary.conditions.length === 0
    ? rootSpaces(input.matrix, input.boundary.roots, input.domain)
    : null;
  const primaryMathJson = input.boundary.roots.length
    ? ['Set', ...input.boundary.roots.map((root) => root.value.mathJson)]
    : 'EmptySet';
  const primaryLatex = symbolicMathJsonLatex(primaryMathJson);
  const characteristic = characteristicRow(input.characteristic, input.label, input.source);
  const emptyRootRow = input.boundary.roots.length === 0
    ? {
        row: { label: 'Eigenvalues', latex: primaryLatex },
        evidence: canonicalLeafEvidence(
          primaryLatex,
          primaryMathJson,
          `${input.source}.empty-eigenvalue-set`,
        ),
      }
    : null;
  const rootRows = input.boundary.roots.map((root, index) => {
    const space = spaces?.[index];
    const rootLatex = `${input.characteristic.targetLatex}=${root.value.canonicalLatex}`;
    const spaceLatex = space
      ? `E_{${root.value.canonicalLatex}}=${symbolicMathJsonLatex(vectorSetMathJson(space.basis))}`
      : null;
    return {
      root: { label: root.multiplicity > 1 ? `Eigenvalue (multiplicity ${root.multiplicity})` : 'Eigenvalue', latex: rootLatex },
      rootEvidence: canonicalLeafEvidence(
        rootLatex,
        ['Equal', input.characteristic.target, root.value.mathJson],
        `${input.source}.root-${index + 1}`,
      ),
      ...(space && spaceLatex ? {
        space: { label: 'Eigenspace', latex: spaceLatex },
        spaceEvidence: canonicalLeafEvidence(
          spaceLatex,
          ['Equal', ['Subscript', 'E', root.value.mathJson], vectorSetMathJson(space.basis)],
          `${input.source}.eigenspace-${index + 1}`,
        ),
      } : {}),
    };
  });
  return responseWithEvidence({
    resultLatex: primaryLatex,
    answerRows: {
      label: 'Spectral evidence',
      rows: [
        characteristic.row,
        ...(emptyRootRow ? [emptyRootRow.row] : []),
        ...rootRows.flatMap((entry) => [entry.root, ...(entry.space ? [entry.space] : [])]),
      ],
    },
    exactSupplementLatex: input.boundary.conditions.map((condition) => condition.canonicalLatex),
    warnings: spaces || input.boundary.roots.length === 0
      ? []
      : ['Eigenvalues are proved, but eigenspaces remain conditional under the displayed requirements.'],
  }, {
    primary: canonicalLeafEvidence(primaryLatex, primaryMathJson, `${input.source}.primary-eigenvalues`),
    answerRows: [
      characteristic.evidence,
      ...(emptyRootRow ? [emptyRootRow.evidence] : []),
      ...rootRows.flatMap((entry) => [
        entry.rootEvidence,
        ...(entry.spaceEvidence ? [entry.spaceEvidence] : []),
      ]),
    ],
    supplements: conditionEvidence(input.boundary, input.source),
  });
}

function matrixFromColumns(columns: readonly (readonly LinearAlgebraScalarWireV1[])[]) {
  return columns[0].map((_, row) => columns.map((column) => column[row]));
}

function diagonalMatrix(
  values: readonly LinearAlgebraScalarWireV1[],
  domain: LinearAlgebraScalarDomain,
) {
  return values.map((value, row) => values.map((_, column) =>
    row === column ? value : zero(domain)));
}

function diagonalizationResponse(input: {
  matrix: SymbolicMatrix;
  characteristic: CharacteristicPolynomial;
  boundary: Extract<EquationPolynomialResultV1, { kind: 'proved' }>;
  domain: LinearAlgebraScalarDomain;
  label: string;
  source: string;
}) {
  if (input.boundary.conditions.length) {
    return characteristicOnlyResponse({
      characteristic: input.characteristic,
      label: input.label,
      source: input.source,
      roots: input.boundary.roots,
      warning: 'Diagonalization was not claimed because the eigenvalues still carry conditions.',
    });
  }
  const spaces = rootSpaces(input.matrix, input.boundary.roots, input.domain);
  if (!spaces) {
    return characteristicOnlyResponse({
      characteristic: input.characteristic,
      label: input.label,
      source: input.source,
      roots: input.boundary.roots,
      warning: 'Diagonalization was not claimed because the eigenspaces remain conditional.',
    });
  }
  const columns: LinearAlgebraScalarWireV1[][] = [];
  const diagonalValues: LinearAlgebraScalarWireV1[] = [];
  for (const space of spaces) {
    if (space.basis.length < space.root.multiplicity) {
      return characteristicOnlyResponse({
        characteristic: input.characteristic,
        label: input.label,
        source: input.source,
        roots: input.boundary.roots,
        warning: 'This matrix does not have a proved complete eigenbasis, so it is not diagonalizable.',
      });
    }
    for (let index = 0; index < space.root.multiplicity; index += 1) {
      columns.push(space.basis[index]);
      diagonalValues.push(space.value);
    }
  }
  if (columns.length !== input.matrix.length) {
    return characteristicOnlyResponse({
      characteristic: input.characteristic,
      label: input.label,
      source: input.source,
      roots: input.boundary.roots,
      warning: 'The bounded polynomial result did not prove a complete eigenbasis.',
    });
  }
  const p = matrixFromColumns(columns);
  const d = diagonalMatrix(diagonalValues, input.domain);
  const inverse = inverseSymbolicMatrix(p, input.domain);
  if (!inverse.ok || inverse.supplements.length) {
    return characteristicOnlyResponse({
      characteristic: input.characteristic,
      label: input.label,
      source: input.source,
      roots: input.boundary.roots,
      warning: 'The eigenvector matrix was not proved invertible without additional conditions.',
    });
  }
  const reconstructed = multiplySymbolicMatrices(
    multiplySymbolicMatrices(p, d, input.domain)!,
    inverse.matrix,
    input.domain,
  )!;
  const resultLatex = `${input.label}=${symbolicMatrixLatex(p)}${symbolicMatrixLatex(d)}${symbolicMatrixLatex(inverse.matrix)}`;
  const resultMathJson = ['Equal', symbolicMatrixMathJson(input.matrix), [
    'Multiply', symbolicMatrixMathJson(p), symbolicMatrixMathJson(d), symbolicMatrixMathJson(inverse.matrix),
  ]];
  const rows = [
    { label: 'P', latex: symbolicMatrixLatex(p), mathJson: symbolicMatrixMathJson(p) },
    { label: 'D', latex: symbolicMatrixLatex(d), mathJson: symbolicMatrixMathJson(d) },
    { label: 'P inverse', latex: symbolicMatrixLatex(inverse.matrix), mathJson: symbolicMatrixMathJson(inverse.matrix) },
    { label: 'Reconstruction', latex: symbolicMatrixLatex(reconstructed), mathJson: symbolicMatrixMathJson(reconstructed) },
  ];
  return responseWithEvidence({
    resultLatex,
    answerRows: { label: 'Diagonalization', rows: rows.map(({ label, latex }) => ({ label, latex })) },
    warnings: [],
  }, {
    primary: canonicalLeafEvidence(resultLatex, resultMathJson, `${input.source}.primary-diagonalization`),
    answerRows: rows.map((row, index) => canonicalLeafEvidence(
      row.latex,
      row.mathJson,
      `${input.source}.diagonalization-row-${index + 1}`,
    )),
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
    const boundary = solveEquationPolynomialBoundary({
      version: 1,
      target: characteristic.target,
      domain,
      coefficients: characteristic.coefficients,
    });
    if (boundary.kind === 'partial') {
      return characteristicOnlyResponse({
        characteristic,
        label,
        source,
        roots: boundary.roots,
        unresolved: boundary.unresolvedFactor,
        warning: boundary.roots.length > 0
          ? 'Known eigenvalues are shown; the remaining factor exceeded the bounded polynomial presentation policy.'
          : 'The characteristic polynomial is shown; its unresolved factor exceeded the bounded polynomial presentation policy.',
      });
    }
    if (boundary.kind === 'unsupported') {
      return characteristicOnlyResponse({
        characteristic,
        label,
        source,
        warning: `The characteristic polynomial is proved, but bounded eigenvalue solving stopped (${boundary.reason}).`,
      });
    }
    return request.operation === 'eigenA' || request.operation === 'eigenB'
      ? eigenResponse({ matrix, characteristic, boundary, domain, label, source })
      : diagonalizationResponse({ matrix, characteristic, boundary, domain, label, source });
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
