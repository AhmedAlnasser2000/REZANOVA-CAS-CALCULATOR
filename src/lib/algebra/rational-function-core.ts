import { ComputeEngine } from '@cortex-js/compute-engine';
import type { SolveDomainConstraint } from '../../types/calculator';
import type { AssumptionFact } from './assumptions-core';
import { assumptionFactsFromDomainConstraints } from './assumptions-core';
import {
  addExactPolynomials,
  buildExactScalarNode,
  buildExactPolynomialFromCoefficients,
  divideExactScalars,
  divideExactPolynomials,
  exactPolynomialCoefficientArray,
  exactPolynomialDegree,
  exactPolynomialGcd,
  exactPolynomialIsZero,
  exactPolynomialLeadingCoefficient,
  exactPolynomialToLatex,
  exactPolynomialToNode,
  exactScalarIsZero,
  getExactPolynomialCoefficient,
  makeMonicExactPolynomial,
  multiplyExactPolynomials,
  multiplyExactScalars,
  negateExactScalar,
  normalizeExactPolynomial,
  normalizeExactScalar,
  parseExactPolynomial,
  primitiveExactPolynomial,
  quadraticDiscriminant,
  readExactScalarNode,
  scaleExactPolynomial,
  subtractExactScalars,
  type ExactPolynomial,
  type ExactScalar,
} from './polynomial-core';
import { solveExactLinearSystem } from '../linear-algebra/exact-matrix-core';
import { normalizeAst } from '../symbolic-engine/normalize';

const ce = new ComputeEngine();
const NUMERIC_CONSTANT_SYMBOLS = new Set(['Pi', 'ExponentialE']);

export type RationalFunctionStopReason =
  | 'unsupported-expression'
  | 'multivariable'
  | 'degree-limit'
  | 'zero-denominator'
  | 'variable-mismatch'
  | 'not-proper'
  | 'denominator-not-distinct-linear'
  | 'repeated-linear-factor'
  | 'unsupported-factorization'
  | 'irreducible-quadratic-factor'
  | 'algebraic-root-required'
  | 'factorization-degree-limit'
  | 'unsupported-factor-multiplicity';

export type ExactRationalFunction = {
  variable: string;
  numerator: ExactPolynomial;
  denominator: ExactPolynomial;
};

export type ExactRationalFunctionSuccess = {
  kind: 'success';
  rational: ExactRationalFunction;
  normalizedNode: unknown;
  normalizedLatex: string;
  numeratorLatex: string;
  denominatorLatex?: string;
  exclusionConstraints: SolveDomainConstraint[];
  assumptionFacts?: AssumptionFact[];
};

export type ExactRationalFunctionStop = {
  kind: 'stop';
  reason: RationalFunctionStopReason;
};

export type ExactRationalFunctionResult =
  | ExactRationalFunctionSuccess
  | ExactRationalFunctionStop;

export type PartialFractionTerm = {
  coefficient: ExactScalar;
  root: ExactScalar;
  denominator: ExactPolynomial;
  node: unknown;
  latex: string;
};

export type PartialFractionReadinessResult =
  | {
    kind: 'success';
    variable: string;
    terms: PartialFractionTerm[];
    reconstructedNode: unknown;
    reconstructedLatex: string;
  }
  | {
    kind: 'stop';
    reason: RationalFunctionStopReason;
  };

export type LinearRationalFactor = {
  kind: 'linear';
  root: ExactScalar;
  multiplicity: number;
  polynomial: ExactPolynomial;
  latex: string;
};

export type IrreducibleQuadraticFactor = {
  kind: 'irreducible-quadratic';
  multiplicity: 1;
  polynomial: ExactPolynomial;
  latex: string;
  linearCoefficient: ExactScalar;
  constantCoefficient: ExactScalar;
  discriminant: ExactScalar;
};

export type RationalDenominatorFactor =
  | LinearRationalFactor
  | IrreducibleQuadraticFactor;

export type RationalFactorizationResult =
  | {
    kind: 'success';
    variable: string;
    denominator: ExactPolynomial;
    factors: RationalDenominatorFactor[];
    squareFree: boolean;
  }
  | {
    kind: 'stop';
    reason: RationalFunctionStopReason;
  };

export type LinearPowerPartialFractionTerm = {
  kind: 'linear-power';
  coefficient: ExactScalar;
  root: ExactScalar;
  power: number;
  denominator: ExactPolynomial;
  node: unknown;
  latex: string;
};

export type QuadraticPartialFractionTerm = {
  kind: 'irreducible-quadratic';
  linearCoefficient: ExactScalar;
  constantCoefficient: ExactScalar;
  derivativeCoefficient: ExactScalar;
  residualConstant: ExactScalar;
  factor: IrreducibleQuadraticFactor;
  numerator: ExactPolynomial;
  node: unknown;
  latex: string;
};

export type RationalPartialFractionReadinessTerm =
  | LinearPowerPartialFractionTerm
  | QuadraticPartialFractionTerm;

export type RationalPartialFractionReadinessResult =
  | {
    kind: 'success';
    variable: string;
    factorization: Extract<RationalFactorizationResult, { kind: 'success' }>;
    terms: RationalPartialFractionReadinessTerm[];
    reconstructedNode: unknown;
    reconstructedLatex: string;
  }
  | {
    kind: 'stop';
    reason: RationalFunctionStopReason;
  };

type ParseOptions = {
  maxDegree: number;
};

function isNodeArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function isExactInteger(value: number) {
  return Number.isFinite(value) && Number.isInteger(value);
}

function collectVariables(node: unknown, variables = new Set<string>()) {
  if (typeof node === 'string') {
    if (!NUMERIC_CONSTANT_SYMBOLS.has(node)) {
      variables.add(node);
    }
    return variables;
  }

  if (!isNodeArray(node)) {
    return variables;
  }

  for (let index = 1; index < node.length; index += 1) {
    collectVariables(node[index], variables);
  }
  return variables;
}

function detectSingleVariable(node: unknown) {
  const variables = collectVariables(node);
  if (variables.size > 1) {
    return null;
  }
  return [...variables][0] ?? 'x';
}

function zeroPolynomial(variable: string) {
  return buildExactPolynomialFromCoefficients(variable, [{ numerator: 0, denominator: 1 }]);
}

function onePolynomial(variable: string) {
  return buildExactPolynomialFromCoefficients(variable, [{ numerator: 1, denominator: 1 }]);
}

function isOnePolynomial(polynomial: ExactPolynomial) {
  const normalized = normalizeExactPolynomial(polynomial);
  return exactPolynomialDegree(normalized) === 0
    && getExactPolynomialCoefficient(normalized, 0).numerator === 1
    && getExactPolynomialCoefficient(normalized, 0).denominator === 1;
}

function multiplyPolynomials(
  left: ExactPolynomial,
  right: ExactPolynomial,
  options: ParseOptions,
) {
  return multiplyExactPolynomials(left, right, options.maxDegree);
}

function rationalFromPolynomial(polynomial: ExactPolynomial): ExactRationalFunction {
  return {
    variable: polynomial.variable,
    numerator: normalizeExactPolynomial(polynomial),
    denominator: onePolynomial(polynomial.variable),
  };
}

function multiplyRationalFunctions(
  left: ExactRationalFunction,
  right: ExactRationalFunction,
  options: ParseOptions,
): ExactRationalFunctionResult {
  if (left.variable !== right.variable) {
    return { kind: 'stop', reason: 'variable-mismatch' };
  }

  const numerator = multiplyPolynomials(left.numerator, right.numerator, options);
  const denominator = multiplyPolynomials(left.denominator, right.denominator, options);
  if (!numerator || !denominator) {
    return { kind: 'stop', reason: 'degree-limit' };
  }
  if (exactPolynomialIsZero(denominator)) {
    return { kind: 'stop', reason: 'zero-denominator' };
  }

  return buildNormalizedRationalFunction({
    variable: left.variable,
    numerator,
    denominator,
  });
}

function addRationalFunctions(
  left: ExactRationalFunction,
  right: ExactRationalFunction,
  sign: 1 | -1,
  options: ParseOptions,
): ExactRationalFunctionResult {
  if (left.variable !== right.variable) {
    return { kind: 'stop', reason: 'variable-mismatch' };
  }

  const leftNumerator = multiplyPolynomials(left.numerator, right.denominator, options);
  const rightNumerator = multiplyPolynomials(right.numerator, left.denominator, options);
  const denominator = multiplyPolynomials(left.denominator, right.denominator, options);
  if (!leftNumerator || !rightNumerator || !denominator) {
    return { kind: 'stop', reason: 'degree-limit' };
  }

  return buildNormalizedRationalFunction({
    variable: left.variable,
    numerator: addExactPolynomials(leftNumerator, rightNumerator, sign),
    denominator,
  });
}

function powerRationalFunction(
  rational: ExactRationalFunction,
  exponent: number,
  options: ParseOptions,
): ExactRationalFunctionResult {
  let result: ExactRationalFunction = {
    variable: rational.variable,
    numerator: onePolynomial(rational.variable),
    denominator: onePolynomial(rational.variable),
  };

  const base = exponent >= 0
    ? rational
    : {
      variable: rational.variable,
      numerator: rational.denominator,
      denominator: rational.numerator,
    };

  if (exactPolynomialIsZero(base.denominator)) {
    return { kind: 'stop', reason: 'zero-denominator' };
  }

  for (let index = 0; index < Math.abs(exponent); index += 1) {
    const multiplied = multiplyRationalFunctions(result, base, options);
    if (multiplied.kind === 'stop') {
      return multiplied;
    }
    result = multiplied.rational;
  }

  return buildNormalizedRationalFunction(result);
}

function parseRationalFunction(
  node: unknown,
  variable: string,
  options: ParseOptions,
): ExactRationalFunctionResult {
  const polynomial = parseExactPolynomial(node, variable, options.maxDegree);
  if (polynomial) {
    return buildNormalizedRationalFunction(rationalFromPolynomial(polynomial));
  }

  if (!isNodeArray(node) || node.length === 0 || typeof node[0] !== 'string') {
    return { kind: 'stop', reason: 'unsupported-expression' };
  }

  const [operator, ...children] = node;

  if (operator === 'Negate' && children.length === 1) {
    const child = parseRationalFunction(children[0], variable, options);
    if (child.kind === 'stop') {
      return child;
    }
    return buildNormalizedRationalFunction({
      ...child.rational,
      numerator: scaleExactPolynomial(child.rational.numerator, { numerator: -1, denominator: 1 }),
    });
  }

  if ((operator === 'Add' || operator === 'Subtract') && children.length > 0) {
    const [first, ...rest] = children;
    let current = parseRationalFunction(first, variable, options);
    if (current.kind === 'stop') {
      return current;
    }

    for (const childNode of rest) {
      const child = parseRationalFunction(childNode, variable, options);
      if (child.kind === 'stop') {
        return child;
      }
      current = addRationalFunctions(
        current.rational,
        child.rational,
        operator === 'Add' ? 1 : -1,
        options,
      );
      if (current.kind === 'stop') {
        return current;
      }
    }
    return current;
  }

  if (operator === 'Multiply' && children.length > 0) {
    let current: ExactRationalFunctionResult = {
      kind: 'success',
      rational: {
        variable,
        numerator: onePolynomial(variable),
        denominator: onePolynomial(variable),
      },
      normalizedNode: 1,
      normalizedLatex: '1',
      numeratorLatex: '1',
      exclusionConstraints: [],
    };

    for (const childNode of children) {
      const child = parseRationalFunction(childNode, variable, options);
      if (child.kind === 'stop') {
        return child;
      }
      current = multiplyRationalFunctions(current.rational, child.rational, options);
      if (current.kind === 'stop') {
        return current;
      }
    }
    return current;
  }

  if (operator === 'Divide' && children.length === 2) {
    const numerator = parseRationalFunction(children[0], variable, options);
    const denominator = parseRationalFunction(children[1], variable, options);
    if (numerator.kind === 'stop') {
      return numerator;
    }
    if (denominator.kind === 'stop') {
      return denominator;
    }
    if (exactPolynomialIsZero(denominator.rational.numerator)) {
      return { kind: 'stop', reason: 'zero-denominator' };
    }

    return multiplyRationalFunctions(numerator.rational, {
      variable,
      numerator: denominator.rational.denominator,
      denominator: denominator.rational.numerator,
    }, options);
  }

  if (operator === 'Power' && children.length === 2) {
    const exponent = readExactScalarNode(children[1]);
    if (!exponent || exponent.denominator !== 1) {
      return { kind: 'stop', reason: 'unsupported-expression' };
    }
    const base = parseRationalFunction(children[0], variable, options);
    return base.kind === 'success'
      ? powerRationalFunction(base.rational, exponent.numerator, options)
      : base;
  }

  return { kind: 'stop', reason: 'unsupported-expression' };
}

function normalizeDenominatorSign(rational: ExactRationalFunction): ExactRationalFunction {
  const denominator = normalizeExactPolynomial(rational.denominator);
  const leading = exactPolynomialLeadingCoefficient(denominator);
  if (leading.numerator >= 0) {
    return {
      ...rational,
      numerator: normalizeExactPolynomial(rational.numerator),
      denominator,
    };
  }

  return {
    ...rational,
    numerator: scaleExactPolynomial(rational.numerator, { numerator: -1, denominator: 1 }),
    denominator: scaleExactPolynomial(denominator, { numerator: -1, denominator: 1 }),
  };
}

export function buildNormalizedRationalFunction(
  rational: ExactRationalFunction,
): ExactRationalFunctionResult {
  if (rational.numerator.variable !== rational.denominator.variable) {
    return { kind: 'stop', reason: 'variable-mismatch' };
  }
  if (exactPolynomialIsZero(rational.denominator)) {
    return { kind: 'stop', reason: 'zero-denominator' };
  }

  if (exactPolynomialIsZero(rational.numerator)) {
    const normalizedZero = {
      variable: rational.variable,
      numerator: zeroPolynomial(rational.variable),
      denominator: onePolynomial(rational.variable),
    };
    return buildRationalFunctionSuccess(normalizedZero);
  }

  const gcd = exactPolynomialGcd(rational.numerator, rational.denominator);
  if (!gcd) {
    return { kind: 'stop', reason: 'variable-mismatch' };
  }

  const numeratorDivision = divideExactPolynomials(rational.numerator, gcd);
  const denominatorDivision = divideExactPolynomials(rational.denominator, gcd);
  if (!numeratorDivision || !denominatorDivision) {
    return { kind: 'stop', reason: 'unsupported-expression' };
  }

  let numerator = numeratorDivision.quotient;
  let denominator = denominatorDivision.quotient;
  const denominatorLeading = exactPolynomialLeadingCoefficient(denominator);
  const denominatorScale = normalizeExactScalar(denominatorLeading);
  if (!(denominatorScale.numerator === 1 && denominatorScale.denominator === 1)) {
    const reciprocal = {
      numerator: denominatorScale.denominator,
      denominator: denominatorScale.numerator,
    };
    numerator = scaleExactPolynomial(numerator, reciprocal);
    denominator = scaleExactPolynomial(denominator, reciprocal);
  }

  return buildRationalFunctionSuccess(normalizeDenominatorSign({
    variable: rational.variable,
    numerator,
    denominator,
  }));
}

function buildRationalFunctionSuccess(rational: ExactRationalFunction): ExactRationalFunctionSuccess {
  const numeratorNode = exactPolynomialToNode(rational.numerator);
  const denominatorNode = exactPolynomialToNode(rational.denominator);
  const normalizedNode = isOnePolynomial(rational.denominator)
    ? numeratorNode
    : normalizeAst(['Divide', numeratorNode, denominatorNode]);
  const denominatorLatex = isOnePolynomial(rational.denominator)
    ? undefined
    : exactPolynomialToLatex(rational.denominator);
  const exclusionConstraints: SolveDomainConstraint[] = denominatorLatex
    ? [{ kind: 'nonzero', expressionLatex: denominatorLatex }]
    : [];

  return {
    kind: 'success',
    rational,
    normalizedNode,
    normalizedLatex: ce.box(normalizedNode as Parameters<typeof ce.box>[0]).latex,
    numeratorLatex: exactPolynomialToLatex(rational.numerator),
    denominatorLatex,
    exclusionConstraints,
    assumptionFacts: assumptionFactsFromDomainConstraints(exclusionConstraints, {
      source: 'rational-function-core',
      scope: 'result',
      trust: 'proved',
    }),
  };
}

export function normalizeExactRationalFunctionNode(
  node: unknown,
  options: Partial<ParseOptions & { variable: string }> = {},
): ExactRationalFunctionResult {
  const normalized = normalizeAst(node);
  const variable = options.variable ?? detectSingleVariable(normalized);
  if (!variable) {
    return { kind: 'stop', reason: 'multivariable' };
  }

  return parseRationalFunction(normalized, variable, {
    maxDegree: options.maxDegree ?? 8,
  });
}

function positiveDivisors(value: number) {
  const absolute = Math.abs(value);
  if (absolute === 0) {
    return [0];
  }

  const divisors = new Set<number>();
  for (let candidate = 1; candidate * candidate <= absolute; candidate += 1) {
    if (absolute % candidate === 0) {
      divisors.add(candidate);
      divisors.add(absolute / candidate);
    }
  }
  return [...divisors].sort((left, right) => left - right);
}

function exactScalarKey(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return `${normalized.numerator}/${normalized.denominator}`;
}

function exactScalarSign(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return Math.sign(normalized.numerator);
}

function exactScalarSquareRoot(value: ExactScalar): ExactScalar | null {
  const normalized = normalizeExactScalar(value);
  if (normalized.numerator < 0 || normalized.denominator <= 0) {
    return null;
  }

  const numeratorRoot = Math.sqrt(normalized.numerator);
  const denominatorRoot = Math.sqrt(normalized.denominator);
  if (!Number.isInteger(numeratorRoot) || !Number.isInteger(denominatorRoot)) {
    return null;
  }

  return normalizeExactScalar({
    numerator: numeratorRoot,
    denominator: denominatorRoot,
  });
}

function rationalRootCandidates(polynomial: ExactPolynomial) {
  const primitive = primitiveExactPolynomial(polynomial);
  if (!primitive) {
    return [] as ExactScalar[];
  }

  const coefficients = exactPolynomialCoefficientArray(primitive.polynomial);
  if (!coefficients.every((coefficient) =>
    coefficient.denominator === 1 && isExactInteger(coefficient.numerator))) {
    return [];
  }

  const leading = Math.abs(coefficients[0]?.numerator ?? 0);
  const constant = Math.abs(coefficients[coefficients.length - 1]?.numerator ?? 0);
  if (leading === 0) {
    return [];
  }

  const candidates = new Map<string, ExactScalar>();
  if (constant === 0) {
    candidates.set('0/1', { numerator: 0, denominator: 1 });
  }

  for (const numerator of positiveDivisors(constant)) {
    for (const denominator of positiveDivisors(leading)) {
      const positive = normalizeExactScalar({ numerator, denominator });
      const negative = normalizeExactScalar({ numerator: -numerator, denominator });
      candidates.set(exactScalarKey(positive), positive);
      candidates.set(exactScalarKey(negative), negative);
    }
  }

  return [...candidates.values()];
}

function evaluatePolynomialAtScalar(polynomial: ExactPolynomial, value: ExactScalar) {
  const coefficients = exactPolynomialCoefficientArray(polynomial);
  let current = coefficients[0] ?? { numerator: 0, denominator: 1 };
  for (let index = 1; index < coefficients.length; index += 1) {
    current = normalizeExactScalar({
      numerator: current.numerator * value.numerator * coefficients[index].denominator
        + coefficients[index].numerator * current.denominator * value.denominator,
      denominator: current.denominator * value.denominator * coefficients[index].denominator,
    });
  }
  return current;
}

function linearFactorForRoot(variable: string, root: ExactScalar) {
  return buildExactPolynomialFromCoefficients(variable, [
    { numerator: 1, denominator: 1 },
    negateExactScalar(root),
  ]);
}

function polynomialPower(
  polynomial: ExactPolynomial,
  exponent: number,
): ExactPolynomial | null {
  let current = onePolynomial(polynomial.variable);
  for (let index = 0; index < exponent; index += 1) {
    const next = multiplyExactPolynomials(
      current,
      polynomial,
      exactPolynomialDegree(current) + exactPolynomialDegree(polynomial),
    );
    if (!next) {
      return null;
    }
    current = next;
  }
  return current;
}

function rationalFactorizationStop(reason: RationalFunctionStopReason): RationalFactorizationResult {
  return { kind: 'stop', reason };
}

function buildQuadraticFactor(polynomial: ExactPolynomial): IrreducibleQuadraticFactor | null {
  const monic = makeMonicExactPolynomial(polynomial);
  if (!monic || exactPolynomialDegree(monic) !== 2) {
    return null;
  }

  const discriminant = quadraticDiscriminant(monic);
  if (!discriminant || exactScalarSign(discriminant) >= 0) {
    return null;
  }

  return {
    kind: 'irreducible-quadratic',
    multiplicity: 1,
    polynomial: monic,
    latex: exactPolynomialToLatex(monic),
    linearCoefficient: getExactPolynomialCoefficient(monic, 1),
    constantCoefficient: getExactPolynomialCoefficient(monic, 0),
    discriminant,
  };
}

export function factorSupportedRationalDenominator(
  denominator: ExactPolynomial,
  options: { maxDegree?: number } = {},
): RationalFactorizationResult {
  const maxDegree = options.maxDegree ?? 8;
  if (exactPolynomialDegree(denominator) > maxDegree) {
    return rationalFactorizationStop('factorization-degree-limit');
  }

  let current = makeMonicExactPolynomial(denominator);
  if (!current) {
    return rationalFactorizationStop('zero-denominator');
  }
  const monicDenominator = current;

  const factors: RationalDenominatorFactor[] = [];
  while (exactPolynomialDegree(current) > 0) {
    const root = rationalRootCandidates(current)
      .find((candidate) => exactScalarIsZero(evaluatePolynomialAtScalar(current!, candidate)));

    if (root) {
      const factor = linearFactorForRoot(current.variable, root);
      let multiplicity = 0;

      while (true) {
        const divided = divideExactPolynomials(current, factor);
        if (!divided || !exactPolynomialIsZero(divided.remainder)) {
          break;
        }
        multiplicity += 1;
        current = divided.quotient;
      }

      factors.push({
        kind: 'linear',
        root,
        multiplicity,
        polynomial: factor,
        latex: exactPolynomialToLatex(factor),
      });
      continue;
    }

    if (exactPolynomialDegree(current) === 2) {
      const discriminant = quadraticDiscriminant(current);
      if (!discriminant) {
        return rationalFactorizationStop('unsupported-factorization');
      }

      const squareRoot = exactScalarSquareRoot(discriminant);
      if (exactScalarSign(discriminant) > 0 && !squareRoot) {
        return rationalFactorizationStop('algebraic-root-required');
      }

      const quadratic = buildQuadraticFactor(current);
      if (!quadratic) {
        return rationalFactorizationStop('unsupported-factorization');
      }

      factors.push(quadratic);
      current = onePolynomial(current.variable);
      continue;
    }

    return rationalFactorizationStop('unsupported-factorization');
  }

  return {
    kind: 'success',
    variable: denominator.variable,
    denominator: monicDenominator,
    factors,
    squareFree: factors.every((factor) => factor.multiplicity === 1),
  };
}

function factorDistinctLinearDenominator(
  denominator: ExactPolynomial,
): { kind: 'success'; roots: ExactScalar[] } | { kind: 'stop'; reason: RationalFunctionStopReason } {
  let current = makeMonicExactPolynomial(denominator);
  if (!current) {
    return { kind: 'stop', reason: 'zero-denominator' };
  }

  const roots: ExactScalar[] = [];
  while (exactPolynomialDegree(current) > 0) {
    const root = rationalRootCandidates(current)
      .find((candidate) => exactScalarIsZero(evaluatePolynomialAtScalar(current!, candidate)));
    if (!root) {
      return { kind: 'stop', reason: 'denominator-not-distinct-linear' };
    }

    const factor = linearFactorForRoot(current.variable, root);
    const firstDivision = divideExactPolynomials(current, factor);
    if (!firstDivision || !exactPolynomialIsZero(firstDivision.remainder)) {
      return { kind: 'stop', reason: 'denominator-not-distinct-linear' };
    }

    const secondDivision = divideExactPolynomials(firstDivision.quotient, factor);
    if (secondDivision && exactPolynomialIsZero(secondDivision.remainder)) {
      return { kind: 'stop', reason: 'repeated-linear-factor' };
    }

    roots.push(root);
    current = firstDivision.quotient;
  }

  return { kind: 'success', roots };
}

function partialFractionCoefficient(numerator: ExactPolynomial, root: ExactScalar, roots: ExactScalar[]) {
  const numeratorValue = evaluatePolynomialAtScalar(numerator, root);
  const denominatorValue = roots
    .filter((candidate) => exactScalarKey(candidate) !== exactScalarKey(root))
    .reduce<ExactScalar>((current, candidate) =>
      multiplyExactScalars(current, subtractExactScalars(root, candidate)), { numerator: 1, denominator: 1 });

  if (exactScalarIsZero(denominatorValue)) {
    return null;
  }

  return normalizeExactScalar({
    numerator: numeratorValue.numerator * denominatorValue.denominator,
    denominator: numeratorValue.denominator * denominatorValue.numerator,
  });
}

function buildPartialFractionTermNode(coefficient: ExactScalar, denominator: ExactPolynomial) {
  const denominatorNode = exactPolynomialToNode(denominator);
  if (coefficient.numerator === 1 && coefficient.denominator === 1) {
    return ['Divide', 1, denominatorNode];
  }
  return ['Divide', buildExactScalarNode(coefficient), denominatorNode];
}

export function decomposeDistinctLinearPartialFractions(
  rational: ExactRationalFunction,
): PartialFractionReadinessResult {
  const normalized = buildNormalizedRationalFunction(rational);
  if (normalized.kind === 'stop') {
    return normalized;
  }

  const { numerator, denominator, variable } = normalized.rational;
  if (exactPolynomialDegree(numerator) >= exactPolynomialDegree(denominator)) {
    return { kind: 'stop', reason: 'not-proper' };
  }

  const denominatorFactors = factorDistinctLinearDenominator(denominator);
  if (denominatorFactors.kind === 'stop') {
    return denominatorFactors;
  }

  const terms: PartialFractionTerm[] = [];
  for (const root of denominatorFactors.roots) {
    const denominatorPolynomial = linearFactorForRoot(variable, root);
    const coefficient = partialFractionCoefficient(numerator, root, denominatorFactors.roots);
    if (!coefficient) {
      return { kind: 'stop', reason: 'repeated-linear-factor' };
    }
    const node = normalizeAst(buildPartialFractionTermNode(coefficient, denominatorPolynomial));
    terms.push({
      coefficient,
      root,
      denominator: denominatorPolynomial,
      node,
      latex: ce.box(node as Parameters<typeof ce.box>[0]).latex,
    });
  }

  const reconstructedNode = terms.length === 1
    ? terms[0].node
    : normalizeAst(['Add', ...terms.map((term) => term.node)]);

  return {
    kind: 'success',
    variable,
    terms,
    reconstructedNode,
    reconstructedLatex: ce.box(reconstructedNode as Parameters<typeof ce.box>[0]).latex,
  };
}

type PartialFractionBasis =
  | {
    kind: 'linear-power';
    factor: LinearRationalFactor;
    power: number;
    basisNumerator: ExactPolynomial;
    denominator: ExactPolynomial;
  }
  | {
    kind: 'quadratic-linear';
    factor: IrreducibleQuadraticFactor;
    coefficientKind: 'linear' | 'constant';
    basisNumerator: ExactPolynomial;
  };

function buildPartialFractionBasis(
  factorization: Extract<RationalFactorizationResult, { kind: 'success' }>,
): PartialFractionBasis[] | null {
  const basis: PartialFractionBasis[] = [];

  for (const factor of factorization.factors) {
    if (factor.kind === 'linear') {
      for (let power = 1; power <= factor.multiplicity; power += 1) {
        const denominator = polynomialPower(factor.polynomial, power);
        if (!denominator) {
          return null;
        }
        const division = divideExactPolynomials(factorization.denominator, denominator);
        if (!division || !exactPolynomialIsZero(division.remainder)) {
          return null;
        }
        basis.push({
          kind: 'linear-power',
          factor,
          power,
          denominator,
          basisNumerator: division.quotient,
        });
      }
      continue;
    }

    const division = divideExactPolynomials(factorization.denominator, factor.polynomial);
    if (!division || !exactPolynomialIsZero(division.remainder)) {
      return null;
    }
    const xBasis = multiplyExactPolynomials(
      buildExactPolynomialFromCoefficients(factorization.variable, [
        { numerator: 1, denominator: 1 },
        { numerator: 0, denominator: 1 },
      ]),
      division.quotient,
      exactPolynomialDegree(factorization.denominator),
    );
    if (!xBasis) {
      return null;
    }
    basis.push({
      kind: 'quadratic-linear',
      factor,
      coefficientKind: 'linear',
      basisNumerator: xBasis,
    });
    basis.push({
      kind: 'quadratic-linear',
      factor,
      coefficientKind: 'constant',
      basisNumerator: division.quotient,
    });
  }

  return basis;
}

function solveExactCoefficientSystem(
  basis: PartialFractionBasis[],
  numerator: ExactPolynomial,
): ExactScalar[] | null {
  const rowCount = basis.length;
  const coefficients: ExactScalar[][] = Array.from({ length: rowCount }, (_, degree) =>
    basis.map((entry) => getExactPolynomialCoefficient(entry.basisNumerator, degree)));
  const constants: ExactScalar[] = Array.from({ length: rowCount }, (_, degree) =>
    getExactPolynomialCoefficient(numerator, degree));

  const solved = solveExactLinearSystem(coefficients, constants);
  return solved.kind === 'success' ? solved.solution : null;
}

function buildLinearPowerTermNode(coefficient: ExactScalar, denominator: ExactPolynomial) {
  return normalizeAst(buildPartialFractionTermNode(coefficient, denominator));
}

function buildQuadraticTermNode(numerator: ExactPolynomial, denominator: ExactPolynomial) {
  return normalizeAst(['Divide', exactPolynomialToNode(numerator), exactPolynomialToNode(denominator)]);
}

function buildQuadraticTerm(
  factor: IrreducibleQuadraticFactor,
  linearCoefficient: ExactScalar,
  constantCoefficient: ExactScalar,
): QuadraticPartialFractionTerm | null {
  const half = divideExactScalars(linearCoefficient, { numerator: 2, denominator: 1 });
  if (!half) {
    return null;
  }
  const derivativeCoefficient = half;
  const residualConstant = subtractExactScalars(
    constantCoefficient,
    multiplyExactScalars(derivativeCoefficient, factor.linearCoefficient),
  );
  const numerator = buildExactPolynomialFromCoefficients(factor.polynomial.variable, [
    linearCoefficient,
    constantCoefficient,
  ]);
  const node = buildQuadraticTermNode(numerator, factor.polynomial);

  return {
    kind: 'irreducible-quadratic',
    linearCoefficient,
    constantCoefficient,
    derivativeCoefficient,
    residualConstant,
    factor,
    numerator,
    node,
    latex: ce.box(node as Parameters<typeof ce.box>[0]).latex,
  };
}

export function decomposeRationalPartialFractionReadiness(
  rational: ExactRationalFunction,
): RationalPartialFractionReadinessResult {
  const normalized = buildNormalizedRationalFunction(rational);
  if (normalized.kind === 'stop') {
    return normalized;
  }

  const { numerator, denominator, variable } = normalized.rational;
  if (exactPolynomialDegree(numerator) >= exactPolynomialDegree(denominator)) {
    return { kind: 'stop', reason: 'not-proper' };
  }

  const factorization = factorSupportedRationalDenominator(denominator);
  if (factorization.kind === 'stop') {
    return factorization;
  }

  const basis = buildPartialFractionBasis(factorization);
  if (!basis) {
    return { kind: 'stop', reason: 'unsupported-factorization' };
  }

  const coefficients = solveExactCoefficientSystem(basis, numerator);
  if (!coefficients) {
    return { kind: 'stop', reason: 'unsupported-factorization' };
  }

  const terms: RationalPartialFractionReadinessTerm[] = [];
  for (let index = 0; index < basis.length; index += 1) {
    const entry = basis[index];
    const coefficient = coefficients[index];

    if (entry.kind === 'linear-power') {
      if (exactScalarIsZero(coefficient)) {
        continue;
      }
      const node = buildLinearPowerTermNode(coefficient, entry.denominator);
      terms.push({
        kind: 'linear-power',
        coefficient,
        root: entry.factor.root,
        power: entry.power,
        denominator: entry.denominator,
        node,
        latex: ce.box(node as Parameters<typeof ce.box>[0]).latex,
      });
      continue;
    }

    const siblingIndex = basis.findIndex((candidate, candidateIndex) =>
      candidateIndex > index
      && candidate.kind === 'quadratic-linear'
      && candidate.factor === entry.factor
      && candidate.coefficientKind !== entry.coefficientKind);
    if (entry.coefficientKind !== 'linear' || siblingIndex < 0) {
      continue;
    }
    if (exactScalarIsZero(coefficient) && exactScalarIsZero(coefficients[siblingIndex])) {
      continue;
    }

    const term = buildQuadraticTerm(entry.factor, coefficient, coefficients[siblingIndex]);
    if (!term) {
      return { kind: 'stop', reason: 'unsupported-factorization' };
    }
    terms.push(term);
  }

  const reconstructedNode = terms.length === 0
    ? 0
    : terms.length === 1
      ? terms[0].node
      : normalizeAst(['Add', ...terms.map((term) => term.node)]);

  return {
    kind: 'success',
    variable,
    factorization,
    terms,
    reconstructedNode,
    reconstructedLatex: ce.box(reconstructedNode as Parameters<typeof ce.box>[0]).latex,
  };
}
