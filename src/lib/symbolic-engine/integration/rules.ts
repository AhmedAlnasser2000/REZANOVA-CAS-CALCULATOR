import { areEquivalentNodes, differentiateNode, simplifyNode } from '../differentiation';
import {
  addExactPolynomials,
  buildExactPolynomialFromCoefficients,
  divideExactScalars,
  divideExactPolynomials,
  exactPolynomialDegree,
  exactPolynomialIsZero,
  exactPolynomialToLatex,
  exactPolynomialToNode,
  exactScalarIsZero,
  getExactPolynomialCoefficient,
  parseExactPolynomial,
  scaleExactPolynomial,
  type ExactPolynomial,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import {
  boxLatex,
  flattenMultiply,
  isNodeArray,
  multiplyLatex,
  parseAffine,
  toPolynomialTerms,
  type PolynomialTerm,
  wrapGroupedLatex,
} from '../patterns';
import { BY_PARTS_POLYNOMIAL_DEGREE_CAP, LOG_BY_PARTS_POLYNOMIAL_DEGREE_CAP } from './types';
import {
  numberLatex,
  numericNodeValue,
  proportionalScale,
  rationalApproximation,
  sameNode,
} from './node-helpers';
import {
  isNumericBaseExponentialFactor,
  tryPolynomialTimesNumericBaseExponential,
} from './numeric-base-exponential-parts';
import { trySquareRootSubstitutionRule } from './sqrt-substitution';
import {
  parseExactAffineArgument,
  solveExactPolynomialTimesExponential,
  solveExactPolynomialTimesTrig,
} from './exact-parts';
import { scaleLatex } from './rational';
import type { AntiderivativeBackcheck } from '../../calculus/engine/verification';

export type NativeRuleResult = {
  exactLatex: string;
  antiderivativeNode: unknown;
};

export type PartsRuleDetailedResult = {
  exactLatex: string;
  antiderivativeNode?: unknown;
  verification?: AntiderivativeBackcheck;
};

function partsRuleString(result: string | PartsRuleDetailedResult | undefined) {
  return typeof result === 'string' ? result : result?.exactLatex;
}

function exactNumberNode(value: number): unknown {
  const rational = rationalApproximation(value);
  return rational && rational.denominator !== 1
    ? ['Rational', rational.numerator, rational.denominator]
    : rational?.numerator ?? value;
}

function scaleNativeNode(node: unknown, scale: number): unknown {
  if (Math.abs(scale - 1) < 1e-10) return node;
  if (Math.abs(scale + 1) < 1e-10) return ['Negate', node];
  return ['Multiply', exactNumberNode(scale), node];
}

function integralOfOuter(inner: unknown, outer: unknown, scale = 1) {
  const applyScale = (latex: string) => scaleLatex(latex, scale);
  const innerLatex = wrapGroupedLatex(boxLatex(inner));

  if (sameNode(outer, inner)) {
    const coefficient = scale / 2;
    return {
      exactLatex: scaleLatex(`${innerLatex}^{2}`, coefficient),
      antiderivativeNode: scaleNativeNode(['Power', inner, 2], coefficient),
    };
  }

  if (isNodeArray(outer) && outer[0] === 'Cos' && outer.length === 2) {
    return {
      exactLatex: applyScale(`\\sin\\left(${innerLatex}\\right)`),
      antiderivativeNode: scaleNativeNode(['Sin', inner], scale),
    };
  }

  if (isNodeArray(outer) && outer[0] === 'Sin' && outer.length === 2) {
    return {
      exactLatex: applyScale(`-\\cos\\left(${innerLatex}\\right)`),
      antiderivativeNode: scaleNativeNode(['Negate', ['Cos', inner]], scale),
    };
  }

  if (isNodeArray(outer) && outer[0] === 'Ln' && outer.length === 2 && sameNode(outer[1], inner)) {
    const primitive = ['Subtract', ['Multiply', inner, ['Ln', inner]], inner];
    return {
      exactLatex: applyScale(`${innerLatex}\\ln\\left(${innerLatex}\\right)-${innerLatex}`),
      antiderivativeNode: scaleNativeNode(primitive, scale),
    };
  }

  if (isNodeArray(outer) && outer[0] === 'Log' && outer.length === 2 && sameNode(outer[1], inner)) {
    const primitive = [
      'Divide',
      ['Subtract', ['Multiply', inner, ['Ln', inner]], inner],
      ['Ln', 10],
    ];
    return {
      exactLatex: applyScale(`\\frac{${innerLatex}\\ln\\left(${innerLatex}\\right)-${innerLatex}}{\\ln(10)}`),
      antiderivativeNode: scaleNativeNode(primitive, scale),
    };
  }

  if (isNodeArray(outer) && outer[0] === 'Sqrt' && outer.length === 2 && sameNode(outer[1], inner)) {
    const coefficient = (2 * scale) / 3;
    return {
      exactLatex: scaleLatex(`${innerLatex}^{\\frac{3}{2}}`, coefficient),
      antiderivativeNode: scaleNativeNode(['Power', inner, ['Rational', 3, 2]], coefficient),
    };
  }

  if (
    isNodeArray(outer)
    && outer[0] === 'Power'
    && outer.length === 3
    && outer[1] === 'ExponentialE'
    && sameNode(outer[2], inner)
  ) {
    return {
      exactLatex: applyScale(`e^{${boxLatex(inner)}}`),
      antiderivativeNode: scaleNativeNode(['Power', 'ExponentialE', inner], scale),
    };
  }

  if (isNodeArray(outer) && outer[0] === 'Power' && outer.length === 3) {
    const exponent = numericNodeValue(outer[2]);
    if (exponent === undefined || !sameNode(outer[1], inner)) {
      return undefined;
    }

    if (exponent === -1) {
      return {
        exactLatex: applyScale(`\\ln\\left|${innerLatex}\\right|`),
        antiderivativeNode: scaleNativeNode(['Ln', ['Abs', inner]], scale),
      };
    }

    const nextExponent = exponent + 1;
    if (Math.abs(nextExponent) < 1e-10) {
      return undefined;
    }

    const coefficient = scale / nextExponent;
    return {
      exactLatex: scaleLatex(
        `${innerLatex}^{${numberLatex(nextExponent)}}`,
        coefficient,
      ),
      antiderivativeNode: scaleNativeNode(
        ['Power', inner, exactNumberNode(nextExponent)],
        coefficient,
      ),
    };
  }

  if (isNodeArray(outer) && outer[0] === 'Divide' && outer.length === 3 && outer[1] === 1) {
    if (sameNode(outer[2], inner)) {
      return {
        exactLatex: applyScale(`\\ln\\left|${innerLatex}\\right|`),
        antiderivativeNode: scaleNativeNode(['Ln', ['Abs', inner]], scale),
      };
    }
  }

  return undefined;
}

function polynomialDegree(terms: PolynomialTerm[]) {
  return terms.length === 0 ? 0 : terms[0].degree;
}

function polynomialToAscendingCoefficients(terms: PolynomialTerm[]) {
  const degree = polynomialDegree(terms);
  const coefficients = Array.from({ length: degree + 1 }, () => 0);
  for (const term of terms) {
    coefficients[term.degree] = term.coefficient;
  }
  return coefficients;
}

function polynomialFromAscendingCoefficients(coefficients: number[]) {
  const terms: string[] = [];
  for (let degree = coefficients.length - 1; degree >= 0; degree -= 1) {
    const coefficient = coefficients[degree];
    if (Math.abs(coefficient) < 1e-10) {
      continue;
    }

    const sign = coefficient < 0 ? '-' : '+';
    const absoluteCoefficient = Math.abs(coefficient);
    let term = '';

    if (degree === 0) {
      term = boxLatex(absoluteCoefficient);
    } else if (degree === 1) {
      term = absoluteCoefficient === 1 ? 'x' : `${boxLatex(absoluteCoefficient)}x`;
    } else {
      term = absoluteCoefficient === 1 ? `x^{${degree}}` : `${boxLatex(absoluteCoefficient)}x^{${degree}}`;
    }

    terms.push(terms.length === 0 ? (sign === '-' ? `-${term}` : term) : `${sign}${term}`);
  }

  return terms.join('') || '0';
}

function gaussianSolve(matrix: number[][], rhs: number[]) {
  const size = rhs.length;
  const augmented = matrix.map((row, index) => [...row, rhs[index]]);

  for (let pivot = 0; pivot < size; pivot += 1) {
    let best = pivot;
    for (let row = pivot + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[best][pivot])) {
        best = row;
      }
    }

    if (Math.abs(augmented[best][pivot]) < 1e-10) {
      return undefined;
    }

    [augmented[pivot], augmented[best]] = [augmented[best], augmented[pivot]];
    const scale = augmented[pivot][pivot];
    for (let column = pivot; column <= size; column += 1) {
      augmented[pivot][column] /= scale;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === pivot) {
        continue;
      }

      const factor = augmented[row][pivot];
      for (let column = pivot; column <= size; column += 1) {
        augmented[row][column] -= factor * augmented[pivot][column];
      }
    }
  }

  return augmented.map((row) => row[size]);
}

function buildTrigLinearSystem(
  terms: PolynomialTerm[],
  slope: number,
  kind: 'sin' | 'cos',
) {
  const degree = polynomialDegree(terms);
  if (degree > BY_PARTS_POLYNOMIAL_DEGREE_CAP || slope === 0) {
    return undefined;
  }

  const size = degree + 1;
  const unknownCount = size * 2;
  const matrix: number[][] = Array.from({ length: unknownCount }, () =>
    Array.from({ length: unknownCount }, () => 0));
  const rhs = Array.from({ length: unknownCount }, () => 0);
  const coefficients = polynomialToAscendingCoefficients(terms);

  for (let power = 0; power <= degree; power += 1) {
    const sinRow = power;
    if (power + 1 <= degree) {
      matrix[sinRow][power + 1] = power + 1;
    }
    matrix[sinRow][size + power] = -slope;
    rhs[sinRow] = kind === 'sin' ? coefficients[power] : 0;

    const cosRow = size + power;
    if (power + 1 <= degree) {
      matrix[cosRow][size + power + 1] = power + 1;
    }
    matrix[cosRow][power] = slope;
    rhs[cosRow] = kind === 'cos' ? coefficients[power] : 0;
  }

  const solution = gaussianSolve(matrix, rhs);
  if (!solution) {
    return undefined;
  }

  return {
    sinCoefficients: solution.slice(0, size),
    cosCoefficients: solution.slice(size),
  };
}

function solvePolynomialTimesExponential(
  terms: PolynomialTerm[],
  slope: number,
  exponentLatex: string,
) {
  if (slope === 0 || polynomialDegree(terms) > BY_PARTS_POLYNOMIAL_DEGREE_CAP) {
    return undefined;
  }

  const polynomial = polynomialToAscendingCoefficients(terms);
  const antiderivative = Array.from({ length: polynomial.length }, () => 0);
  const last = polynomial.length - 1;
  antiderivative[last] = polynomial[last] / slope;
  for (let degree = last - 1; degree >= 0; degree -= 1) {
    antiderivative[degree] = (polynomial[degree] - (degree + 1) * antiderivative[degree + 1]) / slope;
  }

  return `e^{${exponentLatex}}\\left(${polynomialFromAscendingCoefficients(antiderivative)}\\right)`;
}

function groupPolynomialCoefficientLatex(latex: string) {
  return latex.includes('+') || latex.slice(1).includes('-')
    ? wrapGroupedLatex(latex)
    : latex;
}

function solvePolynomialTimesTrig(
  terms: PolynomialTerm[],
  slope: number,
  angleLatex: string,
  kind: 'sin' | 'cos',
) {
  const solution = buildTrigLinearSystem(terms, slope, kind);
  if (!solution) {
    return undefined;
  }

  const sinLatex = polynomialFromAscendingCoefficients(solution.sinCoefficients);
  const cosLatex = polynomialFromAscendingCoefficients(solution.cosCoefficients);
  const pieces: string[] = [];
  if (sinLatex !== '0') {
    pieces.push(multiplyLatex(
      groupPolynomialCoefficientLatex(sinLatex),
      `\\sin\\left(${angleLatex}\\right)`,
    ));
  }
  if (cosLatex !== '0') {
    pieces.push(multiplyLatex(
      groupPolynomialCoefficientLatex(cosLatex),
      `\\cos\\left(${angleLatex}\\right)`,
    ));
  }
  return pieces.join('+') || undefined;
}

function integrateExactPolynomial(polynomial: ExactPolynomial): ExactPolynomial | undefined {
  const terms = new Map<number, ExactScalar>();
  for (const [degree, coefficient] of polynomial.terms.entries()) {
    const integrated = divideExactScalars(coefficient, { numerator: degree + 1, denominator: 1 });
    if (!integrated) {
      return undefined;
    }
    if (!exactScalarIsZero(integrated)) {
      terms.set(degree + 1, integrated);
    }
  }
  return { variable: polynomial.variable, terms };
}

function joinAdditiveParts(parts: string[]) {
  return parts
    .filter((part) => part !== '0')
    .reduce((joined, part, index) => {
      if (index === 0) {
        return part;
      }
      return part.startsWith('-') ? `${joined}${part}` : `${joined}+${part}`;
    }, '') || undefined;
}

function integratePolynomialOverAffine(
  numerator: ExactPolynomial,
  affine: ExactPolynomial,
) {
  const division = divideExactPolynomials(numerator, affine);
  if (!division || exactPolynomialDegree(division.remainder) > 0) {
    return undefined;
  }

  let polynomialIntegral: ExactPolynomial | undefined;
  if (!exactPolynomialIsZero(division.quotient)) {
    polynomialIntegral = integrateExactPolynomial(division.quotient);
    if (!polynomialIntegral) {
      return undefined;
    }
  }

  let logCoefficient: ExactScalar = { numerator: 0, denominator: 1 };
  const residual = getExactPolynomialCoefficient(division.remainder, 0);
  if (!exactScalarIsZero(residual)) {
    const coefficient = divideExactScalars(residual, getExactPolynomialCoefficient(affine, 1));
    if (!coefficient) {
      return undefined;
    }
    logCoefficient = coefficient;
  }

  return { polynomialIntegral, logCoefficient };
}

function solvePolynomialTimesLog(
  polynomialNode: unknown,
  logFactor: unknown,
  variable: string,
) {
  if (!isNodeArray(logFactor) || logFactor.length !== 2 || (logFactor[0] !== 'Ln' && logFactor[0] !== 'Log')) {
    return undefined;
  }

  const polynomial = parseExactPolynomial(polynomialNode, variable, LOG_BY_PARTS_POLYNOMIAL_DEGREE_CAP);
  const affine = parseExactPolynomial(logFactor[1], variable, 1);
  if (
    !polynomial
    || !affine
    || exactPolynomialDegree(polynomial) > LOG_BY_PARTS_POLYNOMIAL_DEGREE_CAP
    || exactPolynomialDegree(affine) !== 1
  ) {
    return undefined;
  }

  const slope = getExactPolynomialCoefficient(affine, 1);
  if (exactScalarIsZero(slope)) {
    return undefined;
  }

  const integratedPolynomial = integrateExactPolynomial(polynomial);
  if (!integratedPolynomial) {
    return undefined;
  }

  const correctionNumerator = scaleExactPolynomial(integratedPolynomial, slope);
  const correction = integratePolynomialOverAffine(correctionNumerator, affine);
  if (!correction) {
    return undefined;
  }

  const logPolynomial = exactScalarIsZero(correction.logCoefficient)
    ? integratedPolynomial
    : addExactPolynomials(
      integratedPolynomial,
      buildExactPolynomialFromCoefficients(variable, [correction.logCoefficient]),
      -1,
    );
  const expressionParts: string[] = [];
  const expressionNodes: unknown[] = [];
  if (!exactPolynomialIsZero(logPolynomial)) {
    expressionParts.push(
      `${groupPolynomialCoefficientLatex(exactPolynomialToLatex(logPolynomial))}\\ln\\left(${wrapGroupedLatex(exactPolynomialToLatex(affine))}\\right)`,
    );
    expressionNodes.push([
      'Multiply',
      exactPolynomialToNode(logPolynomial),
      ['Ln', exactPolynomialToNode(affine)],
    ]);
  }
  if (correction.polynomialIntegral && !exactPolynomialIsZero(correction.polynomialIntegral)) {
    const negatedCorrection = scaleExactPolynomial(
      correction.polynomialIntegral,
      { numerator: -1, denominator: 1 },
    );
    expressionParts.push(exactPolynomialToLatex(negatedCorrection));
    expressionNodes.push(exactPolynomialToNode(negatedCorrection));
  }

  const expression = joinAdditiveParts(expressionParts);
  if (!expression) {
    return undefined;
  }
  const expressionNode = expressionNodes.length === 1
    ? expressionNodes[0]
    : ['Add', ...expressionNodes];
  return logFactor[0] === 'Log'
    ? {
        exactLatex: `\\frac{${expression}}{\\ln(10)}`,
        antiderivativeNode: ['Divide', expressionNode, ['Ln', 10]],
      }
    : { exactLatex: expression, antiderivativeNode: expressionNode };
}

export function derivativeRatioIntegral(node: unknown, variable: string): NativeRuleResult | undefined {
  if (!isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3) {
    return undefined;
  }

  const denominator = node[2];
  const numeratorTerms = toPolynomialTerms(node[1], variable);
  const denominatorDerivativeTerms = toPolynomialTerms(
    simplifyNode(differentiateNode(denominator, variable)),
    variable,
  );
  if (!numeratorTerms || !denominatorDerivativeTerms || numeratorTerms.length !== denominatorDerivativeTerms.length) {
    return undefined;
  }

  let ratio: number | undefined;
  for (let index = 0; index < numeratorTerms.length; index += 1) {
    const numeratorTerm = numeratorTerms[index];
    const denominatorTerm = denominatorDerivativeTerms[index];
    if (numeratorTerm.degree !== denominatorTerm.degree) {
      return undefined;
    }

    if (Math.abs(denominatorTerm.coefficient) < 1e-10) {
      return undefined;
    }

    const nextRatio = numeratorTerm.coefficient / denominatorTerm.coefficient;
    if (ratio === undefined) {
      ratio = nextRatio;
      continue;
    }

    if (Math.abs(ratio - nextRatio) > 1e-10) {
      return undefined;
    }
  }

  if (ratio === undefined) {
    return undefined;
  }

  return {
    exactLatex: scaleLatex(`\\ln\\left|${wrapGroupedLatex(boxLatex(denominator))}\\right|`, ratio),
    antiderivativeNode: scaleNativeNode(['Ln', ['Abs', denominator]], ratio),
  };
}

export function normalizeIntegralLatexInput(latex: string) {
  let normalized = latex.replace(/\)\s*(?=(?:\(|e\^|\\(?:sin|cos|tan|ln|log)\b))/g, ')\\cdot ');
  let cursor = 0;

  while (cursor < normalized.length) {
    const start = normalized.indexOf('e^(', cursor);
    if (start === -1) {
      break;
    }

    let depth = 1;
    let index = start + 3;
    let body = '';
    while (index < normalized.length && depth > 0) {
      const character = normalized[index];
      if (character === '(') {
        depth += 1;
      } else if (character === ')') {
        depth -= 1;
      }

      if (depth > 0) {
        body += character;
      }
      index += 1;
    }

    if (depth !== 0) {
      break;
    }

    normalized = `${normalized.slice(0, start)}e^{${body}}${normalized.slice(index)}`;
    cursor = start + body.length + 3;
  }

  return normalized;
}

function reciprocalFactor(node: unknown): unknown {
  if (isNodeArray(node) && node[0] === 'Sqrt' && node.length === 2) {
    return ['Power', node[1], -0.5];
  }

  if (isNodeArray(node) && node[0] === 'Power' && node.length === 3) {
    const exponent = numericNodeValue(node[2]);
    if (exponent !== undefined) {
      return ['Power', node[1], -exponent];
    }
  }

  return ['Power', node, -1];
}

function substitutionFactors(node: unknown): unknown[] {
  if (isNodeArray(node) && node[0] === 'Divide' && node.length === 3) {
    return [
      ...substitutionFactors(node[1]),
      ...substitutionFactors(node[2]).map(reciprocalFactor),
    ];
  }

  if (isNodeArray(node) && node[0] === 'Multiply') {
    return flattenMultiply(node);
  }

  return [node];
}

function substitutionInner(outer: unknown) {
  if (
    isNodeArray(outer)
    && ['Arctan', 'Arcsin'].includes(String(outer[0]))
    && outer.length === 2
  ) {
    return outer;
  }

  if (
    isNodeArray(outer)
    && ['Sin', 'Cos', 'Ln', 'Log', 'Sqrt'].includes(String(outer[0]))
    && outer.length === 2
  ) {
    return outer[1];
  }

  if (isNodeArray(outer) && outer[0] === 'Power' && outer.length === 3) {
    return outer[1] === 'ExponentialE' ? outer[2] : outer[1];
  }

  if (isNodeArray(outer) && outer[0] === 'Divide' && outer.length === 3 && outer[1] === 1) {
    return outer[2];
  }

  return undefined;
}

function derivativeFactorFromRemaining(factors: unknown[], selectedIndex: number) {
  const remaining = factors.filter((_, factorIndex) => factorIndex !== selectedIndex);
  if (remaining.length === 0) {
    return 1;
  }

  return remaining.length === 1 ? remaining[0] : ['Multiply', ...remaining];
}

function isPowerOfFunction(node: unknown, head: string, exponent: number) {
  return isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && numericNodeValue(node[2]) === exponent
    && isNodeArray(node[1])
    && node[1][0] === head
    && node[1].length === 2
    ? node[1][1]
    : undefined;
}

function reciprocalDenominatorEquivalentScale(
  candidate: unknown,
  reference: unknown,
  variable: string,
): number | undefined {
  if (!isNodeArray(candidate) || candidate[0] !== 'Power' || candidate.length !== 3) {
    return undefined;
  }
  if (numericNodeValue(candidate[2]) !== -1) {
    return undefined;
  }

  if (
    isNodeArray(reference)
    && reference[0] === 'Divide'
    && reference.length === 3
  ) {
    const numerator = numericNodeValue(reference[1]);
    return numerator !== undefined
      && Math.abs(numerator) > 1e-10
      && equivalentDenominator(candidate[1], reference[2], variable)
      ? 1 / numerator
      : undefined;
  }

  return undefined;
}

function equivalentExactPolynomials(left: unknown, right: unknown, variable: string) {
  const leftPolynomial = parseExactPolynomial(
    expandSimplePolynomialPowers(simplifyNode(left), variable),
    variable,
    BY_PARTS_POLYNOMIAL_DEGREE_CAP,
  );
  const rightPolynomial = parseExactPolynomial(
    expandSimplePolynomialPowers(simplifyNode(right), variable),
    variable,
    BY_PARTS_POLYNOMIAL_DEGREE_CAP,
  );
  if (!leftPolynomial || !rightPolynomial) {
    return false;
  }
  const degree = Math.max(
    exactPolynomialDegree(leftPolynomial),
    exactPolynomialDegree(rightPolynomial),
  );
  for (let index = 0; index <= degree; index += 1) {
    const leftCoefficient = getExactPolynomialCoefficient(leftPolynomial, index);
    const rightCoefficient = getExactPolynomialCoefficient(rightPolynomial, index);
    if (!exactScalarIsZero({
      numerator: leftCoefficient.numerator * rightCoefficient.denominator
        - rightCoefficient.numerator * leftCoefficient.denominator,
      denominator: leftCoefficient.denominator * rightCoefficient.denominator,
    })) {
      return false;
    }
  }
  return true;
}

function equivalentDenominator(left: unknown, right: unknown, variable: string) {
  return areEquivalentNodes(simplifyNode(left), simplifyNode(right))
    || equivalentExactPolynomials(left, right, variable);
}

function expandSimplePolynomialPowers(node: unknown, variable: string): unknown {
  if (!isNodeArray(node)) {
    return node;
  }

  if (
    node[0] === 'Power'
    && node.length === 3
    && numericNodeValue(node[2]) === 2
    && isNodeArray(node[1])
    && node[1][0] === 'Multiply'
    && node[1].length === 3
  ) {
    const leftScalar = numericNodeValue(node[1][1]);
    if (leftScalar !== undefined && node[1][2] === variable) {
      return ['Multiply', leftScalar * leftScalar, ['Power', variable, 2]];
    }
    const rightScalar = numericNodeValue(node[1][2]);
    if (rightScalar !== undefined && node[1][1] === variable) {
      return ['Multiply', rightScalar * rightScalar, ['Power', variable, 2]];
    }
  }

  return [node[0], ...node.slice(1).map((child) => expandSimplePolynomialPowers(child, variable))];
}

function trigIdentityDerivativeScale(candidate: unknown, reference: unknown): number | undefined {
  const candidateCos = isPowerOfFunction(candidate, 'Cos', -2);
  const referenceSec = isPowerOfFunction(reference, 'Sec', 2);
  if (candidateCos !== undefined && referenceSec !== undefined && sameNode(candidateCos, referenceSec)) {
    return 1;
  }

  const candidateSec = isPowerOfFunction(candidate, 'Sec', 2);
  const referenceCos = isPowerOfFunction(reference, 'Cos', -2);
  if (candidateSec !== undefined && referenceCos !== undefined && sameNode(candidateSec, referenceCos)) {
    return 1;
  }

  const candidateCsc = isPowerOfFunction(candidate, 'Csc', 2);
  const referenceSin = isPowerOfFunction(reference, 'Sin', -2);
  if (candidateCsc !== undefined && referenceSin !== undefined && sameNode(candidateCsc, referenceSin)) {
    return 1;
  }

  const candidateSin = isPowerOfFunction(candidate, 'Sin', -2);
  const referenceCsc = isPowerOfFunction(reference, 'Csc', 2);
  if (candidateSin !== undefined && referenceCsc !== undefined && sameNode(candidateSin, referenceCsc)) {
    return 1;
  }

  return undefined;
}

function derivativeScale(candidate: unknown, reference: unknown, variable: string): number | undefined {
  const direct = proportionalScale(candidate, reference, variable);
  if (direct !== undefined) {
    return direct;
  }

  if (isNodeArray(reference) && reference[0] === 'Negate' && reference.length === 2) {
    const negated = derivativeScale(candidate, reference[1], variable);
    return negated === undefined ? undefined : -negated;
  }

  if (isNodeArray(candidate) && candidate[0] === 'Negate' && candidate.length === 2) {
    const negated = derivativeScale(candidate[1], reference, variable);
    return negated === undefined ? undefined : -negated;
  }

  return trigIdentityDerivativeScale(candidate, reference)
    ?? reciprocalDenominatorEquivalentScale(candidate, reference, variable);
}

export function trySubstitutionRule(node: unknown, variable: string) {
  const squareRootSubstitution = trySquareRootSubstitutionRule(node, variable);
  if (squareRootSubstitution) {
    return squareRootSubstitution;
  }

  const factors = substitutionFactors(node);
  for (let index = 0; index < factors.length; index += 1) {
    const outer = factors[index];
    const inner = substitutionInner(outer);

    if (!inner) {
      continue;
    }

    if (sameNode(inner, variable)) {
      continue;
    }

    const derivative = simplifyNode(differentiateNode(inner, variable));
    const derivativeFactor = derivativeFactorFromRemaining(factors, index);
    const scale = derivativeScale(derivativeFactor, derivative, variable);
    if (scale === undefined) {
      continue;
    }

    const solved = integralOfOuter(inner, outer, scale);
    if (solved) {
      return solved;
    }
  }

  return undefined;
}

function productWithSelectedFactor(
  factors: unknown[],
  selectedIndex: number,
) {
  const remaining = factors.filter((_, index) => index !== selectedIndex);
  if (remaining.length === 0) {
    return undefined;
  }

  return remaining.length === 1 ? remaining[0] : ['Multiply', ...remaining];
}

export function tryPartsRuleDetailed(
  node: unknown,
  variable: string,
): string | PartsRuleDetailedResult | undefined {
  if (!isNodeArray(node) || node[0] !== 'Multiply') {
    return undefined;
  }

  const factors = flattenMultiply(node);

  const exponentialIndex = factors.findIndex((factor) =>
    isNodeArray(factor)
    && factor[0] === 'Power'
    && factor.length === 3
    && (factor[1] === 'ExponentialE' || isNumericBaseExponentialFactor(factor)),
  );
  if (exponentialIndex >= 0) {
    const polynomialNode = productWithSelectedFactor(factors, exponentialIndex);
    const exponential = factors[exponentialIndex];
    const terms = polynomialNode ? toPolynomialTerms(polynomialNode, variable) : undefined;
    const exactPolynomial = polynomialNode
      ? parseExactPolynomial(polynomialNode, variable, BY_PARTS_POLYNOMIAL_DEGREE_CAP)
      : undefined;
    if (terms && isNodeArray(exponential) && exponential.length === 3) {
      if (exponential[1] === 'ExponentialE') {
        const exactAffine = parseExactAffineArgument(exponential[2], variable);
        if (exactPolynomial && exactAffine) {
          const solved = solveExactPolynomialTimesExponential(
            exactPolynomial,
            exactAffine.slope,
            exactAffine.latex,
            exponential[2],
          );
          if (solved) {
            return solved;
          }
        }

        const affine = parseAffine(exponential[2], variable);
        if (affine) {
          const solved = solvePolynomialTimesExponential(terms, affine.a, affine.latex);
          if (solved) {
            return solved;
          }
        }
      } else {
        const solved = tryPolynomialTimesNumericBaseExponential(exponential, terms, variable);
        if (solved) {
          return solved;
        }
      }
    }
  }

  const trigIndex = factors.findIndex((factor) =>
    isNodeArray(factor)
    && factor.length === 2
    && (factor[0] === 'Sin' || factor[0] === 'Cos'),
  );
  if (trigIndex >= 0) {
    const polynomialNode = productWithSelectedFactor(factors, trigIndex);
    const trigFactor = factors[trigIndex];
    const terms = polynomialNode ? toPolynomialTerms(polynomialNode, variable) : undefined;
    const exactPolynomial = polynomialNode
      ? parseExactPolynomial(polynomialNode, variable, BY_PARTS_POLYNOMIAL_DEGREE_CAP)
      : undefined;
    const affine =
      isNodeArray(trigFactor) && trigFactor.length === 2
        ? parseAffine(trigFactor[1], variable)
        : undefined;
    const exactAffine =
      isNodeArray(trigFactor) && trigFactor.length === 2
        ? parseExactAffineArgument(trigFactor[1], variable)
        : undefined;
    const trigKind =
      isNodeArray(trigFactor) && trigFactor[0] === 'Sin' ? 'sin' : 'cos';
    if (exactPolynomial && exactAffine) {
      const angleNode = isNodeArray(trigFactor) ? trigFactor[1] : undefined;
      if (angleNode === undefined) {
        return undefined;
      }
      const solved = solveExactPolynomialTimesTrig(
        exactPolynomial,
        exactAffine.slope,
        exactAffine.latex,
        angleNode,
        trigKind,
      );
      if (solved) {
        return solved;
      }
    }
    if (terms && affine) {
      const solved = solvePolynomialTimesTrig(terms, affine.a, affine.latex, trigKind);
      if (solved) {
        return solved;
      }
    }
  }

  const logIndex = factors.findIndex((factor) =>
    isNodeArray(factor)
    && factor.length === 2
    && (factor[0] === 'Ln' || factor[0] === 'Log')
    && exactPolynomialDegree(parseExactPolynomial(factor[1], variable, 1) ?? { variable, terms: new Map() }) === 1,
  );
  if (logIndex >= 0) {
    const polynomialNode = productWithSelectedFactor(factors, logIndex);
    const logFactor = factors[logIndex];
    if (polynomialNode) {
      const solved = solvePolynomialTimesLog(polynomialNode, logFactor, variable);
      if (solved) {
        return solved;
      }
    }
  }

  return undefined;
}

export function tryPartsRule(node: unknown, variable: string) {
  return partsRuleString(tryPartsRuleDetailed(node, variable));
}
