import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  addExactPolynomials,
  buildExactPolynomialFromCoefficients,
  divideExactScalars,
  exactPolynomialDegree,
  exactPolynomialIsZero,
  exactPolynomialToLatex,
  getExactPolynomialCoefficient,
  multiplyExactPolynomials,
  normalizeExactPolynomial,
  normalizeExactScalar,
  primitiveExactPolynomial,
  readExactScalarNode,
  scaleExactPolynomial,
  type ExactPolynomial,
  type ExactScalar,
} from './polynomial-core';
import { normalizeExplicitNamedVariablesInLatex } from './named-variable';
import type { StoredVariableValue, VariableSubstitutionSnapshot } from '../../types/calculator';

const ce = new ComputeEngine();

export const DEFAULT_BIVARIATE_RESULTANT_MAX_SYLVESTER_DIMENSION = 6;
export const DEFAULT_BIVARIATE_RESULTANT_MAX_ELIMINATED_DEGREE = 4;
export const DEFAULT_BIVARIATE_RESULTANT_MAX_RETAINED_DEGREE = 8;
export const DEFAULT_BIVARIATE_RESULTANT_MAX_TERMS = 24;
export const DEFAULT_BIVARIATE_RESULTANT_MAX_SCALAR_ABS = 1_000_000_000;

const ZERO: ExactScalar = { numerator: 0, denominator: 1 };
const ONE: ExactScalar = { numerator: 1, denominator: 1 };
const NEGATIVE_ONE: ExactScalar = { numerator: -1, denominator: 1 };

export type BivariateResultantStopReason =
  | 'parse-error'
  | 'unsupported-symbolic-parameter'
  | 'non-polynomial-input'
  | 'degree-limit'
  | 'term-limit'
  | 'scalar-growth-limit'
  | 'zero-polynomial'
  | 'constant-polynomial'
  | 'sylvester-dimension-limit'
  | 'projection-ambiguity'
  | 'stored-constant-unsafe';

export type BivariateResultantOptions = {
  storedVariables?: readonly StoredVariableValue[] | readonly VariableSubstitutionSnapshot[];
  maxSylvesterDimension?: number;
  maxEliminatedDegree?: number;
  maxRetainedDegree?: number;
  maxTerms?: number;
  maxScalarAbs?: number;
};

type RequiredBivariateResultantOptions = Required<Omit<BivariateResultantOptions, 'storedVariables'>>;

export type BivariateResultantStop = {
  kind: 'stop';
  reason: BivariateResultantStopReason;
  constantContext?: 'resultant';
  symbols?: string[];
  storedVariable?: string;
};

export type BivariatePolynomial = {
  retainedVariable: string;
  eliminatedVariable: string;
  terms: Map<number, ExactPolynomial>;
};

export type BivariateResultantSuccess = {
  kind: 'success';
  retainedVariable: string;
  eliminatedVariable: string;
  leftDegree: number;
  rightDegree: number;
  sylvesterDimension: number;
  projectedPolynomial: ExactPolynomial;
  projectedLatex: string;
  substitutedLeftLatex: string;
  substitutedRightLatex: string;
  substitutions: VariableSubstitutionSnapshot[];
  protectedSubstitutions: VariableSubstitutionSnapshot[];
};

export type BivariateResultantResult = BivariateResultantSuccess | BivariateResultantStop;

type BivariateParseResult =
  | { kind: 'success'; polynomial: BivariatePolynomial }
  | BivariateResultantStop;

type PolynomialResult =
  | { kind: 'success'; polynomial: ExactPolynomial }
  | BivariateResultantStop;

type SubstitutionResult =
  | {
      kind: 'success';
      node: unknown;
      substitutions: VariableSubstitutionSnapshot[];
      protectedSubstitutions: VariableSubstitutionSnapshot[];
    }
  | BivariateResultantStop;

function optionsWithDefaults(options: BivariateResultantOptions = {}): RequiredBivariateResultantOptions {
  return {
    maxSylvesterDimension: options.maxSylvesterDimension ?? DEFAULT_BIVARIATE_RESULTANT_MAX_SYLVESTER_DIMENSION,
    maxEliminatedDegree: options.maxEliminatedDegree ?? DEFAULT_BIVARIATE_RESULTANT_MAX_ELIMINATED_DEGREE,
    maxRetainedDegree: options.maxRetainedDegree ?? DEFAULT_BIVARIATE_RESULTANT_MAX_RETAINED_DEGREE,
    maxTerms: options.maxTerms ?? DEFAULT_BIVARIATE_RESULTANT_MAX_TERMS,
    maxScalarAbs: options.maxScalarAbs ?? DEFAULT_BIVARIATE_RESULTANT_MAX_SCALAR_ABS,
  };
}

function stop(reason: BivariateResultantStopReason, extras: Omit<BivariateResultantStop, 'kind' | 'reason'> = {}): BivariateResultantStop {
  return { kind: 'stop', reason, ...extras };
}

function isNodeArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function isSafeInteger(value: number) {
  return Number.isFinite(value) && Number.isInteger(value) && Number.isSafeInteger(value);
}

function scalarWithinCaps(value: ExactScalar, options: RequiredBivariateResultantOptions) {
  const normalized = normalizeExactScalar(value);
  return isSafeInteger(normalized.numerator)
    && isSafeInteger(normalized.denominator)
    && normalized.denominator > 0
    && Math.abs(normalized.numerator) <= options.maxScalarAbs
    && Math.abs(normalized.denominator) <= options.maxScalarAbs;
}

function validatePolynomial(
  polynomial: ExactPolynomial,
  options: RequiredBivariateResultantOptions,
): PolynomialResult {
  const normalized = normalizeExactPolynomial(polynomial);
  if (exactPolynomialDegree(normalized) > options.maxRetainedDegree) {
    return stop('degree-limit');
  }
  if (normalized.terms.size > options.maxTerms) {
    return stop('term-limit');
  }
  for (const coefficient of normalized.terms.values()) {
    if (!scalarWithinCaps(coefficient, options)) {
      return stop('scalar-growth-limit');
    }
  }
  return { kind: 'success', polynomial: normalized };
}

function zeroPolynomial(variable: string) {
  return buildExactPolynomialFromCoefficients(variable, [ZERO]);
}

function onePolynomial(variable: string) {
  return buildExactPolynomialFromCoefficients(variable, [ONE]);
}

function scalarPolynomial(variable: string, scalar: ExactScalar) {
  return buildExactPolynomialFromCoefficients(variable, [normalizeExactScalar(scalar)]);
}

function degreePolynomial(variable: string, degree: number, coefficient: ExactScalar = ONE) {
  return buildExactPolynomialFromCoefficients(
    variable,
    [
      normalizeExactScalar(coefficient),
      ...Array.from({ length: degree }, () => ZERO),
    ],
  );
}

function validateBivariatePolynomial(
  polynomial: BivariatePolynomial,
  options: RequiredBivariateResultantOptions,
): BivariateParseResult {
  let totalTerms = 0;
  const terms = new Map<number, ExactPolynomial>();
  for (const [degree, coefficient] of polynomial.terms.entries()) {
    if (degree > options.maxEliminatedDegree) {
      return stop('degree-limit');
    }
    const validated = validatePolynomial(coefficient, options);
    if (validated.kind === 'stop') {
      return validated;
    }
    if (!exactPolynomialIsZero(validated.polynomial)) {
      totalTerms += validated.polynomial.terms.size;
      terms.set(degree, validated.polynomial);
    }
  }
  if (totalTerms > options.maxTerms) {
    return stop('term-limit');
  }
  return {
    kind: 'success',
    polynomial: {
      retainedVariable: polynomial.retainedVariable,
      eliminatedVariable: polynomial.eliminatedVariable,
      terms,
    },
  };
}

function constantBivariate(retainedVariable: string, eliminatedVariable: string, scalar: ExactScalar): BivariatePolynomial {
  return {
    retainedVariable,
    eliminatedVariable,
    terms: new Map([[0, scalarPolynomial(retainedVariable, scalar)]]),
  };
}

function retainedBivariate(retainedVariable: string, eliminatedVariable: string): BivariatePolynomial {
  return {
    retainedVariable,
    eliminatedVariable,
    terms: new Map([[0, degreePolynomial(retainedVariable, 1)]]),
  };
}

function eliminatedBivariate(retainedVariable: string, eliminatedVariable: string): BivariatePolynomial {
  return {
    retainedVariable,
    eliminatedVariable,
    terms: new Map([[1, onePolynomial(retainedVariable)]]),
  };
}

function addBivariatePolynomials(
  left: BivariatePolynomial,
  right: BivariatePolynomial,
  sign: 1 | -1,
  options: RequiredBivariateResultantOptions,
): BivariateParseResult {
  const terms = new Map<number, ExactPolynomial>(left.terms);
  for (const [degree, rightCoefficient] of right.terms.entries()) {
    const current = terms.get(degree) ?? zeroPolynomial(left.retainedVariable);
    const next = addExactPolynomials(current, rightCoefficient, sign);
    if (exactPolynomialIsZero(next)) {
      terms.delete(degree);
    } else {
      terms.set(degree, next);
    }
  }
  return validateBivariatePolynomial({
    retainedVariable: left.retainedVariable,
    eliminatedVariable: left.eliminatedVariable,
    terms,
  }, options);
}

function multiplyBivariatePolynomials(
  left: BivariatePolynomial,
  right: BivariatePolynomial,
  options: RequiredBivariateResultantOptions,
): BivariateParseResult {
  const terms = new Map<number, ExactPolynomial>();
  for (const [leftDegree, leftCoefficient] of left.terms.entries()) {
    for (const [rightDegree, rightCoefficient] of right.terms.entries()) {
      const degree = leftDegree + rightDegree;
      if (degree > options.maxEliminatedDegree) {
        return stop('degree-limit');
      }
      const product = multiplyExactPolynomials(leftCoefficient, rightCoefficient, options.maxRetainedDegree);
      if (!product) {
        return stop('degree-limit');
      }
      const current = terms.get(degree) ?? zeroPolynomial(left.retainedVariable);
      const next = addExactPolynomials(current, product);
      if (exactPolynomialIsZero(next)) {
        terms.delete(degree);
      } else {
        terms.set(degree, next);
      }
    }
  }
  return validateBivariatePolynomial({
    retainedVariable: left.retainedVariable,
    eliminatedVariable: left.eliminatedVariable,
    terms,
  }, options);
}

function scaleBivariatePolynomial(
  polynomial: BivariatePolynomial,
  scalar: ExactScalar,
  options: RequiredBivariateResultantOptions,
): BivariateParseResult {
  const terms = new Map<number, ExactPolynomial>();
  for (const [degree, coefficient] of polynomial.terms.entries()) {
    const next = scaleExactPolynomial(coefficient, scalar);
    if (!exactPolynomialIsZero(next)) {
      terms.set(degree, next);
    }
  }
  return validateBivariatePolynomial({
    retainedVariable: polynomial.retainedVariable,
    eliminatedVariable: polynomial.eliminatedVariable,
    terms,
  }, options);
}

function powerBivariatePolynomial(
  polynomial: BivariatePolynomial,
  exponent: number,
  options: RequiredBivariateResultantOptions,
): BivariateParseResult {
  if (exponent < 0 || exponent > Math.max(options.maxEliminatedDegree, options.maxRetainedDegree)) {
    return stop('degree-limit');
  }
  let current = constantBivariate(polynomial.retainedVariable, polynomial.eliminatedVariable, ONE);
  for (let index = 0; index < exponent; index += 1) {
    const next = multiplyBivariatePolynomials(current, polynomial, options);
    if (next.kind === 'stop') {
      return next;
    }
    current = next.polynomial;
  }
  return validateBivariatePolynomial(current, options);
}

function parseBivariateNode(
  node: unknown,
  retainedVariable: string,
  eliminatedVariable: string,
  options: RequiredBivariateResultantOptions,
): BivariateParseResult {
  const scalar = readExactScalarNode(node);
  if (scalar) {
    return validateBivariatePolynomial(constantBivariate(retainedVariable, eliminatedVariable, scalar), options);
  }

  if (typeof node === 'string') {
    if (node === retainedVariable) {
      return validateBivariatePolynomial(retainedBivariate(retainedVariable, eliminatedVariable), options);
    }
    if (node === eliminatedVariable) {
      return validateBivariatePolynomial(eliminatedBivariate(retainedVariable, eliminatedVariable), options);
    }
    return stop('unsupported-symbolic-parameter', { symbols: [node] });
  }

  if (!isNodeArray(node) || node.length === 0 || typeof node[0] !== 'string') {
    return stop('non-polynomial-input');
  }

  const operator = node[0];
  if (operator === 'Negate' && node.length === 2) {
    const child = parseBivariateNode(node[1], retainedVariable, eliminatedVariable, options);
    return child.kind === 'stop' ? child : scaleBivariatePolynomial(child.polynomial, NEGATIVE_ONE, options);
  }

  if (operator === 'Add' || operator === 'Subtract') {
    const [first, ...rest] = node.slice(1);
    if (first === undefined) {
      return stop('non-polynomial-input');
    }
    const initial = parseBivariateNode(first, retainedVariable, eliminatedVariable, options);
    if (initial.kind === 'stop') {
      return initial;
    }
    return rest.reduce<BivariateParseResult>((current, child) => {
      if (current.kind === 'stop') {
        return current;
      }
      const parsedChild = parseBivariateNode(child, retainedVariable, eliminatedVariable, options);
      if (parsedChild.kind === 'stop') {
        return parsedChild;
      }
      return addBivariatePolynomials(
        current.polynomial,
        parsedChild.polynomial,
        operator === 'Add' ? 1 : -1,
        options,
      );
    }, initial);
  }

  if (operator === 'Multiply') {
    const factors = node.slice(1);
    if (factors.length === 0) {
      return stop('non-polynomial-input');
    }
    const initial = validateBivariatePolynomial(
      constantBivariate(retainedVariable, eliminatedVariable, ONE),
      options,
    );
    return factors.reduce<BivariateParseResult>((current, factor) => {
      if (current.kind === 'stop') {
        return current;
      }
      const parsedFactor = parseBivariateNode(factor, retainedVariable, eliminatedVariable, options);
      if (parsedFactor.kind === 'stop') {
        return parsedFactor;
      }
      return multiplyBivariatePolynomials(current.polynomial, parsedFactor.polynomial, options);
    }, initial);
  }

  if (operator === 'Divide' && node.length === 3) {
    const numerator = parseBivariateNode(node[1], retainedVariable, eliminatedVariable, options);
    if (numerator.kind === 'stop') {
      return numerator;
    }
    const denominator = readExactScalarNode(node[2]);
    if (!denominator) {
      return stop('non-polynomial-input');
    }
    const reciprocal = divideExactScalars(ONE, denominator);
    return reciprocal
      ? scaleBivariatePolynomial(numerator.polynomial, reciprocal, options)
      : stop('non-polynomial-input');
  }

  if (operator === 'Power' && node.length === 3) {
    const exponent = readExactScalarNode(node[2]);
    if (!exponent || exponent.denominator !== 1) {
      return stop('non-polynomial-input');
    }
    const base = parseBivariateNode(node[1], retainedVariable, eliminatedVariable, options);
    return base.kind === 'stop'
      ? base
      : powerBivariatePolynomial(base.polynomial, exponent.numerator, options);
  }

  return stop('non-polynomial-input');
}

function bivariateDegree(polynomial: BivariatePolynomial) {
  const degrees = [...polynomial.terms.keys()];
  return degrees.length === 0 ? 0 : Math.max(...degrees);
}

function bivariateCoefficient(polynomial: BivariatePolynomial, degree: number) {
  return polynomial.terms.get(degree) ?? zeroPolynomial(polynomial.retainedVariable);
}

function bivariateCoefficientArray(polynomial: BivariatePolynomial) {
  const degree = bivariateDegree(polynomial);
  return Array.from({ length: degree + 1 }, (_, index) =>
    bivariateCoefficient(polynomial, degree - index));
}

function shiftedCoefficientRow(
  coefficients: ExactPolynomial[],
  shift: number,
  dimension: number,
  variable: string,
) {
  return Array.from({ length: dimension }, (_, column) =>
    coefficients[column - shift] ?? zeroPolynomial(variable));
}

function buildBivariateSylvesterMatrix(
  left: BivariatePolynomial,
  right: BivariatePolynomial,
  options: RequiredBivariateResultantOptions,
): { kind: 'success'; matrix: ExactPolynomial[][]; leftDegree: number; rightDegree: number } | BivariateResultantStop {
  if (left.retainedVariable !== right.retainedVariable || left.eliminatedVariable !== right.eliminatedVariable) {
    return stop('projection-ambiguity');
  }
  if (left.terms.size === 0 || right.terms.size === 0) {
    return stop('zero-polynomial');
  }
  const leftDegree = bivariateDegree(left);
  const rightDegree = bivariateDegree(right);
  if (leftDegree === 0 || rightDegree === 0) {
    return stop('constant-polynomial');
  }
  const dimension = leftDegree + rightDegree;
  if (dimension > options.maxSylvesterDimension) {
    return stop('sylvester-dimension-limit');
  }
  const leftCoefficients = bivariateCoefficientArray(left);
  const rightCoefficients = bivariateCoefficientArray(right);
  return {
    kind: 'success',
    leftDegree,
    rightDegree,
    matrix: [
      ...Array.from({ length: rightDegree }, (_, index) =>
        shiftedCoefficientRow(leftCoefficients, index, dimension, left.retainedVariable)),
      ...Array.from({ length: leftDegree }, (_, index) =>
        shiftedCoefficientRow(rightCoefficients, index, dimension, left.retainedVariable)),
    ],
  };
}

function multiplyPolynomialChecked(
  left: ExactPolynomial,
  right: ExactPolynomial,
  options: RequiredBivariateResultantOptions,
): PolynomialResult {
  const product = multiplyExactPolynomials(left, right, options.maxRetainedDegree);
  return product ? validatePolynomial(product, options) : stop('degree-limit');
}

function addPolynomialChecked(
  left: ExactPolynomial,
  right: ExactPolynomial,
  sign: 1 | -1,
  options: RequiredBivariateResultantOptions,
): PolynomialResult {
  return validatePolynomial(addExactPolynomials(left, right, sign), options);
}

function determinantPolynomialMatrix(
  matrix: ExactPolynomial[][],
  variable: string,
  options: RequiredBivariateResultantOptions,
): PolynomialResult {
  if (matrix.length === 0) {
    return { kind: 'success', polynomial: onePolynomial(variable) };
  }
  if (matrix.length === 1) {
    return validatePolynomial(matrix[0][0] ?? zeroPolynomial(variable), options);
  }

  let determinant = zeroPolynomial(variable);
  for (let column = 0; column < matrix[0].length; column += 1) {
    const coefficient = matrix[0][column] ?? zeroPolynomial(variable);
    if (exactPolynomialIsZero(coefficient)) {
      continue;
    }
    const minor = matrix.slice(1).map((row) => row.filter((_, index) => index !== column));
    const minorDeterminant = determinantPolynomialMatrix(minor, variable, options);
    if (minorDeterminant.kind === 'stop') {
      return minorDeterminant;
    }
    const product = multiplyPolynomialChecked(coefficient, minorDeterminant.polynomial, options);
    if (product.kind === 'stop') {
      return product;
    }
    const added = addPolynomialChecked(determinant, product.polynomial, column % 2 === 0 ? 1 : -1, options);
    if (added.kind === 'stop') {
      return added;
    }
    determinant = added.polynomial;
  }
  return validatePolynomial(determinant, options);
}

function scalarFromDecimalString(raw: string): ExactScalar | null {
  const compact = raw.trim();
  const match = compact.match(/^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$/i);
  if (!match) {
    return null;
  }
  const sign = match[1] === '-' ? -1 : 1;
  const integerPart = match[2] ?? '';
  const fractionPart = match[3] ?? match[4] ?? '';
  const exponent = Number(match[5] ?? '0');
  const digitsRaw = `${integerPart}${fractionPart}`.replace(/^0+(?=\d)/, '') || '0';
  const scale = fractionPart.length - exponent;
  const digits = Number(digitsRaw);
  if (!isSafeInteger(digits)) {
    return null;
  }
  if (scale >= 0) {
    const denominator = 10 ** scale;
    if (!isSafeInteger(denominator)) {
      return null;
    }
    return normalizeExactScalar({ numerator: sign * digits, denominator });
  }
  const factor = 10 ** -scale;
  if (!isSafeInteger(factor) || !isSafeInteger(digits * factor)) {
    return null;
  }
  return normalizeExactScalar({ numerator: sign * digits * factor, denominator: 1 });
}

function scalarFromStoredValue(entry: StoredVariableValue | VariableSubstitutionSnapshot): ExactScalar | null {
  const compact = entry.valueLatex.trim().replace(/\s+/g, '');
  const latexFraction = compact.match(/^\\frac\{([+-]?\d+)\}\{([+-]?\d+)\}$/);
  if (latexFraction) {
    const numerator = Number(latexFraction[1]);
    const denominator = Number(latexFraction[2]);
    return isSafeInteger(numerator) && isSafeInteger(denominator) && denominator !== 0
      ? normalizeExactScalar({ numerator, denominator })
      : null;
  }
  const slashFraction = compact.match(/^([+-]?\d+)\/([+-]?\d+)$/);
  if (slashFraction) {
    const numerator = Number(slashFraction[1]);
    const denominator = Number(slashFraction[2]);
    return isSafeInteger(numerator) && isSafeInteger(denominator) && denominator !== 0
      ? normalizeExactScalar({ numerator, denominator })
      : null;
  }
  return scalarFromDecimalString(compact) ?? scalarFromDecimalString(`${entry.numericValue}`);
}

function exactScalarNode(value: ExactScalar): unknown {
  const normalized = normalizeExactScalar(value);
  return normalized.denominator === 1
    ? normalized.numerator
    : ['Rational', normalized.numerator, normalized.denominator];
}

function substituteStoredConstantsInNode(
  node: unknown,
  replacements: Map<string, ExactScalar>,
  protectedNames: ReadonlySet<string>,
  usedNames: Set<string>,
  protectedUsedNames: Set<string>,
): unknown {
  if (typeof node === 'string') {
    if (protectedNames.has(node)) {
      protectedUsedNames.add(node);
      return node;
    }
    const replacement = replacements.get(node);
    if (replacement) {
      usedNames.add(node);
      return exactScalarNode(replacement);
    }
    return node;
  }
  if (Array.isArray(node)) {
    const [operator, ...operands] = node;
    if (operator === 'Function') {
      return [
        operator,
        operands.length > 0
          ? substituteStoredConstantsInNode(operands[0], replacements, protectedNames, usedNames, protectedUsedNames)
          : operands[0],
        ...operands.slice(1),
      ];
    }
    return [
      operator,
      ...operands.map((operand) =>
        substituteStoredConstantsInNode(operand, replacements, protectedNames, usedNames, protectedUsedNames)),
    ];
  }
  if (node && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node).map(([key, value]) => [
        key,
        substituteStoredConstantsInNode(value, replacements, protectedNames, usedNames, protectedUsedNames),
      ]),
    );
  }
  return node;
}

function parseAndSubstituteExpression(
  latex: string,
  retainedVariable: string,
  eliminatedVariable: string,
  storedVariables: BivariateResultantOptions['storedVariables'],
  options: RequiredBivariateResultantOptions,
): SubstitutionResult {
  let parsed: unknown;
  try {
    parsed = ce.parse(normalizeExplicitNamedVariablesInLatex(latex).latex).json;
  } catch {
    return stop('parse-error');
  }

  const protectedNames = new Set([retainedVariable, eliminatedVariable]);
  const replacements = new Map<string, ExactScalar>();
  const storedByName = new Map<string, StoredVariableValue | VariableSubstitutionSnapshot>();
  for (const entry of storedVariables ?? []) {
    if (!Number.isFinite(entry.numericValue) || protectedNames.has(entry.name)) {
      storedByName.set(entry.name, entry);
      continue;
    }
    const scalar = scalarFromStoredValue(entry);
    if (!scalar || !scalarWithinCaps(scalar, options)) {
      return stop('stored-constant-unsafe', { storedVariable: entry.name });
    }
    replacements.set(entry.name, scalar);
    storedByName.set(entry.name, entry);
  }

  const usedNames = new Set<string>();
  const protectedUsedNames = new Set<string>();
  const node = substituteStoredConstantsInNode(parsed, replacements, protectedNames, usedNames, protectedUsedNames);
  return {
    kind: 'success',
    node,
    substitutions: [...usedNames].sort().flatMap((name) => {
      const entry = storedByName.get(name);
      return entry ? [{ name: entry.name, valueLatex: entry.valueLatex, numericValue: entry.numericValue }] : [];
    }),
    protectedSubstitutions: [...protectedUsedNames].sort().flatMap((name) => {
      const entry = storedByName.get(name);
      return entry ? [{ name: entry.name, valueLatex: entry.valueLatex, numericValue: entry.numericValue }] : [];
    }),
  };
}

function combineSubstitutions(
  left: VariableSubstitutionSnapshot[],
  right: VariableSubstitutionSnapshot[],
) {
  const byName = new Map<string, VariableSubstitutionSnapshot>();
  for (const entry of [...left, ...right]) {
    byName.set(entry.name, entry);
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeProjectedPolynomial(polynomial: ExactPolynomial): PolynomialResult {
  const primitive = primitiveExactPolynomial(polynomial);
  if (!primitive || exactPolynomialIsZero(primitive.polynomial)) {
    return stop('projection-ambiguity');
  }
  if (exactPolynomialDegree(primitive.polynomial) === 0) {
    return stop('constant-polynomial', { constantContext: 'resultant' });
  }
  return { kind: 'success', polynomial: primitive.polynomial };
}

export function projectBivariateResultant(
  leftLatex: string,
  rightLatex: string,
  retainedVariable: string,
  eliminatedVariable: string,
  options: BivariateResultantOptions = {},
): BivariateResultantResult {
  if (retainedVariable === eliminatedVariable) {
    return stop('projection-ambiguity');
  }
  const resolvedOptions = optionsWithDefaults(options);
  const leftSubstitution = parseAndSubstituteExpression(
    leftLatex,
    retainedVariable,
    eliminatedVariable,
    options.storedVariables,
    resolvedOptions,
  );
  if (leftSubstitution.kind === 'stop') {
    return leftSubstitution;
  }
  const rightSubstitution = parseAndSubstituteExpression(
    rightLatex,
    retainedVariable,
    eliminatedVariable,
    options.storedVariables,
    resolvedOptions,
  );
  if (rightSubstitution.kind === 'stop') {
    return rightSubstitution;
  }

  const left = parseBivariateNode(leftSubstitution.node, retainedVariable, eliminatedVariable, resolvedOptions);
  if (left.kind === 'stop') {
    return left;
  }
  const right = parseBivariateNode(rightSubstitution.node, retainedVariable, eliminatedVariable, resolvedOptions);
  if (right.kind === 'stop') {
    return right;
  }

  const sylvester = buildBivariateSylvesterMatrix(left.polynomial, right.polynomial, resolvedOptions);
  if (sylvester.kind === 'stop') {
    return sylvester;
  }

  const determinant = determinantPolynomialMatrix(sylvester.matrix, retainedVariable, resolvedOptions);
  if (determinant.kind === 'stop') {
    return determinant;
  }
  const projected = normalizeProjectedPolynomial(determinant.polynomial);
  if (projected.kind === 'stop') {
    return projected;
  }
  const validated = validatePolynomial(projected.polynomial, resolvedOptions);
  if (validated.kind === 'stop') {
    return validated;
  }

  const substitutedLeft = ce.box(leftSubstitution.node as Parameters<typeof ce.box>[0]).latex;
  const substitutedRight = ce.box(rightSubstitution.node as Parameters<typeof ce.box>[0]).latex;
  return {
    kind: 'success',
    retainedVariable,
    eliminatedVariable,
    leftDegree: sylvester.leftDegree,
    rightDegree: sylvester.rightDegree,
    sylvesterDimension: sylvester.leftDegree + sylvester.rightDegree,
    projectedPolynomial: validated.polynomial,
    projectedLatex: exactPolynomialToLatex(validated.polynomial),
    substitutedLeftLatex: substitutedLeft,
    substitutedRightLatex: substitutedRight,
    substitutions: combineSubstitutions(leftSubstitution.substitutions, rightSubstitution.substitutions),
    protectedSubstitutions: combineSubstitutions(
      leftSubstitution.protectedSubstitutions,
      rightSubstitution.protectedSubstitutions,
    ),
  };
}

export function getProjectedPolynomialCoefficient(result: BivariateResultantSuccess, degree: number) {
  return getExactPolynomialCoefficient(result.projectedPolynomial, degree);
}
