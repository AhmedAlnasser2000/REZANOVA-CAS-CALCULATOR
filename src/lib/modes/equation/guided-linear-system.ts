import type { ExactScalar } from '../../algebra/polynomial-core';
import {
  addExactScalars,
  exactScalarIsZero,
  multiplyExactScalars,
  negateExactScalar,
  normalizeExactScalar,
} from '../../algebra/polynomial-core';
import {
  exactMatrixToLatex,
  exactScalarToLatex,
} from '../../linear-algebra/exact-matrix-format';
import { exactMatrixMathJson } from '../../linear-algebra/canonical-evidence';
import {
  rrefExactMatrix,
  scalar,
  solveExactLinearSystem,
  type ExactRowOperation,
  type ExactMatrix,
  type ExactVector,
} from '../../linear-algebra/exact-matrix-core';
import { parseLinearAlgebraScalarWire } from '../../linear-algebra/scalar-wire';
import {
  mathPart,
  mixedDetailSection,
  proseSolveSummary,
  textPart,
} from '../../display/result-detail-lines';
import { profileEquationResult } from '../../display/printer';
import { createEquationResultOutcome } from '../../equation/equation-solve-result';
import { type EquationOwnedMathJsonLeaf } from '../../equation/solve-result/owned-readback-math';
import { equationMathValuesWithOwnedReadback } from '../../equation/solve-result/owned-readback-math';
import type {
  DisplayDetailSection,
  EquationSystemCell,
  ResultProducerDraft,
  SerializableMathJson,
} from '../../../types/calculator';

type Polynomial = Map<string, ExactScalar>;
type ParsedSystem = {
  coefficients: Polynomial[][];
  constants: Polynomial[];
  hasParameters: boolean;
};

const ZERO = scalar(0);
const ONE = scalar(1);
const VARIABLES = ['x', 'y', 'z'] as const;
const MAX_PARAMETER_NAMES = 8;
const MAX_DETERMINANT_TERMS = 96;

function exactScalarMathJson(value: ExactScalar): SerializableMathJson {
  const magnitude = Math.abs(value.numerator);
  const unsigned: SerializableMathJson = value.denominator === 1
    ? magnitude
    : ['Rational', magnitude, value.denominator];
  return value.numerator < 0 ? ['Negate', unsigned] : unsigned;
}

function systemOutcome(
  input: Omit<Extract<ResultProducerDraft, { kind: 'success' }>, 'canonicalResult' | 'primaryMath'>,
  primaryMathJson: SerializableMathJson,
  leaves: readonly EquationOwnedMathJsonLeaf[],
): ResultProducerDraft {
  if (!input.exactLatex) throw new Error('Equation systems require an exact primary readback.');
  const withPrimary = {
    ...input,
    primaryMath: { canonicalLatex: input.exactLatex, mathJson: primaryMathJson },
  } satisfies Omit<Extract<ResultProducerDraft, { kind: 'success' }>, 'canonicalResult'>;
  return profileEquationResult(createEquationResultOutcome(withPrimary, {
    mathValues: equationMathValuesWithOwnedReadback({
      outcome: withPrimary,
      routeId: 'equation.linear',
      leaves: [{
        canonicalLatex: input.exactLatex,
        mathJson: primaryMathJson,
        source: 'equation-guided-system.primary',
      }, ...leaves],
    }),
  }));
}

function clonePolynomial(value: Polynomial): Polynomial {
  return new Map(value);
}

function constantPolynomial(value: ExactScalar): Polynomial {
  return exactScalarIsZero(value) ? new Map() : new Map([['', normalizeExactScalar(value)]]);
}

function symbolPolynomial(symbol: string): Polynomial {
  return new Map([[symbol, ONE]]);
}

function polynomialDegree(key: string) {
  return key ? key.split('*').length : 0;
}

function keyFromFactors(factors: readonly string[]) {
  return [...factors].sort().join('*');
}

function addTerm(polynomial: Polynomial, key: string, coefficient: ExactScalar) {
  if (exactScalarIsZero(coefficient)) return;
  const previous = polynomial.get(key) ?? ZERO;
  const next = addExactScalars(previous, coefficient);
  if (exactScalarIsZero(next)) {
    polynomial.delete(key);
  } else {
    polynomial.set(key, normalizeExactScalar(next));
  }
}

function addPolynomials(left: Polynomial, right: Polynomial): Polynomial {
  const result = clonePolynomial(left);
  for (const [key, coefficient] of right) addTerm(result, key, coefficient);
  return result;
}

function negatePolynomial(value: Polynomial): Polynomial {
  const result: Polynomial = new Map();
  for (const [key, coefficient] of value) {
    result.set(key, negateExactScalar(coefficient));
  }
  return result;
}

function subtractPolynomials(left: Polynomial, right: Polynomial) {
  return addPolynomials(left, negatePolynomial(right));
}

function multiplyPolynomials(left: Polynomial, right: Polynomial, maxDegree: number): Polynomial | null {
  if (left.size === 0 || right.size === 0) return new Map();
  const result: Polynomial = new Map();
  for (const [leftKey, leftCoefficient] of left) {
    for (const [rightKey, rightCoefficient] of right) {
      const factors = [
        ...(leftKey ? leftKey.split('*') : []),
        ...(rightKey ? rightKey.split('*') : []),
      ];
      if (factors.length > maxDegree) return null;
      addTerm(result, keyFromFactors(factors), multiplyExactScalars(leftCoefficient, rightCoefficient));
      if (result.size > MAX_DETERMINANT_TERMS) return null;
    }
  }
  return result;
}

function constantValue(value: Polynomial) {
  return value.get('') ?? ZERO;
}

function divideByConstant(value: Polynomial, divisor: ExactScalar): Polynomial | null {
  if (exactScalarIsZero(divisor)) return null;
  const reciprocal = scalar(divisor.denominator, divisor.numerator);
  return multiplyPolynomials(value, constantPolynomial(reciprocal), 3);
}

function isParameterSymbol(value: unknown): value is string {
  return typeof value === 'string'
    && /^[A-Za-z][A-Za-z0-9_]*$/u.test(value)
    && !['x', 'y', 'z', 'Pi', 'ExponentialE', 'ImaginaryUnit'].includes(value);
}

function exactFromNode(node: unknown): ExactScalar | null {
  if (typeof node === 'number' && Number.isSafeInteger(node)) return scalar(node);
  if (!Array.isArray(node) || typeof node[0] !== 'string') return null;
  if (node[0] === 'Rational' && node.length === 3 && typeof node[1] === 'number' && typeof node[2] === 'number') {
    return Number.isSafeInteger(node[1]) && Number.isSafeInteger(node[2]) && node[2] !== 0
      ? scalar(node[1], node[2])
      : null;
  }
  if (node[0] === 'Negate' && node.length === 2) {
    const child = exactFromNode(node[1]);
    return child ? negateExactScalar(child) : null;
  }
  if (node[0] === 'Divide' && node.length === 3) {
    const numerator = exactFromNode(node[1]);
    const denominator = exactFromNode(node[2]);
    return numerator && denominator && !exactScalarIsZero(denominator)
      ? scalar(numerator.numerator * denominator.denominator, numerator.denominator * denominator.numerator)
      : null;
  }
  if (node[0] === 'Multiply' || node[0] === 'Add' || node[0] === 'Subtract') {
    const operands = node.slice(1).map(exactFromNode);
    if (operands.some((value) => !value)) return null;
    const values = operands as ExactScalar[];
    if (values.length === 0) return null;
    if (node[0] === 'Multiply') return values.reduce(multiplyExactScalars, ONE);
    if (node[0] === 'Add') return values.reduce(addExactScalars, ZERO);
    return values.slice(1).reduce((left, right) => addExactScalars(left, negateExactScalar(right)), values[0]);
  }
  return null;
}

function affinePolynomialFromNode(node: unknown): Polynomial | null {
  const exact = exactFromNode(node);
  if (exact) return constantPolynomial(exact);
  if (isParameterSymbol(node)) return symbolPolynomial(node);
  if (!Array.isArray(node) || typeof node[0] !== 'string') return null;
  const operator = node[0];
  if (operator === 'Negate' && node.length === 2) {
    const child = affinePolynomialFromNode(node[1]);
    return child ? negatePolynomial(child) : null;
  }
  if (operator === 'Add' || operator === 'Subtract') {
    const operands = node.slice(1).map(affinePolynomialFromNode);
    if (operands.some((value) => !value) || operands.length === 0) return null;
    const values = operands as Polynomial[];
    return operator === 'Add'
      ? values.reduce(addPolynomials, new Map())
      : values.slice(1).reduce(subtractPolynomials, values[0]);
  }
  if (operator === 'Multiply') {
    const operands = node.slice(1).map(affinePolynomialFromNode);
    if (operands.some((value) => !value) || operands.length === 0) return null;
    return (operands as Polynomial[]).reduce(
      (left, right) => left === null ? null : multiplyPolynomials(left, right, 1),
      constantPolynomial(ONE) as Polynomial | null,
    );
  }
  if (operator === 'Divide' && node.length === 3) {
    const numerator = affinePolynomialFromNode(node[1]);
    const denominator = exactFromNode(node[2]);
    return numerator && denominator ? divideByConstant(numerator, denominator) : null;
  }
  return null;
}

function parseCell(value: EquationSystemCell): { value: Polynomial; parameters: string[] } | { error: string } {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return { error: 'System coefficients must be finite exact rational values.' };
    if (Number.isSafeInteger(value)) return { value: constantPolynomial(scalar(value)), parameters: [] };
    return { error: 'Decimal coefficients must be entered as exact fractions in Equation systems.' };
  }
  const source = value.trim() || '0';
  const parsed = parseLinearAlgebraScalarWire(source, 'real');
  if (!parsed.ok) return { error: parsed.error };
  const polynomial = affinePolynomialFromNode(parsed.value.mathJson);
  if (!polynomial) {
    return {
      error: 'Equation systems accept exact rational constants and affine named parameters only. Products of parameters, powers, functions, and non-affine expressions are outside this screen.',
    };
  }
  const parameters = [...polynomial.keys()]
    .flatMap((key) => key ? key.split('*') : [])
    .filter((name, index, all) => all.indexOf(name) === index);
  return { value: polynomial, parameters };
}

function parseSystem(source: EquationSystemCell[][], size: 2 | 3): ParsedSystem | { error: string } {
  if (source.length !== size || source.some((row) => row.length < size + 1)) {
    return { error: `Enter ${size} complete equations before solving.` };
  }
  const coefficients: Polynomial[][] = [];
  const constants: Polynomial[] = [];
  const parameterNames = new Set<string>();
  for (const row of source) {
    const parsedRow: Polynomial[] = [];
    for (const value of row.slice(0, size + 1)) {
      const parsed = parseCell(value);
      if ('error' in parsed) return parsed;
      parsed.parameters.forEach((parameter) => parameterNames.add(parameter));
      parsedRow.push(parsed.value);
    }
    coefficients.push(parsedRow.slice(0, size));
    constants.push(parsedRow[size]);
  }
  if (parameterNames.size > MAX_PARAMETER_NAMES) {
    return { error: `This system has more than ${MAX_PARAMETER_NAMES} named parameters, beyond the bounded Equation system limit.` };
  }
  return { coefficients, constants, hasParameters: parameterNames.size > 0 };
}

function exactSystem(parsed: ParsedSystem): { coefficients: ExactMatrix; constants: ExactVector } | null {
  if (parsed.hasParameters) return null;
  return {
    coefficients: parsed.coefficients.map((row) => row.map(constantValue)),
    constants: parsed.constants.map(constantValue),
  };
}

function augmentedMatrix(coefficients: ExactMatrix, constants: ExactVector): ExactMatrix {
  return coefficients.map((row, index) => [...row, constants[index]]);
}

function parameterName(index: number, count: number) {
  return count === 1 ? 't' : `t_{${index + 1}}`;
}

function joinTerms(constant: ExactScalar, terms: string[]) {
  const result = exactScalarIsZero(constant) ? [] : [exactScalarToLatex(constant)];
  for (const term of terms) result.push(result.length > 0 && !term.startsWith('-') ? `+${term}` : term);
  return result.join('') || '0';
}

function solutionFamilyFromRref(rref: ExactMatrix, pivots: number[], size: number) {
  const coefficientPivots = pivots.filter((column) => column < size);
  const freeColumns = Array.from({ length: size }, (_, index) => index)
    .filter((column) => !coefficientPivots.includes(column));
  const parameters = freeColumns.map((column, index) => [column, parameterName(index, freeColumns.length)] as const);
  const names = new Map(parameters);
  const entries = Array.from({ length: size }, () => '0');
  parameters.forEach(([column, parameter]) => { entries[column] = parameter; });
  coefficientPivots.forEach((pivotColumn, pivotRow) => {
    const row = rref[pivotRow];
    const terms = freeColumns.flatMap((freeColumn) => {
      const value = negateExactScalar(row[freeColumn]);
      if (exactScalarIsZero(value)) return [];
      const parameter = names.get(freeColumn) ?? 't';
      const coefficient = value.numerator === value.denominator
        ? ''
        : value.numerator === -value.denominator
          ? '-'
          : exactScalarToLatex(value);
      return [`${coefficient}${parameter}`];
    });
    entries[pivotColumn] = joinTerms(row[size], terms);
  });
  return {
    assignments: entries.map((entry, index) => `${VARIABLES[index]}=${entry}`),
    domain: `${parameters.map(([, parameter]) => parameter).join(',')}\\in\\mathbb{R}`,
    entries,
  };
}

function solutionFamilyMathJson(rref: ExactMatrix, pivots: number[], size: number): SerializableMathJson[] {
  const coefficientPivots = pivots.filter((column) => column < size);
  const freeColumns = Array.from({ length: size }, (_, index) => index)
    .filter((column) => !coefficientPivots.includes(column));
  const parameterByColumn = new Map(freeColumns.map((column, index) => [
    column,
    parameterName(index, freeColumns.length),
  ]));
  const values: SerializableMathJson[] = Array.from({ length: size }, () => 0);
  freeColumns.forEach((column) => {
    values[column] = parameterByColumn.get(column) ?? 't';
  });
  coefficientPivots.forEach((pivotColumn, pivotRow) => {
    const row = rref[pivotRow];
    const terms: SerializableMathJson[] = [exactScalarMathJson(row[size])];
    freeColumns.forEach((freeColumn) => {
      const coefficient = negateExactScalar(row[freeColumn]);
      if (exactScalarIsZero(coefficient)) return;
      const parameter = parameterByColumn.get(freeColumn) ?? 't';
      if (coefficient.numerator === coefficient.denominator) {
        terms.push(parameter);
      } else if (coefficient.numerator === -coefficient.denominator) {
        terms.push(['Negate', parameter]);
      } else {
        terms.push(['Multiply', exactScalarMathJson(coefficient), parameter]);
      }
    });
    values[pivotColumn] = (terms.length === 1 ? terms[0] : ['Add', ...terms]) as SerializableMathJson;
  });
  return values;
}

function familyDomainMathJson(size: number, pivots: number[]): SerializableMathJson {
  const freeCount = size - pivots.filter((column) => column < size).length;
  const parameters = Array.from({ length: freeCount }, (_, index) => parameterName(index, freeCount));
  return ['Element', parameters.length === 1 ? parameters[0] : ['Tuple', ...parameters], 'RealNumbers'];
}

function rowOperationDetails(operations: readonly ExactRowOperation[]): DisplayDetailSection {
  if (operations.length === 0) {
    return {
      title: 'Row Reduction Steps',
      lines: ['The matrix was already in reduced row echelon form.'],
      lineKind: 'text',
    };
  }
  const lines = operations.map((operation) => {
    if (operation.kind === 'swap') {
      return [textPart(`Swapped rows ${operation.rowA + 1} and ${operation.rowB + 1}.`)];
    }
    if (operation.kind === 'scale') {
      return [
        textPart(`Scaled row ${operation.row + 1} by `),
        mathPart(exactScalarToLatex(operation.factor)),
        textPart('.'),
      ];
    }
    return [
      textPart(`Replaced row ${operation.targetRow + 1} using row ${operation.pivotRow + 1} with factor `),
      mathPart(exactScalarToLatex(operation.factor)),
      textPart('.'),
    ];
  });
  return mixedDetailSection('Row Reduction Steps', lines);
}

function numericDetails(
  kind: 'unique' | 'inconsistent' | 'infinite',
  rankA: number,
  rankAugmented: number,
  size: number,
  rref: ExactMatrix,
  operations: readonly ExactRowOperation[],
): DisplayDetailSection[] {
  const contradiction = rref.find((row) =>
    row.slice(0, size).every(exactScalarIsZero) && !exactScalarIsZero(row[size]));
  const proof = kind === 'unique'
    ? 'The ranks match and every variable column has a pivot.'
    : kind === 'inconsistent'
      ? 'The augmented column creates a contradiction, so no values satisfy every equation.'
      : 'The ranks match but there are free variables, so the solution is an infinite family.';
  return [
    mixedDetailSection('System Evidence', [
      [textPart('Coefficient rank: '), mathPart(`${rankA}`), textPart('.')],
      [textPart('Augmented rank: '), mathPart(`${rankAugmented}`), textPart('.')],
      [textPart(proof)],
      ...(contradiction ? [[textPart('Contradiction row: '), mathPart(`0=${exactScalarToLatex(contradiction[size])}`), textPart('.')]] : []),
    ]),
    mixedDetailSection('Augmented RREF', [[
      mathPart(exactMatrixToLatex(rref)),
    ]]),
    rowOperationDetails(operations),
  ];
}

function numericDetailLeaves(
  rankA: number,
  rankAugmented: number,
  size: number,
  rref: ExactMatrix,
  operations: readonly ExactRowOperation[],
): EquationOwnedMathJsonLeaf[] {
  const contradiction = rref.find((row) =>
    row.slice(0, size).every(exactScalarIsZero) && !exactScalarIsZero(row[size]));
  return [
    { canonicalLatex: `${rankA}`, mathJson: rankA, source: 'equation-guided-system.rank-a' },
    { canonicalLatex: `${rankAugmented}`, mathJson: rankAugmented, source: 'equation-guided-system.rank-augmented' },
    ...(contradiction ? [{
      canonicalLatex: `0=${exactScalarToLatex(contradiction[size])}`,
      mathJson: ['Equal', 0, exactScalarMathJson(contradiction[size])] as SerializableMathJson,
      source: 'equation-guided-system.contradiction',
    }] : []),
    {
      canonicalLatex: exactMatrixToLatex(rref),
      mathJson: exactMatrixMathJson(rref) as unknown as SerializableMathJson,
      source: 'equation-guided-system.rref',
    },
    ...operations.flatMap((operation, index) => operation.kind === 'swap'
      ? []
      : [{
          canonicalLatex: exactScalarToLatex(operation.factor),
          mathJson: exactScalarMathJson(operation.factor),
          source: `equation-guided-system.row-operation-${index}`,
        }]),
  ];
}

function solutionLeaves(
  assignments: readonly string[],
  values: readonly SerializableMathJson[],
  size: number,
): EquationOwnedMathJsonLeaf[] {
  return [
    ...assignments.map((assignment, index) => ({
      canonicalLatex: assignment,
      mathJson: equalityMathJson(VARIABLES[index], values[index]),
      source: `equation-guided-system.assignment-${index}`,
    })),
    ...VARIABLES.slice(0, size).map((variable, index) => ({
      canonicalLatex: variable,
      mathJson: variable,
      source: `equation-guided-system.variable-${index}`,
    })),
    ...values.map((value, index) => ({
      canonicalLatex: index < assignments.length
        ? assignments[index].slice(assignments[index].indexOf('=') + 1)
        : '0',
      mathJson: value,
      source: `equation-guided-system.value-${index}`,
    })),
  ];
}

function solveNumericSystem(input: { coefficients: ExactMatrix; constants: ExactVector }, size: 2 | 3): ResultProducerDraft {
  const title = `${size}x${size}`;
  const coefficientRref = rrefExactMatrix(input.coefficients);
  const augmentedRref = rrefExactMatrix(augmentedMatrix(input.coefficients, input.constants));
  if (coefficientRref.kind === 'stop' || augmentedRref.kind === 'stop') {
    return createEquationResultOutcome({
      kind: 'error', title,
      error: 'The system exceeded the exact row-reduction limits.', warnings: [],
    });
  }
  const rankA = coefficientRref.rank;
  const rankAugmented = augmentedRref.rank;
  const detailLeaves = numericDetailLeaves(
    rankA,
    rankAugmented,
    size,
    augmentedRref.matrix,
    augmentedRref.rowOperations,
  );
  if (rankA < rankAugmented) {
    return systemOutcome({
      kind: 'success', title, exactLatex: '\\varnothing',
      answerRows: { label: 'Answer', rows: [{ latex: '\\varnothing', label: 'No solution' }] },
      ...proseSolveSummary('No solution. The augmented system has a contradiction.'),
      detailSections: numericDetails('inconsistent', rankA, rankAugmented, size, augmentedRref.matrix, augmentedRref.rowOperations),
      warnings: [], resultOrigin: 'rule-based-symbolic',
    }, 'EmptySet', [{
      canonicalLatex: '\\varnothing', mathJson: 'EmptySet', source: 'equation-guided-system.empty-answer',
    }, ...detailLeaves]);
  }
  if (rankA < size) {
    const family = solutionFamilyFromRref(augmentedRref.matrix, augmentedRref.pivotColumns, size);
    const values = solutionFamilyMathJson(augmentedRref.matrix, augmentedRref.pivotColumns, size);
    return systemOutcome({
      kind: 'success', title, exactLatex: family.assignments.join(',\\;'),
      exactSupplementLatex: [family.domain],
      answerRows: { label: 'Solution family', rows: family.assignments.map((latex) => ({ latex })) },
      systemReadback: {
        label: 'Solution family', variablesLatex: [...VARIABLES.slice(0, size)],
        rows: [{ valuesLatex: family.entries }], source: `equation-linear-${size}x${size}`,
      },
      ...proseSolveSummary('Infinitely many solutions. The displayed parameter rows describe the family.'),
      detailSections: numericDetails('infinite', rankA, rankAugmented, size, augmentedRref.matrix, augmentedRref.rowOperations),
      warnings: [], resultOrigin: 'rule-based-symbolic',
    }, assignmentTupleMathJson(values), [
      ...solutionLeaves(family.assignments, values, size),
      {
        canonicalLatex: family.domain,
        mathJson: familyDomainMathJson(size, augmentedRref.pivotColumns),
        source: 'equation-guided-system.family-domain',
      },
      ...detailLeaves,
    ]);
  }
  const solved = solveExactLinearSystem(input.coefficients, input.constants);
  if (solved.kind === 'stop') {
    return createEquationResultOutcome({ kind: 'error', title, error: 'Exact row reduction stopped before a solution was produced.', warnings: [] });
  }
  const values = solved.solution.map(exactScalarToLatex);
  const valueMathJson = solved.solution.map(exactScalarMathJson);
  const assignments = values.map((value, index) => `${VARIABLES[index]}=${value}`);
  return systemOutcome({
    kind: 'success', title, exactLatex: assignments.join(',\\;'),
    answerRows: { label: 'Solution values', rows: assignments.map((latex) => ({ latex })) },
    systemReadback: {
      label: 'Solution values', variablesLatex: [...VARIABLES.slice(0, size)],
      rows: [{ valuesLatex: values }], source: `equation-linear-${size}x${size}`,
    },
    ...proseSolveSummary('Exactly one solution. Every variable column has a pivot.'),
    detailSections: numericDetails('unique', rankA, rankAugmented, size, augmentedRref.matrix, augmentedRref.rowOperations),
    warnings: [], resultOrigin: 'rule-based-symbolic',
  }, assignmentTupleMathJson(valueMathJson), [
    ...solutionLeaves(assignments, valueMathJson, size),
    ...detailLeaves,
  ]);
}

function determinant(matrix: Polynomial[][]): Polynomial | null {
  const size = matrix.length;
  if (size === 1) return clonePolynomial(matrix[0][0]);
  let result: Polynomial = new Map();
  for (let column = 0; column < size; column += 1) {
    const minor = matrix.slice(1).map((row) => row.filter((_, index) => index !== column));
    const minorDeterminant = determinant(minor);
    const product = minorDeterminant ? multiplyPolynomials(matrix[0][column], minorDeterminant, size) : null;
    if (!product) return null;
    result = addPolynomials(result, column % 2 === 0 ? product : negatePolynomial(product));
    if (result.size > MAX_DETERMINANT_TERMS) return null;
  }
  return result;
}

function polynomialEquals(left: Polynomial, right: Polynomial) {
  if (left.size !== right.size) return false;
  for (const [key, value] of left) {
    const other = right.get(key);
    if (!other || other.numerator !== value.numerator || other.denominator !== value.denominator) return false;
  }
  return true;
}

function polynomialToLatex(value: Polynomial) {
  if (value.size === 0) return '0';
  const entries = [...value.entries()].sort(([left], [right]) => {
    const degree = polynomialDegree(right) - polynomialDegree(left);
    return degree || left.localeCompare(right);
  });
  const pieces: string[] = [];
  for (const [key, coefficient] of entries) {
    const negative = coefficient.numerator < 0;
    const magnitude = negative ? negateExactScalar(coefficient) : coefficient;
    const factors = key ? key.split('*').join('') : '';
    const body = key === ''
      ? exactScalarToLatex(magnitude)
      : magnitude.numerator === magnitude.denominator
        ? factors
        : `${exactScalarToLatex(magnitude)}${factors}`;
    pieces.push(pieces.length === 0 ? (negative ? `-${body}` : body) : (negative ? `-${body}` : `+${body}`));
  }
  return pieces.join('');
}

function polynomialToMathJson(value: Polynomial): SerializableMathJson {
  if (value.size === 0) return 0;
  const terms = [...value.entries()]
    .sort(([left], [right]) => {
      const degree = polynomialDegree(right) - polynomialDegree(left);
      return degree || left.localeCompare(right);
    })
    .map(([key, coefficient]) => {
      const coefficientNode = exactScalarMathJson(coefficient);
      if (!key) return coefficientNode;
      const factors: SerializableMathJson[] = key.split('*');
      const coefficientIsOne = coefficient.numerator === coefficient.denominator;
      const coefficientIsNegativeOne = coefficient.numerator === -coefficient.denominator;
      if (coefficientIsOne) return factors.length === 1 ? factors[0] : ['Multiply', ...factors];
      if (coefficientIsNegativeOne) {
        const product: SerializableMathJson = factors.length === 1 ? factors[0] : ['Multiply', ...factors];
        return ['Negate', product];
      }
      return ['Multiply', coefficientNode, ...factors];
    });
  return (terms.length === 1 ? terms[0] : ['Add', ...terms]) as SerializableMathJson;
}

function divisionLatex(numerator: Polynomial, denominator: Polynomial) {
  if (numerator.size === 0) return '0';
  if (denominator.size === 1 && denominator.get('')?.numerator === 1 && denominator.get('')?.denominator === 1) {
    return polynomialToLatex(numerator);
  }
  if (polynomialEquals(numerator, denominator)) return '1';
  if (polynomialEquals(numerator, negatePolynomial(denominator))) return '-1';
  return `\\frac{${polynomialToLatex(numerator)}}{${polynomialToLatex(denominator)}}`;
}

function sharedMonomialFactors(left: Polynomial, right: Polynomial): string[] {
  const allKeys = [...left.keys(), ...right.keys()];
  if (allKeys.length === 0 || allKeys.some((key) => key === '')) return [];
  const countsByKey = allKeys.map((key) => {
    const counts = new Map<string, number>();
    for (const factor of key.split('*')) counts.set(factor, (counts.get(factor) ?? 0) + 1);
    return counts;
  });
  const shared = new Map(countsByKey[0]);
  for (const counts of countsByKey.slice(1)) {
    for (const [factor, count] of shared) {
      const nextCount = Math.min(count, counts.get(factor) ?? 0);
      if (nextCount === 0) shared.delete(factor);
      else shared.set(factor, nextCount);
    }
  }
  return [...shared.entries()].flatMap(([factor, count]) => Array.from({ length: count }, () => factor));
}

function removeMonomialFactors(value: Polynomial, factors: readonly string[]): Polynomial {
  if (factors.length === 0) return value;
  return new Map([...value.entries()].map(([key, coefficient]) => {
    const remaining = key.split('*');
    for (const factor of factors) {
      const index = remaining.indexOf(factor);
      if (index === -1) throw new Error('Attempted to cancel a missing symbolic monomial factor.');
      remaining.splice(index, 1);
    }
    return [keyFromFactors(remaining), coefficient];
  }));
}

function reduceSymbolicRatio(numerator: Polynomial, denominator: Polynomial) {
  const factors = sharedMonomialFactors(numerator, denominator);
  const reduced = factors.length === 0
    ? { numerator, denominator }
    : {
      numerator: removeMonomialFactors(numerator, factors),
      denominator: removeMonomialFactors(denominator, factors),
    };
  const denominatorConstant = reduced.denominator.size === 1
    ? reduced.denominator.get('')
    : undefined;
  if (!denominatorConstant || exactScalarIsZero(denominatorConstant)) return reduced;
  const normalizedNumerator = divideByConstant(reduced.numerator, denominatorConstant);
  return normalizedNumerator
    ? { numerator: normalizedNumerator, denominator: constantPolynomial(ONE) }
    : reduced;
}

function divisionMathJson(numerator: Polynomial, denominator: Polynomial): SerializableMathJson {
  if (numerator.size === 0) return 0;
  if (denominator.size === 1 && denominator.get('')?.numerator === 1 && denominator.get('')?.denominator === 1) {
    return polynomialToMathJson(numerator);
  }
  if (polynomialEquals(numerator, denominator)) return 1;
  if (polynomialEquals(numerator, negatePolynomial(denominator))) return ['Negate', 1];
  return ['Divide', polynomialToMathJson(numerator), polynomialToMathJson(denominator)];
}

function equalityMathJson(variable: string, value: SerializableMathJson): SerializableMathJson {
  return ['Equal', variable, value];
}

function assignmentTupleMathJson(
  values: readonly SerializableMathJson[],
): SerializableMathJson {
  return ['Tuple', ...values.map((value, index) => equalityMathJson(VARIABLES[index], value))] as SerializableMathJson;
}

function solveSymbolicSystem(parsed: ParsedSystem, size: 2 | 3): ResultProducerDraft {
  const title = `${size}x${size}`;
  const determinantValue = determinant(parsed.coefficients);
  if (!determinantValue) {
    return createEquationResultOutcome({
      kind: 'error', title,
      error: 'The symbolic determinant exceeded the bounded affine-system expansion limit.', warnings: [],
    });
  }
  const determinantLatex = polynomialToLatex(determinantValue);
  if (determinantValue.size === 0) {
    return createEquationResultOutcome({
      kind: 'error', title,
      error: 'The symbolic determinant is identically zero. This system needs parameter case-splitting, which is outside the bounded Equation system solver.',
      detailSections: [mixedDetailSection('Symbolic System Boundary', [[
        textPart('Determinant: '), mathPart('0'), textPart('. The system can change classification for different parameter values.'),
      ]])],
      warnings: [],
    });
  }
  const values: string[] = [];
  const numeratorLatex: string[] = [];
  const ratioParts: { numerator: Polynomial; denominator: Polynomial }[] = [];
  for (let column = 0; column < size; column += 1) {
    const replacement = parsed.coefficients.map((row, rowIndex) => row.map((entry, entryIndex) =>
      entryIndex === column ? parsed.constants[rowIndex] : entry));
    const numerator = determinant(replacement);
    if (!numerator) {
      return createEquationResultOutcome({ kind: 'error', title, error: 'A symbolic Cramer numerator exceeded the bounded expansion limit.', warnings: [] });
    }
    numeratorLatex.push(polynomialToLatex(numerator));
    const ratio = reduceSymbolicRatio(numerator, determinantValue);
    ratioParts.push(ratio);
    values.push(divisionLatex(ratio.numerator, ratio.denominator));
  }
  const assignments = values.map((value, index) => `${VARIABLES[index]}=${value}`);
  const valueMathJson = ratioParts.map(({ numerator, denominator }) => divisionMathJson(numerator, denominator));
  const determinantCondition = `${determinantLatex}\\ne0`;
  return systemOutcome({
    kind: 'success', title, exactLatex: assignments.join(',\\;'),
    exactSupplementLatex: [determinantCondition],
    answerRows: { label: 'Solution values', rows: assignments.map((latex) => ({ latex })) },
    systemReadback: {
      label: 'Symbolic solution', variablesLatex: [...VARIABLES.slice(0, size)],
      rows: [{ valuesLatex: values }], source: `equation-linear-${size}x${size}-symbolic`,
    },
    ...proseSolveSummary('Solved the bounded affine-parameter system under the displayed nonzero determinant condition.'),
    detailSections: [mixedDetailSection('Symbolic System Evidence', [
      [textPart('Determinant: '), mathPart(determinantLatex), textPart('.')],
      ...numeratorLatex.map((value, index) => [
        textPart(`${VARIABLES[index]} numerator: `), mathPart(value), textPart('.'),
      ]),
    ])],
    warnings: [], resultOrigin: 'rule-based-symbolic',
  }, assignmentTupleMathJson(valueMathJson), [
    ...solutionLeaves(assignments, valueMathJson, size),
    {
      canonicalLatex: determinantCondition,
      mathJson: ['NotEqual', polynomialToMathJson(determinantValue), 0],
      source: 'equation-guided-system.determinant-condition',
    },
    {
      canonicalLatex: determinantLatex,
      mathJson: polynomialToMathJson(determinantValue),
      source: 'equation-guided-system.determinant',
    },
    ...numeratorLatex.map((latex, index) => {
      const replacement = parsed.coefficients.map((row, rowIndex) => row.map((entry, entryIndex) =>
        entryIndex === index ? parsed.constants[rowIndex] : entry));
      const numerator = determinant(replacement);
      if (!numerator) throw new Error('Missing symbolic Cramer numerator after bounded expansion.');
      return {
        canonicalLatex: latex,
        mathJson: polynomialToMathJson(numerator),
        source: `equation-guided-system.cramer-numerator-${index}`,
      };
    }),
  ]);
}

export function solveGuidedLinearSystem(
  source: EquationSystemCell[][],
  size: 2 | 3,
): ResultProducerDraft {
  const parsed = parseSystem(source, size);
  if ('error' in parsed) {
    return createEquationResultOutcome({ kind: 'error', title: `${size}x${size}`, error: parsed.error, warnings: [] });
  }
  const numeric = exactSystem(parsed);
  return numeric ? solveNumericSystem(numeric, size) : solveSymbolicSystem(parsed, size);
}
