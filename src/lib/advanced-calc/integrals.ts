import { ComputeEngine } from '@cortex-js/compute-engine';
import { integrateAdaptiveSimpson } from '../adaptive-simpson';
import { formatNumber, latexToApproxText, numberToLatex } from '../format';
import { getResultGuardError } from '../result-guard';
import { resolveAntiderivativeRule } from '../antiderivative-rules';
import { resolveSymbolicIntegralFromAst } from '../symbolic-engine/integration';
import type {
  AdvancedCalcResultOrigin,
  AdvancedDefiniteIntegralState,
  AdvancedImproperIntegralState,
  AdvancedIndefiniteIntegralState,
} from '../../types/calculator';

const ce = new ComputeEngine();
type BoxedLike = {
  latex: string;
  json: unknown;
  evaluate: () => BoxedLike;
  N?: () => BoxedLike;
  subs: (scope: Record<string, number>) => BoxedLike;
};

export type AdvancedCalcEvaluation = {
  exactLatex?: string;
  approxText?: string;
  warnings: string[];
  error?: string;
  resultOrigin?: AdvancedCalcResultOrigin;
};

type PolynomialTerm = {
  degree: number;
  coefficient: number;
};

type AffineForm = {
  a: number;
  b: number;
  latex: string;
};

function box(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]) as BoxedLike;
}

function isNodeArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function isFiniteNumber(node: unknown): node is number {
  return typeof node === 'number' && Number.isFinite(node);
}

function wrapGroupedLatex(latex: string) {
  return /^[-+]?\w+(?:\^\{?[-+]?\d+\}?)?$/.test(latex) ? latex : `\\left(${latex}\\right)`;
}

function multiplyLatex(left: string, right: string) {
  if (left === '1') {
    return right;
  }

  if (left === '-1') {
    return `-${wrapGroupedLatex(right)}`;
  }

  return `${left}${wrapGroupedLatex(right)}`;
}

function divideByNumericCoefficient(numeratorLatex: string, denominator: number) {
  if (denominator === 1) {
    return numeratorLatex;
  }

  if (denominator === -1) {
    return `-${wrapGroupedLatex(numeratorLatex)}`;
  }

  return `\\frac{${numeratorLatex}}{${box(denominator).latex}}`;
}

function dependsOnVariable(node: unknown, variable: string): boolean {
  if (node === variable) {
    return true;
  }

  if (!isNodeArray(node)) {
    return false;
  }

  return node.some((child, index) => index > 0 && dependsOnVariable(child, variable));
}

function parseLinearTerm(node: unknown, variable: string) {
  if (node === variable) {
    return 1;
  }

  if (!isNodeArray(node) || node[0] !== 'Multiply' || node.length !== 3) {
    return undefined;
  }

  if (node[1] === variable && isFiniteNumber(node[2])) {
    return node[2];
  }

  if (node[2] === variable && isFiniteNumber(node[1])) {
    return node[1];
  }

  return undefined;
}

function parseAffine(node: unknown, variable: string): AffineForm | undefined {
  if (node === variable) {
    return { a: 1, b: 0, latex: variable };
  }

  const linear = parseLinearTerm(node, variable);
  if (linear !== undefined) {
    return {
      a: linear,
      b: 0,
      latex: box(node).latex,
    };
  }

  if (!isNodeArray(node) || node[0] !== 'Add' || node.length !== 3) {
    return undefined;
  }

  const left = node[1];
  const right = node[2];
  if (isFiniteNumber(left)) {
    const affine = parseAffine(right, variable);
    return affine
      ? { a: affine.a, b: affine.b + left, latex: box(node).latex }
      : undefined;
  }

  if (isFiniteNumber(right)) {
    const affine = parseAffine(left, variable);
    return affine
      ? { a: affine.a, b: affine.b + right, latex: box(node).latex }
      : undefined;
  }

  return undefined;
}

function numericConstant(node: unknown): number | undefined {
  if (isFiniteNumber(node)) {
    return node;
  }

  if (!isNodeArray(node)) {
    return undefined;
  }

  if (node[0] === 'Multiply') {
    let product = 1;
    for (const factor of node.slice(1)) {
      const numeric = numericConstant(factor);
      if (numeric === undefined) {
        return undefined;
      }
      product *= numeric;
    }
    return product;
  }

  return undefined;
}

function polynomialTerms(node: unknown, variable: string): Map<number, number> | undefined {
  if (!dependsOnVariable(node, variable)) {
    const constant = numericConstant(node);
    return constant === undefined ? undefined : new Map([[0, constant]]);
  }

  if (node === variable) {
    return new Map([[1, 1]]);
  }

  if (isNodeArray(node) && node[0] === 'Add') {
    const result = new Map<number, number>();
    for (const term of node.slice(1)) {
      const partial = polynomialTerms(term, variable);
      if (!partial) {
        return undefined;
      }

      for (const [degree, coefficient] of partial.entries()) {
        result.set(degree, (result.get(degree) ?? 0) + coefficient);
      }
    }

    return result;
  }

  if (isNodeArray(node) && node[0] === 'Multiply') {
    let coefficient = 1;
    let degree = 0;

    for (const factor of node.slice(1)) {
      if (!dependsOnVariable(factor, variable)) {
        const numeric = numericConstant(factor);
        if (numeric === undefined) {
          return undefined;
        }
        coefficient *= numeric;
        continue;
      }

      if (factor === variable) {
        degree += 1;
        continue;
      }

      if (
        isNodeArray(factor)
        && factor[0] === 'Power'
        && factor[1] === variable
        && factor.length === 3
        && isFiniteNumber(factor[2])
        && Number.isInteger(factor[2])
      ) {
        degree += factor[2];
        continue;
      }

      return undefined;
    }

    return new Map([[degree, coefficient]]);
  }

  if (
    isNodeArray(node)
    && node[0] === 'Power'
    && node[1] === variable
    && node.length === 3
    && isFiniteNumber(node[2])
    && Number.isInteger(node[2])
  ) {
    return new Map([[node[2], 1]]);
  }

  return undefined;
}

function toPolynomialTerms(node: unknown, variable: string): PolynomialTerm[] | undefined {
  const terms = polynomialTerms(node, variable);
  if (!terms) {
    return undefined;
  }

  return [...terms.entries()]
    .filter(([, coefficient]) => Math.abs(coefficient) > 1e-10)
    .map(([degree, coefficient]) => ({ degree, coefficient }))
    .sort((left, right) => right.degree - left.degree);
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
    const abs = Math.abs(coefficient);
    let term = '';

    if (degree === 0) {
      term = box(abs).latex;
    } else if (degree === 1) {
      term = abs === 1 ? 'x' : `${box(abs).latex}x`;
    } else {
      term = abs === 1 ? `x^{${degree}}` : `${box(abs).latex}x^{${degree}}`;
    }

    terms.push(terms.length === 0 ? (sign === '-' ? `-${term}` : term) : `${sign}${term}`);
  }

  return terms.join('') || '0';
}

function solvePolynomialTimesExponential(
  terms: PolynomialTerm[],
  affine: AffineForm,
) {
  if (affine.a === 0 || polynomialDegree(terms) > 6) {
    return undefined;
  }

  const p = polynomialToAscendingCoefficients(terms);
  const q = Array.from({ length: p.length }, () => 0);
  const last = p.length - 1;
  q[last] = p[last] / affine.a;
  for (let degree = last - 1; degree >= 0; degree -= 1) {
    q[degree] = (p[degree] - (degree + 1) * q[degree + 1]) / affine.a;
  }

  return `${box(['Power', 'ExponentialE', affine.a === 1 && affine.b === 0 ? 'x' : box(['Add', ['Multiply', affine.a, 'x'], affine.b]).json]).latex}\\left(${polynomialFromAscendingCoefficients(q)}\\right)`;
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
  a: number,
  kind: 'sin' | 'cos',
) {
  const degree = polynomialDegree(terms);
  if (degree > 6 || a === 0) {
    return undefined;
  }

  const size = degree + 1;
  const unknownCount = size * 2;
  const matrix: number[][] = Array.from({ length: unknownCount }, () =>
    Array.from({ length: unknownCount }, () => 0));
  const rhs = Array.from({ length: unknownCount }, () => 0);
  const p = polynomialToAscendingCoefficients(terms);

  // Unknowns are [S0..Sn, C0..Cn]
  for (let power = 0; power <= degree; power += 1) {
    // S' - aC = P  (sin coefficients)
    const rowSin = power;
    if (power + 1 <= degree) {
      matrix[rowSin][power + 1] = power + 1;
    }
    matrix[rowSin][size + power] = -a;
    rhs[rowSin] = kind === 'sin' ? p[power] : 0;

    // C' + aS = P  (cos coefficients)
    const rowCos = size + power;
    if (power + 1 <= degree) {
      matrix[rowCos][size + power + 1] = power + 1;
    }
    matrix[rowCos][power] = a;
    rhs[rowCos] = kind === 'cos' ? p[power] : 0;
  }

  const solution = gaussianSolve(matrix, rhs);
  if (!solution) {
    return undefined;
  }

  const s = solution.slice(0, size);
  const c = solution.slice(size);
  return { s, c };
}

function solvePolynomialTimesTrig(
  terms: PolynomialTerm[],
  affine: AffineForm,
  kind: 'sin' | 'cos',
) {
  const solution = buildTrigLinearSystem(terms, affine.a, kind);
  if (!solution) {
    return undefined;
  }

  const sLatex = polynomialFromAscendingCoefficients(solution.s);
  const cLatex = polynomialFromAscendingCoefficients(solution.c);
  const angleLatex = wrapGroupedLatex(affine.latex);
  const sinLatex = `\\sin\\left(${angleLatex}\\right)`;
  const cosLatex = `\\cos\\left(${angleLatex}\\right)`;

  const pieces = [];
  if (sLatex !== '0') {
    pieces.push(multiplyLatex(sLatex, sinLatex));
  }
  if (cLatex !== '0') {
    pieces.push(multiplyLatex(cLatex, cosLatex));
  }
  return pieces.join('+') || undefined;
}

function derivativeRatioIntegral(node: unknown, variable: string) {
  if (!isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3) {
    return undefined;
  }

  const denominator = node[2];
  const denominatorDerivative = box(['D', denominator, variable]).evaluate().json;
  const numeratorTerms = toPolynomialTerms(node[1], variable);
  const derivativeTerms = toPolynomialTerms(denominatorDerivative, variable);
  if (!numeratorTerms || !derivativeTerms || numeratorTerms.length !== derivativeTerms.length) {
    return undefined;
  }

  let ratio: number | undefined;
  for (let index = 0; index < numeratorTerms.length; index += 1) {
    const numeratorTerm = numeratorTerms[index];
    const derivativeTerm = derivativeTerms[index];
    if (numeratorTerm.degree !== derivativeTerm.degree) {
      return undefined;
    }

    if (Math.abs(derivativeTerm.coefficient) < 1e-10) {
      return undefined;
    }

    const nextRatio = numeratorTerm.coefficient / derivativeTerm.coefficient;
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

  return divideByNumericCoefficient(
    `\\ln\\left|${wrapGroupedLatex(box(denominator).latex)}\\right|`,
    1 / ratio,
  );
}

function inverseTrigIntegral(node: unknown, variable: string) {
  if (!isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3 || node[1] !== 1) {
    return undefined;
  }

  const denominator = node[2];
  if (isNodeArray(denominator) && denominator[0] === 'Add' && denominator.length === 3) {
    const left = denominator[1];
    const right = denominator[2];
    const maybePower = isFiniteNumber(left) && left === 1 ? right : isFiniteNumber(right) && right === 1 ? left : null;
    if (
      maybePower
      && isNodeArray(maybePower)
      && maybePower[0] === 'Power'
      && maybePower.length === 3
      && isFiniteNumber(maybePower[2])
      && maybePower[2] === 2
    ) {
      const affine = parseAffine(maybePower[1], variable);
      if (affine && affine.a !== 0) {
        return divideByNumericCoefficient(
          `\\arctan\\left(${affine.latex}\\right)`,
          affine.a,
        );
      }
    }
  }

  if (
    isNodeArray(denominator)
    && denominator[0] === 'Power'
    && denominator.length === 3
    && isFiniteNumber(denominator[2])
    && denominator[2] === -0.5
  ) {
    const inner = denominator[1];
    if (isNodeArray(inner) && inner[0] === 'Add' && inner.length === 3) {
      const left = inner[1];
      const right = inner[2];
      const powerTerm =
        isFiniteNumber(left) && left === 1 && isNodeArray(right) && right[0] === 'Multiply'
          ? right
          : isFiniteNumber(right) && right === 1 && isNodeArray(left) && left[0] === 'Multiply'
            ? left
            : null;
      if (
        powerTerm
        && powerTerm.length === 3
        && isFiniteNumber(powerTerm[1])
        && powerTerm[1] === -1
        && isNodeArray(powerTerm[2])
        && powerTerm[2][0] === 'Power'
        && powerTerm[2].length === 3
        && isFiniteNumber(powerTerm[2][2])
        && powerTerm[2][2] === 2
      ) {
        const affine = parseAffine(powerTerm[2][1], variable);
        if (affine && affine.a !== 0) {
          return divideByNumericCoefficient(
            `\\arcsin\\left(${affine.latex}\\right)`,
            affine.a,
          );
        }
      }
    }
  }

  return undefined;
}

function advancedIntegralRule(node: unknown, variable = 'x'): string | undefined {
  const basic = resolveAntiderivativeRule(node, variable);
  if (basic) {
    return basic;
  }

  const inverseTrig = inverseTrigIntegral(node, variable);
  if (inverseTrig) {
    return inverseTrig;
  }

  const derivativeRatio = derivativeRatioIntegral(node, variable);
  if (derivativeRatio) {
    return derivativeRatio;
  }

  if (isNodeArray(node) && node[0] === 'Multiply') {
    const factors = node.slice(1);
    const exponential = factors.find((factor) =>
      isNodeArray(factor)
      && factor[0] === 'Power'
      && factor.length === 3
      && factor[1] === 'ExponentialE',
    ) as ['Power', 'ExponentialE', unknown] | undefined;
    const trig = factors.find((factor) =>
      isNodeArray(factor)
      && factor.length === 2
      && (factor[0] === 'Sin' || factor[0] === 'Cos'),
    ) as ['Sin' | 'Cos', unknown] | undefined;
    const polynomialFactor = factors.find((factor) => dependsOnVariable(factor, variable) && factor !== exponential && factor !== trig);

    if (exponential && polynomialFactor) {
      const terms = toPolynomialTerms(polynomialFactor, variable);
      const affine = parseAffine(exponential[2], variable);
      if (terms && affine) {
        const solved = solvePolynomialTimesExponential(terms, affine);
        if (solved) {
          return solved;
        }
      }
    }

    if (trig && polynomialFactor) {
      const terms = toPolynomialTerms(polynomialFactor, variable);
      const affine = parseAffine(trig[1], variable);
      const trigKind = trig[0] === 'Sin' ? 'sin' : 'cos';
      if (terms && affine) {
        const solved = solvePolynomialTimesTrig(terms, affine, trigKind);
        if (solved) {
          return solved;
        }
      }
    }
  }

  return undefined;
}

function boxedToFiniteNumber(expr: BoxedLike) {
  const numeric = expr.N?.() ?? expr.evaluate();
  if (typeof numeric.json === 'number' && Number.isFinite(numeric.json)) {
    return numeric.json;
  }

  if (
    typeof numeric.json === 'object'
    && numeric.json !== null
    && 'num' in numeric.json
    && typeof numeric.json.num === 'string'
  ) {
    const parsed = Number(numeric.json.num);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  const approx = latexToApproxText(numeric.latex);
  if (!approx) {
    return undefined;
  }

  const parsed = Number(approx.replace(/\s+/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function evaluateAt(body: unknown, value: number) {
  try {
    return boxedToFiniteNumber(box(body).subs({ x: value }).evaluate());
  } catch {
    return undefined;
  }
}

function integrateFinite(body: unknown, lower: number, upper: number): AdvancedCalcEvaluation {
  const result = integrateAdaptiveSimpson((value) => evaluateAt(body, value), lower, upper);
  if (result.kind === 'unsafe') {
    return {
      warnings: [],
      error: 'The numeric integral became too large or too small to display safely.',
    };
  }

  if (result.kind !== 'success') {
    return {
      warnings: [],
      error: 'This definite integral could not be evaluated reliably in Advanced Calc.',
    };
  }

  const guardError = getResultGuardError(numberToLatex(result.value), formatNumber(result.value));
  if (guardError) {
    return { warnings: [], error: guardError };
  }

  return {
    exactLatex: numberToLatex(result.value),
    approxText: formatNumber(result.value),
    warnings: ['Symbolic integral unavailable; showing a numeric definite integral.'],
    resultOrigin: 'numeric-fallback',
  };
}

const IMPROPER_EPSILON = 1e-8;

function integrateHalfInfinite(body: unknown, finiteBound: number, direction: 'pos' | 'neg') {
  const result = integrateAdaptiveSimpson((value) => {
    if (value >= 1) {
      return undefined;
    }

    const mapped =
      direction === 'pos'
        ? finiteBound + value / (1 - value)
        : finiteBound - value / (1 - value);
    const integrand = evaluateAt(body, mapped);
    if (integrand === undefined) {
      return undefined;
    }

    const jacobian = 1 / (1 - value) ** 2;
    return integrand * jacobian;
  }, 0, 1 - IMPROPER_EPSILON, { tolerance: 1e-7, maxDepth: 14 });

  if (result.kind === 'unsafe') {
    return {
      warnings: [],
      error: 'The numeric integral became too large or too small to display safely.',
    } satisfies AdvancedCalcEvaluation;
  }

  if (result.kind !== 'success') {
    return {
      warnings: [],
      error: 'This improper integral could not be evaluated reliably.',
    } satisfies AdvancedCalcEvaluation;
  }

  const guardError = getResultGuardError(numberToLatex(result.value), formatNumber(result.value));
  if (guardError) {
    return { warnings: [], error: guardError } satisfies AdvancedCalcEvaluation;
  }

  return {
    exactLatex: numberToLatex(result.value),
    approxText: formatNumber(result.value),
    warnings: ['Symbolic improper integral unavailable; showing a numeric improper integral.'],
    resultOrigin: 'numeric-fallback',
  } satisfies AdvancedCalcEvaluation;
}

export function evaluateAdvancedIndefiniteIntegral(
  state: AdvancedIndefiniteIntegralState,
): AdvancedCalcEvaluation {
  const bodyLatex = state.bodyLatex.trim();
  if (!bodyLatex) {
    return {
      warnings: [],
      error: 'Enter an integrand in x before evaluating the integral.',
    };
  }

  try {
    const parsed = ce.parse(`\\int ${bodyLatex}\\,dx`) as BoxedLike;
    const integrand = ce.parse(bodyLatex) as BoxedLike;
    const exact = parsed.evaluate();
    if (exact.latex !== parsed.latex && !exact.latex.includes('\\int')) {
      return {
        exactLatex: exact.latex,
        approxText: latexToApproxText((exact.N?.() ?? exact).latex),
        warnings: [],
        resultOrigin: 'symbolic',
      };
    }

    const symbolicEngine = resolveSymbolicIntegralFromAst(integrand.json, 'x');
    if (symbolicEngine.kind === 'success') {
      return {
        exactLatex: symbolicEngine.exactLatex,
        warnings: [],
        resultOrigin: symbolicEngine.origin,
      };
    }

    const byRule = advancedIntegralRule(integrand.json, 'x');
    if (byRule) {
      return {
        exactLatex: byRule,
        warnings: [],
        resultOrigin: 'rule-based-symbolic',
      };
    }

    return {
      warnings: [],
      error: 'This antiderivative could not be determined symbolically in Advanced Calc.',
    };
  } catch {
    return {
      warnings: [],
      error: 'This antiderivative could not be determined symbolically in Advanced Calc.',
    };
  }
}

export function evaluateAdvancedDefiniteIntegral(
  state: AdvancedDefiniteIntegralState,
): AdvancedCalcEvaluation {
  const bodyLatex = state.bodyLatex.trim();
  const lower = Number(state.lower);
  const upper = Number(state.upper);
  if (!bodyLatex || !Number.isFinite(lower) || !Number.isFinite(upper)) {
    return {
      warnings: [],
      error: 'Definite integrals require numeric bounds in Advanced Calc.',
    };
  }

  try {
    const parsed = ce.parse(`\\int_{${lower}}^{${upper}} ${bodyLatex}\\,dx`) as BoxedLike;
    const integrand = ce.parse(bodyLatex) as BoxedLike;
    const exact = parsed.evaluate();
    if (exact.latex !== parsed.latex && !exact.latex.includes('\\int')) {
      const guardError = getResultGuardError(exact.latex, latexToApproxText((exact.N?.() ?? exact).latex));
      if (guardError) {
        return { warnings: [], error: guardError };
      }
      return {
        exactLatex: exact.latex,
        approxText: latexToApproxText((exact.N?.() ?? exact).latex),
        warnings: [],
        resultOrigin: 'symbolic',
      };
    }

    return integrateFinite(integrand.json, lower, upper);
  } catch {
    return {
      warnings: [],
      error: 'This definite integral could not be evaluated reliably in Advanced Calc.',
    };
  }
}

export function evaluateAdvancedImproperIntegral(
  state: AdvancedImproperIntegralState,
): AdvancedCalcEvaluation {
  const bodyLatex = state.bodyLatex.trim();
  if (!bodyLatex) {
    return {
      warnings: [],
      error: 'Enter an integrand before evaluating the improper integral.',
    };
  }

  let body: unknown;
  try {
    body = ce.parse(bodyLatex).json;
  } catch {
    return {
      warnings: [],
      error: 'This improper integral could not be evaluated reliably.',
    };
  }
  const lowerFinite = Number(state.lower);
  const upperFinite = Number(state.upper);

  if (state.lowerKind === 'finite' && state.upperKind === 'finite') {
    return {
      warnings: [],
      error: 'Improper integrals with these bounds are not supported in Advanced Calc yet.',
    };
  }

  if (state.lowerKind === 'finite' && !Number.isFinite(lowerFinite)) {
    return {
      warnings: [],
      error: 'Improper integrals with these bounds are not supported in Advanced Calc yet.',
    };
  }

  if (state.upperKind === 'finite' && !Number.isFinite(upperFinite)) {
    return {
      warnings: [],
      error: 'Improper integrals with these bounds are not supported in Advanced Calc yet.',
    };
  }

  if (state.lowerKind === 'finite' && state.upperKind === 'posInfinity') {
    return integrateHalfInfinite(body, lowerFinite, 'pos');
  }

  if (state.lowerKind === 'negInfinity' && state.upperKind === 'finite') {
    return integrateHalfInfinite(body, upperFinite, 'neg');
  }

  const left = integrateHalfInfinite(body, 0, 'neg');
  if (left.error) {
    return left.error.includes('reliably')
      ? { warnings: [], error: 'This improper integral appears divergent.' }
      : left;
  }

  const right = integrateHalfInfinite(body, 0, 'pos');
  if (right.error) {
    return right.error.includes('reliably')
      ? { warnings: [], error: 'This improper integral appears divergent.' }
      : right;
  }

  const leftValue = Number(left.approxText);
  const rightValue = Number(right.approxText);
  if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) {
    return {
      warnings: [],
      error: 'This improper integral could not be evaluated reliably.',
    };
  }

  const total = leftValue + rightValue;
  const guardError = getResultGuardError(numberToLatex(total), formatNumber(total));
  if (guardError) {
    return { warnings: [], error: guardError };
  }

  return {
    exactLatex: numberToLatex(total),
    approxText: formatNumber(total),
    warnings: ['Symbolic improper integral unavailable; showing a numeric improper integral.'],
    resultOrigin: 'numeric-fallback',
  };
}
