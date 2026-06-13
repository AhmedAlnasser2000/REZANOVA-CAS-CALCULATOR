import { ComputeEngine } from '@cortex-js/compute-engine';
import type { SolveDomainConstraint } from '../../../types/calculator';
import { assumptionFactsFromDomainConstraints } from '../assumptions-core';
import {
  addExactPolynomials,
  buildExactPolynomialFromCoefficients,
  divideExactPolynomials,
  exactPolynomialDegree,
  exactPolynomialGcd,
  exactPolynomialIsZero,
  exactPolynomialLeadingCoefficient,
  exactPolynomialToLatex,
  exactPolynomialToNode,
  getExactPolynomialCoefficient,
  multiplyExactPolynomials,
  normalizeExactPolynomial,
  normalizeExactScalar,
  parseExactPolynomial,
  readExactScalarNode,
  scaleExactPolynomial,
  type ExactPolynomial,
} from '../polynomial-core';
import { normalizeAst } from '../../symbolic-engine/normalize';
import type {
  ExactRationalFunction,
  ExactRationalFunctionResult,
  ExactRationalFunctionSuccess,
  ParseOptions,
} from './types';

const ce = new ComputeEngine();
const NUMERIC_CONSTANT_SYMBOLS = new Set(['Pi', 'ExponentialE']);

function isNodeArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
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

export function onePolynomial(variable: string) {
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
