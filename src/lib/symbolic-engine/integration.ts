import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  backcheckAntiderivative,
  type AntiderivativeBackcheck,
} from '../calculus-verification';
import { resolveAntiderivativeRule } from '../antiderivative-rules';
import {
  areEquivalentNodes,
  differentiateNode,
  simplifyNode,
} from './differentiation';
import {
  boxLatex,
  divideByNumericCoefficient,
  flattenMultiply,
  isFiniteNumber,
  isNodeArray,
  multiplyLatex,
  parseAffine,
  toPolynomialTerms,
  type PolynomialTerm,
  wrapGroupedLatex,
} from './patterns';
import type { CalculusIntegrationStrategy } from '../../types/calculator';

const ce = new ComputeEngine();
const BY_PARTS_POLYNOMIAL_DEGREE_CAP = 6;
const LOG_BY_PARTS_POLYNOMIAL_DEGREE_CAP = 4;
const RATIONAL_APPROX_MAX_DENOMINATOR = 24;

export type IntegralStrategy = CalculusIntegrationStrategy;

export type IntegralResolution =
  | {
      kind: 'success';
      exactLatex: string;
      origin: 'rule-based-symbolic';
      strategy: IntegralStrategy;
      verification: AntiderivativeBackcheck;
    }
  | {
      kind: 'error';
      error: string;
    };

function symbolicSuccess(
  node: unknown,
  variable: string,
  exactLatex: string,
  strategy: IntegralStrategy,
): IntegralResolution {
  return {
    kind: 'success',
    exactLatex,
    origin: 'rule-based-symbolic',
    strategy,
    verification: backcheckAntiderivative({
      antiderivativeLatex: exactLatex,
      integrand: node,
      variable,
    }),
  };
}

function scaleLatex(latex: string, scale: number) {
  if (Math.abs(scale - 1) < 1e-10) {
    return latex;
  }

  if (Math.abs(scale + 1) < 1e-10) {
    return `-${wrapGroupedLatex(latex)}`;
  }

  const rational = rationalApproximation(scale);
  if (rational) {
    const sign = rational.numerator < 0 ? '-' : '';
    const numerator = Math.abs(rational.numerator);
    if (rational.denominator === 1) {
      return `${sign}${multiplyLatex(String(numerator), latex)}`;
    }

    if (numerator === 1) {
      const divided = divideByNumericCoefficient(latex, rational.denominator);
      return sign ? `-${wrapGroupedLatex(divided)}` : divided;
    }

    return `${sign}\\frac{${numerator}${wrapGroupedLatex(latex)}}{${rational.denominator}}`;
  }

  const reciprocal = 1 / scale;
  if (Math.abs(reciprocal - Math.round(reciprocal)) < 1e-10) {
    return divideByNumericCoefficient(latex, Math.round(reciprocal));
  }

  return multiplyLatex(boxLatex(scale), latex);
}

function rationalApproximation(value: number) {
  if (!Number.isFinite(value)) {
    return undefined;
  }

  for (let denominator = 1; denominator <= RATIONAL_APPROX_MAX_DENOMINATOR; denominator += 1) {
    const numerator = Math.round(value * denominator);
    if (Math.abs(value - numerator / denominator) < 1e-10) {
      return { numerator, denominator };
    }
  }

  return undefined;
}

function numericNodeValue(node: unknown) {
  if (isFiniteNumber(node)) {
    return node;
  }

  if (
    isNodeArray(node)
    && node[0] === 'Rational'
    && node.length === 3
    && isFiniteNumber(node[1])
    && isFiniteNumber(node[2])
    && node[2] !== 0
  ) {
    return node[1] / node[2];
  }

  return undefined;
}

function numberLatex(value: number) {
  const rational = rationalApproximation(value);
  if (rational) {
    if (rational.denominator === 1) {
      return String(rational.numerator);
    }

    return `\\frac{${rational.numerator}}{${rational.denominator}}`;
  }

  return boxLatex(value);
}

function sameNode(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function proportionalScale(candidate: unknown, reference: unknown, variable: string) {
  if (areEquivalentNodes(candidate, reference)) {
    return 1;
  }

  if (isFiniteNumber(candidate) && isFiniteNumber(reference) && Math.abs(reference) > 1e-10) {
    return candidate / reference;
  }

  const candidateTerms = toPolynomialTerms(candidate, variable);
  const referenceTerms = toPolynomialTerms(reference, variable);
  if (!candidateTerms || !referenceTerms || candidateTerms.length !== referenceTerms.length) {
    return undefined;
  }

  let ratio: number | undefined;
  for (let index = 0; index < candidateTerms.length; index += 1) {
    const candidateTerm = candidateTerms[index];
    const referenceTerm = referenceTerms[index];
    if (candidateTerm.degree !== referenceTerm.degree) {
      return undefined;
    }

    if (Math.abs(referenceTerm.coefficient) < 1e-10) {
      return undefined;
    }

    const nextRatio = candidateTerm.coefficient / referenceTerm.coefficient;
    if (ratio === undefined) {
      ratio = nextRatio;
      continue;
    }

    if (Math.abs(ratio - nextRatio) > 1e-10) {
      return undefined;
    }
  }

  return ratio;
}

function integralOfOuter(inner: unknown, outer: unknown, scale = 1) {
  const applyScale = (latex: string) => scaleLatex(latex, scale);
  const innerLatex = wrapGroupedLatex(boxLatex(inner));

  if (isNodeArray(outer) && outer[0] === 'Cos' && outer.length === 2) {
    return applyScale(`\\sin\\left(${innerLatex}\\right)`);
  }

  if (isNodeArray(outer) && outer[0] === 'Sin' && outer.length === 2) {
    return applyScale(`-\\cos\\left(${innerLatex}\\right)`);
  }

  if (isNodeArray(outer) && outer[0] === 'Ln' && outer.length === 2 && sameNode(outer[1], inner)) {
    return applyScale(`${innerLatex}\\ln\\left(${innerLatex}\\right)-${innerLatex}`);
  }

  if (isNodeArray(outer) && outer[0] === 'Log' && outer.length === 2 && sameNode(outer[1], inner)) {
    return applyScale(`\\frac{${innerLatex}\\ln\\left(${innerLatex}\\right)-${innerLatex}}{\\ln(10)}`);
  }

  if (isNodeArray(outer) && outer[0] === 'Sqrt' && outer.length === 2 && sameNode(outer[1], inner)) {
    return scaleLatex(`${innerLatex}^{\\frac{3}{2}}`, (2 * scale) / 3);
  }

  if (
    isNodeArray(outer)
    && outer[0] === 'Power'
    && outer.length === 3
    && outer[1] === 'ExponentialE'
    && sameNode(outer[2], inner)
  ) {
    return applyScale(`e^{${boxLatex(inner)}}`);
  }

  if (isNodeArray(outer) && outer[0] === 'Power' && outer.length === 3) {
    const exponent = numericNodeValue(outer[2]);
    if (exponent === undefined || !sameNode(outer[1], inner)) {
      return undefined;
    }

    if (exponent === -1) {
      return applyScale(`\\ln\\left|${innerLatex}\\right|`);
    }

    const nextExponent = exponent + 1;
    if (Math.abs(nextExponent) < 1e-10) {
      return undefined;
    }

    return scaleLatex(
      `${innerLatex}^{${numberLatex(nextExponent)}}`,
      scale / nextExponent,
    );
  }

  if (isNodeArray(outer) && outer[0] === 'Divide' && outer.length === 3 && outer[1] === 1) {
    if (sameNode(outer[2], inner)) {
      return applyScale(`\\ln\\left|${innerLatex}\\right|`);
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
  const wrappedAngle = wrapGroupedLatex(angleLatex);
  const pieces: string[] = [];
  if (sinLatex !== '0') {
    pieces.push(multiplyLatex(sinLatex, `\\sin\\left(${wrappedAngle}\\right)`));
  }
  if (cosLatex !== '0') {
    pieces.push(multiplyLatex(cosLatex, `\\cos\\left(${wrappedAngle}\\right)`));
  }
  return pieces.join('+') || undefined;
}

function solvePolynomialTimesLog(terms: PolynomialTerm[], variable: string) {
  if (polynomialDegree(terms) > LOG_BY_PARTS_POLYNOMIAL_DEGREE_CAP) {
    return undefined;
  }

  const pieces: string[] = [];
  for (const term of terms) {
    const nextDegree = term.degree + 1;
    const powerLatex = nextDegree === 1 ? variable : `${variable}^{${nextDegree}}`;
    const leading = divideByNumericCoefficient(powerLatex, nextDegree);
    const correction = divideByNumericCoefficient(powerLatex, nextDegree ** 2);
    const integrated = `${leading}\\ln\\left(${variable}\\right)-${correction}`;
    pieces.push(scaleLatex(integrated, term.coefficient));
  }

  return pieces.join('+') || undefined;
}

function derivativeRatioIntegral(node: unknown, variable: string) {
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

  return scaleLatex(`\\ln\\left|${wrapGroupedLatex(boxLatex(denominator))}\\right|`, ratio);
}

function squaredAffineTerm(node: unknown, variable: string) {
  if (
    isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && isFiniteNumber(node[2])
    && node[2] === 2
  ) {
    const affine = parseAffine(node[1], variable);
    if (affine) {
      return affine;
    }
  }

  return undefined;
}

function normalizedSqrtConstant(value: number) {
  if (value <= 0) {
    return undefined;
  }

  const root = Math.sqrt(value);
  return Math.abs(root - Math.round(root)) < 1e-10 ? Math.round(root) : undefined;
}

function affineRatioLatex(affineLatex: string, constant: number) {
  return constant === 1
    ? affineLatex
    : `\\frac{${affineLatex}}{${boxLatex(constant)}}`;
}

function reciprocalSqrtBody(node: unknown) {
  if (
    isNodeArray(node)
    && node[0] === 'Sqrt'
    && node.length === 2
    && isNodeArray(node[1])
    && node[1][0] === 'Divide'
    && node[1].length === 3
    && node[1][1] === 1
  ) {
    return node[1][2];
  }

  if (isNodeArray(node) && node[0] === 'Divide' && node.length === 3 && node[1] === 1) {
    const denominator = node[2];
    if (isNodeArray(denominator) && denominator[0] === 'Sqrt' && denominator.length === 2) {
      return denominator[1];
    }
  }

  if (
    isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && isFiniteNumber(node[2])
    && node[2] === -0.5
  ) {
    return node[1];
  }

  return undefined;
}

function normalizeIntegralLatexInput(latex: string) {
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

function inverseTrigIntegral(node: unknown, variable: string) {
  if (
    isNodeArray(node)
    && node[0] === 'Divide'
    && node.length === 3
    && node[1] === 1
    && isNodeArray(node[2])
    && node[2][0] === 'Add'
    && node[2].length === 3
  ) {
    const left = node[2][1];
    const right = node[2][2];
    const constant =
      isFiniteNumber(left) && squaredAffineTerm(right, variable)
        ? left
        : isFiniteNumber(right) && squaredAffineTerm(left, variable)
          ? right
          : undefined;
    const affine =
      isFiniteNumber(left)
        ? squaredAffineTerm(right, variable)
        : isFiniteNumber(right)
          ? squaredAffineTerm(left, variable)
          : undefined;
    const a = constant === undefined ? undefined : normalizedSqrtConstant(constant);
    if (affine && a && affine.a !== 0) {
      return divideByNumericCoefficient(
        `\\arctan\\left(${affineRatioLatex(affine.latex, a)}\\right)`,
        affine.a * a,
      );
    }
  }

  const sqrtBody = reciprocalSqrtBody(node);
  if (
    sqrtBody
    && isNodeArray(sqrtBody)
    && sqrtBody[0] === 'Add'
    && sqrtBody.length === 3
  ) {
    const left = sqrtBody[1];
    const right = sqrtBody[2];
    const constant =
      isFiniteNumber(left) && isNodeArray(right) && right[0] === 'Negate'
        ? left
        : isFiniteNumber(right) && isNodeArray(left) && left[0] === 'Negate'
          ? right
          : undefined;
    const negatedPower =
      isFiniteNumber(left) && isNodeArray(right) && right[0] === 'Negate'
        ? right[1]
        : isFiniteNumber(right) && isNodeArray(left) && left[0] === 'Negate'
          ? left[1]
          : undefined;
    const affine = negatedPower ? squaredAffineTerm(negatedPower, variable) : undefined;
    const a = constant === undefined ? undefined : normalizedSqrtConstant(constant);
    if (affine && a && affine.a !== 0) {
      return divideByNumericCoefficient(
        `\\arcsin\\left(${affineRatioLatex(affine.latex, a)}\\right)`,
        affine.a,
      );
    }
  }

  return undefined;
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

function trySubstitutionRule(node: unknown, variable: string) {
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
    const scale = proportionalScale(derivativeFactor, derivative, variable);
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

function tryPartsRule(node: unknown, variable: string) {
  if (!isNodeArray(node) || node[0] !== 'Multiply') {
    return undefined;
  }

  const factors = flattenMultiply(node);

  const exponentialIndex = factors.findIndex((factor) =>
    isNodeArray(factor)
    && factor[0] === 'Power'
    && factor.length === 3
    && factor[1] === 'ExponentialE',
  );
  if (exponentialIndex >= 0) {
    const polynomialNode = productWithSelectedFactor(factors, exponentialIndex);
    const exponential = factors[exponentialIndex];
    const terms = polynomialNode ? toPolynomialTerms(polynomialNode, variable) : undefined;
    const affine =
      isNodeArray(exponential) && exponential.length === 3
        ? parseAffine(exponential[2], variable)
        : undefined;
    if (terms && affine) {
      const solved = solvePolynomialTimesExponential(terms, affine.a, affine.latex);
      if (solved) {
        return solved;
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
    const affine =
      isNodeArray(trigFactor) && trigFactor.length === 2
        ? parseAffine(trigFactor[1], variable)
        : undefined;
    const trigKind =
      isNodeArray(trigFactor) && trigFactor[0] === 'Sin' ? 'sin' : 'cos';
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
    && factor[1] === variable,
  );
  if (logIndex >= 0) {
    const polynomialNode = productWithSelectedFactor(factors, logIndex);
    const terms = polynomialNode ? toPolynomialTerms(polynomialNode, variable) : undefined;
    if (terms) {
      const solved = solvePolynomialTimesLog(terms, variable);
      if (solved) {
        return solved;
      }
    }
  }

  return undefined;
}

export function resolveSymbolicIntegralFromAst(node: unknown, variable = 'x'): IntegralResolution {
  const inverseTrig = inverseTrigIntegral(node, variable);
  if (inverseTrig) {
    return symbolicSuccess(node, variable, inverseTrig, 'inverse-trig');
  }

  const derivativeRatio = derivativeRatioIntegral(node, variable);
  if (derivativeRatio) {
    return symbolicSuccess(node, variable, derivativeRatio, 'derivative-ratio');
  }

  const substitution = trySubstitutionRule(node, variable);
  if (substitution) {
    return symbolicSuccess(node, variable, substitution, 'u-substitution');
  }

  const basic = resolveAntiderivativeRule(node, variable);
  if (basic) {
    return symbolicSuccess(node, variable, basic, 'direct-rule');
  }

  const byParts = tryPartsRule(node, variable);
  if (byParts) {
    return symbolicSuccess(node, variable, byParts, 'integration-by-parts');
  }

  const affine = parseAffine(node, variable);
  if (affine && affine.a !== 0) {
    return symbolicSuccess(
      node,
      variable,
      divideByNumericCoefficient(
        `${wrapGroupedLatex(affine.latex)}^{2}`,
        2 * affine.a,
      ),
      'affine-linear',
    );
  }

  return {
    kind: 'error',
    error: 'This antiderivative could not be determined symbolically in this milestone.',
  };
}

export function resolveSymbolicIntegralFromLatex(latex: string, variable = 'x'): IntegralResolution {
  const parsed = ce.parse(normalizeIntegralLatexInput(latex));
  return resolveSymbolicIntegralFromAst(parsed.json, variable);
}
